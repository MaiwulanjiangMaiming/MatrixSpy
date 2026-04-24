"""
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com

High-performance MAT file parser
Support for large data, lazy loading, incremental updates
"""

import sys
import scipy.io
import numpy as np
from typing import Dict, Any, List, Optional
import json
import base64
import mat73
import h5py


class HighPerfMatParser:
    """High-performance MAT file parser with lazy loading support"""
    
    def __init__(self, max_preview_size=1000000):
        self.max_preview_size = max_preview_size
    
    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parse MAT file"""
        try:
            metadata = self.get_metadata(file_path)
            version = metadata['version']

            result = {}
            if version == 'v7.3':
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
                data = scipy.io.loadmat(file_path, simplify_cells=True,
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
                'data': result,
                'metadata': metadata['metadata']
            }
        except Exception as e:
            import traceback
            print(f"Error in parse_file: {e}", file=sys.stderr)
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """Get file metadata (without loading full data)"""
        try:
            version = self._detect_version(file_path)
            
            if version == 'v7.3':
                metadata = {}
                with h5py.File(file_path, 'r') as f:
                    for key in f.keys():
                        if key.startswith('#'):
                            continue
                        item = f[key]
                        metadata[key] = {
                            'type': 'ndarray' if isinstance(item, h5py.Dataset) else 'struct',
                            'shape': list(item.shape) if isinstance(item, h5py.Dataset) else None,
                            'dtype': str(item.dtype) if isinstance(item, h5py.Dataset) else None,
                            'size': item.size * item.dtype.itemsize if isinstance(item, h5py.Dataset) else 0,
                            'previewable': True
                        }
            else:
                data = scipy.io.loadmat(file_path, simplify_cells=True,
                                       struct_as_record=False, squeeze_me=True)
                
                metadata = {}
                for key, value in data.items():
                    if not key.startswith('__'):
                        try:
                            metadata[key] = {
                                'type': self._get_type_name(value),
                                'shape': self._get_shape(value),
                                'dtype': self._get_dtype(value),
                                'size': self._estimate_size(value),
                                'previewable': self._is_previewable(value)
                            }
                        except Exception as e:
                            import traceback
                            print(f"Error processing key '{key}': {e}", file=sys.stderr)
                            traceback.print_exc()
                            metadata[key] = {
                                'type': 'error',
                                'error': str(e)
                            }
            
            return {
                'success': True,
                'version': version,
                'file_path': file_path,
                'metadata': metadata
            }
        except Exception as e:
            import traceback
            print(f"Error in get_metadata: {e}", file=sys.stderr)
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def load_variable(self, file_path: str, variable_name: str,
                     slice_info: Optional[Dict] = None) -> Dict[str, Any]:
        """Load single variable (supports slicing)"""
        try:
            version = self._detect_version(file_path)
            
            if version == 'v7.3':
                data = mat73.loadmat(file_path, only_include=variable_name, use_attrdict=True)
            else:
                data = scipy.io.loadmat(file_path, variable_names=[variable_name],
                                       simplify_cells=True, struct_as_record=False,
                                       squeeze_me=True)
            
            value = data.get(variable_name)
            if value is None:
                raise ValueError(f"Variable '{variable_name}' not found")
            
            if slice_info:
                value = self._apply_slice(value, slice_info)
            
            return {
                'success': True,
                'variable_name': variable_name,
                'data': self._process_value(value, is_root=False, force_load=True)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'variable_name': variable_name
            }
    
    def load_slice(self, file_path: str, variable_name: str,
                   axis: int, index: int) -> Dict[str, Any]:
        """Load a single 2D slice from a 3D array (optimized for visualization)"""
        try:
            version = self._detect_version(file_path)
            
            if version == 'v7.3':
                data = mat73.loadmat(file_path, only_include=variable_name, use_attrdict=True)
            else:
                data = scipy.io.loadmat(file_path, variable_names=[variable_name],
                                       simplify_cells=True, struct_as_record=False,
                                       squeeze_me=True)
            
            value = data.get(variable_name)
            if value is None:
                raise ValueError(f"Variable '{variable_name}' not found")
            
            if not isinstance(value, np.ndarray) or value.ndim < 3:
                raise ValueError(f"Variable must be at least 3D array")
            
            if axis >= value.ndim:
                raise ValueError(f"Axis {axis} out of bounds for {value.ndim}D array")
            
            # Extract the 2D slice
            slices = [slice(None)] * value.ndim
            slices[axis] = index
            slice_data = value[tuple(slices)]
            
            # Ensure we have a 2D result
            if slice_data.ndim > 2:
                # Reshape to 2D by collapsing extra dimensions
                new_shape = []
                for i, s in enumerate(slice_data.shape):
                    if i != axis:
                        new_shape.append(s)
                slice_data = slice_data.reshape(new_shape)
            
            # Convert to base64-encoded binary for efficient transfer
            raw_bytes = slice_data.astype(np.float32).tobytes()
            encoded = base64.b64encode(raw_bytes).decode('ascii')
            
            return {
                'success': True,
                'variable_name': variable_name,
                'data': {
                    '_type': 'slice',
                    'shape': list(slice_data.shape),
                    'dtype': str(slice_data.dtype),
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
        """Process HDF5 dataset"""
        data = np.array(item)
        return self._process_array(data)

    def _process_hdf5_group(self, item: h5py.Group) -> Dict[str, Any]:
        """Process HDF5 group (struct-like)"""
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
        """Process value (smart loading)"""
        if isinstance(value, (dict, list, tuple)) and not force_load:
            size = self._estimate_size(value)
            if size > 10 * 1024 * 1024:
                return {
                    '_type': 'large_data',
                    'type': type(value).__name__,
                    'size': size,
                    'message': 'Large data structure - use lazy loading'
                }

        if isinstance(value, np.ndarray):
            return self._process_array(value, force_load)
        elif isinstance(value, (np.integer, np.int64, np.int32)):
            return int(value)
        elif isinstance(value, (np.floating, np.float64, np.float32)):
            val = float(value)
            if np.isnan(val) or np.isinf(val):
                return None
            return val
        elif isinstance(value, (complex, np.complex128, np.complex64)):
            return {
                'real': float(value.real),
                'imag': float(value.imag),
                '_type': 'complex'
            }
        elif isinstance(value, np.bool_):
            return bool(value)
        elif isinstance(value, bytes):
            try:
                return value.decode('utf-8')
            except:
                return value.decode('latin-1', errors='replace')
        elif isinstance(value, dict):
            return {
                '_type': 'struct',
                **{k: self._process_value(v, is_root=False, force_load=force_load)
                   for k, v in value.items()}
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
        else:
            return value
    
    def _process_array(self, arr: np.ndarray, force_load: bool = False) -> Dict[str, Any]:
        """Process array (smart preview)"""
        result = {
            '_type': 'ndarray',
            'shape': list(arr.shape),
            'dtype': str(arr.dtype),
            'size': int(arr.size)
        }
        
        # Determine whether to load full data
        should_load = force_load or arr.size <= self.max_preview_size
        
        if should_load:
            # Process complex arrays
            if np.iscomplexobj(arr):
                result['complex'] = True
                result['data'] = self._convert_complex_array(arr)
                result['statistics'] = self._get_stats(arr)
            else:
                result['data'] = self._convert_array(arr)
                result['statistics'] = self._get_stats(arr)
        else:
            # Large data: return only statistics, no preview data (avoid complex serialization issues)
            result['data'] = None
            result['statistics'] = self._get_stats(arr)
        
        return result
    
    def _convert_array(self, arr: np.ndarray) -> Any:
        """Convert array to JSON serializable format (preserve original dimensions)"""
        if arr.size == 0:
            return []

        data = arr.tolist()
        return self._replace_nan_inf(data)

    def _replace_nan_inf(self, data):
        """Recursively replace NaN and Inf with None"""
        if isinstance(data, list):
            return [self._replace_nan_inf(item) for item in data]
        elif isinstance(data, float):
            if np.isnan(data) or np.isinf(data):
                return None
        return data
    
    def _convert_complex_array(self, arr: np.ndarray) -> Any:
        """Convert complex array (preserve original dimensions)"""
        # Limit complex array conversion to prevent recursion depth issues
        if arr.size > 1000000:  # 1M elements
            return {
                '_type': 'complex',
                'shape': arr.shape,
                'dtype': str(arr.dtype),
                'message': 'Large complex array - display limited to statistics'
            }

        # Recursive conversion to preserve dimensions
        def convert_recursive(arr_slice):
            if arr_slice.ndim == 0:
                return {
                    'real': float(arr_slice.real),
                    'imag': float(arr_slice.imag),
                    '_type': 'complex'
                }
            elif arr_slice.ndim == 1:
                return [
                    {
                        'real': float(x.real),
                        'imag': float(x.imag),
                        '_type': 'complex'
                    }
                    for x in arr_slice
                ]
            else:
                return [convert_recursive(sub_arr) for sub_arr in arr_slice]

        return convert_recursive(arr)
    
    def _get_preview(self, arr: np.ndarray, max_items: int = 1000) -> Dict[str, Any]:
        """Get data preview with better performance for large arrays"""
        if arr.size > 1000000:  # 1M elements
            return {
                '_type': 'large_array',
                'shape': arr.shape,
                'dtype': str(arr.dtype),
                'size': arr.size,
                'message': 'Large array - preview limited to statistics'
            }

        if arr.ndim == 1:
            # 1D: take first and last elements
            if arr.size > max_items:
                quarter = max_items // 4
                return {
                    'head': self._convert_array(arr[:quarter]),
                    'tail': self._convert_array(arr[-quarter:]),
                    'truncated': True,
                    'total': arr.size
                }
            else:
                return {
                    'data': self._convert_array(arr),
                    'truncated': False
                }
        elif arr.ndim == 2:
            # 2D: take center region for large matrices
            h, w = arr.shape
            if h > 50 or w > 50:
                # Sample from center for better performance
                ch, cw = h // 2, w // 2
                sample_h = min(20, h)
                sample_w = min(20, w)
                start_h = max(0, ch - sample_h // 2)
                start_w = max(0, cw - sample_w // 2)
                preview = arr[start_h:start_h + sample_h, start_w:start_w + sample_w]
                return {
                    'center': self._convert_array(preview),
                    'truncated': True,
                    'shape': arr.shape
                }
            else:
                return {
                    'data': self._convert_array(arr),
                    'truncated': False
                }
        else:
            # High-dimensional: take first slice
            return {
                'first_slice': self._convert_array(arr[tuple([0] * (arr.ndim - 2) + [slice(None), slice(None)])]),
                'truncated': True
            }
    
    def _safe_float(self, val):
        """Convert value to float, handling NaN/Inf"""
        if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
            return None
        return float(val)

    def _get_stats(self, arr: np.ndarray) -> Dict[str, Any]:
        """Get statistics"""
        try:
            # Check if array is numeric
            if not np.issubdtype(arr.dtype, np.number):
                return {
                    'min': None,
                    'max': None,
                    'mean': None,
                    'std': None,
                    'note': 'Non-numeric array'
                }

            if np.iscomplexobj(arr):
                abs_arr = np.abs(arr)
                return {
                    'min': self._safe_float(np.min(abs_arr)),
                    'max': self._safe_float(np.max(abs_arr)),
                    'mean': self._safe_float(np.mean(abs_arr)),
                    'std': self._safe_float(np.std(abs_arr))
                }
            else:
                return {
                    'min': self._safe_float(np.min(arr)),
                    'max': self._safe_float(np.max(arr)),
                    'mean': self._safe_float(np.mean(arr)),
                    'std': self._safe_float(np.std(arr))
                }
        except Exception as e:
            return {
                'min': None,
                'max': None,
                'mean': None,
                'std': None,
                'error': str(e)
            }
    
    def _detect_version(self, file_path: str) -> str:
        """Detect file version"""
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
    
    def _get_type_name(self, value: Any) -> str:
        """Get type name"""
        if isinstance(value, np.ndarray):
            if np.iscomplexobj(value):
                return 'complex_array'
            return 'ndarray'
        elif isinstance(value, (int, float, np.number)):
            return 'scalar'
        elif isinstance(value, str):
            return 'string'
        elif isinstance(value, dict):
            return 'struct'
        elif hasattr(value, '_fieldnames'):
            return 'struct'
        elif isinstance(value, (list, tuple)):
            return 'cell'
        else:
            return 'unknown'
    
    def _get_shape(self, value: Any) -> Optional[List[int]]:
        """Get shape"""
        if isinstance(value, np.ndarray):
            return list(value.shape)
        elif isinstance(value, (list, tuple)):
            return [len(value)]
        else:
            return None
    
    def _get_dtype(self, value: Any) -> Optional[str]:
        """Get data type"""
        if isinstance(value, np.ndarray):
            return str(value.dtype)
        elif isinstance(value, (int, np.integer)):
            return 'int'
        elif isinstance(value, (float, np.floating)):
            return 'float'
        elif isinstance(value, str):
            return 'str'
        else:
            return None
    
    def _estimate_size(self, value: Any) -> int:
        """Estimate size"""
        if isinstance(value, np.ndarray):
            return int(value.nbytes)
        elif isinstance(value, (list, tuple)):
            return sum(self._estimate_size(v) for v in value)
        elif isinstance(value, dict):
            return sum(self._estimate_size(v) for v in value.values())
        else:
            return 0
    
    def _is_previewable(self, value: Any) -> bool:
        """Check if previewable"""
        if isinstance(value, np.ndarray):
            return value.size <= self.max_preview_size
        return True
    
    def _apply_slice(self, value: Any, slice_info: Dict) -> Any:
        """Apply slice"""
        if not isinstance(value, np.ndarray):
            return value
        
        slices = []
        for dim_slice in slice_info.get('dims', []):
            if isinstance(dim_slice, dict):
                start = dim_slice.get('start', 0)
                stop = dim_slice.get('stop')
                step = dim_slice.get('step', 1)
                slices.append(slice(start, stop, step))
            else:
                slices.append(dim_slice)
        
        return value[tuple(slices)]


def main():
    """Command line entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python high_perf_parser.py <file.mat> [--metadata] [--variable <name>] [--slice <name> <axis> <index>]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    parser = HighPerfMatParser()
    
    if '--metadata' in sys.argv:
        result = parser.get_metadata(file_path)
    elif '--variable' in sys.argv:
        idx = sys.argv.index('--variable')
        var_name = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else None
        slice_info = json.loads(sys.argv[idx + 2]) if idx + 2 < len(sys.argv) else None
        result = parser.load_variable(file_path, var_name, slice_info)
    elif '--slice' in sys.argv:
        idx = sys.argv.index('--slice')
        var_name = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else ''
        axis = int(sys.argv[idx + 2]) if idx + 2 < len(sys.argv) else 0
        slice_idx = int(sys.argv[idx + 3]) if idx + 3 < len(sys.argv) else 0
        result = parser.load_slice(file_path, var_name, axis, slice_idx)
    else:
        result = parser.parse_file(file_path)
    
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
