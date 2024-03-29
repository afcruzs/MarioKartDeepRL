from flask import Flask, render_template, request
from flask import Flask, jsonify
from flask import abort, make_response
from flask import Flask, current_app
from flask import send_from_directory
import base64
import os
from datetime import datetime
import uuid
import random
import numpy as np
from preprocessing import preprocess_map
from PIL import Image
from io import BytesIO
from qlearning import QLearning, QLearningParameters, possible_actions
from session import Session, LOAD_SESSION, NEW_SESSION, create_dir, SESSION_PATH, LOAD_MODEL, LOAD_SESSION_NO_REPLAY
import argparse
import os.path

def create_agent(session_mode, saved_episodes, session_name, replay_memory_filepath,
    model_filepath, session_base_path):
    if not session_name:
        now = datetime.now()
        session_name = now.strftime("%Y%m%d_%H%M%S")

    new_session_path = os.path.join(session_base_path, session_name)

    if session_mode == LOAD_MODEL and not os.path.exists(model_filepath):
        raise Exception("Session %s does not exist." % new_session_path)

    if session_mode == NEW_SESSION and os.path.exists(new_session_path):
        raise Exception("A session called %s already exists." % session_name)

    session = Session(saved_episodes, new_session_path)
    agent = QLearning(session, QLearningParameters())

    if session_mode == LOAD_MODEL:
        if not model_filepath:
            raise Exception("The model file path is not specified")

        agent.model.load_weights(model_filepath)
    elif session_mode == LOAD_SESSION or session_mode == LOAD_SESSION_NO_REPLAY:
        print("Loading session:", new_session_path)
        load_replay_memory = (session_mode != LOAD_SESSION_NO_REPLAY)
        agent.load_agent(load_replay_memory=load_replay_memory)
    elif session_mode != NEW_SESSION:
        raise Exception("Invalid session mode")

    if replay_memory_filepath:
        agent.load_replay_memory(replay_memory_filepath)

    return agent, session

parser = argparse.ArgumentParser(description='Parse session parameters')
parser.add_argument("--mode", default=NEW_SESSION, type=str)
parser.add_argument("--saved_episodes", default='4', type=int)
parser.add_argument("--session_name", required=False)
parser.add_argument("--replay_memory_filepath", required=False)
parser.add_argument("--model_filepath", required=False)
parser.add_argument("--session_base_path", type=str, default=SESSION_PATH,
    required=False)
parser.add_argument("--host", type=str, default="0.0.0.0")
parser.add_argument("--port", type=int, default=5000)

args = parser.parse_args()
if args.replay_memory_filepath and args.mode == LOAD_SESSION:
    raise Exception("Error, trying to load the replay memory and load an existing session")

if args.mode == LOAD_SESSION and not args.session_name:
    raise Exception("Load session provided but no session name is provided")

EMPTY_FRAME = np.zeros((240, 160, 3))

last_action_request = None
minimaps = {
    name: (preprocess_map(filename), average_time) for name, filename, average_time in
        [('peach_circuit', 'tracks/peach_circuit.png', 30 * 100),
         ('boo_lake', 'tracks/boo_lake.png', 30 * 100),
         ('bowser_castle_2', 'tracks/bowser_castle_2.png', 30 * 100),
         ('mario_circuit', 'tracks/mario_circuit.png', 30 * 100),
         ('cheep_cheep_island', 'tracks/cheep_cheep_island.png', 30 * 100),
         ('luigi_circuit', 'tracks/luigi_circuit.png', 30 * 100),
         ('sky_garden', 'tracks/sky_garden.png', 30 * 100),
         ('sunset_wilds', 'tracks/sunset_wilds.png', 30 * 100),
         ('bowser_castle_1', 'tracks/bowser_castle_1.png', 30 * 100),
         ('shy_guy_beach', 'tracks/shy_guy_beach.png', 30 * 100),
         ('bowser_castle_3', 'tracks/bowser_castle_3.png', 30 * 100),
         ('snow_land', 'tracks/snow_land.png', 30 * 100),
         ('yoshi_desert', 'tracks/yoshi_desert.png', 30 * 100)]


}

agent, session = create_agent(args.mode, args.saved_episodes,
    args.session_name, args.replay_memory_filepath, args.model_filepath,
    args.session_base_path)
app = Flask(__name__)


@app.route('/get-checkpoint-parameters', methods = ['POST'])
def get_checkpoints_parameters():
    return make_response(jsonify({
        'max_time_between_checkpoints': agent.parameters.max_time_between_checkpoints
    }))

@app.route('/get-minimap', methods = ['POST'])
def get_minimap():
    params = request.get_json()
    minimap_name = params['minimap_name']
    matrix, average_time = minimaps[minimap_name]
    max_steps = np.max(matrix)

    return make_response(jsonify({
        "matrix": matrix,
        "average_time": average_time,
        "max_steps": int(max_steps)
    }))

@app.route('/game-id', methods = ['POST'])
def generate_game_id():
    global last_action_request
    last_action_request = None
    return make_response(jsonify({
        'id': uuid.uuid4()
    }))

@app.route('/request-action', methods = ['POST'])
def request_action():
    global last_action_request

    params = request.get_json()
    
    game_id, reward, screenshots, train, is_terminal_state = (
        params["game_id"], float(params["reward"]), params["screenshots"],
        params["train"], bool(params["race_ended"]))

    max_time_between_checkpoints = agent.parameters.max_time_between_checkpoints

    images = []
    for i, screenshot in enumerate(screenshots):
        s = BytesIO(base64.decodestring(screenshot.encode()))
        images.append(np.array(Image.open(s)))
        s.close()

    if len(images) != agent.parameters.history_length:
        images += [EMPTY_FRAME] * (agent.parameters.history_length - len(images))

    processed_images = agent.preprocess_images(images)
    if train and last_action_request is not None:
        last_state, last_action = last_action_request
        agent.record_experience(last_state, last_action, reward, processed_images,
            is_terminal_state)

    action_index = agent.choose_action(np.array([processed_images]), train)[0]
    last_action_request = None if is_terminal_state else (processed_images, action_index)
    action = possible_actions[action_index]

    
    return make_response(jsonify({
        'action': action,
        'max_time_between_checkpoints': max_time_between_checkpoints,
    }))

if __name__ == '__main__':
    with session:
        app.run(host=args.host, port=args.port, debug=True, use_reloader=False,
            passthrough_errors=False)
