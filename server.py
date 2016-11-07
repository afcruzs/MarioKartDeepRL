from flask import Flask, render_template, request
from flask_socketio import SocketIO
from flask_cors import CORS, cross_origin
from flask import Flask, jsonify
from flask import abort, make_response
from flask import Flask, current_app
from flask import send_from_directory
import base64
from datetime import datetime
import uuid


app = Flask(__name__)
CORS(app)

#app.config['SECRET_KEY'] = 'secret!'
#socketio = SocketIO(app)

"""@socketio.on('message')
def handle_message(message):
    send(message)

@socketio.on('json')
def handle_json(json):
    send(json, json=True)

@socketio.on('my event')
def handle_my_custom_event(json):
    emit('my response', json)"""

@app.route('/game-id', methods = ['POST'])
def generate_game_id():
    return make_response(jsonify({
        'id': uuid.uuid4()
    }))

@app.route('/frame-data', methods = ['POST'])
def post_frame_data():
    params = request.get_json()

    game_id, reward, screenshots = params["game_id"], float(params["reward"]), params["screenshots"]
    now = datetime.now()

    for i, screenshot in enumerate(screenshots):
        file_name = "results/%s_%s_%d.png" % (game_id, now.strftime("%Y%m%d_%H%M%S"), i)
        with open(file_name, 'w') as f:
            f.write(base64.decodestring(screenshot))

    return make_response(jsonify({'status': 200}))

@app.route('/emulator')
def emulator():
    return current_app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(host='localhost', debug=True)
