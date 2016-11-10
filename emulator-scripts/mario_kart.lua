local http = require("socket.http")
local mime = require("mime")
local json = require("json")
local ltn12 = require("ltn12")

local current_lap_percentage = 0
local last_lap_percentage = 0.9
local last_updated_lap = -1
local lap_reward = {0, 0, 0}
local actual_global_lap = 0
local global_lap = 1
local minimap_offset_x = 240 - 64
local minimap_offset_y = 160 - 64
local end_of_lap_threshold = 0.9
local start_of_lap_threshold = 0.1

function get_lap()
  local status = memory.read_u8(0x3BE0)
  if status == 4 then
    return 2
  end

  if status == 12 then
    return 3
  end

  return 1
end

function compute_reward(track_info)
  local position = memory.read_u8(0x23B4)
  local coins = memory.read_u8(0x3D10)
  local first_lap_time = memory.read_u16_le(0x3C74)
  local second_lap_time = memory.read_u16_le(0x3C76)
  local current_lap_time = memory.read_u16_le(0x5C80) - first_lap_time - second_lap_time
  local frames_not_hitting_gas = memory.read_u16_le(0x3ADC)
  local frames_hitting_brake = memory.read_u16_le(0x3AE0)
  local lakitu_rescue_count = memory.read_u8(0x3AE7)
  local entity_hit_count = memory.read_u8(0x3AE8)
  local wall_hit_count = memory.read_u8(0x3AE9)
  local spin_count = memory.read_u8(0x3AEA)
  local start_turbo_count = memory.read_u8(0x3AEB)
  local drift_turbo_count = memory.read_u8(0x3AEC)
  local item_box_hit_full = memory.read_u8(0x3AF4)
  local frames_outside = memory.read_u16_le(0x3AF0)

  local track_position = get_minimap_position()
  local x = track_position[1] - minimap_offset_x + 1
  local y = track_position[2] - minimap_offset_y + 1

  local lap_percentage = last_lap_percentage

  if (track_info['matrix'][x][y] ~= -1) then
    lap_percentage = (track_info['matrix'][x][y] * 1.0) / track_info['max_steps']
  end

  -- Check if the lap counter is still valid
  if last_lap_percentage >= end_of_lap_threshold and lap_percentage <= start_of_lap_threshold then
    actual_global_lap = actual_global_lap + 1
  else
    if lap_percentage >= end_of_lap_threshold and last_lap_percentage <= start_of_lap_threshold then
      actual_global_lap = actual_global_lap - 1
    end
  end

  last_lap_percentage = lap_percentage
  global_lap = math.max(global_lap, actual_global_lap)

  if global_lap == actual_global_lap then
    current_lap_percentage = lap_percentage
  end

  local average_time = track_info['average_time']
  local relative_time = average_time * current_lap_percentage - current_lap_time
  lap_reward[global_lap] = relative_time

  gui.text(0, 80, "Time reward lap 1: " .. lap_reward[1])
  gui.text(0, 100, "Time reward lap 2: " .. lap_reward[2])
  gui.text(0, 120, "Time reward lap 3: " .. lap_reward[3])

  -- return lap_reward[1] + lap_reward[2] + lap_reward[3]
  -- local relative_time = ((average_time - first_lap_time) + (average_time - second_lap_time) +
     -- average_time * lap_percentage - current_lap_time)

  --[[
  local attributes = {
    position=position, coins=coins, time=time,
    no_hit_gas=frames_not_hitting_gas, brake_hits=frames_hitting_brake,
    lakitu_rescues=lakitu_rescue_count, hits=entity_hit_count,
    wall_hits=wall_hit_count, spins=spin_count, start_turbo=start_turbo_count,
    drift_turbo=drift_turbo_count, item_box_full=item_box_hit_full,
    frames_outside=frames_outside
  }

  local i = 0
  for key,value in pairs(attributes) do
    gui.text(0, i * 20, key .. ": " .. value)
    i = i + 1
  end
--]]

  return (lap_reward[1] + lap_reward[2] + lap_reward[3]) / 80 +
    (7 - position) * 8 + coins * 4 -
    frames_not_hitting_gas / 4 - frames_hitting_brake * 2 -
    lakitu_rescue_count * 30 - entity_hit_count * 15 -
    wall_hit_count * 20 - spin_count * 15 + start_turbo_count * 25 +
    drift_turbo_count * 15 + item_box_hit_full * 15 -
    frames_outside / 4
end

function get_minimap_position()
	local old_domain = memory.getcurrentmemorydomain()
	memory.usememorydomain("OAM")
	local y = memory.read_u8(0) + 4
	local x = bit.band(memory.read_u16_le(2), 0x1FF) + 4

	memory.usememorydomain(old_domain)

	return {x, y}
end

function race_ended()
  return memory.read_u8(0x3BE0) == 0x34
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

local base_url = "http://localhost:5000/"

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

local game_id = renew_game_id()
local screenshot_folder = "../results/"
local state_file = "../game/mario_kart.State"

local frames_to_stack = 4
local frame_number = 0
local update_frequency = 10
local action = {}
local max_time_without_finish = 18000
local train = true

console.log(game_id)

memory.usememorydomain("IWRAM")

local track_info = retrieve_minimap('peach_circuit')

function reset( ... )
  frame_number = 0
  game_id = renew_game_id()
  savestate.load(state_file)
  current_lap_percentage = 0
  last_lap_percentage = 0.9
  lap_reward = {0, 0, 0}
  actual_global_lap = 0
  global_lap = 1
  last_updated_lap = -1
end

reset()

while true do
  local reward = compute_reward(track_info)

  gui.text(0, 0, "Reward: " .. reward)
  gui.text(0, 20, "Ended: " .. tostring(race_ended()))
  gui.text(0, 40, "Lap percentage: " .. (current_lap_percentage * 100) .. '%')
  gui.text(0, 60, "Lap: " .. (global_lap) .. ' / 3')

  client.screenshot(screenshot_folder .. "screenshot" .. (frame_number % frames_to_stack) ..  ".png")

  local time = memory.read_u16_le(0x5C80)
  local out_of_time = (time >= max_time_without_finish)

  if out_of_time then
    reward = -30000
  end

  if out_of_time or (frame_number % update_frequency) == 0 then
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
        race_ended=race_ended()
    }, result)

    result = json:decode(result[1])
    action = result.action
  end

  joypad.set(action)

  if out_of_time or race_ended() then
    reset()
  end

	local position = get_minimap_position()

  frame_number = frame_number + 1
  emu.frameadvance()
end
