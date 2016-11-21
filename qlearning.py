from scipy.misc import imresize
import numpy as np
import itertools
import random
import utils
from keras.models import Sequential
from keras.layers import Convolution2D, Dense, Flatten
from keras.optimizers import RMSprop
from keras.backend import image_dim_ordering, set_image_dim_ordering
from keras.initializations import normal
from collections import deque
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
    def __init__(self, frame_size, history_length, minibatch_size,
        replay_memory_size, discount_factor, learning_rate,
        gradient_momentum, squared_momentum, min_squared_gradient,
        initial_exploration, final_exploration, final_exploration_frame,
        replay_start_size, max_no_op, target_network_update_frequency, steps,
        exploration_rate, exploration_decay):
    
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
        self.replay_memory_sizetart_size = replay_start_size
        self.max_no_op = max_no_op
        self.steps = steps
        self.exploration_rate = exploration_rate
        self.exploration_decay = exploration_decay
        self.target_network_update_frequency = target_network_update_frequency        


class QLearning(object):
    def __init__(self, session, frame_size=(84, 84), history_length=4, minibatch_size=32,
        replay_memory_size=100000, discount_factor=0.99, learning_rate=0.00025,
        gradient_momentum=0.95, squared_momentum=0.95, min_squared_gradient=0.01,
        initial_exploration=1, final_exploration=0.1, final_exploration_frame=1000000,
        replay_start_size=100, max_no_op=30, target_network_update_frequency=5000):

        

        '''
        self.parameters.frame_size = frame_size
        self.parameters.history_length = history_length
        self.parameters.minibatch_size = minibatch_size
        self.parameters.replay_memory_size = replay_memory_size
        self.parameters.discount_factor = discount_factor
        self.parameters.learning_rate = learning_rate
        self.parameters.gradient_momentum = gradient_momentum
        self.parameters.squared_momentum = squared_momentum
        self.parameters.min_squared_gradient = min_squared_gradient
        self.parameters.initial_exploration = initial_exploration
        self.parameters.final_exploration = final_exploration
        self.parameters.final_exploration_frame = final_exploration_frame
        self.parameters.replay_start_size = replay_start_size
        self.parameters.max_no_op = max_no_op
        '''
        self.session = session
        self.replay_memory = deque()
        steps = 0
        exploration_rate = initial_exploration
        exploration_decay = (1.0 * initial_exploration - final_exploration) / final_exploration_frame

        self.parameters = QLearningParameters(frame_size, history_length, minibatch_size,
        replay_memory_size, discount_factor, learning_rate,
        gradient_momentum, squared_momentum, min_squared_gradient,
        initial_exploration, final_exploration, final_exploration_frame,
        replay_start_size, max_no_op, target_network_update_frequency, steps,
        exploration_rate, exploration_decay)
        

        self.model = self._create_model()
        self.delayed_model = self._create_model()
        copy_weights(self.model, self.delayed_model)

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

        model.compile(RMSprop(lr=self.parameters.learning_rate), 'mse')

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
        np.save(replay_memory_file_name, self.replay_memory)
        with open(parameters_file_name, 'wb') as output:
            pickle.dump(self.parameters, output)


    def load_agent(self):
        full_path = self.session.get_current_path()
        model_file_name = full_path + '/model.h5'
        delayed_model_file_name = full_path + '/delayed_model.h5'
        replay_memory_file_name = full_path + '/replay_memory.npy'
        parameters_file_name = full_path + '/parameters.pkl'

        print "Loading model weights..."
        self.model.load_weights(model_file_name)
        print "Loading delayed model weights..."
        self.delayed_model.load_weights(delayed_model_file_name)
        print "Loading replayed memory..."
        self.replay_memory = np.load(replay_memory_file_name)
        print "Loading parameters..."
        with open(parameters_file_name, 'rb') as input_file:
            self.parameters = pickle.load(input_file)

    def train_step(self):
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
        print "Exploration rate in iteration %d is %f" % (self.parameters.steps, self.exploration_rate)

        self.parameters.steps += 1

        if self.parameters.steps % self.parameters.target_network_update_frequency == 0:
            copy_weights(self.model, self.delayed_model)

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
        if train and random.uniform(0,1) <= self.parameters.exploration_rate:
            print "The action is randomly chosen"
            result = [random.choice(xrange(len(possible_actions))) for _ in xrange(processed_images.shape[0])]
        else:
            print "The action is NOT randomly chosen"
            result = [np.argmax(i) for i in self.model.predict(processed_images)]

        self.exploration_rate = max(self.parameters.final_exploration, 
            self.parameters.exploration_rate - self.parameters.exploration_decay)
        return result
