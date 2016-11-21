local http = require("socket.http")
local mime = require("mime")
local json = require("json")
local ltn12 = require("ltn12")
local deque = require("deque")

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

local game_id = nil
local action = {}
local state = nil
local last_checkpoint = nil

local MarioKartState = {}
MarioKartState.__index = MarioKartState

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
  self.positions_queue = deque.new()
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
  checkpoint.race_status = self.race_status

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

function MarioKartState:_get_speed(track_info)
  local max_velocity = 100.0 * track_info['max_steps'] / track_info['average_time']
  local new_position = assert(self.positions_queue:peek_right(), 'No new position available')
  local old_position = assert(self.positions_queue:peek_left(), 'No old position available')

  local speed = 0
  local lap_difference = new_position['lap'] - old_position['lap']

  if lap_difference >= 0 then
    speed = lap_difference * track_info['max_steps'] - old_position['step'] + new_position['step']
  else
    speed = -((-lap_difference) * track_info['max_steps'] - new_position['step'] + old_position['step'])
  end
  speed = speed / max_velocity

  return speed
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
    y=y
  })

  self.time = MarioKartState._get_time_from_ram()
  self.race_status = MarioKartState._get_race_status_from_ram()
end

function MarioKartState:get_reward(track_info)
  return self:_get_speed(track_info)
end

function MarioKartState._get_race_status_from_ram()
  return memory.read_u8(0x3BE0)
end

function MarioKartState:race_ended()
  return self.race_status == 0x34
end

function make_json_request(url, method, content_table, response_out)
  local content = json:encode(content_table)
  return http.request{
    url = url,
    method = method,
    headers = {
      ["content-type"] = "application/json; charset=utf-8",
      ["content-length"] = string.len(content)
    },
    source = ltn12.source.string(content),
    sink = ltn12.sink.table(response_out)
  }
end

function renew_game_id()
  local result = {}
  make_json_request(base_url .. "game-id", "POST", {}, result)

  result = json:decode(result[1])
  return result.id
end

function retrieve_minimap(name)
  local result = {}
  make_json_request(base_url .. "get-minimap", "POST", {
        minimap_name=name
    }, result)

  local json_string = table.concat(result, '')

  result = json:decode(json_string)
  return result
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
  savestate.load(state_file)

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
    console.log("Checkpoint created")
  end

  gui.text(0, 0, "Reward: " .. reward)
  gui.text(0, 20, "Ended: " .. tostring(race_ended))
  gui.text(0, 40, "Lap: " .. (state.global_lap) .. ' / 3')
  gui.text(0, 60, "Overall progress: " .. (state:get_overall_progress()))

  client.screenshot(screenshot_folder .. "screenshot" .. (frame_number % frames_to_stack) ..  ".png")

  if not manual_mode then
    if race_ended or (frame_number % update_frequency) == 0 then
      local last_screenshots = {}
      for i=0,frames_to_stack-1 do
        if i >= frame_number then
          break
        end
        local screenshot_index = ((frame_number + frames_to_stack - i) % frames_to_stack)
        local screenshot_file = io.open(screenshot_folder .. "screenshot" .. screenshot_index ..  ".png", "rb")

        if screenshot_file then
          local data = screenshot_file:read("*all")
          last_screenshots[i + 1] = (mime.b64(data))
          screenshot_file:close()
        end
      end

      local result = {}
      make_json_request(base_url .. "request-action", "POST", {
        game_id=game_id,
        reward=reward,
        screenshots=last_screenshots,
        train=train,
        race_ended=race_ended
      }, result)

      result = json:decode(result[1])
      action = result.action
    end

    joypad.set(action)
  end

  frame_number = frame_number + 1

  if race_ended then
    reset()
  end

  if state:is_timed_out() then
    restore_checkpoint()
  end

  emu.frameadvance()
  collectgarbage()
end
