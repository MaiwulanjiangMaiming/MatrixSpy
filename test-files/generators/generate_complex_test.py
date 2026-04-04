"""
生成包含复数矩阵的测试 MAT 文件
"""

import numpy as np
import scipy.io

data = {
    'scalar_int': 42,
    'scalar_float': 3.14159,
    'scalar_complex': 1 + 2j,
    
    'vector_small': np.arange(10, dtype=np.float64),
    'vector_complex': np.arange(100, dtype=np.float64) + 1j * np.arange(100, dtype=np.float64),
    
    'matrix_small': np.random.rand(16, 16),
    'matrix_complex': (np.random.rand(64, 64) - 0.5) + 1j * (np.random.rand(64, 64) - 0.5),
    
    'metadata': {
        'TR': 500,
        'TE': 30,
        'FOV': [256, 256],
        'voxel_size': [1.0, 1.0, 3.0],
        'num_slices': 16
    },
    
    'description': 'Test file with complex matrices for MAT File Viewer'
}

scipy.io.savemat('test-files/v7.3/test_complex.mat', data)

print('✅ test_complex.mat 已创建！')
print('包含:')
print('  - scalar_int: 42')
print('  - scalar_float: 3.14159')
print('  - scalar_complex: 1+2j')
print('  - vector_small: 10 elements')
print('  - vector_complex: 100 complex elements')
print('  - matrix_small: 16×16')
print('  - matrix_complex: 64×64 complex')
print('  - metadata: struct')
print('  - description: string')
