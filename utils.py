import numpy as np

class CircularBuffer(object):
    def __init__(self, max_length, source=None):
        if max_length <= 0:
            raise Exception("Invalid max_length. Expected a positive number, but got", max_length)
        self._max_length = max_length
        self._buffer = [None] * max_length
        self._actual_len = 0
        self._head = 0

        if source is not None:
            for element in source:
                self.push_circular(element)

    def __len__(self):
        return self._actual_len

    def __getitem__(self, i):
        if not isinstance(i, int):
            raise ValueError("int expected, but got" + str(i))

        if not 0 <= i < self._actual_len:
            raise IndexError("Index %d outside of bounds [0, %d)" % (i, self._actual_len))

        return self._buffer[i]

    def __iter__(self):
        for i in xrange(self._actual_len):
            yield self._buffer[(self._head + i) % self._max_length]

    def push_circular(self, element):
        self._buffer[(self._head + self._actual_len) % self._max_length] = element
        if self._actual_len == self._max_length:
            self._head = (self._head + 1) % self._max_length
        else:
            self._actual_len = self._actual_len + 1

def sample_without_replacement(source, n):
    """
    Generates a list of n unique, randomly chosen elements from source.
    This implementation is efficient for small values of n, with arbitrarily big
    sources.
    """
    if n > len(source):
        raise Exception("Insufficient elements (%d) for a sample of size %d" % (len(source), n))

    chosen = set()
    chosen.add(-1)
    result = []

    for i in xrange(n):
        element = -1
        while element in chosen:
            element = np.random.randint(0, len(source))

        chosen.add(element)
        result.append(source[element])

    return result
