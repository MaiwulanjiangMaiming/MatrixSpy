import json
import numpy as np
import scipy.io
import pytest

from high_perf_parser import HighPerfMatParser


@pytest.fixture
def parser():
    return HighPerfMatParser()


def test_parse_scalar_int(parser, tmp_path):
    file_path = tmp_path / "scalar_int.mat"
    scipy.io.savemat(str(file_path), {"x": np.int32(42)})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    assert result["data"]["x"] == 42


def test_parse_scalar_float(parser, tmp_path):
    file_path = tmp_path / "scalar_float.mat"
    scipy.io.savemat(str(file_path), {"x": np.float64(3.14)})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    data = result["data"]["x"]
    assert isinstance(data, float)
    assert abs(data - 3.14) < 1e-10


def test_parse_vector(parser, tmp_path):
    file_path = tmp_path / "vector.mat"
    arr = np.array([1, 2, 3, 4, 5], dtype=np.float64)
    scipy.io.savemat(str(file_path), {"vec": arr})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    data = result["data"]["vec"]
    assert data["_type"] == "ndarray"
    assert data["shape"] == [5]
    assert data["data"] == [1.0, 2.0, 3.0, 4.0, 5.0]


def test_parse_matrix(parser, tmp_path):
    file_path = tmp_path / "matrix.mat"
    arr = np.array([[1, 2], [3, 4]], dtype=np.float64)
    scipy.io.savemat(str(file_path), {"mat": arr})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    data = result["data"]["mat"]
    assert data["_type"] == "ndarray"
    assert data["shape"] == [2, 2]
    assert data["data"] == [[1.0, 2.0], [3.0, 4.0]]


def test_parse_complex(parser, tmp_path):
    file_path = tmp_path / "complex.mat"
    arr = np.array([1 + 2j, 3 + 4j], dtype=np.complex128)
    scipy.io.savemat(str(file_path), {"cplx": arr})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    data = result["data"]["cplx"]
    assert data["_type"] == "ndarray"
    assert data.get("complex") is True
    items = data["data"]
    assert items[0]["_type"] == "complex"
    assert items[0]["real"] == 1.0
    assert items[0]["imag"] == 2.0


def test_parse_string(parser, tmp_path):
    file_path = tmp_path / "string.mat"
    scipy.io.savemat(str(file_path), {"msg": np.array("hello")})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    val = result["data"]["msg"]
    assert "hello" in str(val)


def test_parse_struct(parser, tmp_path):
    file_path = tmp_path / "struct.mat"
    dt = np.dtype([("field1", np.float64), ("field2", np.int32)])
    arr = np.array((1.5, 10), dtype=dt)
    scipy.io.savemat(str(file_path), {"s": arr})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    data = result["data"]["s"]
    assert data["_type"] == "struct"
    assert "field1" in data
    assert "field2" in data


def test_parse_empty_array(parser, tmp_path):
    file_path = tmp_path / "empty.mat"
    arr = np.array([], dtype=np.float64)
    scipy.io.savemat(str(file_path), {"empty": arr})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    data = result["data"]["empty"]
    assert data["_type"] == "ndarray"
    assert data["data"] == []


def test_version_detection(parser, tmp_path):
    file_path = tmp_path / "version.mat"
    scipy.io.savemat(str(file_path), {"x": np.float64(1.0)})
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    assert result["version"] in ("v5", "v7")


def test_result_is_json_serializable(parser, tmp_path):
    file_path = tmp_path / "json_test.mat"
    scipy.io.savemat(str(file_path), {
        "a": np.float64(1.0),
        "b": np.array([1, 2, 3], dtype=np.float64),
    })
    result = parser.parse_file(str(file_path))
    serialized = json.dumps(result)
    assert isinstance(serialized, str)
