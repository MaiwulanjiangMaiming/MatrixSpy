#!/usr/bin/env python3
"""
完整诊断脚本 - 测试所有组件
"""

import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

def test_python_parser():
    """测试 Python 解析器"""
    print("=" * 60)
    print("测试 1: Python 解析器")
    print("=" * 60)
    
    from high_perf_parser import HighPerfMatParser
    
    parser = HighPerfMatParser()
    test_file = 'test-files/v7.3/test_small.mat'
    
    try:
        result = parser.parse_file(test_file)
        print(f"✅ 解析成功")
        print(f"   版本: {result.get('version')}")
        print(f"   变量数: {len(result.get('data', {}))}")
        
        # 测试 JSON 序列化
        json_str = json.dumps(result)
        print(f"   JSON 大小: {len(json_str)} bytes")
        
        # 测试反序列化
        parsed = json.loads(json_str)
        print(f"✅ JSON 序列化/反序列化成功")
        
        return True
    except Exception as e:
        print(f"❌ 失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_extension_files():
    """测试 Extension 文件"""
    print("\n" + "=" * 60)
    print("测试 2: Extension 文件")
    print("=" * 60)
    
    files_to_check = [
        'extension/out/extension.js',
        'extension/webview-dist/main.js',
        'extension/resources/icon.svg',
        'extension/package.json'
    ]
    
    all_exist = True
    for file_path in files_to_check:
        full_path = os.path.join('/Users/rock/Interesting_Projects/mat-file-viewer', file_path)
        exists = os.path.exists(full_path)
        status = "✅" if exists else "❌"
        print(f"{status} {file_path}")
        if not exists:
            all_exist = False
    
    return all_exist


def test_webview_dist():
    """测试 Webview 编译结果"""
    print("\n" + "=" * 60)
    print("测试 3: Webview 编译结果")
    print("=" * 60)
    
    webview_file = '/Users/rock/Interesting_Projects/mat-file-viewer/extension/webview-dist/main.js'
    
    if not os.path.exists(webview_file):
        print(f"❌ 文件不存在: {webview_file}")
        return False
    
    file_size = os.path.getsize(webview_file)
    print(f"✅ 文件存在")
    print(f"   大小: {file_size / 1024 / 1024:.2f} MB")
    
    # 检查是否包含关键代码
    with open(webview_file, 'r') as f:
        content = f.read()
    
    checks = [
        ('React', 'React' in content),
        ('Plotly', 'Plotly' in content or 'plotly' in content),
        ('TreeView', 'TreeView' in content),
        ('DataPreview', 'DataPreview' in content)
    ]
    
    for name, found in checks:
        status = "✅" if found else "❌"
        print(f"{status} 包含 {name}")
    
    return all(found for _, found in checks)


def test_mat_files():
    """测试 MAT 文件"""
    print("\n" + "=" * 60)
    print("测试 4: MAT 测试文件")
    print("=" * 60)
    
    test_files = [
        'test-files/v7.3/test_small.mat',
        'test-files/v7.3/shepp_logan_2d.mat',
        'test-files/v7.3/shepp_logan_3d.mat'
    ]
    
    all_exist = True
    for file_path in test_files:
        full_path = os.path.join('/Users/rock/Interesting_Projects/mat-file-viewer', file_path)
        exists = os.path.exists(full_path)
        status = "✅" if exists else "❌"
        size = os.path.getsize(full_path) / 1024 if exists else 0
        print(f"{status} {file_path} ({size:.1f} KB)")
        if not exists:
            all_exist = False
    
    return all_exist


def main():
    """主测试"""
    os.chdir('/Users/rock/Interesting_Projects/mat-file-viewer')
    
    print("\n" + "🔍" * 30)
    print("MAT File Viewer - 完整诊断")
    print("🔍" * 30 + "\n")
    
    results = []
    
    # 运行所有测试
    results.append(("Python 解析器", test_python_parser()))
    results.append(("Extension 文件", test_extension_files()))
    results.append(("Webview 编译", test_webview_dist()))
    results.append(("MAT 测试文件", test_mat_files()))
    
    # 总结
    print("\n" + "=" * 60)
    print("诊断总结")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{status} - {name}")
    
    all_passed = all(passed for _, passed in results)
    
    if all_passed:
        print("\n✅ 所有测试通过！")
        print("\n如果插件还是不工作，请检查：")
        print("1. VSCode 是否正确加载了插件")
        print("2. 查看 Debug Console 的输出")
        print("3. 检查是否有 JavaScript 错误")
    else:
        print("\n❌ 部分测试失败，请先修复这些问题")
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
