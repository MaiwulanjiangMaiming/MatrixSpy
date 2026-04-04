#!/usr/bin/env python3
"""
测试脚本：MAT文件解析器功能测试
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

from mat_parser import MatParser
import json

def test_version_detection():
    """测试文件版本检测"""
    print("=" * 60)
    print("测试 2.1: 文件版本自动检测")
    print("=" * 60)
    
    parser = MatParser()
    
    test_files = [
        ('test-files/v5/basic_v5.mat', 'v5'),
        ('test-files/v7/basic_v7.mat', 'v5'),  # v7 实际保存为 v5 格式
        ('test-files/v7/cell_arrays.mat', 'v5'),
        ('test-files/v7.3/mri_data.mat', 'v5'),  # scipy 保存的也是 v5
    ]
    
    results = []
    for file_path, expected_version in test_files:
        detected = parser.detect_version(file_path)
        status = "✅" if detected == expected_version else "❌"
        results.append({
            'file': file_path,
            'expected': expected_version,
            'detected': detected,
            'status': status
        })
        print(f"{status} {file_path}")
        print(f"   预期: {expected_version}, 检测: {detected}")
    
    return all(r['status'] == "✅" for r in results)

def test_file_parsing():
    """测试文件解析"""
    print("\n" + "=" * 60)
    print("测试 2.2: 文件解析功能")
    print("=" * 60)
    
    parser = MatParser()
    
    test_cases = [
        {
            'file': 'test-files/v5/basic_v5.mat',
            'expected_vars': ['scalar_int', 'scalar_float', 'scalar_complex', 
                            'vector_1d', 'vector_complex', 'matrix_2d', 
                            'matrix_complex', 'tensor_3d', 'string_var',
                            'struct_simple', 'struct_nested']
        },
        {
            'file': 'test-files/v7/cell_arrays.mat',
            'expected_vars': ['cell_simple', 'cell_nested']
        },
        {
            'file': 'test-files/v7.3/mri_data.mat',
            'expected_vars': ['kspace', 'image', 'magnitude', 'phase', 
                            'real_part', 'imag_part', 'header']
        }
    ]
    
    results = []
    for test_case in test_cases:
        file_path = test_case['file']
        expected_vars = test_case['expected_vars']
        
        print(f"\n📄 测试文件: {file_path}")
        result = parser.parse(file_path)
        
        if result['success']:
            actual_vars = list(result['data'].keys())
            missing_vars = set(expected_vars) - set(actual_vars)
            extra_vars = set(actual_vars) - set(expected_vars)
            
            if not missing_vars and not extra_vars:
                print(f"   ✅ 解析成功")
                print(f"   ✅ 变量数量: {len(actual_vars)}")
                print(f"   ✅ 所有预期变量都存在")
                results.append(True)
            else:
                print(f"   ❌ 变量不匹配")
                if missing_vars:
                    print(f"   ❌ 缺失变量: {missing_vars}")
                if extra_vars:
                    print(f"   ⚠️  额外变量: {extra_vars}")
                results.append(False)
        else:
            print(f"   ❌ 解析失败: {result.get('error', 'Unknown error')}")
            results.append(False)
    
    return all(results)

def test_metadata_extraction():
    """测试元数据提取"""
    print("\n" + "=" * 60)
    print("测试 2.3: 元数据提取功能")
    print("=" * 60)
    
    parser = MatParser()
    
    file_path = 'test-files/v7.3/mri_data.mat'
    print(f"\n📄 测试文件: {file_path}")
    
    result = parser.get_metadata(file_path)
    
    if result['success']:
        print(f"   ✅ 元数据提取成功")
        print(f"   ✅ 版本: {result['version']}")
        print(f"\n   变量信息:")
        
        for var_name, meta in result['metadata'].items():
            print(f"   - {var_name}:")
            print(f"     类型: {meta.get('type', 'N/A')}")
            if meta.get('shape'):
                print(f"     形状: {meta['shape']}")
            if meta.get('dtype'):
                print(f"     数据类型: {meta['dtype']}")
            if meta.get('size'):
                size_kb = meta['size'] / 1024
                print(f"     大小: {size_kb:.2f} KB")
        
        return True
    else:
        print(f"   ❌ 元数据提取失败: {result.get('error', 'Unknown error')}")
        return False

def main():
    """主测试函数"""
    print("\n" + "🧪" * 30)
    print("MAT File Parser - 功能测试")
    print("🧪" * 30 + "\n")
    
    # 切换到项目根目录
    os.chdir('/Users/rock/Interesting_Projects/mat-file-viewer')
    
    # 执行测试
    test_results = []
    
    # 测试 2.1: 版本检测
    test_results.append(('版本检测', test_version_detection()))
    
    # 测试 2.2: 文件解析
    test_results.append(('文件解析', test_file_parsing()))
    
    # 测试 2.3: 元数据提取
    test_results.append(('元数据提取', test_metadata_extraction()))
    
    # 输出总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    for test_name, result in test_results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {test_name}")
    
    all_passed = all(result for _, result in test_results)
    
    if all_passed:
        print("\n🎉 所有测试通过！")
        return 0
    else:
        print("\n⚠️  部分测试失败，请检查详细输出")
        return 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
