"""
生成包含三维 MRI 数据的测试 MAT 文件
用于演示三维查看器和图像可视化
"""

import numpy as np
import scipy.io

def generate_shepp_logan_2d(size=256):
    """生成 2D Shepp-Logan Phantom"""
    x = np.linspace(-1, 1, size)
    y = np.linspace(-1, 1, size)
    X, Y = np.meshgrid(x, y)
    
    phantom = np.zeros_like(X)
    
    ellipses = [
        (0.69, 0.92, 0.0, 0.0, 0, 1.0),
        (0.6624, 0.874, 0.0, -0.0184, 0, -0.8),
        (0.41, 0.16, -0.22, 0.0, -18, -0.2),
        (0.31, 0.11, 0.22, 0.0, 18, -0.2),
        (0.21, 0.25, 0.0, 0.35, 0, 0.1),
        (0.046, 0.046, 0.0, 0.1, 0, 0.1),
        (0.046, 0.046, 0.0, -0.1, 0, 0.1),
        (0.046, 0.023, -0.08, -0.605, 0, 0.1),
        (0.023, 0.023, 0.0, -0.606, 0, 0.1),
        (0.023, 0.046, 0.06, -0.605, 0, 0.1),
    ]
    
    for a, b, x0, y0, phi, amp in ellipses:
        phi_rad = np.deg2rad(phi)
        cos_phi = np.cos(phi_rad)
        sin_phi = np.sin(phi_rad)
        
        x_rot = (X - x0) * cos_phi + (Y - y0) * sin_phi
        y_rot = -(X - x0) * sin_phi + (Y - y0) * cos_phi
        
        mask = (x_rot / a) ** 2 + (y_rot / b) ** 2 <= 1
        phantom[mask] += amp
    
    return phantom

def generate_kspace(image):
    """生成 k-space 数据（FFT）"""
    kspace = np.fft.fftshift(np.fft.fft2(np.fft.ifftshift(image)))
    return kspace

print('生成 2D Shepp-Logan Phantom...')
phantom_2d = generate_shepp_logan_2d(256)

print('生成 k-space...')
kspace_2d = generate_kspace(phantom_2d)

print('生成 3D 数据...')
num_slices = 16
phantom_3d = np.zeros((256, 256, num_slices), dtype=np.complex128)
kspace_3d = np.zeros((256, 256, num_slices), dtype=np.complex128)

for i in range(num_slices):
    # 每个切片稍微不同，模拟 3D 体积
    shift = (i - num_slices / 2) * 0.05
    phantom_slice = generate_shepp_logan_2d(256)
    phantom_3d[:, :, i] = phantom_slice + 1j * np.zeros_like(phantom_slice)
    kspace_3d[:, :, i] = generate_kspace(phantom_slice)

data = {
    'phantom_2d': phantom_2d,
    'kspace_2d': kspace_2d,
    'phantom_3d': phantom_3d,
    'kspace_3d': kspace_3d,
    
    'scalar_float': 3.14159,
    
    'vector_small': np.arange(10, dtype=np.float64),
    'matrix_small': np.random.rand(16, 16),
    'matrix_complex': (np.random.rand(64, 64) - 0.5) + 1j * (np.random.rand(64, 64) - 0.5),
    
    'metadata': {
        'TR': 500,
        'TE': 30,
        'FOV': [256, 256, 48],
        'voxel_size': [1.0, 1.0, 3.0],
        'num_slices': num_slices,
        'matrix_size': [256, 256]
    },
    
    'description': '3D MRI data with Shepp-Logan Phantom and k-space'
}

scipy.io.savemat('test-files/v7.3/test_3d_mri.mat', data)

print('✅ test_3d_mri.mat 已创建！')
print('包含:')
print('  - phantom_2d: 256×256')
print('  - kspace_2d: 256×256 complex')
print('  - phantom_3d: 256×256×16 complex')
print('  - kspace_3d: 256×256×16 complex')
print('  - matrix_small: 16×16')
print('  - matrix_complex: 64×64 complex')
print('  - metadata: struct')
print('  - description: string')
print()
print('使用方法:')
print('  1. 点击 phantom_2d 查看 2D 图像')
print('  2. 点击 kspace_2d 查看 2D k-space (选择 view mode: Magnitude/Phase)')
print('  3. 点击 phantom_3d 查看 3D 数据 (使用 Slice 滑块)')
print('  4. 点击 kspace_3d 查看 3D k-space')
