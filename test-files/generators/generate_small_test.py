#!/usr/bin/env python3
"""
生成小型测试数据，用于快速验证插件功能
"""

import numpy as np
import scipy.io
from pathlib import Path


def generate_small_test_data():
    """生成小型测试数据"""
    print("=" * 60)
    print("生成小型测试数据")
    print("=" * 60)
    
    output_dir = Path(__file__).parent.parent / 'v7.3'
    output_dir.mkdir(exist_ok=True, parents=True)
    
    # 创建小型测试数据
    data = {
        # 标量
        'scalar_int': 42,
        'scalar_float': 3.14159,
        'scalar_complex': 1 + 2j,
        
        # 小向量
        'vector_small': np.arange(10, dtype=float),
        
        # 小矩阵 (16x16)
        'matrix_small': np.random.rand(16, 16),
        
        # 小型 Shepp-Logan phantom (64x64)
        'phantom_small': generate_small_phantom(64),
        
        # 简单的结构体
        'metadata': {
            'patient_id': 'TEST001',
            'scan_date': '2026-04-04',
            'resolution': [64, 64],
            'TR': 500.0,
            'TE': 30.0
        },
        
        # 字符串
        'description': 'Small test dataset for MAT File Viewer'
    }
    
    output_file = output_dir / 'test_small.mat'
    scipy.io.savemat(output_file, data, do_compression=True)
    print(f"✅ 已保存: {output_file}")
    
    # 验证数据
    loaded = scipy.io.loadmat(output_file)
    print(f"\n📊 验证数据:")
    for key in data.keys():
        if not key.startswith('__'):
            print(f"   - {key}: {type(data[key])}")
    
    return output_file


def generate_small_phantom(size=64):
    """生成小型 Shepp-Logan phantom"""
    phantom = np.zeros((size, size))
    
    # 简化的椭圆参数
    ellipses = [
        (1.0, 0.69, 0.92, 0.0, 0.0, 0),
        (-0.8, 0.6624, 0.874, 0.0, -0.0184, 0),
        (-0.2, 0.11, 0.31, 0.22, 0.0, -18),
        (-0.2, 0.16, 0.41, -0.22, 0.0, 18),
        (0.1, 0.21, 0.25, 0.0, 0.35, 0),
    ]
    
    x = np.linspace(-1, 1, size)
    y = np.linspace(-1, 1, size)
    X, Y = np.meshgrid(x, y)
    
    for intensity, a, b, x0, y0, theta in ellipses:
        theta = np.radians(theta)
        X_rot = (X - x0) * np.cos(theta) + (Y - y0) * np.sin(theta)
        Y_rot = -(X - x0) * np.sin(theta) + (Y - y0) * np.cos(theta)
        mask = (X_rot / a) ** 2 + (Y_rot / b) ** 2 <= 1
        phantom[mask] += intensity
    
    return phantom


if __name__ == '__main__':
    generate_small_test_data()
