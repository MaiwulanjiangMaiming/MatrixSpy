"""
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com

High-performance MAT file parser
Support for large data, lazy loading, incremental updates
"""

import scipy.io
import numpy as np
from typing import Dict, Any, List, Optional
import json


class HighPerfMatParser:
    """High-performance MAT file parser"""
    
    def __init__(self, max_preview_size=20000000):
        self.max_preview_size = max_preview_size
    
    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parse MAT file"""
        try:
            # Get metadata first
            metadata = self.get_metadata(file_path)
            
            # Only load small data, return None for large data
            data = scipy.io.loadmat(file_path, simplify_cells=True,
                                   struct_as_record=False, squeeze_me=True)
            
            result = {}
            for key, value in data.items():
                if not key.startswith('__'):
                    result[key] = self._process_value(value, is_root=True)
            
            return {
                'success': True,
                'version': metadata['version'],
                'file_path': file_path,
                'data': result,
                'metadata': metadata['metadata']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """Get file metadata (without loading full data)"""
        try:
            data = scipy.io.loadmat(file_path, simplify_cells=True,
                                   struct_as_record=False, squeeze_me=True)
            
            # Detect version
            version = self._detect_version(file_path)
            
            metadata = {}
            for key, value in data.items():
                if not key.startswith('__'):
                    metadata[key] = {
                        'type': self._get_type_name(value),
                        'shape': self._get_shape(value),
                        'dtype': self._get_dtype(value),
                        'size': self._estimate_size(value),
                        'previewable': self._is_previewable(value)
                    }
            
            return {
                'success': True,
                'version': version,
                'file_path': file_path,
                'metadata': metadata
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def load_variable(self, file_path: str, variable_name: str,
                     slice_info: Optional[Dict] = None) -> Dict[str, Any]:
        """Load single variable (supports slicing)"""
        try:
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
    
    def _process_value(self, value: Any, is_root: bool = False, 
                      force_load: bool = False) -> Any:
        """Process value (smart loading)"""
        if isinstance(value, np.ndarray):
            return self._process_array(value, force_load)
        elif isinstance(value, (np.integer, np.int64, np.int32)):
            return int(value)
        elif isinstance(value, (np.floating, np.float64, np.float32)):
            return float(value)
        elif isinstance(value, (complex, np.complex128, np.complex64)):
            return {
                'real': float(value.real),
                'imag': float(value.imag),
                '_type': 'complex'
            }
        elif isinstance(value, np.bool_):
            return bool(value)
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
            # MATLAB struct
            result = {'_type': 'struct'}
            for field in value._fieldnames:
                result[field] = self._process_value(
                    getattr(value, field), 
                    is_root=False, 
                    force_load=force_load
                )
            return result
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
        
        # Preserve original multi-dimensional structure
        return arr.tolist()
    
    def _convert_complex_array(self, arr: np.ndarray) -> Any:
        """Convert complex array (preserve original dimensions)"""
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
    
    def _get_preview(self, arr: np.ndarray, max_items: int = 100) -> Dict[str, Any]:
        """Get data preview"""
        if arr.ndim == 1:
            # 1D: take first and last 50 elements
            if arr.size > max_items:
                half = max_items // 2
                return {
                    'head': self._convert_array(arr[:half]),
                    'tail': self._convert_array(arr[-half:]),
                    'truncated': True
                }
            else:
                return {
                    'data': self._convert_array(arr),
                    'truncated': False
                }
        elif arr.ndim == 2:
            # 2D: take center region
            h, w = arr.shape
            if h > 10 or w > 10:
                ch, cw = h // 2, w // 2
                preview = arr[max(0, ch-5):ch+5, max(0, cw-5):cw+5]
                return {
                    'center': self._convert_array(preview),
                    'truncated': True
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
    
    def _get_stats(self, arr: np.ndarray) -> Dict[str, Any]:
        """Get statistics"""
        if np.iscomplexobj(arr):
            return {
                'min': float(np.min(np.abs(arr))),
                'max': float(np.max(np.abs(arr))),
                'mean': float(np.mean(np.abs(arr))),
                'std': float(np.std(np.abs(arr)))
            }
        else:
            return {
                'min': float(np.min(arr)),
                'max': float(np.max(arr)),
                'mean': float(np.mean(arr)),
                'std': float(np.std(arr))
            }
    
    def _detect_version(self, file_path: str) -> str:
        """Detect file version"""
        with open(file_path, 'rb') as f:
            header = f.read(128)
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
        print("Usage: python high_perf_parser.py <file.mat> [--metadata] [--variable <name>]")
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
    else:
        result = parser.parse_file(file_path)
    
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
