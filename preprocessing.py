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

  matrix = [[-1 for j in range(height)] for i in range(width)]

  q = deque()

  for x in range(width):
    for y in range(height):
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

  for x in range(width):
    for y in range(height):
      if img.getpixel((x, y)) == START_LINE_COLOR:
        matrix[x][y] = 0

  track_pixels = [(x, y) for x in range(width) for y in range(height) if
                  img.getpixel((x, y)) in (TRACK_COLOR, START_LINE_COLOR, INIT_COLOR)]

  for x in range(width):
    for y in range(height):
      if matrix[x][y] != -1:
        continue

      _, closest_x, closest_y = min((abs(x1 - x) + abs(y1 - y), x1, y1) for x1, y1 in track_pixels)

      matrix[x][y] = matrix[closest_x][closest_y]

  return matrix
