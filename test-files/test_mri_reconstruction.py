#!/usr/bin/env python3
"""
MRI 图像重建功能测试 - 修复版
直接使用 scipy 加载数据进行测试
"""

import sys
import os
import numpy as np
import scipy.io
import matplotlib
matplotlib.use('Agg')  # 非交互式后端
import matplotlib.pyplot as plt
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

from utils.mri_tools import MRITools


def test_mri_reconstruction():
    """测试 MRI 图像重建功能"""
    print("=" * 60)
    print("MRI 图像重建功能测试")
    print("=" * 60)
    
    mri_tools = MRITools()
    
    # 测试文件
    test_file = 'test-files/v7.3/shepp_logan_2d.mat'
    
    print(f"\n📄 加载文件: {test_file}")
    data = scipy.io.loadmat(test_file)
    
    print("✅ 文件加载成功")
    print(f"   变量列表: {[k for k in data.keys() if not k.startswith('__')]}")
    
    # 提取数据
    phantom = data['phantom']
    kspace = data['kspace']
    magnitude = data['magnitude']
    phase = data['phase']
    
    print(f"\n📊 数据形状:")
    print(f"   Phantom: {phantom.shape}, dtype: {phantom.dtype}")
    print(f"   k-space: {kspace.shape}, dtype: {kspace.dtype}")
    print(f"   Magnitude: {magnitude.shape}, dtype: {magnitude.dtype}")
    print(f"   Phase: {phase.shape}, dtype: {phase.dtype}")
    
    # 测试 1: k-space 到图像重建
    print("\n" + "=" * 60)
    print("测试 1: k-space → 图像重建")
    print("=" * 60)
    
    reconstructed = mri_tools.kspace_to_image(kspace)
    reconstructed_magnitude = mri_tools.get_magnitude(reconstructed)
    
    # 计算重建误差
    error = np.abs(phantom - reconstructed_magnitude)
    max_error = np.max(error)
    mean_error = np.mean(error)
    
    print(f"✅ 重建完成")
    print(f"   最大误差: {max_error:.6e}")
    print(f"   平均误差: {mean_error:.6e}")
    
    if max_error < 1e-10:
        print("✅ 重建精度: 优秀（误差 < 1e-10）")
    elif max_error < 1e-6:
        print("✅ 重建精度: 良好（误差 < 1e-6）")
    else:
        print("⚠️  重建精度: 需要改进")
    
    # 测试 2: 幅度和相位提取
    print("\n" + "=" * 60)
    print("测试 2: 幅度和相位提取")
    print("=" * 60)
    
    mag = mri_tools.get_magnitude(kspace)
    phs = mri_tools.get_phase(kspace)
    
    print(f"✅ 幅度范围: [{np.min(mag):.2f}, {np.max(mag):.2f}]")
    print(f"✅ 相位范围: [{np.min(phs):.2f}, {np.max(phs):.2f}] rad")
    
    # 测试 3: 多切片处理
    print("\n" + "=" * 60)
    print("测试 3: 多切片 MRI 处理")
    print("=" * 60)
    
    test_file_3d = 'test-files/v7.3/shepp_logan_3d.mat'
    data_3d = scipy.io.loadmat(test_file_3d)
    
    phantom_3d = data_3d['phantom_3d']
    kspace_3d = data_3d['kspace_3d']
    
    print(f"✅ 3D 数据加载成功")
    print(f"   形状: {phantom_3d.shape}")
    
    # 提取单个切片
    slice_idx = 8
    slice_2d = mri_tools.extract_slice(phantom_3d, slice_idx, axis=2)
    print(f"✅ 提取切片 {slice_idx}: {slice_2d.shape}")
    
    # 生成马赛克
    mosaic = mri_tools.generate_mosaic(phantom_3d, axis=2, cols=4)
    print(f"✅ 生成马赛克: {mosaic.shape}")
    
    # 测试 4: 多线圈处理
    print("\n" + "=" * 60)
    print("测试 4: 多线圈 MRI 处理")
    print("=" * 60)
    
    test_file_coil = 'test-files/v7.3/shepp_logan_multicoil.mat'
    data_coil = scipy.io.loadmat(test_file_coil)
    
    coil_images = data_coil['coil_images']
    
    print(f"✅ 多线圈数据加载成功")
    print(f"   形状: {coil_images.shape}")
    
    # RSS 组合
    combined = mri_tools.rss_combine(np.abs(coil_images), axis=2)
    print(f"✅ RSS 组合完成: {combined.shape}")
    print(f"   组合图像范围: [{np.min(combined):.2f}, {np.max(combined):.2f}]")
    
    # 测试 5: k-space 分析
    print("\n" + "=" * 60)
    print("测试 5: k-space 分析")
    print("=" * 60)
    
    analysis = mri_tools.analyze_kspace(kspace)
    print(f"✅ k-space 分析完成:")
    print(f"   形状: {analysis['shape']}")
    print(f"   是否复数: {analysis['is_complex']}")
    print(f"   幅度统计:")
    print(f"     最小值: {analysis['magnitude_stats']['min']:.2e}")
    print(f"     最大值: {analysis['magnitude_stats']['max']:.2e}")
    print(f"     平均值: {analysis['magnitude_stats']['mean']:.2e}")
    print(f"     标准差: {analysis['magnitude_stats']['std']:.2e}")
    
    return True, phantom, kspace, magnitude, phase


