import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'extension', 'python'))


@pytest.fixture
def parser():
    from high_perf_parser import HighPerfMatParser
    return HighPerfMatParser()
