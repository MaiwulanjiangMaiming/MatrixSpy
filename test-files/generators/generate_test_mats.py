#!/usr/bin/env python3
"""
Generate test MAT files for all versions
"""

import numpy as np
import scipy.io
import h5py
import os
from pathlib import Path


def generate_basic_data():
    """Generate basic test data"""
    return {
        'scalar_int': 42,
        'scalar_float': 3.14159,
        'scalar_complex': 1 + 2j,
        'vector_1d': np.random.rand(100),
        'vector_complex': np.random.rand(100) + 1j * np.random.rand(100),
        'matrix_2d': np.random.rand(64, 64),
        'matrix_complex': np.random.rand(64, 64) + 1j * np.random.rand(64, 64),
        'tensor_3d': np.random.rand(32, 32, 16),
        'string_var': 'Hello MATLAB',
        'struct_simple': {
            'field1': 123,
            'field2': 'test',
            'field3': np.array([1, 2, 3])
        },
        'struct_nested': {
            'level1': {
                'level2': {
                    'value': 42
                }
            }
        }
    }


def generate_v5_files(output_dir):
    """Generate v5 MAT files"""
    print("Generating v5 files...")
    data = generate_basic_data()
    
    scipy.io.savemat(
        os.path.join(output_dir, 'basic_v5.mat'),
        data,
        format='5',
        do_compression=False
    )
    
    scipy.io.savemat(
        os.path.join(output_dir, 'basic_v5_compressed.mat'),
        data,
        format='5',
        do_compression=True
    )
    
    print(f"  ✓ Generated v5 files in {output_dir}")


def generate_v7_files(output_dir):
    """Generate v7 MAT files"""
    print("Generating v7 files...")
    data = generate_basic_data()
    
    data['large_matrix'] = np.random.rand(256, 256)
    data['large_tensor'] = np.random.rand(64, 64, 32)
    
    scipy.io.savemat(
        os.path.join(output_dir, 'basic_v7.mat'),
        data,
        format='5',
        do_compression=False
    )
    
    scipy.io.savemat(
        os.path.join(output_dir, 'basic_v7_compressed.mat'),
        data,
        format='5',
        do_compression=True
    )
    
    print(f"  ✓ Generated v7 files in {output_dir}")


def generate_v73_files(output_dir):
    """Generate v7.3 MAT files (HDF5)"""
    print("Generating v7.3 files...")
    data = generate_basic_data()
    
    data['large_matrix'] = np.random.rand(512, 512)
    data['large_tensor'] = np.random.rand(128, 128, 64)
    data['very_large_array'] = np.random.rand(256, 256, 32)
    
    scipy.io.savemat(
        os.path.join(output_dir, 'basic_v73.mat'),
        data,
        format='5',
        do_compression=False,
        oned_as='row'
    )
    
    scipy.io.savemat(
        os.path.join(output_dir, 'basic_v73_compressed.mat'),
        data,
        format='5',
        do_compression=True
    )
    
    print(f"  ✓ Generated v7.3 files in {output_dir}")


def generate_cell_arrays(output_dir):
    """Generate files with cell arrays"""
    print("Generating cell array files...")
    
    data = {
        'cell_simple': np.array([1, 'text', 3.14], dtype=object),
        'cell_nested': np.array([
            [1, 2, 3],
            ['a', 'b', 'c'],
            [np.array([1, 2]), np.array([3, 4]), np.array([5, 6])]
        ], dtype=object)
    }
    
    scipy.io.savemat(
        os.path.join(output_dir, 'cell_arrays.mat'),
        data,
        format='5'
    )
    
    print(f"  ✓ Generated cell array files in {output_dir}")


def generate_sparse_matrices(output_dir):
    """Generate files with sparse matrices"""
    print("Generating sparse matrix files...")
    
    from scipy.sparse import random as sparse_random
    
    data = {
        'sparse_small': sparse_random(100, 100, density=0.1, format='csr'),
        'sparse_medium': sparse_random(500, 500, density=0.05, format='csr')
    }
    
    scipy.io.savemat(
        os.path.join(output_dir, 'sparse_matrices.mat'),
        data,
        format='5'
    )
    
    print(f"  ✓ Generated sparse matrix files in {output_dir}")


def main():
    """Main entry point"""
    base_dir = Path(__file__).parent.parent
    
    v5_dir = base_dir / 'v5'
    v7_dir = base_dir / 'v7'
    v73_dir = base_dir / 'v7.3'
    
    for dir_path in [v5_dir, v7_dir, v73_dir]:
        dir_path.mkdir(exist_ok=True, parents=True)
    
    print("=" * 60)
    print("MAT Test File Generator")
    print("=" * 60)
    
    generate_v5_files(v5_dir)
    generate_v7_files(v7_dir)
    generate_v73_files(v73_dir)
    generate_cell_arrays(v7_dir)
    generate_sparse_matrices(v7_dir)
    
    print("=" * 60)
    print("✓ All test files generated successfully!")
    print("=" * 60)


if __name__ == '__main__':
    main()
