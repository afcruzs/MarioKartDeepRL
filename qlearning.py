from scipy.misc import imresize
import numpy as np
import itertools
import random
import utils
from keras.models import Sequential
from keras.layers import Conv2D, Dense, Flatten
from keras.optimizers import Adam
from keras.backend import image_dim_ordering, set_image_dim_ordering
from keras.initializers import RandomNormal
from utils import CircularBuffer
from datetime import datetime
import pickle
import shutil
from tables import IsDescription, Float32Atom, Int8Col, BoolCol, open_file, Float32Col

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

HDF5_REPLAY_MEMORY_GROUP_NAME = 'replay_memory_group'
HDF5_REPLAY_MEMORY_TABLE_NAME = 'replay_memory_table'

if image_dim_ordering() != 'th':
    set_image_dim_ordering('th')

def copy_weights(source_model, dest_model):
    for i, layer in enumerate(source_model.layers):
        dest_model.layers[i].set_weights(layer.get_weights())

class QLearningParameters(object):
    def __init__(self, frame_size=(84, 84), history_length=1, minibatch_size=32,
        replay_memory_size=100000, discount_factor=0.92, learning_rate=0.00025,
        gradient_momentum=0.95, squared_momentum=0.95, min_squared_gradient=0.01,
        initial_exploration=1, final_exploration=0.1, final_exploration_frame=1000000,
        replay_memory_start_size=80000, target_network_update_frequency=5000, use_color_frames=True,
        max_time_between_checkpoints=2000, final_max_time_between_checkpoints=20000,
        final_checkpoint_frame=1000000):

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
        self.replay_memory_start_size = replay_memory_start_size
        self.steps = 0
        self.episodes = 0
        self.exploration_rate = initial_exploration
        self.exploration_decay = (1.0 * initial_exploration - final_exploration) / final_exploration_frame
        self.target_network_update_frequency = target_network_update_frequency
        self.use_color_frames = use_color_frames
        self.max_time_between_checkpoints = max_time_between_checkpoints
        self.max_time_between_checkpoints_increase = (1.0 * final_max_time_between_checkpoints - max_time_between_checkpoints) / final_checkpoint_frame


