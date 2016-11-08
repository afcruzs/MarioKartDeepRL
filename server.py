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

from PIL import Image
from cStringIO import StringIO
from qlearning import QLearning, possible_actions

app = Flask(__name__)
agent = QLearning(pretrained_model="weights.h5")

@app.route('/game-id', methods = ['POST'])
def generate_game_id():
    return make_response(jsonify({
        'id': uuid.uuid4()
    }))


app.route('/save-model', methods = ['POST'])
def generate_game_id():
    params = request.get_json()
    file_name = params["file_name"]
    agent.save_model(file_name)
    return make_response(jsonify({}))

@app.route('/request-action', methods = ['POST'])
def request_action():
    params = request.get_json()

    game_id, reward, screenshots, train = params["game_id"], float(params["reward"]), params["screenshots"], params["train"]
    reward = float(reward)
    
    now = datetime.now()

    images = []
    for i, screenshot in enumerate(screenshots):
        #file_name = "results/%s_%s_%d.png" % (game_id, now.strftime("%Y%m%d_%H%M%S"), i)
        #with open(file_name, 'wb') as f:
        #    f.write(base64.decodestring(screenshot))
        s = StringIO(base64.decodestring(screenshot))
        images.append(np.array(Image.open(s)))
        s.close()

    processed_images = agent.preprocess_images(images)
    if train and agent.prev_state != None and agent.prev_action != None:
        agent.store_in_replay_memory(agent.prev_state, agent.prev_action, reward, processed_images)
        agent.train_step()


    action_index = agent.choose_action(np.array([processed_images]), train)[0]
    if train:
        agent.prev_action = action_index
        agent.prev_state = processed_images
    action = possible_actions[action_index]

    return make_response(jsonify({'action': action}))

if __name__ == '__main__':
    app.run(host='localhost', debug=True)
