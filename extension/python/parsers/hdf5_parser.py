"""
HDF5 Parser for MAT files v7.3
"""

import h5py
import numpy as np
import mat73
from typing import Dict, Any, List, Optional
from pathlib import Path


class HDF5Parser:
    """Parser for MAT files v7.3 using h5py and mat73"""
    
    def parse(self, file_path: str, variables: Optional[List[str]] = None) -> Dict[str, Any]:
        """Parse MAT v7.3 file using mat73"""
        try:
            if variables:
                data = mat73.loadmat(file_path, only_include=variables, use_attrdict=True)
            else:
                data = mat73.loadmat(file_path, use_attrdict=True)
            
            result = {}
            for key, value in data.items():
                result[key] = self._process_value(value)
            
            return result
        except Exception as e:
            raise RuntimeError(f"Failed to parse MAT v7.3 file: {str(e)}")
    
    def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata using h5py for efficiency"""
        try:
            metadata = {}
            
            with h5py.File(file_path, 'r') as f:
                for key in f.keys():
                    if key.startswith('#'):
                        continue
                    
                    item = f[key]
                    metadata[key] = self._get_hdf5_metadata(item)
            
            return metadata
        except Exception as e:
            raise RuntimeError(f"Failed to extract metadata: {str(e)}")
    
    def load_variable(self, file_path: str, variable_name: str,
                     slice_info: Optional[Dict] = None) -> Any:
        """Load a specific variable with optional slicing (lazy loading)"""
        try:
            if slice_info:
                data = mat73.loadmat(file_path, only_include=variable_name,
                                    use_attrdict=True)
                value = data.get(variable_name)
                value = self._apply_slice(value, slice_info)
            else:
                data = mat73.loadmat(file_path, only_include=variable_name,
                                    use_attrdict=True)
                value = data.get(variable_name)
            
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
        else:
            return value
    
    def _process_array(self, arr: np.ndarray) -> Dict[str, Any]:
        """Process NumPy array"""
        result = {
            '_type': 'ndarray',
            'shape': list(arr.shape),
            'dtype': str(arr.dtype),
            'data': arr.tolist() if arr.size < 10000 else None
        }
        
        if np.iscomplexobj(arr):
            result['complex'] = True
            result['magnitude'] = np.abs(arr).tolist() if arr.size < 10000 else None
            result['phase'] = np.angle(arr).tolist() if arr.size < 10000 else None
        
        return result
    
    def _get_hdf5_metadata(self, item) -> Dict[str, Any]:
        """Get metadata for HDF5 item"""
        if isinstance(item, h5py.Dataset):
            return {
                'type': 'dataset',
                'shape': list(item.shape),
                'dtype': str(item.dtype),
                'size': item.size * item.dtype.itemsize,
                'chunks': item.chunks,
                'compression': item.compression
            }
        elif isinstance(item, h5py.Group):
            return {
                'type': 'group',
                'children': list(item.keys())
            }
        else:
            return {'type': 'unknown'}
    
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
