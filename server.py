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
from cStringIO import StringIO
from qlearning import QLearning, QLearningParameters, possible_actions
from session import Session, LOAD_SESSION, NEW_SESSION, create_dir, SESSION_PATH
import argparse

def create_agent(session_mode, episodes, session_name, replay_memory_filepath):
    if not session_name:
        now = datetime.now()
        session_name = now.strftime("%Y%m%d_%H%M%S")

    new_session_path = SESSION_PATH + session_name
    if session_mode == NEW_SESSION:
        print "Creating session:", new_session_path
        if not create_dir(new_session_path): # If true, the dir is created
            raise Exception("A session called %s already exists." % session_name)
        session = Session(episodes, new_session_path)
        session.create_logs_directories()
    else:
        print "Loading session:", new_session_path
        if not os.path.exists(new_session_path):
            raise Exception("Session %s does not exist." % new_session_path)
        session = Session(episodes, new_session_path)

    agent = QLearning(session, QLearningParameters())
    if replay_memory_filepath:
        agent.load_replay_memory(replay_memory_filepath)

    if session_mode == LOAD_SESSION:
        agent.load_agent()

    return agent

parser = argparse.ArgumentParser(description='Parse session parameters')
parser.add_argument("--mode", default=NEW_SESSION, type=str)
parser.add_argument("--episodes", default='4', type=int)
parser.add_argument("--session_name", required=False)
parser.add_argument("--replay_memory_filepath", required=False)

args = parser.parse_args()
if args.replay_memory_filepath and args.mode == LOAD_SESSION:
    raise Exception("Error, trying to load the replay memory and load an existing session")

if args.mode == LOAD_SESSION and not args.session_name:
    raise Exception("Load session provided but no session name is provided")

agent = create_agent(args.mode, args.episodes, args.session_name, args.replay_memory_filepath)
app = Flask(__name__)
accumulated_reward = 0.0
number_of_steps = 0
accumulated_loss = 0

last_action_request = None
minimaps = {
    name: (preprocess_map(filename), average_time) for name, filename, average_time in
        [('peach_circuit', 'tracks/peach_circuit.png', 30 * 100)]
}

EMPTY_FRAME = np.zeros((240, 160, 3))

@app.route('/get-minimap', methods = ['POST'])
def get_minimap():
    params = request.get_json()
    minimap_name = params['minimap_name']
    matrix, average_time = minimaps[minimap_name]
    max_steps = np.max(matrix)
    return make_response(jsonify({
        "matrix": matrix,
        "average_time": average_time,
        "max_steps": max_steps
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
    global last_action_request, accumulated_reward, number_of_steps, accumulated_loss

    params = request.get_json()

    game_id, reward, screenshots, train, is_terminal_state = (
        params["game_id"], float(params["reward"]), params["screenshots"],
        params["train"], bool(params["race_ended"]))

    accumulated_reward += reward
    number_of_steps += 1.0

    images = []
    for i, screenshot in enumerate(screenshots):
        s = StringIO(base64.decodestring(screenshot))
        images.append(np.array(Image.open(s)))
        s.close()

    if len(images) != agent.parameters.history_length:
        images += [EMPTY_FRAME] * (agent.parameters.history_length - len(images))

    now = datetime.now()

    processed_images = agent.preprocess_images(images)
    if train and last_action_request is not None:
        last_state, last_action = last_action_request
        agent.store_in_replay_memory(last_state, last_action, reward,
            processed_images, is_terminal_state)
        loss = agent.train_step()
        accumulated_loss += loss

    action_index = agent.choose_action(np.array([processed_images]), train)[0]
    last_action_request = None if is_terminal_state else (processed_images, action_index)
    action = possible_actions[action_index]


    if is_terminal_state:
        agent.save_agent()
        agent.advance_episode()

        average_reward = accumulated_reward / number_of_steps
        average_loss = accumulated_loss / (number_of_steps - 1)

        agent.session.append_reward(average_reward)
        agent.session.append_loss(average_loss)

        accumulated_reward = 0
        number_of_steps = 0
        accumulated_loss = 0

        print "%s: New episode" % (now.strftime("%Y%m%d_%H%M%S"),)

    return make_response(jsonify({'action': action}))

if __name__ == '__main__':
    app.run(host='localhost', debug=True, use_reloader=False)
