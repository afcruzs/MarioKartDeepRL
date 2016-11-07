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
agent = QLearning()

@app.route('/game-id', methods = ['POST'])
def generate_game_id():
    return make_response(jsonify({
        'id': uuid.uuid4()
    }))

@app.route('/request-action', methods = ['POST'])
def request_action():
    params = request.get_json()

    game_id, reward, screenshots = params["game_id"], float(params["reward"]), params["screenshots"]
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
    action = agent.choose_action(np.array([processed_images]))[0]
    return make_response(jsonify({'action': action}))

if __name__ == '__main__':
    app.run(host='localhost', debug=True)
