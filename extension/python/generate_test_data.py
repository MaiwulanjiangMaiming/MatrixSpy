import numpy as np
import scipy.io as sio
import os
import h5py

output_dir = '/Users/rock/Documents/PKU_projects/GRAFT-MRI/test_mat_files'
os.makedirs(output_dir, exist_ok=True)

sio.savemat(os.path.join(output_dir, 'basic_test.mat'), {
    'scalar_double': 3.14159,
    'scalar_int': 42,
    'vector_1d': np.array([1.0, 2.0, 3.0, 4.0, 5.0]),
    'matrix_2d': np.random.randn(10, 10),
})
print('basic_test.mat created')

sio.savemat(os.path.join(output_dir, 'complex_test.mat'), {
    'complex_scalar': complex(3.5, 2.1),
    'kspace_data': np.random.randn(64, 64) + 1j * np.random.randn(64, 64),
})
print('complex_test.mat created')

sio.savemat(os.path.join(output_dir, 'mri_3d_test.mat'), {
    'kdata': np.random.randn(32, 32, 16) + 1j * np.random.randn(32, 32, 16),
    'phantom_2d': np.random.randn(128, 128),
})
print('mri_3d_test.mat created')

sio.savemat(os.path.join(output_dir, 'fmri_4d_test.mat'), {
    'fmri_data': np.random.randn(64, 64, 30, 10),
    't1_map': np.random.rand(128, 128) * 3.0,
})
print('fmri_4d_test.mat created')

sio.savemat(os.path.join(output_dir, 'struct_test.mat'), {
    'patient': {'name': 'Test Patient', 'age': 35},
    'data': {'magnitude': np.random.randn(64, 64, 20)},
})
print('struct_test.mat created')

with h5py.File(os.path.join(output_dir, 'large_v73_test.mat'), 'w') as f:
    f.create_dataset('large_4d', data=np.random.randn(100, 100, 50, 5))
    f.create_dataset('kspace_h5', data=np.random.randn(128, 128, 32) + 1j * np.random.randn(128, 128, 32))
print('large_v73_test.mat created')

sio.savemat(os.path.join(output_dir, 'edge_case_test.mat'), {
    'nan_values': np.array([1.0, float('nan'), 3.0]),
    'very_small': np.array([1e-10, 1e-20]),
})
print('edge_case_test.mat created')

print('All test files created in:', output_dir)
