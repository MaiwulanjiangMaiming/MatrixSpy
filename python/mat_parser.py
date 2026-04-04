#!/usr/bin/env python3
"""
MAT File Parser - Main Entry Point
Supports MATLAB .mat files v4, v5, v6, v7, v7.3
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

from parsers.scipy_parser import ScipyParser
from parsers.hdf5_parser import HDF5Parser
from serializers.json_serializer import JSONSerializer


class MatParser:
    """Main MAT file parser class"""
    
    def __init__(self):
        self.scipy_parser = ScipyParser()
        self.hdf5_parser = HDF5Parser()
        self.serializer = JSONSerializer()
    
    def detect_version(self, file_path: str) -> str:
        """Detect MAT file version"""
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
    
    def parse(self, file_path: str, variables: Optional[List[str]] = None) -> Dict[str, Any]:
        """Parse MAT file and return structured data"""
        version = self.detect_version(file_path)
        
        try:
            if version == 'v7.3':
                data = self.hdf5_parser.parse(file_path, variables)
            else:
                data = self.scipy_parser.parse(file_path, variables)
            
            return {
                'success': True,
                'version': version,
                'file_path': file_path,
                'data': data
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'version': version,
                'file_path': file_path
            }
    
    def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """Get file metadata without loading full data"""
        version = self.detect_version(file_path)
        
        try:
            if version == 'v7.3':
                metadata = self.hdf5_parser.get_metadata(file_path)
            else:
                metadata = self.scipy_parser.get_metadata(file_path)
            
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
                'version': version,
                'file_path': file_path
            }
    
    def load_variable(self, file_path: str, variable_name: str, 
                      slice_info: Optional[Dict] = None) -> Dict[str, Any]:
        """Load a specific variable with optional slicing (lazy loading)"""
        version = self.detect_version(file_path)
        
        try:
            if version == 'v7.3':
                data = self.hdf5_parser.load_variable(file_path, variable_name, slice_info)
            else:
                data = self.scipy_parser.load_variable(file_path, variable_name, slice_info)
            
            return {
                'success': True,
                'version': version,
                'variable_name': variable_name,
                'data': data
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'variable_name': variable_name
            }


def main():
    """Main entry point for command-line usage"""
    parser = argparse.ArgumentParser(description='MAT File Parser')
    parser.add_argument('file_path', help='Path to .mat file')
    parser.add_argument('--metadata', action='store_true', 
                        help='Only extract metadata')
    parser.add_argument('--variable', help='Load specific variable')
    parser.add_argument('--slice', help='Slice info as JSON string')
    
    args = parser.parse_args()
    
    mat_parser = MatParser()
    
    if args.metadata:
        result = mat_parser.get_metadata(args.file_path)
    elif args.variable:
        slice_info = json.loads(args.slice) if args.slice else None
        result = mat_parser.load_variable(args.file_path, args.variable, slice_info)
    else:
        result = mat_parser.parse(args.file_path)
    
    print(json.dumps(result, cls=NumpyEncoder))


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for NumPy types"""
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return self._convert_array(obj.tolist())
        elif isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, (np.complex128, np.complex64, complex)):
            return {'real': obj.real, 'imag': obj.imag, '_type': 'complex'}
        elif isinstance(obj, np.bool_):
            return bool(obj)
        return super().default(obj)
    
    def _convert_array(self, arr):
        """Recursively convert array elements"""
        if isinstance(arr, list):
            return [self._convert_array(item) for item in arr]
        elif isinstance(arr, (complex, np.complex128, np.complex64)):
            return {'real': arr.real, 'imag': arr.imag, '_type': 'complex'}
        elif isinstance(arr, (np.integer, np.int64, np.int32)):
            return int(arr)
        elif isinstance(arr, (np.floating, np.float64, np.float32)):
            return float(arr)
        elif isinstance(arr, np.bool_):
            return bool(arr)
        else:
            return arr


if __name__ == '__main__':
    main()
