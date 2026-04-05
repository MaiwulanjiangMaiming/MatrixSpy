"""
Lazy Loader for large MAT files
"""

import h5py
import numpy as np
from typing import Dict, Any, Optional, Tuple


class LazyLoader:
    """Lazy loader for large MAT v7.3 files"""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.file_handle = None
    
    def open(self):
        """Open file handle"""
        if self.file_handle is None:
            self.file_handle = h5py.File(self.file_path, 'r')
    
    def close(self):
        """Close file handle"""
        if self.file_handle is not None:
            self.file_handle.close()
            self.file_handle = None
    
    def get_variable_info(self, variable_name: str) -> Dict[str, Any]:
        """Get variable information without loading data"""
        self.open()
        
        if variable_name not in self.file_handle:
            raise ValueError(f"Variable '{variable_name}' not found")
        
        item = self.file_handle[variable_name]
        
        if isinstance(item, h5py.Dataset):
            return {
                'type': 'dataset',
                'shape': list(item.shape),
                'dtype': str(item.dtype),
                'size': item.size,
                'chunks': item.chunks,
                'compression': item.compression
            }
        elif isinstance(item, h5py.Group):
            return {
                'type': 'group',
                'children': list(item.keys())
            }
    
    def load_slice(self, variable_name: str, 
                   slices: Tuple[slice, ...]) -> np.ndarray:
        """Load a specific slice of a variable"""
        self.open()
        
        if variable_name not in self.file_handle:
            raise ValueError(f"Variable '{variable_name}' not found")
        
        dataset = self.file_handle[variable_name]
        
        if not isinstance(dataset, h5py.Dataset):
            raise TypeError(f"Variable '{variable_name}' is not a dataset")
        
        return dataset[slices]
    
    def load_chunk(self, variable_name: str, 
                   chunk_index: Tuple[int, ...]) -> np.ndarray:
        """Load a specific chunk by index"""
        self.open()
        
        if variable_name not in self.file_handle:
            raise ValueError(f"Variable '{variable_name}' not found")
        
        dataset = self.file_handle[variable_name]
        
        if not isinstance(dataset, h5py.Dataset):
            raise TypeError(f"Variable '{variable_name}' is not a dataset")
        
        if dataset.chunks is None:
            raise ValueError(f"Variable '{variable_name}' is not chunked")
        
        chunk_shape = dataset.chunks
        slices = []
        
        for i, idx in enumerate(chunk_index):
            start = idx * chunk_shape[i]
            end = min((idx + 1) * chunk_shape[i], dataset.shape[i])
            slices.append(slice(start, end))
        
        return dataset[tuple(slices)]
    
    def iterate_chunks(self, variable_name: str, 
                       batch_size: int = 1) -> Any:
        """Iterate over chunks of a variable"""
        self.open()
        
        if variable_name not in self.file_handle:
            raise ValueError(f"Variable '{variable_name}' not found")
        
        dataset = self.file_handle[variable_name]
        
        if not isinstance(dataset, h5py.Dataset):
            raise TypeError(f"Variable '{variable_name}' is not a dataset")
        
        if len(dataset.shape) == 1:
            for i in range(0, dataset.shape[0], batch_size):
                yield dataset[i:i+batch_size]
        elif len(dataset.shape) == 2:
            for i in range(0, dataset.shape[0], batch_size):
                yield dataset[i:i+batch_size, :]
        elif len(dataset.shape) == 3:
            for i in range(0, dataset.shape[2], batch_size):
                yield dataset[:, :, i:i+batch_size]
    
    def __enter__(self):
        self.open()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
