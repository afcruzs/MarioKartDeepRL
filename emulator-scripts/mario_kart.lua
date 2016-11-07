local http = require("socket.http")
local mime = require("mime")
local json = require("json")
local ltn12 = require("ltn12")
local base64 = require("base64")

function compute_reward()
	local position = memory.read_u8(0x23B4)
	local coins = memory.read_u8(0x3D10)
	local time = memory.read_u16_le(0x5C80)
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

	return (7 - position) * 8 + coins * 4 - time / 80 -
		frames_not_hitting_gas / 4 - frames_hitting_brake * 2 -
		lakitu_rescue_count * 30 - entity_hit_count * 15 -
		wall_hit_count * 20 - spin_count * 15 + start_turbo_count * 25 +
		drift_turbo_count * 15 + item_box_hit_full * 15 -
		frames_outside / 4
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

local game_id = renew_game_id()
local screenshot_folder = "../results/"
local state_file = "../game/mario_kart.State"
savestate.load(state_file)

local frames_to_stack = 4
local frame_number = 0
local update_frequency = 30

console.log(game_id)

while true do
	local reward = compute_reward()
  local table = joypad.get()

	gui.text(0, 0, "Reward: " .. reward)
	gui.text(0, 20, "Ended: " .. tostring(race_ended()))

	client.screenshot(screenshot_folder .. "screenshot" .. (frame_number % frames_to_stack) ..  ".png")

	if (frame_number % update_frequency) == 0 then
		local last_screenshots = {}
		for i=0,frames_to_stack-1 do
			local screenshot_index = ((frame_number - i) % frames_to_stack)
			local screenshot_file = io.open(screenshot_folder .. "screenshot" .. screenshot_index ..  ".png", "rb")

			if screenshot_file then
				local data = screenshot_file:read("*all")
				last_screenshots[i + 1] = (base64.enc(data))
				screenshot_file:close()
			end
		end

		local result = {}
		make_json_request(base_url .. "frame-data", "POST", {
			game_id=game_id,
			reward=reward,
			screenshots=last_screenshots
		}, result)
	end

	frame_number = frame_number + 1

	if race_ended() then
		savestate.load(state_file)
	end

	emu.frameadvance()
end
