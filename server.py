from flask import Flask, render_template, request
from flask import Flask, jsonify
from flask import abort, make_response
from flask import Flask, current_app
from flask import send_from_directory
import base64
from datetime import datetime
import uuid
import random
import numpy as np
from preprocessing import preprocess_map
from PIL import Image
from cStringIO import StringIO
from qlearning import QLearning, possible_actions

app = Flask(__name__)
agent = QLearning()
last_action_request = None
minimaps = {name : (preprocess_map(filename), average_time) for name, filename, average_time in
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

@app.route('/save-model', methods = ['POST'])
def save_model():
    params = request.get_json()
    file_name = params["file_name"]
    agent.save_model(file_name)
    return make_response(jsonify({}))

@app.route('/request-action', methods = ['POST'])
def request_action():
    global last_action_request

    params = request.get_json()

    game_id, reward, screenshots, train, is_terminal_state = (
        params["game_id"], float(params["reward"]), params["screenshots"],
        params["train"], bool(params["race_ended"]))

    now = datetime.now()

    images = []
    for i, screenshot in enumerate(screenshots):
        s = StringIO(base64.decodestring(screenshot))
        images.append(np.array(Image.open(s)))
        s.close()

    if len(images) != agent.history_length:
        images = [EMPTY_FRAME] * (agent.history_length - len(images)) + images

    processed_images = agent.preprocess_images(images)
    if train and last_action_request is not None and not is_terminal_state:
        last_state, last_action = last_action_request
        agent.store_in_replay_memory(last_state, last_action, reward,
            processed_images, is_terminal_state)
        agent.train_step()

    action_index = agent.choose_action(np.array([processed_images]), train)[0]
    last_action_request = (processed_images, action_index)
    action = possible_actions[action_index]

    return make_response(jsonify({'action': action}))

if __name__ == '__main__':
    app.run(host='localhost', debug=True)