class QLearning(object):
    def __init__(self, session, parameters):
        self.session = session
        self.parameters = parameters
        self.replay_memory = CircularBuffer(self.parameters.replay_memory_size)

        self.model = self._create_model()
        self.delayed_model = self._create_model()
        copy_weights(self.model, self.delayed_model)

        self.episode_accumulated_reward = 0.0
        self.episode_accumulated_loss = 0
        self.episode_steps = 0

        self.session.set_episode(self.parameters.episodes)
    
    def _get_frame_channels(self):
        return 3 if self.parameters.use_color_frames else 1

    def _create_model(self):
        channels = self._get_frame_channels()
        
        init = RandomNormal()
        model = Sequential()
        model.add(Conv2D(32, (8, 8), strides=(4, 4), activation='relu', kernel_initializer=init,
            input_shape=(channels * self.parameters.history_length, self.parameters.frame_size[0], self.parameters.frame_size[1])))
        model.add(Conv2D(64, (4, 4), strides=(2, 2), activation='relu', kernel_initializer=init))
        model.add(Conv2D(64, (3, 3), strides=(1, 1), activation='relu', kernel_initializer=init))
        model.add(Flatten())
        model.add(Dense(512, activation='relu', kernel_initializer=init))
        model.add(Dense(len(possible_actions), activation='linear', kernel_initializer=init))

        model.compile(
            Adam(lr=self.parameters.learning_rate,
                 beta_1=self.parameters.gradient_momentum,
                 beta_2=self.parameters.squared_momentum,
                 epsilon=self.parameters.min_squared_gradient), 'mse')

        return model

    def advance_episode(self):
        self.parameters.episodes += 1
        self.session.set_episode(self.parameters.episodes)

    def save_agent(self):
        full_path = self.session.get_current_path()
        print("Saving agent state to", full_path)

        model_file_name = full_path + '/model.h5'
        delayed_model_file_name = full_path + '/delayed_model.h5'
        replay_memory_file_name = full_path + '/replay_memory.h5'
        parameters_file_name = full_path + '/parameters.pkl'

        self.model.save_weights(model_file_name)
        self.delayed_model.save_weights(delayed_model_file_name)
        self.save_replay_memory(replay_memory_file_name)
        with open(parameters_file_name, 'wb') as output:
            pickle.dump(self.parameters, output)

        print("Saving episode folder information")
        episode_file_name = self.session.get_session_path() + '/episode.txt'
        with open(episode_file_name, 'w') as f:
            f.write(str(self.parameters.episodes) + '\n')

        print("Copying weights to global folder")

        episode_weights_dir = self.session.get_episode_weights_directory(self.parameters.episodes) + '/'
        shutil.copy(model_file_name, episode_weights_dir)
        shutil.copy(delayed_model_file_name, episode_weights_dir)
        shutil.copy(parameters_file_name, episode_weights_dir)

        print("Agent state saved to", full_path)

    def save_replay_memory(self, replay_memory_file_name):
        print("%s: Saving replay memory to %s" % (datetime.now(), replay_memory_file_name))
        channels = self._get_frame_channels()
        state_shape = (channels * self.parameters.history_length, *self.parameters.frame_size)

        memory_sample_cols = {
            'state': Float32Col(shape=state_shape), 
            'new_state': Float32Col(shape=state_shape),
            'action': Int8Col(),
            'reward': Float32Col(),
            'is_terminal': BoolCol()
        }


        with open_file(replay_memory_file_name, mode="w") as h5file:
            group = h5file.create_group('/', HDF5_REPLAY_MEMORY_GROUP_NAME, 'Replay Memory')
            table = h5file.create_table(group, HDF5_REPLAY_MEMORY_TABLE_NAME, memory_sample_cols, 'Replay Memory Sample')
            row = table.row

            for state, action, reward, new_state, is_terminal in self.replay_memory:
                row['state'] = state
                row['new_state'] = new_state
                row['action'] = action
                row['reward'] = reward
                row['is_terminal'] = is_terminal

                row.append()

        print("%s: Replay memory saved to %s" % (datetime.now(), replay_memory_file_name))

    def load_replay_memory(self, replay_memory_file_name):
        print("%s: Loading replay memory from %s" % (datetime.now(), replay_memory_file_name))
        self.replay_memory = CircularBuffer(self.parameters.replay_memory_size)

        with open_file(replay_memory_file_name, mode="r") as h5file:
            group = h5file.root.__getattr__(HDF5_REPLAY_MEMORY_GROUP_NAME)
            table = group.__getattr__(HDF5_REPLAY_MEMORY_TABLE_NAME)

            for row in table:
                state = row['state']
                new_state = row['new_state']
                action = row['action']
                reward = row['reward']
                is_terminal = row['is_terminal']

                self.store_in_replay_memory(state, action, reward, new_state, is_terminal)
                
        print("%s: Replay memory loaded from %s" % (datetime.now(), replay_memory_file_name))
        print("Replay memory size: %d" % (len(self.replay_memory),))

    def load_agent(self, load_replay_memory=True):
        print("Locating episode")
        episode_file_name = self.session.get_session_path() + '/episode.txt'
        episode = None
        with open(episode_file_name, 'r') as input_file:
            episode = int(input_file.readline().strip())

        self.session.set_episode(episode)

        full_path = self.session.get_current_path()
        model_file_name = full_path + '/model.h5'
        delayed_model_file_name = full_path + '/delayed_model.h5'
        replay_memory_file_name = full_path + '/replay_memory.h5'
        parameters_file_name    = full_path + '/parameters.pkl'

        print("Loading agent from", full_path)

        print("Loading parameters...")
        with open(parameters_file_name, 'rb') as input_file:
            self.parameters = pickle.load(input_file)

        self.session.set_episode(self.parameters.episodes)
        print("Current episode is:", self.parameters.episodes)

        print("Loading model weights...")
        self.model.load_weights(model_file_name)
        print("Loading delayed model weights...")
        self.delayed_model.load_weights(delayed_model_file_name)

        if load_replay_memory:
            self.load_replay_memory(replay_memory_file_name)
        else:
            print("Replay memory load skipped")

        self.advance_episode()

        print("Agent loaded from", full_path)

    def is_initializing_replay_memory(self):
        return len(self.replay_memory) < self.parameters.replay_memory_start_size

    def record_experience(self, state, action, reward, new_state, is_terminal):
        self.store_in_replay_memory(state, action, reward, new_state, is_terminal)
        if self.is_initializing_replay_memory():
            print("Collecting initial experiences (%d / %d)" % (len(self.replay_memory), self.parameters.replay_memory_start_size))
            return

        # Check if we just filled the initial replay memory
        if self.parameters.steps == 0:
            print("Saving initial replay memory...")
            self.save_replay_memory(self.session.get_session_path() + "/initial-replay-memory.h5")

        self.episode_accumulated_reward += reward
        self.episode_steps += 1.0

        loss = self.train_step()
        self.episode_accumulated_loss += loss

        average_reward = self.episode_accumulated_reward / self.episode_steps
        average_loss = self.episode_accumulated_loss / self.episode_steps
        score = self.episode_accumulated_reward
        episode_steps = self.episode_steps
        episode = self.parameters.episodes
        global_steps = self.parameters.steps

        print("\nEpisode %d. Global step: %d. Episode step: %d" % (episode, global_steps,
            episode_steps))
        print("Cumulative reward: %f. Average: %f. Current reward: %f" % (score, average_reward, reward))
        print("Loss is %f (Average: %f. Cumulative: %f)" % (loss, average_loss,
            self.episode_accumulated_loss))
        print("Exploration rate is %f" % (self.parameters.exploration_rate, ))

        if is_terminal:
            print(("%s: Episode %d finished. Score: %f. Average reward: %f. Average loss: %f. " +
                "Episode steps: %f") %
                (datetime.now().strftime("%Y%m%d_%H%M%S"), episode, score, average_reward,
                average_loss, episode_steps))

            self.session.save_episode_results(reward=average_reward, score=score, loss=average_loss,
                episode_steps=episode_steps)

            self.episode_accumulated_reward = 0
            self.episode_steps = 0
            self.episode_accumulated_loss = 0

            self.save_agent()
            self.advance_episode()

            print("%s: Episode %d saved" % (datetime.now().strftime("%Y%m%d_%H%M%S"), episode))

    def train_step(self):
        self.parameters.steps += 1
        sample = self.sample_replay_memory(self.parameters.minibatch_size)
        channels = self._get_frame_channels()

        Y = np.zeros((len(sample), len(possible_actions)))
        X_old_states = np.zeros((len(sample), channels * self.parameters.history_length,
            self.parameters.frame_size[0], self.parameters.frame_size[1]))
        X_new_states = np.zeros((len(sample), channels * self.parameters.history_length,
            self.parameters.frame_size[0], self.parameters.frame_size[1]))

        for i in range(len(sample)):
            state, action, reward, new_state, is_terminal = sample[i]

            X_old_states[i:i + 1] = state
            X_new_states[i:i + 1] = new_state

        old_predictions = self.model.predict(X_old_states)
        new_predictions = self.delayed_model.predict(X_new_states)

        for i in range(len(sample)):
            state, action, reward, new_state, is_terminal = sample[i]

            Y[i] = old_predictions[i]

            if is_terminal:
                Y[i, action] = reward
            else:
                Y[i, action] = reward + self.parameters.discount_factor * np.max(new_predictions[i])

        loss = self.model.train_on_batch(X_old_states, Y)

        if self.parameters.steps % self.parameters.target_network_update_frequency == 0:
            copy_weights(self.model, self.delayed_model)

        return loss

    def store_in_replay_memory(self, state, action, reward, new_state, is_terminal):
        self.replay_memory.push_circular((state, action, reward, new_state, is_terminal))

    def sample_replay_memory(self, size):
        return utils.sample_without_replacement(self.replay_memory, min(len(self.replay_memory), size))

    def preprocess_images(self, images):
        if len(images) != self.parameters.history_length:
            raise Exception(
                "Invalid number of frames. Expected %d, got %d" % (self.parameters.history_length, len(images)))
        
        color_channels = self._get_frame_channels()
        
        result = np.zeros((color_channels * self.parameters.history_length, self.parameters.frame_size[0], self.parameters.frame_size[1]))
        for i, image in enumerate(images):
            resized_image = imresize(image, self.parameters.frame_size)
            if self.parameters.use_color_frames == False:
                # Assume RGB
                result[i * color_channels, :, :] = (0.2126 * resized_image[:, :, 0] +
                                                    0.7152 * resized_image[:, :, 1] +
                                                    0.0722 * resized_image[:, :, 2])
            else:
                for j in range(color_channels):
                    result[i * color_channels +  j] = resized_image[:, :, j]
                

        return result

    def choose_action(self, processed_images, train):
        action_type = None
        if train and (self.is_initializing_replay_memory() or
                random.uniform(0,1) <= self.parameters.exploration_rate):
            result = [random.choice(range(len(possible_actions))) for _ in range(processed_images.shape[0])]
            action_type = "Random action"
        else:
            result = [np.argmax(i) for i in self.model.predict(processed_images)]
            action_type = "Best action"
        print(action_type + ':', [possible_actions[i].keys() for i in result])

        if train and not self.is_initializing_replay_memory():
            self.parameters.exploration_rate = max(self.parameters.final_exploration,
                self.parameters.exploration_rate - self.parameters.exploration_decay)
            
            self.parameters.max_time_between_checkpoints += self.parameters.max_time_between_checkpoints_increase
        return result
