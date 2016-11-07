from scipy.misc import imresize
import numpy as np
import itertools

from keras.models import Sequential
from keras.layers import Convolution2D, Dense, Flatten
from keras.optimizers import RMSprop
from keras.backend import image_dim_ordering, set_image_dim_ordering
from keras.initializations import normal

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
        replay_start_size=100, max_no_op=30):
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

        init = lambda shape, name: normal(shape, scale=1.0, name=name)
        model = Sequential()
        model.add(Convolution2D(32, 8, 8, subsample=(4, 4), activation='relu', init=init,
            input_shape=(self.history_length, self.frame_size[0], self.frame_size[1])))
        model.add(Convolution2D(64, 4, 4, subsample=(2, 2), activation='relu', init=init))
        model.add(Convolution2D(64, 3, 3, subsample=(1, 1), activation='relu', init=init))
        model.add(Flatten())
        model.add(Dense(512, activation='relu', init=init))
        model.add(Dense(len(possible_actions), activation='softmax', init=init))

        model.compile(RMSprop(lr=self.learning_rate), 'mse')

        self.model = model

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

    def choose_action(self, processed_images):
        predictions = self.model.predict(processed_images)
        print predictions
        return [possible_actions[np.argmax(i)] for i in predictions]
