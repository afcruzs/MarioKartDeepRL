import os
import tensorflow as tf

NEW_SESSION = 'NEW_SESSION'
LOAD_SESSION = 'LOAD_SESSION'
LOAD_MODEL = 'LOAD_MODEL'
LOAD_SESSION_NO_REPLAY = 'LOAD_SESSION_NO_REPLAY'
SESSION_PATH = 'sessions/'
LOSS_FILENAME = 'avg_loss_data'
REWARD_FILENAME = 'avg_reward_data'
SCORE_FILENAME = 'score_data'

class Session(object):
  def __init__(self, saved_episodes, session_path):
    self.saved_episodes = saved_episodes
    self.session_path = session_path
    self.create_episodes_directory()
    self.current_episode = 0

    self.loss_variable = tf.Variable(0)
    self.reward_variable = tf.Variable(0)
    self.score_variable = tf.Variable(0)
    self.episode_steps_variable = tf.Variable(0)

    tf.summary.scalar("Loss", self.loss_variable)
    tf.summary.scalar("Reward", self.reward_variable)
    tf.summary.scalar("Score", self.score_variable)
    tf.summary.scalar("Episode steps", self.episode_steps_variable)

    self.summary_ops = tf.summary.merge_all()
    self.tf_session = tf.Session()
    self.is_closed = False

    self.tf_session.run(tf.global_variables_initializer())
    self.writer = tf.summary.FileWriter(self.get_logs_path(), self.tf_session.graph)

  def __enter__(self):
    return self

  def __exit__(self, exc_type, exc_value, traceback):
    assert not self.is_closed

    self.is_closed = True
    self.tf_session.close()

  def get_episodes_path(self):
    return self.session_path + "/episodes"

  def get_current_path(self):
    return self.get_episodes_path() + "/" + str(self.current_episode % self.saved_episodes)

  def get_session_path(self):
    return self.session_path

  def get_logs_path(self):
    return self.session_path + "/logs"

  def all_weights_path(self):
    return self.session_path + "/all_weights"

  def get_episode_weights_directory(self, episode):
    path = self.all_weights_path() + "/" + str(episode)
    create_dir(path)

    return path

  def create_episodes_directory(self):
    create_dir(self.get_episodes_path())

  def save_episode_results(self, reward, score, loss, episode_steps):
    summary = self.tf_session.run(self.summary_ops, feed_dict={
        self.reward_variable: reward,
        self.score_variable: score,
        self.loss_variable: loss,
        self.episode_steps_variable: episode_steps
    })

    self.writer.add_summary(summary, self.current_episode)
    self.writer.flush()

  def set_episode(self, episode):
    self.current_episode = episode
    create_dir(self.get_current_path())

def create_dir(path):
  if not os.path.exists(path):
    os.makedirs(path)
    return True
  else:
    return False
