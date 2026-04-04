#!/usr/bin/env python3
"""
诊断脚本 - 测试 Python 解析器和数据传递
"""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

from mat_parser import MatParser


def test_parser():
    """测试解析器"""
    print("=" * 60)
    print("MAT File Parser 诊断测试")
    print("=" * 60)
    
    parser = MatParser()
    
    # 测试文件
    test_file = 'test-files/v7.3/test_small.mat'
    
    print(f"\n1. 测试文件: {test_file}")
    print(f"   文件存在: {os.path.exists(test_file)}")
    
    if not os.path.exists(test_file):
        print("   ❌ 文件不存在！")
        return False
    
    # 测试元数据提取
    print("\n2. 测试元数据提取...")
    try:
        metadata = parser.get_metadata(test_file)
        print(f"   ✅ 成功")
        print(f"   版本: {metadata.get('version')}")
        print(f"   变量数: {len(metadata.get('metadata', {}))}")
        print(f"   变量列表: {list(metadata.get('metadata', {}).keys())}")
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 测试完整解析
    print("\n3. 测试完整解析...")
    try:
        result = parser.parse(test_file)
        print(f"   ✅ 成功")
        print(f"   数据大小: {len(json.dumps(result))} bytes")
        
        # 检查数据结构
        if result.get('success'):
            data = result.get('data', {})
            print(f"   变量数: {len(data)}")
            
            for var_name, var_data in list(data.items())[:3]:
                if isinstance(var_data, dict):
                    print(f"   - {var_name}: {var_data.get('_type')}, shape={var_data.get('shape')}")
                    if var_data.get('data') is not None:
                        print(f"     数据大小: {len(json.dumps(var_data['data']))} bytes")
        else:
            print(f"   ❌ 解析失败: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 60)
    print("✅ 所有测试通过！")
    print("=" * 60)
    return True


if __name__ == '__main__':
    os.chdir('/Users/rock/Interesting_Projects/mat-file-viewer')
    success = test_parser()
    sys.exit(0 if success else 1)
