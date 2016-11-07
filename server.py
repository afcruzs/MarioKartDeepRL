from flask import Flask, render_template, request
from flask import Flask, jsonify
from flask import abort, make_response
from flask import Flask, current_app
from flask import send_from_directory
import base64
from datetime import datetime
import uuid
import itertools
import random

app = Flask(__name__)


back_button_actions = [ [], ['L'], ['R'], ['L', 'R'] ]
main_button_actions = [ [], ['A'], ['B'] ]
arrow_button_actions = [ [], ['Up'], ['Right'], ['Down'], ['Left'] ]

possible_actions = [
    { button: 1 for buttons in action for button in buttons  }
    for action in
        itertools.product(back_button_actions, main_button_actions, arrow_button_actions)
]

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

    for i, screenshot in enumerate(screenshots):
        file_name = "results/%s_%s_%d.png" % (game_id, now.strftime("%Y%m%d_%H%M%S"), i)
        with open(file_name, 'wb') as f:
            f.write(base64.decodestring(screenshot))

    return make_response(jsonify({'action': random.choice(possible_actions)}))

@app.route('/emulator')
def emulator():
    return current_app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(host='localhost', debug=True)
