import json
import numpy as np
import pytest

from high_perf_parser import HighPerfMatParser


@pytest.fixture
def parser():
    return HighPerfMatParser()


def test_nan_replaced_with_string(parser):
    arr = np.array([1.0, float("nan"), 3.0], dtype=np.float64)
    result = parser._convert_array(arr)
    assert result[0] == 1.0
    assert result[1] == "NaN"
    assert result[2] == 3.0
    serialized = json.dumps(result)
    assert isinstance(serialized, str)


def test_inf_replaced_with_string(parser):
    arr = np.array([1.0, float("inf"), -float("inf"), 4.0], dtype=np.float64)
    result = parser._convert_array(arr)
    assert result[0] == 1.0
    assert result[1] == "Inf"
    assert result[2] == "-Inf"
    assert result[3] == 4.0
    serialized = json.dumps(result)
    assert isinstance(serialized, str)


def test_complex_serialization(parser):
    arr = np.array([1 + 2j, 3 + 4j], dtype=np.complex128)
    result = parser._convert_complex_array(arr)
    assert isinstance(result, list)
    assert result[0]["_type"] == "complex"
    assert result[0]["real"] == 1.0
    assert result[0]["imag"] == 2.0
    assert result[1]["_type"] == "complex"
    assert result[1]["real"] == 3.0
    assert result[1]["imag"] == 4.0
    serialized = json.dumps(result)
    assert isinstance(serialized, str)


def test_mixed_nan_inf(parser):
    arr = np.array([1.0, float("nan"), float("inf"), -float("inf"), 5.0], dtype=np.float64)
    result = parser._convert_array(arr)
    assert result[0] == 1.0
    assert result[1] == "NaN"
    assert result[2] == "Inf"
    assert result[3] == "-Inf"
    assert result[4] == 5.0
    serialized = json.dumps(result)
    assert isinstance(serialized, str)


def test_all_nan(parser):
    arr = np.array([float("nan"), float("nan")], dtype=np.float64)
    result = parser._convert_array(arr)
    assert result == ["NaN", "NaN"]
    stats = parser._get_stats(arr)
    assert stats["nan_count"] == 2
    assert stats["min"] is None
    assert stats["max"] is None
    serialized = json.dumps({"data": result, "stats": stats})
    assert isinstance(serialized, str)


def test_process_value_nan_float(parser):
    val = float("nan")
    result = parser._process_value(np.float64(val))
    assert result == "NaN"


def test_process_value_inf_float(parser):
    val = float("inf")
    result = parser._process_value(np.float64(val))
    assert result == "Inf"


def test_process_value_complex_with_nan(parser):
    val = complex(float("nan"), 2.0)
    result = parser._process_value(np.complex128(val))
    assert result["_type"] == "complex"
    assert result["real"] == "NaN"
    assert result["imag"] == 2.0
