import numpy as np

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
