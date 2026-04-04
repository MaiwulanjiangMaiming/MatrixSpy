#!/usr/bin/env python3
"""
生成 Shepp-Logan Phantom MRI 模拟数据
用于测试 MRI 功能
"""

import numpy as np
import scipy.io
import os
from pathlib import Path


def shepp_logan_phantom(size=256):
    """
    生成 Shepp-Logan Phantom 图像
    
    参数:
        size: 图像大小 (size x size)
    
    返回:
        phantom: 2D Shepp-Logan phantom 图像
    """
    phantom = np.zeros((size, size))
    
    # 椭圆参数: (强度, a, b, x0, y0, theta)
    # 其中 a, b 是半轴长度，(x0, y0) 是中心，theta 是旋转角度
    ellipses = [
        (1.0, 0.69, 0.92, 0.0, 0.0, 0),      # 外层椭圆 A
        (-0.8, 0.6624, 0.874, 0.0, -0.0184, 0),  # 椭圆 B
        (-0.2, 0.11, 0.31, 0.22, 0.0, -18),   # 右侧亮区 C
        (-0.2, 0.16, 0.41, -0.22, 0.0, 18),   # 左侧亮区 D
        (0.1, 0.21, 0.25, 0.0, 0.35, 0),      # 上部亮区 E
        (0.1, 0.046, 0.046, 0.0, 0.1, 0),     # 小椭圆 F
        (0.1, 0.046, 0.046, 0.0, -0.1, 0),    # 小椭圆 G
        (0.1, 0.046, 0.023, -0.08, -0.605, 0), # 下部椭圆 H
        (0.1, 0.023, 0.023, 0.0, -0.606, 0),  # 小椭圆 I
        (-0.2, 0.056, 0.04, 0.06, -0.605, 0)  # 小暗区 J
    ]
    
    # 创建坐标网格
    x = np.linspace(-1, 1, size)
    y = np.linspace(-1, 1, size)
    X, Y = np.meshgrid(x, y)
    
    # 绘制每个椭圆
    for intensity, a, b, x0, y0, theta in ellipses:
        theta = np.radians(theta)
        
        # 旋转坐标
        X_rot = (X - x0) * np.cos(theta) + (Y - y0) * np.sin(theta)
        Y_rot = -(X - x0) * np.sin(theta) + (Y - y0) * np.cos(theta)
        
        # 椭圆方程
        mask = (X_rot / a) ** 2 + (Y_rot / b) ** 2 <= 1
        
        # 添加到 phantom
        phantom[mask] += intensity
    
    return phantom


def generate_kspace_from_image(image):
    """
    从图像生成 k-space 数据
    
    参数:
        image: 2D 图像
    
    返回:
        kspace: 复数 k-space 数据
    """
    # 傅里叶变换
    kspace = np.fft.fftshift(np.fft.fft2(image))
    return kspace


def add_noise_to_kspace(kspace, snr_db=30):
    """
    向 k-space 添加高斯噪声
    
    参数:
        kspace: k-space 数据
        snr_db: 信噪比 (dB)
    
    返回:
        noisy_kspace: 带噪声的 k-space
    """
    signal_power = np.mean(np.abs(kspace) ** 2)
    snr_linear = 10 ** (snr_db / 10)
    noise_power = signal_power / snr_linear
    
    noise_real = np.random.randn(*kspace.shape) * np.sqrt(noise_power / 2)
    noise_imag = np.random.randn(*kspace.shape) * np.sqrt(noise_power / 2)
    noise = noise_real + 1j * noise_imag
    
    noisy_kspace = kspace + noise
    return noisy_kspace


def generate_multi_slice_phantom(size=256, n_slices=16):
    """
    生成多切片 Shepp-Logan phantom
    
    参数:
        size: 图像大小
        n_slices: 切片数量
    
    返回:
        volume: 3D volume (size x size x n_slices)
    """
    volume = np.zeros((size, size, n_slices))
    
    for i in range(n_slices):
        # 为每个切片添加轻微变化
        phantom = shepp_logan_phantom(size)
        
        # 模拟切片间的变化
        variation = 0.9 + 0.2 * np.sin(2 * np.pi * i / n_slices)
        volume[:, :, i] = phantom * variation
    
    return volume


