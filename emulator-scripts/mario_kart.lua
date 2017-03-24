local mime = require("mime")
local json = require("json")
local ltn12 = require("ltn12")
local deque = require("deque")

local socket = require "socket"
local try    = require "try"

socket.newtry  = try.new
socket.protect = try.protect
socket.try     = try.new()

local http = require "socket.http"
http.TIMEOUT = nil -- Wait indefinitely

local frames_to_stack = 4
local frame_number = 0
local update_frequency = 10
local minimap_offset_x = 240 - 64
local minimap_offset_y = 160 - 64
local end_of_lap_threshold = 0.9
local start_of_lap_threshold = 0.1
local max_time_between_checkpoints = 2000
local max_frames = 65535
local max_coins = 255
local max_entity_hits = 20
local max_wall_hits = 255
local max_length_positions_queue = 60
local checkpoint_percentage_interval = 0.15
local base_url = "http://localhost:5000/"
local screenshot_folder = "../results/"
local state_file = "../game/mario_kart.State"
local checkpoint_state_file = "../game/mario_kart_checkpoint.State"
local train = true
local manual_mode = false
local use_checkpoint = false
local repeat_forever = true
local use_initial_checkpoint = true

local game_id = nil
local action = {}
local state = nil
local last_checkpoint = nil
local MarioKartState = {}

MarioKartState.__index = MarioKartState

local function pack(ok, ...)
  return ok, arg
end

local protected_request = function(reqt, body)
  local ok, results = pack(pcall(function()
    return http.request(reqt, body)
	end))

	if ok then
		return unpack(results)
  else
    return nil, unpack(results)
	end
end

function MarioKartState.new()
  local self = setmetatable({}, MarioKartState)

  self:reset()
  return self
end

function MarioKartState:reset()
  self.current_lap_percentage = 0
  self.last_lap_percentage = 0.9
  self.actual_global_lap = 0
  self.global_lap = 1
  self.position = {0, 0}
  self.time = 0
  self.last_checkpoint_state = self:_build_checkpoint_state()
  self.race_status = 0
  self.is_outside = false
  self.outside_frames = 0
  self.positions_queue = deque.new()
  self.last_score = 0
  self.same_place_frames = 0

  self.place = 0
  self.coins = 0
  self.frames_not_hitting_gas = 0
  self.frames_hitting_brake = 0
  self.lakitu_rescue_count = 0
  self.entity_hit_count = 0
  self.wall_hit_count = 0
  self.spin_count = 0
  self.start_turbo_count = 0
  self.drift_turbo_count = 0
  self.item_box_hit_full = 0
end

function MarioKartState:create_checkpoint()
  self.last_checkpoint_state = self:_build_checkpoint_state()

  local checkpoint = MarioKartState.new()
  checkpoint.current_lap_percentage = self.current_lap_percentage
  checkpoint.last_lap_percentage = self.last_lap_percentage
  checkpoint.actual_global_lap = self.actual_global_lap
  checkpoint.global_lap = self.global_lap
  checkpoint.position = self.position
  checkpoint.time = self.time
  checkpoint.last_checkpoint_state = self.last_checkpoint_state
  checkpoint.is_outside = self.is_outside
  checkpoint.outside_frames = self.outside_frames
  checkpoint.race_status = self.race_status
  checkpoint.last_score = self.last_score
  checkpoint.same_place_frames = self.same_place_frames

  checkpoint.place = self.place
  checkpoint.coins = self.coins
  checkpoint.frames_not_hitting_gas = self.frames_not_hitting_gas
  checkpoint.frames_hitting_brake = self.frames_hitting_brake
  checkpoint.lakitu_rescue_count = self.lakitu_rescue_count
  checkpoint.entity_hit_count = self.entity_hit_count
  checkpoint.wall_hit_count = self.wall_hit_count
  checkpoint.spin_count = self.spin_count
  checkpoint.start_turbo_count = self.start_turbo_count
  checkpoint.drift_turbo_count = self.drift_turbo_count
  checkpoint.item_box_hit_full = self.item_box_hit_full

  -- Omitted properties: positions_queue

  return checkpoint
end

function MarioKartState:_build_checkpoint_state()
  return {
    lap=self.actual_global_lap,
    lap_percentage=self.current_lap_percentage,
    time=self.time
  }
