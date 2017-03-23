import os

NEW_SESSION = 'NEW_SESSION'
LOAD_SESSION = 'LOAD_SESSION'
LOAD_MODEL = 'LOAD_MODEL'
LOAD_SESSION_NO_REPLAY = 'LOAD_SESSION_NO_REPLAY'
RECORD_HIDDEN_REP = 'RECORD_HIDDEN_REP'
SESSION_PATH = 'sessions/'
LOSS_FILENAME = 'avg_loss_data'
REWARD_FILENAME = 'avg_reward_data'
SCORE_FILENAME = 'score_data'

class Session(object):
  def __init__(self, episodes, session_path):
    self.episodes = episodes
    self.session_path = session_path
    self.create_episodes_directory()
    self.create_logs_directories()
    self.current_episode = 0

  def get_episodes_path(self):
    return self.session_path + "/episodes"

  def get_current_path(self):
    return self.get_episodes_path() + "/" + str(self.current_episode)

  def get_session_path(self):
    return self.session_path

  def logs_path(self):
    return self.session_path + "/logs"

  def loss_logs_path(self):
    return self.logs_path() + '/loss'

  def avg_reward_logs_path(self):
    return self.logs_path() + '/reward'

  def all_weights_path(self):
    return self.session_path + "/all_weights"

  def get_episode_weights_directory(self, episode):
    path = self.all_weights_path() + "/" + str(episode)
    create_dir(path)

    return path

  def create_logs_directories(self):
    create_dir(self.logs_path())
    create_dir(self.loss_logs_path())
    create_dir(self.avg_reward_logs_path())

  def create_episodes_directory(self):
    create_dir(self.get_episodes_path())

  def append_loss(self, value):
    with open(self.loss_logs_path() + '/' + LOSS_FILENAME, 'a') as out:
      out.write(str(value) + '\n')

  def append_reward(self, value):
    with open(self.avg_reward_logs_path() + '/' + REWARD_FILENAME, 'a') as out:
      out.write(str(value) + '\n')

  def append_score(self, score, episode_steps, episode):
    with open(self.avg_reward_logs_path() + '/' + SCORE_FILENAME, 'a') as out:
      out.write(str(episode) + ' ' + str(score) + ' ' + str(episode_steps) + '\n')

  def set_episode(self, episode):
    self.current_episode = episode % self.episodes
    create_dir(self.get_current_path())

def create_dir(path):
  if not os.path.exists(path):
    os.makedirs(path)
    return True
  else:
    return False