def main():
    """生成测试数据"""
    print("=" * 60)
    print("Shepp-Logan Phantom MRI 数据生成器")
    print("=" * 60)
    
    # 创建输出目录
    output_dir = Path(__file__).parent.parent / 'v7.3'
    output_dir.mkdir(exist_ok=True, parents=True)
    
    # 1. 生成 2D Shepp-Logan phantom
    print("\n📊 生成 2D Shepp-Logan Phantom...")
    phantom_2d = shepp_logan_phantom(256)
    kspace_2d = generate_kspace_from_image(phantom_2d)
    noisy_kspace_2d = add_noise_to_kspace(kspace_2d, snr_db=30)
    
    # 重建图像
    reconstructed_2d = np.abs(np.fft.ifft2(np.fft.ifftshift(kspace_2d)))
    noisy_reconstructed_2d = np.abs(np.fft.ifft2(np.fft.ifftshift(noisy_kspace_2d)))
    
    # 保存 2D 数据
    data_2d = {
        'phantom': phantom_2d,
        'kspace': kspace_2d,
        'noisy_kspace': noisy_kspace_2d,
        'reconstructed': reconstructed_2d,
        'noisy_reconstructed': noisy_reconstructed_2d,
        'magnitude': np.abs(kspace_2d),
        'phase': np.angle(kspace_2d),
        'size': 256,
        'description': 'Shepp-Logan Phantom 2D'
    }
    
    output_file = output_dir / 'shepp_logan_2d.mat'
    scipy.io.savemat(output_file, data_2d, do_compression=True)
    print(f"✅ 已保存: {output_file}")
    
    # 2. 生成 3D 多切片 phantom
    print("\n📊 生成 3D 多切片 Shepp-Logan Phantom...")
    phantom_3d = generate_multi_slice_phantom(256, 16)
    
    # 为每个切片生成 k-space
    kspace_3d = np.zeros_like(phantom_3d, dtype=complex)
    for i in range(phantom_3d.shape[2]):
        kspace_3d[:, :, i] = generate_kspace_from_image(phantom_3d[:, :, i])
    
    # 保存 3D 数据
    data_3d = {
        'phantom_3d': phantom_3d,
        'kspace_3d': kspace_3d,
        'magnitude_3d': np.abs(kspace_3d),
        'phase_3d': np.angle(kspace_3d),
        'n_slices': 16,
        'size': 256,
        'description': 'Shepp-Logan Phantom 3D Multi-slice'
    }
    
    output_file = output_dir / 'shepp_logan_3d.mat'
    scipy.io.savemat(output_file, data_3d, do_compression=True)
    print(f"✅ 已保存: {output_file}")
    
    # 3. 生成多线圈数据
    print("\n📊 生成多线圈 Shepp-Logan Phantom...")
    n_coils = 8
    coil_images = np.zeros((256, 256, n_coils), dtype=complex)
    
    for coil in range(n_coils):
        # 模拟线圈灵敏度变化
        x = np.linspace(-1, 1, 256)
        y = np.linspace(-1, 1, 256)
        X, Y = np.meshgrid(x, y)
        
        # 简单的线圈灵敏度模型
        angle = 2 * np.pi * coil / n_coils
        sensitivity = np.exp(-((X * np.cos(angle) + Y * np.sin(angle)) ** 2) / 0.5)
        
        # 应用灵敏度
        coil_images[:, :, coil] = phantom_2d * sensitivity
    
    # 生成 k-space
    coil_kspace = np.zeros_like(coil_images, dtype=complex)
    for coil in range(n_coils):
        coil_kspace[:, :, coil] = generate_kspace_from_image(coil_images[:, :, coil])
    
    # RSS 组合
    combined_image = np.sqrt(np.sum(np.abs(coil_images) ** 2, axis=2))
    
    # 保存多线圈数据
    data_coil = {
        'coil_images': coil_images,
        'coil_kspace': coil_kspace,
        'coil_sensitivities': np.zeros((256, 256, n_coils)),  # 占位符
        'combined_image': combined_image,
        'n_coils': n_coils,
        'description': 'Shepp-Logan Phantom Multi-coil'
    }
    
    output_file = output_dir / 'shepp_logan_multicoil.mat'
    scipy.io.savemat(output_file, data_coil, do_compression=True)
    print(f"✅ 已保存: {output_file}")
    
    # 输出统计信息
    print("\n" + "=" * 60)
    print("数据统计")
    print("=" * 60)
    print(f"2D Phantom 大小: {phantom_2d.shape}")
    print(f"2D k-space 大小: {kspace_2d.shape}")
    print(f"3D Phantom 大小: {phantom_3d.shape}")
    print(f"3D k-space 大小: {kspace_3d.shape}")
    print(f"多线圈图像大小: {coil_images.shape}")
    print(f"多线圈 k-space 大小: {coil_kspace.shape}")
    
    print("\n" + "=" * 60)
    print("✅ 所有 Shepp-Logan Phantom 数据生成完成！")
    print("=" * 60)


if __name__ == '__main__':
    main()
