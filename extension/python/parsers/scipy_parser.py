"""
Scipy Parser for MAT files v4-v7.2
"""

import scipy.io
import numpy as np
from typing import Dict, Any, List, Optional
from pathlib import Path


class ScipyParser:
    """Parser for MAT files v4-v7.2 using scipy.io.loadmat"""
    
    def parse(self, file_path: str, variables: Optional[List[str]] = None) -> Dict[str, Any]:
        """Parse MAT file using scipy.io.loadmat"""
        try:
            data = scipy.io.loadmat(file_path, simplify_cells=True, 
                                   struct_as_record=False, squeeze_me=True)
            
            result = {}
            for key, value in data.items():
                if not key.startswith('__'):
                    if variables is None or key in variables:
                        result[key] = self._process_value(value)
            
            return result
        except Exception as e:
            raise RuntimeError(f"Failed to parse MAT file: {str(e)}")
    
    def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata without loading full data"""
        try:
            data = scipy.io.loadmat(file_path, simplify_cells=True,
                                   struct_as_record=False, squeeze_me=True)
            
            metadata = {}
            for key, value in data.items():
                if not key.startswith('__'):
                    metadata[key] = {
                        'type': self._get_type_name(value),
                        'shape': getattr(value, 'shape', None),
                        'dtype': str(getattr(value, 'dtype', None)),
                        'size': self._estimate_size(value)
                    }
            
            return metadata
        except Exception as e:
            raise RuntimeError(f"Failed to extract metadata: {str(e)}")
    
    def load_variable(self, file_path: str, variable_name: str,
                     slice_info: Optional[Dict] = None) -> Any:
        """Load a specific variable with optional slicing"""
        try:
            data = scipy.io.loadmat(file_path, variable_names=[variable_name],
                                   simplify_cells=True, struct_as_record=False,
                                   squeeze_me=True)
            
            value = data.get(variable_name)
            if value is None:
                raise ValueError(f"Variable '{variable_name}' not found")
            
            if slice_info:
                value = self._apply_slice(value, slice_info)
            
            return self._process_value(value)
        except Exception as e:
            raise RuntimeError(f"Failed to load variable: {str(e)}")
    
    def _process_value(self, value: Any) -> Any:
        """Process a value for JSON serialization"""
        if isinstance(value, np.ndarray):
            return self._process_array(value)
        elif isinstance(value, (np.integer, np.floating)):
            return value.item()
        elif isinstance(value, np.complex128):
            return {'real': value.real, 'imag': value.imag, '_type': 'complex'}
        elif isinstance(value, np.bool_):
            return bool(value)
        elif isinstance(value, dict):
            return {k: self._process_value(v) for k, v in value.items()}
        elif isinstance(value, (list, tuple)):
            return [self._process_value(v) for v in value]
        elif hasattr(value, '__dict__'):
            return self._process_struct(value)
        else:
            return value
    
    def _process_array(self, arr: np.ndarray) -> Dict[str, Any]:
        """Process NumPy array"""
        max_size = 100000  # Increased to 100000 elements
        
        result = {
            '_type': 'ndarray',
            'shape': list(arr.shape),
            'dtype': str(arr.dtype),
            'data': arr.tolist() if arr.size < max_size else None
        }
        
        if np.iscomplexobj(arr):
            result['complex'] = True
            result['magnitude'] = np.abs(arr).tolist() if arr.size < max_size else None
            result['phase'] = np.angle(arr).tolist() if arr.size < max_size else None
        
        return result
    
    def _process_struct(self, obj: Any) -> Dict[str, Any]:
        """Process MATLAB struct"""
        result = {'_type': 'struct'}
        if hasattr(obj, '_fieldnames'):
            for field in obj._fieldnames:
                result[field] = self._process_value(getattr(obj, field))
        return result
    
    def _get_type_name(self, value: Any) -> str:
        """Get type name for metadata"""
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
    
    def _estimate_size(self, value: Any) -> int:
        """Estimate memory size in bytes"""
        if isinstance(value, np.ndarray):
            return value.nbytes
        elif isinstance(value, (list, tuple)):
            return sum(self._estimate_size(v) for v in value)
        elif isinstance(value, dict):
            return sum(self._estimate_size(v) for v in value.values())
        else:
            return 0
    
    def _apply_slice(self, value: Any, slice_info: Dict) -> Any:
        """Apply slice to array"""
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
