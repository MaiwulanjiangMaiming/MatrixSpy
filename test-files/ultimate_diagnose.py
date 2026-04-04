#!/usr/bin/env python3
"""
终极诊断脚本 - 找出所有问题
"""

import sys
import os
import json
import subprocess

def test_1_python_parser():
    """测试 1: Python 解析器"""
    print("=" * 60)
    print("测试 1: Python 解析器")
    print("=" * 60)
    
    test_file = 'test-files/v7.3/test_small.mat'
    
    try:
        result = subprocess.run(
            ['python3', 'python/high_perf_parser.py', test_file],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print(f"❌ Python 执行失败")
            print(f"错误: {result.stderr}")
            return False
        
        # 尝试解析 JSON
        try:
            data = json.loads(result.stdout)
            print(f"✅ 解析成功")
            print(f"   版本: {data.get('version')}")
            print(f"   变量数: {len(data.get('data', {}))}")
            print(f"   JSON 大小: {len(result.stdout)} bytes")
            return True
        except json.JSONDecodeError as e:
            print(f"❌ JSON 解析失败: {e}")
            print(f"输出前 500 字符: {result.stdout[:500]}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Python 执行超时")
        return False
    except Exception as e:
        print(f"❌ 执行失败: {e}")
        return False


def test_2_extension_files():
    """测试 2: Extension 文件完整性"""
    print("\n" + "=" * 60)
    print("测试 2: Extension 文件完整性")
    print("=" * 60)
    
    files = {
        'extension/out/extension.js': 'Extension 主文件',
        'extension/webview-dist/main.js': 'Webview 主文件',
        'extension/package.json': 'Package 配置',
        'extension/resources/icon.svg': '图标文件'
    }
    
    all_ok = True
    for file_path, desc in files.items():
        full_path = os.path.join('/Users/rock/Interesting_Projects/mat-file-viewer', file_path)
        if os.path.exists(full_path):
            size = os.path.getsize(full_path)
            print(f"✅ {desc}: {size} bytes")
        else:
            print(f"❌ {desc}: 不存在")
            all_ok = False
    
    return all_ok


def test_3_webview_content():
    """测试 3: Webview 内容检查"""
    print("\n" + "=" * 60)
    print("测试 3: Webview 内容检查")
    print("=" * 60)
    
    webview_file = '/Users/rock/Interesting_Projects/mat-file-viewer/extension/webview-dist/main.js'
    
    if not os.path.exists(webview_file):
        print("❌ Webview 文件不存在")
        return False
    
    with open(webview_file, 'r') as f:
        content = f.read()
    
    checks = {
        'React': 'React' in content,
        'TreeView': 'TreeView' in content,
        'DataPreview': 'DataPreview' in content,
        'App': 'App' in content,
        'Canvas': 'canvas' in content.lower()
    }
    
    all_ok = True
    for name, found in checks.items():
        status = "✅" if found else "❌"
        print(f"{status} 包含 {name}")
        if not found:
            all_ok = False
    
    return all_ok


def test_4_package_json():
    """测试 4: package.json 配置检查"""
    print("\n" + "=" * 60)
    print("测试 4: package.json 配置检查")
    print("=" * 60)
    
    package_file = '/Users/rock/Interesting_Projects/mat-file-viewer/extension/package.json'
    
    with open(package_file, 'r') as f:
        package = json.load(f)
    
    checks = {
        'main': package.get('main') == './out/extension.js',
        'activationEvents': 'onCustomEditor:matViewer.matFile' in package.get('activationEvents', []),
        'customEditors': len(package.get('contributes', {}).get('customEditors', [])) > 0,
        'views': 'matViewerVariables' in str(package.get('contributes', {}).get('views', {}))
    }
    
    all_ok = True
    for name, passed in checks.items():
        status = "✅" if passed else "❌"
        print(f"{status} {name}")
        if not passed:
            all_ok = False
    
    return all_ok


def test_5_mat_files():
    """测试 5: MAT 文件存在性"""
    print("\n" + "=" * 60)
    print("测试 5: MAT 文件存在性")
    print("=" * 60)
    
    test_files = [
        'test-files/v7.3/test_small.mat',
        'test-files/v7.3/shepp_logan_2d.mat'
    ]
    
    all_ok = True
    for file_path in test_files:
        full_path = os.path.join('/Users/rock/Interesting_Projects/mat-file-viewer', file_path)
        if os.path.exists(full_path):
            size = os.path.getsize(full_path) / 1024
            print(f"✅ {file_path}: {size:.1f} KB")
        else:
            print(f"❌ {file_path}: 不存在")
            all_ok = False
    
    return all_ok


def main():
    """主诊断"""
    os.chdir('/Users/rock/Interesting_Projects/mat-file-viewer')
    
    print("\n" + "🔍" * 30)
    print("MAT File Viewer - 终极诊断")
    print("🔍" * 30 + "\n")
    
    results = []
    results.append(("Python 解析器", test_1_python_parser()))
    results.append(("Extension 文件", test_2_extension_files()))
    results.append(("Webview 内容", test_3_webview_content()))
    results.append(("Package 配置", test_4_package_json()))
    results.append(("MAT 文件", test_5_mat_files()))
    
    print("\n" + "=" * 60)
    print("诊断总结")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{status} - {name}")
    
    all_passed = all(passed for _, passed in results)
    
    if all_passed:
        print("\n✅ 所有测试通过！")
        print("\n如果插件还是不工作，可能的原因：")
        print("1. VSCode 缓存问题 - 尝试重启 VSCode")
        print("2. Extension 未正确加载 - 查看 Debug Console")
        print("3. Webview 未正确渲染 - 检查浏览器控制台")
    else:
        print("\n❌ 发现问题，请先修复上述失败项")
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
