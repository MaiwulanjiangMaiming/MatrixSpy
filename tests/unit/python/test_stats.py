"""Tests for statistics computation: sparsity optimization and large-array
sampling path added in v1.5.8."""
import json

import numpy as np
import pytest

from high_perf_parser import HighPerfMatParser


@pytest.fixture
def parser():
    return HighPerfMatParser()


def test_sparsity_all_nonzero(parser):
    """Array with no zeros should have sparsity 0.0."""
    arr = np.array([1.0, 2.0, 3.0, 4.0], dtype=np.float64)
    stats = parser._get_stats(arr)
    assert stats["sparsity"] == 0.0


def test_sparsity_all_zero(parser):
    """Array of all zeros should have sparsity 1.0."""
    arr = np.zeros(10, dtype=np.float64)
    stats = parser._get_stats(arr)
    assert stats["sparsity"] == 1.0


def test_sparsity_mixed(parser):
    """Half zeros → sparsity 0.5."""
    arr = np.array([0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0], dtype=np.float64)
    stats = parser._get_stats(arr)
    assert abs(stats["sparsity"] - 0.5) < 1e-10


def test_sparsity_integer_array(parser):
    """Sparsity should work for integer arrays too (no temporary bool array)."""
    arr = np.array([0, 0, 5, 0, 3, 0], dtype=np.int32)
    stats = parser._get_stats(arr)
    assert abs(stats["sparsity"] - (4 / 6)) < 1e-10


def test_sparsity_nan_not_counted_as_zero(parser):
    """NaN != 0, so NaN elements should not inflate sparsity."""
    arr = np.array([0.0, float("nan"), 0.0, float("nan")], dtype=np.float64)
    stats = parser._get_stats(arr)
    # 2 zeros out of 4 → sparsity 0.5 (NaN is nonzero)
    assert abs(stats["sparsity"] - 0.5) < 1e-10


def test_stats_small_array_exact(parser):
    """Arrays under 10M elements use the exact path (no 'note' field)."""
    arr = np.random.randn(1000).astype(np.float64)
    stats = parser._get_stats(arr)
    assert "note" not in stats
    assert stats["min"] is not None
    assert stats["max"] is not None
    assert stats["mean"] is not None


def test_stats_large_array_sampled(parser):
    """Arrays over 10M elements use the sampling path with a note."""
    # 12M float32 elements ≈ 48MB — large enough to trigger sampling but
    # small enough to keep test memory bounded.
    arr = np.random.randn(12_000_000).astype(np.float32)
    stats = parser._get_stats(arr)
    assert stats.get("note") == "Estimated from sample"
    assert stats["min"] is not None
    assert stats["max"] is not None
    assert stats["mean"] is not None
    # memory_mb should be exact (nbytes), not estimated.
    expected_mb = arr.nbytes / 1e6
    assert abs(stats["memory_mb"] - expected_mb) < 1e-6


def test_stats_sample_reproducible(parser):
    """Same input → same output (fixed seed for reproducibility)."""
    arr = np.random.randn(11_000_000).astype(np.float64)
    stats1 = parser._get_stats(arr)
    stats2 = parser._get_stats(arr)
    # Deterministic seed → identical statistics.
    assert stats1["min"] == stats2["min"]
    assert stats1["max"] == stats2["max"]
    assert stats1["mean"] == stats2["mean"]


def test_stats_sample_close_to_exact(parser):
    """Sampled statistics should be close to exact values within a reasonable
    tolerance for a 1M-element sample of a 12M-element array."""
    rng = np.random.default_rng(0)
    arr = rng.standard_normal(12_000_000).astype(np.float64)
    sampled = parser._get_stats(arr)
    # Compute exact values directly for comparison.
    exact_mean = float(np.mean(arr))
    exact_min = float(np.min(arr))
    assert abs(sampled["mean"] - exact_mean) < 0.05
    # Min of a 1M sample of standard normal is a reasonable estimate of
    # the true min of 12M; allow generous tolerance.
    assert abs(sampled["min"] - exact_min) < 1.0


def test_stats_complex_array_sampled(parser):
    """Complex arrays over 10M elements also use the sampling path."""
    arr = (np.random.randn(11_000_000) + 1j * np.random.randn(11_000_000)).astype(np.complex64)
    stats = parser._get_stats(arr)
    assert stats.get("note") == "Estimated from sample"
    assert stats["min"] is not None


def test_estimate_stats_directly(parser):
    """Call _estimate_stats_from_sample directly to verify the contract."""
    arr = np.array([0.0, 1.0, 2.0, 3.0, 0.0, 5.0], dtype=np.float64)
    stats = parser._estimate_stats_from_sample(arr, max_sample=100)
    # Small array: sample is the whole array.
    assert stats["sparsity"] == (2 / 6)
    assert stats["min"] == 0.0
    assert stats["max"] == 5.0
    assert stats.get("note") == "Estimated from sample"


def test_stats_result_json_serializable(parser):
    """Statistics dict must be JSON-serializable for daemon transport."""
    arr = np.random.randn(100).astype(np.float64)
    stats = parser._get_stats(arr)
    serialized = json.dumps(stats)
    assert isinstance(serialized, str)