end

function MarioKartState:_record_position(position)
  self.positions_queue:push_right(position)
  if self.positions_queue:length() == max_length_positions_queue + 1 then
      self.positions_queue:pop_left()
  end
end

function MarioKartState:get_overall_progress()
  return self.last_lap_percentage + self.actual_global_lap - 1
end

function MarioKartState:is_timed_out()
  return self.time - self.last_checkpoint_state.time >= max_time_between_checkpoints
end

function MarioKartState:_get_progress_difference(track_info)
  local new_position = assert(self.positions_queue:peek_right(), 'No new position available')
  local old_position = assert(self.positions_queue:peek_left(), 'No old position available')

  local new_overall_percentage = new_position['lap'] + new_position['lap_percentage']
  local old_overall_percentage = old_position['lap'] + old_position['lap_percentage']

  return new_overall_percentage - old_overall_percentage
end

function MarioKartState._get_time_from_ram()
  return memory.read_u16_le(0x5C80)
end

function MarioKartState._get_position_from_ram()
	local old_domain = memory.getcurrentmemorydomain()

	memory.usememorydomain("OAM")

  local x = bit.band(memory.read_u16_le(2), 0x1FF) + 4
	local y = memory.read_u8(0) + 4

	memory.usememorydomain(old_domain)

	return {x - minimap_offset_x + 1, y - minimap_offset_y + 1}
end

function MarioKartState:update_from_ram(track_info)
  self.last_score = self:_get_score()
  self.position = MarioKartState._get_position_from_ram()

  local x = self.position[1]
  local y = self.position[2]
  local lap_percentage = self.last_lap_percentage

  if (track_info['matrix'][x][y] ~= -1) then
    lap_percentage = (track_info['matrix'][x][y] * 1.0) / track_info['max_steps']
  end

  -- Check if the lap counter is still valid
  if self.last_lap_percentage >= end_of_lap_threshold and lap_percentage <= start_of_lap_threshold then
    self.actual_global_lap = self.actual_global_lap + 1
  elseif lap_percentage >= end_of_lap_threshold and self.last_lap_percentage <= start_of_lap_threshold then
    self.actual_global_lap = self.actual_global_lap - 1
  end

  self.last_lap_percentage = lap_percentage
  self.global_lap = math.max(self.global_lap, self.actual_global_lap)

  if self.global_lap == self.actual_global_lap then
    self.current_lap_percentage = lap_percentage
  end

  self:_record_position({
    step=track_info['matrix'][x][y],
    lap=self.actual_global_lap,
    x=x,
    y=y,
    lap_percentage=lap_percentage
  })

  self.time = MarioKartState._get_time_from_ram()
  self.race_status = MarioKartState._get_race_status_from_ram()

  local outside_frames = MarioKartState._get_outside_frames_from_ram()
  self.is_outside = (outside_frames ~= self.outside_frames)
  self.outside_frames = outside_frames

  local old_place = self.place
  self.place = memory.read_u8(0x23B4)

  if old_place ~= self.place then
    self.same_place_frames = 0
  end

  self.same_place_frames = self.same_place_frames + 1

  self.coins = memory.read_u8(0x3D10)
  self.frames_not_hitting_gas = memory.read_u16_le(0x3ADC)
  self.frames_hitting_brake = memory.read_u16_le(0x3AE0)
  self.lakitu_rescue_count = memory.read_u8(0x3AE7)
  self.entity_hit_count = memory.read_u8(0x3AE8)
  self.wall_hit_count = memory.read_u8(0x3AE9)
  self.spin_count = memory.read_u8(0x3AEA)
  self.start_turbo_count = memory.read_u8(0x3AEB)
  self.drift_turbo_count = memory.read_u8(0x3AEC)
  self.item_box_hit_full = memory.read_u8(0x3AF4)
end

function MarioKartState:_get_score()
  return (7 - self.place) / 30 * self.same_place_frames + self.coins * 4 - self.time / 80 -
    self.frames_not_hitting_gas / 4 - self.frames_hitting_brake / 2 -
    self.lakitu_rescue_count * 30 - self.entity_hit_count * 15 -
    self.wall_hit_count * 20 - self.spin_count * 15 + self.start_turbo_count * 25 +
    self.drift_turbo_count * 15 + self.item_box_hit_full * 15 -
    self.outside_frames / 4
