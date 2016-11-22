from scipy.misc import imresize
import numpy as np
import itertools
import random
import utils
from keras.models import Sequential
from keras.layers import Convolution2D, Dense, Flatten
from keras.optimizers import Adam
from keras.backend import image_dim_ordering, set_image_dim_ordering
from keras.initializations import normal
from collections import deque
from datetime import datetime
import pickle

possible_actions = [
    {}, # No op
    { 'A': 1 }, # Accelerate, forward
    { 'A': 1, 'Right': 1 }, # Accelerate, right
    { 'A': 1, 'Left': 1 }, # Accelerate, left
    { 'B': 1, 'Down': 1 }, # Break and reverse
    { 'A': 1, 'Right': 1, 'R': 1 }, # Drift right
    { 'A': 1, 'Left': 1, 'R': 1 }, # Drift left
    { 'A': 1, 'L': 1 }, # Accelerate, forward, power
    { 'A': 1, 'Right': 1, 'L': 1 }, # Accelerate, right, power
    { 'A': 1, 'Left': 1, 'L': 1 }, # Accelerate, left, power
    { 'B': 1, 'Down': 1, 'L': 1 }, # Break and reverse, power
    { 'A': 1, 'Right': 1, 'R': 1, 'L': 1 }, # Drift right, power
    { 'A': 1, 'Left': 1, 'R': 1, 'L': 1 } # Drift left, power
]

if image_dim_ordering() != 'th':
    set_image_dim_ordering('th')

def copy_weights(source_model, dest_model):
    for i, layer in enumerate(source_model.layers):
        dest_model.layers[i].set_weights(layer.get_weights())

class QLearningParameters(object):
    def __init__(self, frame_size=(84, 84), history_length=4, minibatch_size=32,
        replay_memory_size=80000, discount_factor=0.99, learning_rate=0.00025,
        gradient_momentum=0.95, squared_momentum=0.95, min_squared_gradient=0.01,
        initial_exploration=1, final_exploration=0.1, final_exploration_frame=1000000,
        replay_start_size=50000, target_network_update_frequency=5000):

        self.frame_size = frame_size
        self.history_length = history_length
        self.minibatch_size = minibatch_size
        self.replay_memory_size = replay_memory_size
        self.discount_factor = discount_factor
        self.learning_rate = learning_rate
        self.gradient_momentum = gradient_momentum
        self.squared_momentum = squared_momentum
        self.min_squared_gradient = min_squared_gradient
        self.initial_exploration = initial_exploration
        self.final_exploration = final_exploration
        self.final_exploration_frame = final_exploration_frame
        self.replay_memory_start_size = replay_start_size
        self.steps = 0
        self.exploration_rate = initial_exploration
        self.exploration_decay = (1.0 * initial_exploration - final_exploration) / final_exploration_frame
        self.target_network_update_frequency = target_network_update_frequency

