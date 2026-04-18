# Install Python Dependencies

MatrixSpy requires Python 3.8 or higher with the following packages:

## Required Packages

- **scipy** - For reading MAT files (v4-v7)
- **numpy** - For numerical operations
- **h5py** - For reading MAT v7.3 (HDF5-based) files
- **mat73** - For improved v7.3 support

## Installation

Open a terminal and run:

```bash
pip install scipy numpy h5py mat73
```

Or using pip3:

```bash
pip3 install scipy numpy h5py mat73
```

## Verify Installation

You can verify the installation by running:

```bash
python3 -c "import scipy, numpy, h5py, mat73; print('All dependencies installed!')"
```

## Configuration

If you're using a custom Python installation, you can configure the Python path in VS Code settings:

1. Open Settings (`Cmd+,` on macOS, `Ctrl+,` on Windows/Linux)
2. Search for "MatrixSpy"
3. Set `matrixspy.pythonPath` to your Python executable path

---

**Note**: Make sure Python is in your system PATH, or configure the full path to your Python executable in the settings.
