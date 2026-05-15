import sys
import scipy.io
import numpy as np
from typing import Dict, Any, List, Optional
import json
import base64
import h5py


class HighPerfMatParser:

    def __init__(self, max_preview_size=1000000):
        self.max_preview_size = max_preview_size

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        try:
            version = self._detect_version(file_path)
            result = {}

            if version == 'v7.3':
                try:
                    import mat73
                    data = mat73.loadmat(file_path, use_attrdict=True)
                    for key in data:
                        if key.startswith('#') or key.startswith('__'):
                            continue
                        try:
                            result[key] = self._process_value(data[key], is_root=True)
                        except Exception as e:
                            print(f"Error processing variable '{key}': {e}", file=sys.stderr)
                            result[key] = {'_type': 'error', 'error': str(e)}
                except ImportError:
                    with h5py.File(file_path, 'r') as f:
                        for key in f.keys():
                            if key.startswith('#'):
                                continue
                            try:
                                item = f[key]
                                if isinstance(item, h5py.Dataset):
                                    result[key] = self._process_hdf5_dataset(item)
                                elif isinstance(item, h5py.Group):
                                    result[key] = self._process_hdf5_group(item)
                            except Exception as e:
                                print(f"Error processing variable '{key}': {e}", file=sys.stderr)
                                result[key] = {'_type': 'error', 'error': str(e)}
            else:
                data = scipy.io.loadmat(file_path, simplify_cells=False,
                                       struct_as_record=False, squeeze_me=True)
                for key, value in data.items():
                    if not key.startswith('__') and not key.startswith('#'):
                        try:
                            result[key] = self._process_value(value, is_root=True)
                        except Exception as e:
                            print(f"Error processing variable '{key}': {e}", file=sys.stderr)
                            result[key] = {'_type': 'error', 'error': str(e)}

            return {
                'success': True,
                'version': version,
                'file_path': file_path,
                'data': result
            }
        except Exception as e:
            import traceback
            print(f"Error in parse_file: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }

    def load_slice(self, file_path: str, variable_name: str,
                   axis: int, index: int) -> Dict[str, Any]:
        try:
            version = self._detect_version(file_path)
            value = None

            if version == 'v7.3':
                try:
                    import mat73
                    data = mat73.loadmat(file_path, only_include=variable_name, use_attrdict=True)
                    value = data.get(variable_name)
                except ImportError:
                    with h5py.File(file_path, 'r') as f:
                        if variable_name not in f:
                            raise ValueError(f"Variable '{variable_name}' not found")
                        ds = f[variable_name]
                        if not isinstance(ds, h5py.Dataset):
                            raise ValueError(f"Variable '{variable_name}' is not a dataset")
                        slices = [slice(None)] * ds.ndim
                        slices[axis] = index
                        value = ds[tuple(slices)]
            else:
                data = scipy.io.loadmat(file_path, variable_names=[variable_name],
                                       simplify_cells=True, struct_as_record=False,
                                       squeeze_me=True)
                value = data.get(variable_name)

            if value is None:
                raise ValueError(f"Variable '{variable_name}' not found")

            if not isinstance(value, np.ndarray) or value.ndim < 3:
                raise ValueError("Variable must be at least 3D array")

            if axis >= value.ndim:
                raise ValueError(f"Axis {axis} out of bounds for {value.ndim}D array")

            if index < 0 or index >= value.shape[axis]:
                raise ValueError(f"Index {index} out of bounds for axis {axis} (size {value.shape[axis]})")

            slices = [slice(None)] * value.ndim
            slices[axis] = index
            slice_data = value[tuple(slices)]

            if slice_data.ndim > 2:
                new_shape = [s for i, s in enumerate(slice_data.shape) if i != axis]
                slice_data = slice_data.reshape(new_shape) if new_shape else slice_data.flatten()

            if slice_data.ndim < 2:
                slice_data = slice_data.reshape(slice_data.shape[0], -1)

            raw_bytes = np.ascontiguousarray(slice_data, dtype=np.float32).tobytes()
            encoded = base64.b64encode(raw_bytes).decode('ascii')

            return {
                'success': True,
                'variable_name': variable_name,
                'data': {
                    '_type': 'slice',
                    'shape': list(slice_data.shape),
                    'dtype': 'float32',
                    'axis': axis,
                    'index': index,
                    'encoded_data': encoded,
                    'statistics': self._get_stats(slice_data)
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'variable_name': variable_name
            }

    def _process_hdf5_dataset(self, item: h5py.Dataset) -> Dict[str, Any]:
        result = {
            '_type': 'ndarray',
            'shape': list(item.shape),
            'dtype': str(item.dtype),
            'size': int(item.size)
        }

        if np.iscomplexobj(item):
            result['complex'] = True

        if item.size > self.max_preview_size:
            result['data'] = None
            result['statistics'] = self._get_hdf5_stats(item)
        else:
            data = np.array(item)
            if np.iscomplexobj(data):
                result['complex'] = True
                result['data'] = self._convert_complex_array(data)
            else:
                result['data'] = self._convert_array(data)
            result['statistics'] = self._get_stats(data)

        return result

    def _process_hdf5_group(self, item: h5py.Group) -> Dict[str, Any]:
        result = {'_type': 'struct'}
        for key in item.keys():
            child = item[key]
            if isinstance(child, h5py.Dataset):
                result[key] = self._process_hdf5_dataset(child)
            elif isinstance(child, h5py.Group):
                result[key] = self._process_hdf5_group(child)
        return result

    def _process_value(self, value: Any, is_root: bool = False,
                      force_load: bool = False) -> Any:
        if isinstance(value, np.ndarray):
            return self._process_array(value, force_load)
        elif isinstance(value, (np.integer,)):
            return int(value)
        elif isinstance(value, (np.floating,)):
            val = float(value)
            if np.isnan(val) or np.isinf(val):
                return None
            return val
        elif isinstance(value, (complex, np.complexfloating)):
            real_val = float(value.real)
            imag_val = float(value.imag)
            return {
                'real': None if (np.isnan(real_val) or np.isinf(real_val)) else real_val,
                'imag': None if (np.isnan(imag_val) or np.isinf(imag_val)) else imag_val,
                '_type': 'complex'
            }
        elif isinstance(value, np.bool_):
            return bool(value)
        elif isinstance(value, bytes):
            try:
                return value.decode('utf-8')
            except UnicodeDecodeError:
                return value.decode('latin-1', errors='replace')
        elif isinstance(value, dict):
            return {
                '_type': 'struct',
                **{k: self._process_value(v, is_root=False, force_load=force_load)
                   for k, v in value.items() if k != '_type'}
            }
        elif isinstance(value, (list, tuple)):
            return [self._process_value(v, is_root=False, force_load=force_load)
                   for v in value]
        elif hasattr(value, '_fieldnames'):
            result = {'_type': 'struct'}
            for field in value._fieldnames:
                result[field] = self._process_value(
                    getattr(value, field),
                    is_root=False,
                    force_load=force_load
                )
            return result
        elif isinstance(value, float):
            if np.isnan(value) or np.isinf(value):
                return None
            return value
        elif isinstance(value, int):
            return value
        elif isinstance(value, str):
            return value
        else:
            return str(value)

    def _process_array(self, arr: np.ndarray, force_load: bool = False) -> Dict[str, Any]:
        result = {
            '_type': 'ndarray',
            'shape': list(arr.shape),
            'dtype': str(arr.dtype),
            'size': int(arr.size)
        }

        should_load = force_load or arr.size <= self.max_preview_size

        if should_load:
            if np.iscomplexobj(arr):
                result['complex'] = True
                result['data'] = self._convert_complex_array(arr)
            else:
                result['data'] = self._convert_array(arr)
            result['statistics'] = self._get_stats(arr)
        else:
            result['data'] = None
            result['statistics'] = self._get_stats(arr)

        return result

    def _convert_array(self, arr: np.ndarray) -> Any:
        if arr.size == 0:
            return []
        if not np.issubdtype(arr.dtype, np.floating):
            return arr.tolist()
        data = arr.tolist()
        return self._replace_nan_inf(data)

    def _replace_nan_inf(self, data):
        if isinstance(data, list):
            return [self._replace_nan_inf(item) for item in data]
        elif isinstance(data, float):
            if np.isnan(data) or np.isinf(data):
                return None
        return data

    def _convert_complex_array(self, arr: np.ndarray) -> Any:
        if arr.size > 1000000:
            return None

        def convert_recursive(arr_slice):
            if arr_slice.ndim == 0:
                real_val = float(arr_slice.real)
                imag_val = float(arr_slice.imag)
                return {
                    'real': None if (np.isnan(real_val) or np.isinf(real_val)) else real_val,
                    'imag': None if (np.isnan(imag_val) or np.isinf(imag_val)) else imag_val,
                    '_type': 'complex'
                }
            elif arr_slice.ndim == 1:
                return [
                    {
                        'real': None if (np.isnan(float(x.real)) or np.isinf(float(x.real))) else float(x.real),
                        'imag': None if (np.isnan(float(x.imag)) or np.isinf(float(x.imag))) else float(x.imag),
                        '_type': 'complex'
                    }
                    for x in arr_slice
                ]
            else:
                return [convert_recursive(sub_arr) for sub_arr in arr_slice]

        return convert_recursive(arr)

    def _safe_float(self, val):
        if val is None:
            return None
        try:
            f = float(val)
            if np.isnan(f) or np.isinf(f):
                return None
            return f
        except (ValueError, TypeError):
            return None

    def _get_stats(self, arr) -> Dict[str, Any]:
        try:
            if isinstance(arr, h5py.Dataset):
                return self._get_hdf5_stats(arr)

            if not isinstance(arr, np.ndarray):
                return {'min': None, 'max': None, 'mean': None, 'std': None}

            if not np.issubdtype(arr.dtype, np.number):
                return {'min': None, 'max': None, 'mean': None, 'std': None, 'note': 'Non-numeric array'}

            if arr.size == 0:
                return {'min': None, 'max': None, 'mean': None, 'std': None}

            if np.iscomplexobj(arr):
                abs_arr = np.abs(arr)
                return {
                    'min': self._safe_float(np.nanmin(abs_arr)),
                    'max': self._safe_float(np.nanmax(abs_arr)),
                    'mean': self._safe_float(np.nanmean(abs_arr)),
                    'std': self._safe_float(np.nanstd(abs_arr))
                }
            else:
                return {
                    'min': self._safe_float(np.nanmin(arr)),
                    'max': self._safe_float(np.nanmax(arr)),
                    'mean': self._safe_float(np.nanmean(arr)),
                    'std': self._safe_float(np.nanstd(arr))
                }
        except Exception as e:
            return {'min': None, 'max': None, 'mean': None, 'std': None, 'error': str(e)}

    def _get_hdf5_stats(self, item: h5py.Dataset, max_sample: int = 100000) -> Dict[str, Any]:
        try:
            if not np.issubdtype(item.dtype, np.number):
                return {'min': None, 'max': None, 'mean': None, 'std': None, 'note': 'Non-numeric array'}

            if item.size <= max_sample:
                data = item[()]
                return self._get_stats(data)

            total = item.size
            step = max(1, total // max_sample)

            slices = [slice(None, None, max(1, s // max_sample)) for s in item.shape]
            sample = item[tuple(slices)]

            if np.iscomplexobj(sample):
                abs_sample = np.abs(sample)
                return {
                    'min': self._safe_float(np.nanmin(abs_sample)),
                    'max': self._safe_float(np.nanmax(abs_sample)),
                    'mean': self._safe_float(np.nanmean(abs_sample)),
                    'std': self._safe_float(np.nanstd(abs_sample)),
                    'note': 'Estimated from sample'
                }
            else:
                return {
                    'min': self._safe_float(np.nanmin(sample)),
                    'max': self._safe_float(np.nanmax(sample)),
                    'mean': self._safe_float(np.nanmean(sample)),
                    'std': self._safe_float(np.nanstd(sample)),
                    'note': 'Estimated from sample'
                }
        except Exception as e:
            return {'min': None, 'max': None, 'mean': None, 'std': None, 'error': str(e)}

    def _detect_version(self, file_path: str) -> str:
        with open(file_path, 'rb') as f:
            header = f.read(128)

        if header[:8] == b'\x89HDF\r\n\x1a\n':
            return 'v7.3'

        header_str = header.decode('ascii', errors='ignore')
        if 'MATLAB 7.3 MAT-file' in header_str:
            return 'v7.3'
        elif 'MATLAB 7.0 MAT-file' in header_str:
            return 'v7'
        elif 'MATLAB 5.0 MAT-file' in header_str:
            return 'v5'
        else:
            return 'v4'


def main():
    if len(sys.argv) < 2:
        print("Usage: python high_perf_parser.py <file.mat> [--slice <name> <axis> <index>]", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    if file_path in ('--help', '-h'):
        print("Usage: python high_perf_parser.py <file.mat> [--slice <name> <axis> <index>]", file=sys.stderr)
        sys.exit(0)

    import os
    if not os.path.isfile(file_path):
        print(json.dumps({'success': False, 'error': f'File not found: {file_path}'}))
        sys.exit(1)

    parser = HighPerfMatParser()

    if '--slice' in sys.argv:
        idx = sys.argv.index('--slice')
        if idx + 3 >= len(sys.argv):
            print(json.dumps({'success': False, 'error': 'Missing arguments for --slice: <name> <axis> <index>'}))
            sys.exit(1)
        var_name = sys.argv[idx + 1]
        try:
            axis = int(sys.argv[idx + 2])
            slice_idx = int(sys.argv[idx + 3])
        except ValueError:
            print(json.dumps({'success': False, 'error': 'Invalid axis or index: must be integers'}))
            sys.exit(1)
        result = parser.load_slice(file_path, var_name, axis, slice_idx)
    else:
        result = parser.parse_file(file_path)

    print(json.dumps(result))


if __name__ == '__main__':
    main()