class QLearning(object):
    def __init__(self, session, parameters):
        self.session = session
        self.replay_memory = deque()
        self.parameters = parameters

        self.model = self._create_model()
        self.delayed_model = self._create_model()
        copy_weights(self.model, self.delayed_model)

        self.episode_accumulated_reward = 0.0
        self.episode_accumulated_loss = 0
        self.episode_steps = 0

    def _create_model(self):
        init = lambda shape, name: normal(shape, name=name)
        model = Sequential()
        model.add(Convolution2D(32, 8, 8, subsample=(4, 4), activation='relu', init=init,
            input_shape=(self.parameters.history_length, self.parameters.frame_size[0], self.parameters.frame_size[1])))
        model.add(Convolution2D(64, 4, 4, subsample=(2, 2), activation='relu', init=init))
        model.add(Convolution2D(64, 3, 3, subsample=(1, 1), activation='relu', init=init))
        model.add(Flatten())
        model.add(Dense(512, activation='relu', init=init))
        model.add(Dense(len(possible_actions), activation='linear', init=init))

        model.compile(
            Adam(lr=self.parameters.learning_rate,
                 beta_1=self.parameters.gradient_momentum,
                 beta_2=self.parameters.squared_momentum,
                 epsilon=self.parameters.min_squared_gradient), 'mse')

        return model

    def advance_episode(self):
        self.session.advance_episode()

    def save_agent(self):
        full_path = self.session.get_current_path()

        model_file_name = full_path + '/model.h5'
        delayed_model_file_name = full_path + '/delayed_model.h5'
        replay_memory_file_name = full_path + '/replay_memory.npy'
        parameters_file_name = full_path + '/parameters.pkl'

        self.model.save_weights(model_file_name)
        self.delayed_model.save_weights(delayed_model_file_name)
        self.save_replay_memory(replay_memory_file_name)
        with open(parameters_file_name, 'wb') as output:
            pickle.dump(self.parameters, output)

    def save_replay_memory(self, replay_memory_file_name):
        np.save(replay_memory_file_name, self.replay_memory)

    def load_replay_memory(self, replay_memory_file_name):
        print "Loading replay memory...", replay_memory_file_name
        self.replay_memory = deque(np.load(replay_memory_file_name))

    def load_agent(self):
        full_path = self.session.get_current_path()
        model_file_name = full_path + '/model.h5'
        delayed_model_file_name = full_path + '/delayed_model.h5'
        replay_memory_file_name = full_path + '/replay_memory.npy'
        parameters_file_name    = full_path + '/parameters.pkl'

        print "Loading model weights..."
        self.model.load_weights(model_file_name)
        print "Loading delayed model weights..."
        self.delayed_model.load_weights(delayed_model_file_name)
        print "Loading replayed memory..."
        self.load_replay_memory(replay_memory_file_name)
        print "Loading parameters..."
        with open(parameters_file_name, 'rb') as input_file:
            self.parameters = pickle.load(input_file)

    def is_initializing_replay_memory(self):
        return len(self.replay_memory) < self.parameters.replay_memory_start_size

    def record_experience(self, state, action, reward, new_state, is_terminal):
        self.store_in_replay_memory(state, action, reward, new_state, is_terminal)
        if self.is_initializing_replay_memory():
            print "Collecting initial experiences"
            return

        # Check if we just filled the initial replay memory
        if self.parameters.steps == 0:
            self.save_replay_memory(self.session.get_session_path() + "/initial-replay-memory.npy")

        self.episode_accumulated_reward += reward
        self.episode_steps += 1.0

        loss = self.train_step()
        self.episode_accumulated_loss += loss

        if is_terminal:
            average_reward = self.episode_accumulated_reward / self.episode_steps
            average_loss = self.episode_accumulated_loss / self.episode_steps

            self.session.append_reward(average_reward)
            self.session.append_loss(average_loss)

            self.episode_accumulated_reward = 0
            self.episode_steps = 0
            self.episode_accumulated_loss = 0

            self.save_agent()
            self.advance_episode()

            now = datetime.now()

            print "%s: New episode" % (now.strftime("%Y%m%d_%H%M%S"),)

    def train_step(self):
        self.parameters.steps += 1
        sample = self.sample_replay_memory(self.parameters.minibatch_size)
        Y = np.zeros((len(sample), len(possible_actions)))
        X_old_states = np.zeros((len(sample), self.parameters.history_length,
            self.parameters.frame_size[0], self.parameters.frame_size[1]))
        X_new_states = np.zeros((len(sample), self.parameters.history_length,
            self.parameters.frame_size[0], self.parameters.frame_size[1]))

        for i in xrange(len(sample)):
            state, action, reward, new_state, is_terminal = sample[i]

            X_old_states[i:i + 1] = state
            X_new_states[i:i + 1] = new_state

        old_predictions = self.model.predict(X_old_states)
        new_predictions = self.delayed_model.predict(X_new_states)

        for i in xrange(len(sample)):
            state, action, reward, new_state, is_terminal = sample[i]

            Y[i] = old_predictions[i]

            if is_terminal:
                Y[i, action] = reward
            else:
                Y[i, action] = reward + self.parameters.discount_factor * np.max(new_predictions[i])

        loss = self.model.train_on_batch(X_old_states, Y)
        print "Loss in iteration %d is %f" % (self.parameters.steps, loss)
        print "Exploration rate in iteration %d is %f" % (self.parameters.steps, self.parameters.exploration_rate)

        if self.parameters.steps % self.parameters.target_network_update_frequency == 0:
            copy_weights(self.model, self.delayed_model)

        return loss

    def store_in_replay_memory(self, state, action, reward, new_state, is_terminal):
        if len(self.replay_memory) == self.parameters.replay_memory_size:
            self.replay_memory.popleft()
        else:
            self.replay_memory.append((state, action, reward, new_state, is_terminal))

    def sample_replay_memory(self, size):
        return utils.sample_without_replacement(self.replay_memory, min(len(self.replay_memory), size))

    def preprocess_images(self, images):
        if len(images) != self.parameters.history_length:
            raise Exception(
                "Invalid number of frames. Expected %d, got %d" % (self.parameters.history_length, len(images)))

        result = np.zeros((self.parameters.history_length, self.parameters.frame_size[0], self.parameters.frame_size[1]))
        for i, image in enumerate(images):
            resized_image = imresize(image, self.parameters.frame_size)
            # Assume RGB
            result[i] = (0.2126 * resized_image[:, :, 0] +
                         0.7152 * resized_image[:, :, 1] +
                         0.0722 * resized_image[:, :, 2])

        return result

    def choose_action(self, processed_images, train):
        if train and (self.is_initializing_replay_memory() or
                random.uniform(0,1) <= self.parameters.exploration_rate):
            result = [random.choice(xrange(len(possible_actions))) for _ in xrange(processed_images.shape[0])]
            print "Random action:",
        else:
            result = [np.argmax(i) for i in self.model.predict(processed_images)]
            print "Best action:",
        print [possible_actions[i].keys() for i in result]

        if train and not self.is_initializing_replay_memory():
            self.parameters.exploration_rate = max(self.parameters.final_exploration,
                self.parameters.exploration_rate - self.parameters.exploration_decay)
        return result
