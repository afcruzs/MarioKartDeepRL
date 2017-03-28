import pickle

parameters_file_name = '../OldEpisodes/26-11-2016-2140/parameters.pkl'
parameters_new_file_name = 'new_parameters.pkl'

with open(parameters_file_name, 'rb') as input_file:
  parameters = pickle.load(input_file)
  parameters.exploration_rate = 0.5

  with open(parameters_new_file_name, 'wb') as output:
    pickle.dump(parameters, output)
    print("saved")
