import json
import numpy as np
import h5py
import pytest

from high_perf_parser import HighPerfMatParser


@pytest.fixture
def parser():
    return HighPerfMatParser()


def test_parse_hdf5_dataset(parser, tmp_path):
    file_path = tmp_path / "dataset.h5"
    with h5py.File(str(file_path), "w") as f:
        f.create_dataset("arr", data=np.array([1.0, 2.0, 3.0, 4.0, 5.0]))
    with h5py.File(str(file_path), "r") as f:
        result = parser._process_hdf5_dataset(f["arr"])
    assert result["_type"] == "ndarray"
    assert result["shape"] == [5]
    assert result["data"] == [1.0, 2.0, 3.0, 4.0, 5.0]


def test_parse_hdf5_group(parser, tmp_path):
    file_path = tmp_path / "group.h5"
    with h5py.File(str(file_path), "w") as f:
        grp = f.create_group("mystruct")
        grp.create_dataset("x", data=np.array([10.0, 20.0]))
        grp.create_dataset("y", data=np.array([30.0, 40.0]))
    with h5py.File(str(file_path), "r") as f:
        result = parser._process_hdf5_group(f["mystruct"])
    assert result["_type"] == "struct"
    assert "x" in result
    assert "y" in result
    assert result["x"]["_type"] == "ndarray"
    assert result["y"]["_type"] == "ndarray"


def test_parse_hdf5_large_lazy(parser, tmp_path):
    parser_small = HighPerfMatParser(max_preview_size=100)
    file_path = tmp_path / "large.h5"
    large_arr = np.random.randn(1100, 1000).astype(np.float32)
    with h5py.File(str(file_path), "w") as f:
        f.create_dataset("big", data=large_arr)
    with h5py.File(str(file_path), "r") as f:
        result = parser_small._process_hdf5_dataset(f["big"])
    assert result["_type"] == "ndarray"
    assert result["data"] is None
    assert result["statistics"] is not None
    assert "min" in result["statistics"]
    assert "max" in result["statistics"]


def test_version_detection_hdf5(parser, tmp_path):
    file_path = tmp_path / "version.h5"
    with h5py.File(str(file_path), "w") as f:
        f.create_dataset("x", data=np.array([1.0]))
    result = parser.parse_file(str(file_path))
    assert result["success"] is True
    assert result["version"] == "v7.3"


def test_hdf5_result_is_json_serializable(parser, tmp_path):
    file_path = tmp_path / "serializable.h5"
    with h5py.File(str(file_path), "w") as f:
        f.create_dataset("arr", data=np.array([1.0, 2.0]))
    with h5py.File(str(file_path), "r") as f:
        result = parser._process_hdf5_dataset(f["arr"])
    serialized = json.dumps(result)
    assert isinstance(serialized, str)
