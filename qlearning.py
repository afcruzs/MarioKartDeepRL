from scipy.misc import imresize
import numpy as np
import itertools
import random
from keras.models import Sequential
from keras.layers import Convolution2D, Dense, Flatten
from keras.optimizers import RMSprop
from keras.backend import image_dim_ordering, set_image_dim_ordering
from keras.initializations import normal
from collections import deque

back_button_actions = [ [], ['L'], ['R'], ['L', 'R'] ]
main_button_actions = [ [], ['A'], ['B'] ]
arrow_button_actions = [ [], ['Up'], ['Right'], ['Down'], ['Left'] ]

possible_actions = [
    { button: 1 for buttons in action for button in buttons  }
    for action in
        itertools.product(back_button_actions, main_button_actions, arrow_button_actions)
]

if image_dim_ordering() != 'th':
    set_image_dim_ordering('th')

class QLearning(object):
    def __init__(self, frame_size=(84, 84), history_length=4, minibatch_size=32,
        replay_memory_size=1000, discount_factor=0.99, learning_rate=0.00025,
        gradient_momentum=0.95, squared_momentum=0.95, min_squared_gradient=0.01,
        initial_exploration=1, final_exploration=0.1, final_exploration_frame=10000,
        replay_start_size=100, max_no_op=30, pretrained_model=None):
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
        self.replay_start_size = replay_start_size
        self.max_no_op = max_no_op
        self.replay_memory = deque()
        self.steps = 0
        self.exploration_rate = self.initial_exploration
        self.exploration_decay = (1.0 * self.initial_exploration - self.final_exploration) / self.final_exploration_frame

        init = lambda shape, name: normal(shape, scale=0.0001, name=name)
        model = Sequential()
        model.add(Convolution2D(32, 8, 8, subsample=(4, 4), activation='relu', init=init,
            input_shape=(self.history_length, self.frame_size[0], self.frame_size[1])))
        model.add(Convolution2D(64, 4, 4, subsample=(2, 2), activation='relu', init=init))
        model.add(Convolution2D(64, 3, 3, subsample=(1, 1), activation='relu', init=init))
        model.add(Flatten())
        model.add(Dense(512, activation='relu', init=init))
        model.add(Dense(len(possible_actions), activation='linear', init=init))

        model.compile(RMSprop(lr=self.learning_rate), 'mse')

        self.model = model

        if pretrained_model:
            print "Loading weights..."
            self.model.load_weights(pretrained_model)

    def save_model(self, file_name):
        self.model.save_weights(file_name + ".h5")

    def train_step(self):
        sample = self.sample_replay_memory(self.minibatch_size)
        Y = np.zeros((len(sample), len(possible_actions)))
        X_old_states = np.zeros((len(sample), self.history_length,
            self.frame_size[0], self.frame_size[1]))
        X_new_states = np.zeros((len(sample), self.history_length,
            self.frame_size[0], self.frame_size[1]))

        for i in xrange(len(sample)):
            state, action, reward, new_state, is_terminal = sample[i]

            X_old_states[i:i + 1] = state
            X_new_states[i:i + 1] = new_state

        old_predictions = self.model.predict(X_old_states)
        new_predictions = self.model.predict(X_new_states)

        for i in xrange(len(sample)):
            state, action, reward, new_state, is_terminal = sample[i]

            Y[i] = old_predictions[i]

            if is_terminal:
                Y[i, action] = reward
            else:
                Y[i, action] = reward + self.discount_factor * np.max(new_predictions[i])

        loss = self.model.train_on_batch(X_old_states, Y)
        print "Loss in iteration %d is %f" % (self.steps, loss)
        print "Exploration rate in iteration %d is %f" % (self.steps, self.exploration_rate)

        self.steps += 1
        if self.steps % 1000 == 0:
            print "Saving weights"
            self.save_model("weights/weights_%d" % (self.steps,))

    def store_in_replay_memory(self, state, action, reward, new_state, is_terminal):
        if len(self.replay_memory) == self.replay_memory_size:
            self.replay_memory.popleft()
        else:
            self.replay_memory.append((state, action, reward, new_state, is_terminal))

    def sample_replay_memory(self, size):
        sample = np.random.choice(xrange(len(self.replay_memory)),
            min(len(self.replay_memory), size), replace=False)
        return [self.replay_memory[i] for i in sample]

    def preprocess_images(self, images):
        if len(images) != self.history_length:
            raise Exception(
                "Invalid number of frames. Expected %d, got %d" % (self.history_length, len(images)))

        result = np.zeros((self.history_length, self.frame_size[0], self.frame_size[1]))
        for i, image in enumerate(images):
            resized_image = imresize(image, self.frame_size)
            # Assume RGB
            result[i] = (0.2126 * resized_image[:, :, 0] +
                         0.7152 * resized_image[:, :, 1] +
                         0.0722 * resized_image[:, :, 2])

        return result

    def choose_action(self, processed_images, train):
        if train and random.uniform(0,1) <= self.exploration_rate:
            print "The action is randomly chosen"
            result = [random.choice(xrange(len(possible_actions))) for _ in xrange(processed_images.shape[0])]
        else:
            print "The action is NOT randomly chosen"
            result = [np.argmax(i) for i in self.model.predict(processed_images)]

        self.exploration_rate = max(self.final_exploration, self.exploration_rate - self.exploration_decay)
        return result
