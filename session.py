import os

NEW_SESSION = 'NEW_SESSION'
LOAD_SESSION = 'LOAD_SESSION'
SESSION_PATH = 'sessions/'
LOSS_FILENAME = 'avg_loss_data'
REWARD_FILENAME = 'avg_reward_data'



class Session(object):
  def __init__(self, episodes, session_path):
    self.episodes = episodes
    self.session_path = session_path
    episodes_sub_dirs = [(session_path +  "/" + name, name) for name in os.listdir(session_path) if os.path.isdir(session_path +  "/" + name)]
    if len(episodes_sub_dirs) == 0:
      self.current_episode = 0
      os.makedirs(self.get_current_path())
    else:
      self.current_episode = int(max(episodes_sub_dirs, key=lambda x : os.path.getmtime(x[0]))[1])

  def get_current_path(self):
    return self.session_path + "/" + str(self.current_episode)

  def logs_path(self):
    return self.session_path + "/logs"

  def loss_logs_path(self):
    return self.logs_path() + '/loss'

  def avg_reward_logs_path(self):
    return self.logs_path() + '/reward'

  def create_logs_directories(self):
    create_dir(self.logs_path())
    create_dir(self.loss_logs_path())
    create_dir(self.avg_reward_logs_path())


  def append_loss(self, value):
    with open(self.loss_logs_path() + '/' + LOSS_FILENAME, 'a') as out:
      out.write(str(value) + '\n')

  def append_reward(self, value):
    with open(self.avg_reward_logs_path() + '/' + REWARD_FILENAME, 'a') as out:
      out.write(str(value) + '\n')

  def advance_episode(self):
    self.current_episode = (self.current_episode + 1) % self.episodes
    os.makedirs(self.get_current_path())

def create_dir(path):
  if not os.path.exists(path):
    os.makedirs(path)
    return True
  else:
    return False



