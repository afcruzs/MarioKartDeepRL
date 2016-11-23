from utils import CircularBuffer
from qlearning import QLearning, QLearningParameters, replay_memory_column_names
from session import Session
import numpy as np
import sys
import itertools
from datetime import datetime

source_file_name = sys.argv[1]
target_file_name = sys.argv[2]

print datetime.now(), "- Loading source replay memory"
source_replay_memory = np.load(source_file_name)
print datetime.now(), "- Source replay memory loaded"

session = Session(4, 'tmp')
agent = QLearning(session, QLearningParameters())
agent.replay_memory = CircularBuffer(agent.parameters.replay_memory_size, source_replay_memory)

print datetime.now(), "- Saving target replay memory"
agent.save_replay_memory(target_file_name)

print datetime.now(), "- Saved target replay memory"

agent.load_replay_memory(target_file_name)

def compare():
    for a, b in itertools.izip(source_replay_memory, agent.replay_memory):
        for i, column in enumerate(replay_memory_column_names):
            is_numpy_array = column in ("state", "new_state")
            if (is_numpy_array and not np.array_equal(a[i], b[i])) or (not is_numpy_array and a[i] != b[i]):
                print "Equality fail for column", column
                print "a[i]:", a[i]
                print "b[i]:", b[i]
                return False
    return True

print datetime.now(), "- Checking replay memory"
assert compare()
print datetime.now(), "- Finished"