def create_visualization(phantom, kspace, magnitude, phase):
    """创建可视化图像"""
    print("\n" + "=" * 60)
    print("生成可视化图像")
    print("=" * 60)
    
    mri_tools = MRITools()
    
    # 创建图形
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    
    # 原始图像
    axes[0, 0].imshow(phantom, cmap='gray')
    axes[0, 0].set_title('Original Phantom', fontsize=14, fontweight='bold')
    axes[0, 0].axis('off')
    
    # k-space 幅度（对数）
    axes[0, 1].imshow(np.log(magnitude + 1), cmap='hot')
    axes[0, 1].set_title('k-space Magnitude (log)', fontsize=14, fontweight='bold')
    axes[0, 1].axis('off')
    
    # k-space 相位
    axes[0, 2].imshow(phase, cmap='twilight')
    axes[0, 2].set_title('k-space Phase', fontsize=14, fontweight='bold')
    axes[0, 2].axis('off')
    
    # 重建图像
    reconstructed = mri_tools.kspace_to_image(kspace)
    reconstructed_mag = mri_tools.get_magnitude(reconstructed)
    
    axes[1, 0].imshow(reconstructed_mag, cmap='gray')
    axes[1, 0].set_title('Reconstructed Image', fontsize=14, fontweight='bold')
    axes[1, 0].axis('off')
    
    # 重建误差
    error = np.abs(phantom - reconstructed_mag)
    im = axes[1, 1].imshow(error, cmap='hot', vmin=0, vmax=1e-10)
    axes[1, 1].set_title(f'Reconstruction Error\n(max: {np.max(error):.2e})', 
                         fontsize=14, fontweight='bold')
    axes[1, 1].axis('off')
    plt.colorbar(im, ax=axes[1, 1], fraction=0.046, pad=0.04)
    
    # 误差直方图
    axes[1, 2].hist(error.flatten(), bins=50, color='blue', alpha=0.7, edgecolor='black')
    axes[1, 2].set_title('Error Distribution', fontsize=14, fontweight='bold')
    axes[1, 2].set_xlabel('Error', fontsize=12)
    axes[1, 2].set_ylabel('Frequency', fontsize=12)
    axes[1, 2].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    # 保存图像
    output_path = 'test-files/v7.3/mri_reconstruction_test.png'
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    print(f"✅ 可视化图像已保存: {output_path}")
    plt.close()
    
    return True


def main():
    """主测试函数"""
    print("\n" + "🧪" * 30)
    print("MAT File Viewer - MRI 功能完整测试")
    print("🧪" * 30 + "\n")
    
    # 切换到项目根目录
    os.chdir('/Users/rock/Interesting_Projects/mat-file-viewer')
    
    # 测试 MRI 重建功能
    result = test_mri_reconstruction()
    
    if result[0]:
        # 生成可视化
        create_visualization(result[1], result[2], result[3], result[4])
    
    print("\n" + "=" * 60)
    print("✅ MRI 功能测试完成！")
    print("=" * 60)
    
    return 0 if result[0] else 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
