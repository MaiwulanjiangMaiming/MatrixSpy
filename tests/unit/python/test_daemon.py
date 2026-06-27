import json
import os
import subprocess
import sys
import time
import scipy.io
import numpy as np
import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PARSER_SCRIPT = os.path.join(PROJECT_ROOT, 'extension', 'python', 'high_perf_parser.py')


class DaemonProcess:
    def __init__(self):
        self.proc = None

    def start(self):
        self.proc = subprocess.Popen(
            [sys.executable, "-u", PARSER_SCRIPT, "--daemon"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
        )
        return self

    def send(self, obj):
        line = json.dumps(obj) + "\n"
        self.proc.stdin.write(line.encode())
        self.proc.stdin.flush()

    def read_response(self, timeout=5):
        import select
        start = time.time()
        while time.time() - start < timeout:
            ready, _, _ = select.select([self.proc.stdout], [], [], 0.1)
            if ready:
                line = self.proc.stdout.readline()
                if line:
                    return json.loads(line.decode())
        raise TimeoutError("Daemon did not respond in time")

    def read_result(self, timeout=15):
        """Read responses, skipping progress messages, until a final
        response (with 'success' or 'error' or no 'progress' key) arrives."""
        import select
        start = time.time()
        while time.time() - start < timeout:
            ready, _, _ = select.select([self.proc.stdout], [], [], 0.1)
            if ready:
                line = self.proc.stdout.readline()
                if line:
                    resp = json.loads(line.decode())
                    if 'progress' in resp and 'success' not in resp:
                        continue
                    return resp
        raise TimeoutError("Daemon did not return a final response in time")

    def stop(self):
        if self.proc and self.proc.poll() is None:
            try:
                self.send({"action": "shutdown"})
                self.proc.wait(timeout=5)
            except Exception:
                self.proc.kill()

    def __enter__(self):
        return self.start()

    def __exit__(self, *args):
        self.stop()


@pytest.fixture
def daemon():
    d = DaemonProcess()
    d.start()
    # Consume the 'ready' handshake before yielding so the first read in a
    # test gets the actual response, not the ready signal.
    d.read_response(timeout=5)
    yield d
    d.stop()


def test_daemon_ping(daemon):
    daemon.send({"action": "ping", "_request_id": "1"})
    resp = daemon.read_response()
    assert resp["action"] == "pong"
    assert resp["_request_id"] == "1"


def test_daemon_load_file(daemon, tmp_path):
    mat_path = tmp_path / "test.mat"
    scipy.io.savemat(str(mat_path), {"x": np.float64(42.0)})
    daemon.send({"action": "load_file", "path": str(mat_path), "_request_id": "2"})
    resp = daemon.read_result()
    assert resp["success"] is True
    assert resp["_request_id"] == "2"


def test_daemon_load_slice(daemon, tmp_path):
    mat_path = tmp_path / "slice_test.mat"
    arr = np.random.randn(3, 4, 5).astype(np.float64)
    scipy.io.savemat(str(mat_path), {"vol": arr})
    daemon.send({"action": "load_file", "path": str(mat_path), "_request_id": "3"})
    resp = daemon.read_result()
    assert resp["success"] is True
    daemon.send({
        "action": "load_slice",
        "path": str(mat_path),
        "variable": "vol",
        "axis": 0,
        "index": 1,
        "_request_id": "4",
    })
    resp = daemon.read_result()
    assert resp["success"] is True
    assert resp["data"]["_type"] == "slice"
    assert resp["_request_id"] == "4"


def test_daemon_shutdown(tmp_path):
    d = DaemonProcess()
    d.start()
    d.read_response(timeout=5)  # consume 'ready' handshake
    d.send({"action": "shutdown", "_request_id": "5"})
    resp = d.read_response()
    assert resp["action"] == "shutdown_ack"
    d.proc.wait(timeout=5)
    assert d.proc.returncode is not None


def test_daemon_unknown_action(daemon):
    daemon.send({"action": "nonexistent", "_request_id": "6"})
    resp = daemon.read_response()
    assert "error" in resp
    assert "Unknown action" in resp["error"]
