from PIL import Image
from collections import deque


BORDER_COLOR = (132, 132, 132, 255)
TRACK_COLOR = (255, 255, 255, 255)
BACKGROUND_COLOR = (255, 0, 255, 255)
START_LINE_COLOR = (0, 0, 0, 255)
INIT_COLOR = (255, 0, 0, 255)


def preprocess_map(filepath):
  offset = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
  img = Image.open(filepath)
  width, height = img.size


  matrix = [[-1 for j in xrange(height)] for i in xrange(width)]

  q = deque()
  
  for x in xrange(width):
    for y in xrange(height):
      if img.getpixel((x, y)) == INIT_COLOR:
        matrix[x][y] = 0
        q.append((x, y))

  max_cost = 0
  while len(q) > 0:
    current_x, current_y = q.popleft()
    cost = matrix[current_x][current_y]
    max_cost = max(cost, max_cost)

    for dx, dy in offset:
      new_x = dx + current_x
      new_y = dy + current_y
      if 0 <= new_x < height and 0 <= new_y < width and \
        img.getpixel((new_x, new_y)) == TRACK_COLOR and matrix[new_x][new_y] == -1:

        matrix[new_x][new_y] = 1 + cost
        q.append((new_x, new_y))

  for x in xrange(width):
    for y in xrange(height):
      if img.getpixel((x, y)) == START_LINE_COLOR:
        matrix[x][y] = max_cost

  return matrix

#matrix = preprocess_map('tracks/peach_circuit.png')
#for row in matrix:
#  print ' '.join(map(str, row))
