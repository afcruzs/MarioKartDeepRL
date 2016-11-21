import numpy as np
import matplotlib.pyplot as plt
import argparse

parser = argparse.ArgumentParser(description='Plot data')
parser.add_argument("--session_name", required=True)
args = parser.parse_args()
session_name = args.session_name

avg_reward = np.loadtxt('sessions/%s/logs/reward/avg_reward_data' % session_name)
avg_loss = np.loadtxt('sessions/%s/logs/loss/avg_loss_data' % session_name)

plt.plot(avg_reward)
plt.xlabel('Episode')
plt.ylabel('Average reward')

plt.figure()
plt.plot(avg_loss)
plt.xlabel('Episode')
plt.ylabel('Average loss (batch of 32 samples)')

plt.show()