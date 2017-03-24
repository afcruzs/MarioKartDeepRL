import numpy as np
from sklearn.manifold import TSNE
from matplotlib import pyplot as plt
import argparse
import pickle
from scipy.misc import toimage
from scipy.misc import imshow


def load_embeddings_only(dir):
  with open(dir + "/embeddings.pkl", 'rb') as file_obj:
    embeddings = pickle.load(file_obj)

  return embeddings

def load_max_rewards_only(dir):
  with open(dir + "/max_rewards.pkl", 'rb') as file_obj:
    max_rewards = pickle.load(file_obj)

  return max_rewards  

def load_states_only(dir):
  with open(dir + "/states.pkl", 'rb') as file_obj:
    states = pickle.load(file_obj)

  return states

def load_embeddings_data(dir):
  embeddings = load_embeddings_only(dir)
  max_rewards = load_max_rewards_only(dir)
  states = load_states_only(dir)

  return embeddings, max_rewards, states


def compute_t_sne(embeddings, n_components=2):
  print "Computing t-sne..."
  model = TSNE(n_components=n_components)

  return model.fit_transform(embeddings)

def do_visualize(embeddings_2d, max_rewards, states):
  x = embeddings_2d[:,0]
  y = embeddings_2d[:,1]

  def on_pick(event):
    ind = event.ind[0]
    data = states[ind]
    toimage(data).show()

  fig = plt.figure()
  ax1 = fig.add_subplot(1, 1, 1)
  col = ax1.scatter(x, y, cmap=plt.get_cmap('RdYlGn'), c=max_rewards, s=90, picker=True)
  fig.canvas.mpl_connect('pick_event', on_pick)
  plt.show()


if __name__ == '__main__':
  COMPUTE_AND_VISUALIZE = "COMPUTE_AND_VISUALIZE"
  COMPUTE_ONLY = "COMPUTE_ONLY"
  VISUALIZE_ONLY = "VISUALIZE_ONLY"

  parser = argparse.ArgumentParser(description='Build t-sne manifold of the learned q value function.')
  parser.add_argument("--dir", type=str, required=True)
  parser.add_argument("--mode", type=str, required=False, default=COMPUTE_ONLY)

  args = parser.parse_args()
  mode = args.mode
  embeddings_dir = args.dir
  if embeddings_dir.endswith("/"):
    embeddings_dir = embeddings_dir[:-1]

  if mode == COMPUTE_AND_VISUALIZE:
    
    embeddings, max_rewards, states = load_embeddings_data(embeddings_dir)
    embeddings_2d = compute_t_sne(embeddings)

    print "Saving..."
    with open(embeddings_dir + "/t-sne-embeddings.pkl", "wb") as file_obj:
      pickle.dump(embeddings_2d, file_obj)

    do_visualize(embeddings_2d, max_rewards, states)
    
  elif mode == COMPUTE_ONLY:
    
    embeddings = load_embeddings_only(embeddings_dir)
    embeddings_2d = compute_t_sne(embeddings)
    print "Saving..."
    with open(embeddings_dir + "/t-sne-embeddings.pkl", "wb") as file_obj:
      pickle.dump(embeddings_2d, file_obj)

  elif mode == VISUALIZE_ONLY:

    with open(embeddings_dir + "/t-sne-embeddings.pkl", 'rb') as file_obj:
      embeddings_2d = pickle.load(file_obj)    

    max_rewards = load_max_rewards_only(embeddings_dir)
    states = load_states_only(embeddings_dir)

    do_visualize(embeddings_2d, max_rewards, states)
    