end

function MarioKartState:get_reward(track_info)
  if use_checkpoint and self:is_timed_out() then
    return -1.0
  end

  local progress_diference = self:_get_progress_difference(track_info)
  local score_reward = self:_get_score() - self.last_score

  return 0.3 * progress_diference + 0.7 * score_reward
end

function MarioKartState._get_outside_frames_from_ram()
  return memory.read_u16_le(0x3AF0)
end

function MarioKartState._get_race_status_from_ram()
  return memory.read_u8(0x3BE0)
end

function MarioKartState:race_ended()
  return self.race_status == 0x34
end

function make_json_request_core(url, method, content_table)
  local content = json:encode(content_table)
  local response_out = {}
  local result, error = protected_request({
    url = url,
    method = method,
    headers = {
      ["content-type"] = "application/json; charset=utf-8",
      ["content-length"] = string.len(content)
    },
    source = ltn12.source.string(content),
    sink = ltn12.sink.table(response_out)
  })

  if result == nil then
    return nil, error
  end

  return json:decode(table.concat(response_out, ''))
end

function make_json_request(url, method, content_table)
  local result = nil
  local err = nil

  result, err = make_json_request_core(url, method, content_table)
  if not result then
    console.log("Request error: " .. url .. ", " .. method)
    console.log(err)
    error("Request error")
  end

  return result
end

function renew_game_id()
  local result = make_json_request(base_url .. "game-id", "POST", {})
  return result.id
end

function retrieve_minimap(name)
  return make_json_request(base_url .. "get-minimap", "POST", {
        minimap_name=name
    })
end

function create_checkpoint()
  last_checkpoint = state:create_checkpoint()
  savestate.save(checkpoint_state_file)
end

function restore_checkpoint()
  state = last_checkpoint
  last_checkpoint = state:create_checkpoint()
  savestate.load(checkpoint_state_file)
end

function reset()
  memory.usememorydomain("IWRAM")
  frame_number = 0
  game_id = renew_game_id()

  if use_initial_checkpoint then
    savestate.load(state_file)
  end

  state = MarioKartState.new()
  create_checkpoint()
end

reset()
local track_info = retrieve_minimap('peach_circuit')

while true do
  state:update_from_ram(track_info)
  local reward = state:get_reward(track_info)
  local race_ended = state:race_ended()

  if state:get_overall_progress() >= last_checkpoint:get_overall_progress() + checkpoint_percentage_interval then
    create_checkpoint()
  end

  gui.text(0, 0, "Reward: " .. reward)
  gui.text(0, 20, "Ended: " .. tostring(race_ended))
  gui.text(0, 40, "Lap: " .. (state.global_lap) .. ' / 3')
  gui.text(0, 60, "Overall progress: " .. (state:get_overall_progress()))
  gui.text(0, 80, "Last checkpoint: " .. (last_checkpoint:get_overall_progress()))
  gui.text(0, 100, "Is outside: " .. tostring(state.is_outside))

  client.screenshot(screenshot_folder .. "screenshot" .. (frame_number % frames_to_stack) ..  ".png")

  if not manual_mode then
    if race_ended or (frame_number % update_frequency) == 0 then
      local last_screenshots = {}
      for i=0,frames_to_stack-1 do
        if i > frame_number then
          break
        end
        local screenshot_index = ((frame_number + frames_to_stack - i) % frames_to_stack)
        local screenshot_file = io.open(screenshot_folder .. "screenshot" .. screenshot_index ..  ".png", "rb")

        local data = screenshot_file:read("*all")
        last_screenshots[i + 1] = (mime.b64(data))
        screenshot_file:close()
      end

      local result = make_json_request(base_url .. "request-action", "POST", {
        game_id=game_id,
        reward=reward,
        screenshots=last_screenshots,
        train=train,
        race_ended=race_ended
      })

      action = result.action
    end

    joypad.set(action)
  end

  frame_number = frame_number + 1

  emu.frameadvance()
  collectgarbage()

  if race_ended then
    if not repeat_forever then
      break
    end
    reset()
  end

  if state:is_timed_out() and use_checkpoint then
    restore_checkpoint()
  end

end
