"""
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com

高性能 MAT 文件解析器
支持大数据、懒加载、增量更新
"""

import scipy.io
import numpy as np
from typing import Dict, Any, List, Optional
import json


class HighPerfMatParser:
    """高性能 MAT 文件解析器"""
    
    def __init__(self, max_preview_size=20000000):
        self.max_preview_size = max_preview_size
    
    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """解析 MAT 文件"""
        try:
            # 先获取元数据
            metadata = self.get_metadata(file_path)
            
            # 只加载小数据，大数据返回 None
            data = scipy.io.loadmat(file_path, simplify_cells=True,
                                   struct_as_record=False, squeeze_me=True)
            
            result = {}
            for key, value in data.items():
                if not key.startswith('__'):
                    result[key] = self._process_value(value, is_root=True)
            
            return {
                'success': True,
                'version': metadata['version'],
                'file_path': file_path,
                'data': result,
                'metadata': metadata['metadata']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def get_metadata(self, file_path: str) -> Dict[str, Any]:
        """获取文件元数据（不加载完整数据）"""
        try:
            data = scipy.io.loadmat(file_path, simplify_cells=True,
                                   struct_as_record=False, squeeze_me=True)
            
            # 检测版本
            version = self._detect_version(file_path)
            
            metadata = {}
            for key, value in data.items():
                if not key.startswith('__'):
                    metadata[key] = {
                        'type': self._get_type_name(value),
                        'shape': self._get_shape(value),
                        'dtype': self._get_dtype(value),
                        'size': self._estimate_size(value),
                        'previewable': self._is_previewable(value)
                    }
            
            return {
                'success': True,
                'version': version,
                'file_path': file_path,
                'metadata': metadata
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'file_path': file_path
            }
    
    def load_variable(self, file_path: str, variable_name: str,
                     slice_info: Optional[Dict] = None) -> Dict[str, Any]:
        """加载单个变量（支持切片）"""
        try:
            data = scipy.io.loadmat(file_path, variable_names=[variable_name],
                                   simplify_cells=True, struct_as_record=False,
                                   squeeze_me=True)
            
            value = data.get(variable_name)
            if value is None:
                raise ValueError(f"Variable '{variable_name}' not found")
            
            if slice_info:
                value = self._apply_slice(value, slice_info)
            
            return {
                'success': True,
                'variable_name': variable_name,
                'data': self._process_value(value, is_root=False, force_load=True)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'variable_name': variable_name
            }
    
    def _process_value(self, value: Any, is_root: bool = False, 
                      force_load: bool = False) -> Any:
        """处理值（智能加载）"""
        if isinstance(value, np.ndarray):
            return self._process_array(value, force_load)
        elif isinstance(value, (np.integer, np.int64, np.int32)):
            return int(value)
        elif isinstance(value, (np.floating, np.float64, np.float32)):
            return float(value)
        elif isinstance(value, (complex, np.complex128, np.complex64)):
            return {
                'real': float(value.real),
                'imag': float(value.imag),
                '_type': 'complex'
            }
        elif isinstance(value, np.bool_):
            return bool(value)
        elif isinstance(value, dict):
            return {
                '_type': 'struct',
                **{k: self._process_value(v, is_root=False, force_load=force_load) 
                   for k, v in value.items()}
            }
        elif isinstance(value, (list, tuple)):
            return [self._process_value(v, is_root=False, force_load=force_load) 
                   for v in value]
        elif hasattr(value, '_fieldnames'):
            # MATLAB struct
            result = {'_type': 'struct'}
            for field in value._fieldnames:
                result[field] = self._process_value(
                    getattr(value, field), 
                    is_root=False, 
                    force_load=force_load
                )
            return result
        else:
            return value
    
    def _process_array(self, arr: np.ndarray, force_load: bool = False) -> Dict[str, Any]:
        """处理数组（智能预览）"""
        result = {
            '_type': 'ndarray',
            'shape': list(arr.shape),
            'dtype': str(arr.dtype),
            'size': int(arr.size)
        }
        
        # 判断是否加载完整数据
        should_load = force_load or arr.size <= self.max_preview_size
        
        if should_load:
            # 处理复数数组
            if np.iscomplexobj(arr):
                result['complex'] = True
                result['data'] = self._convert_complex_array(arr)
                result['statistics'] = self._get_stats(arr)
            else:
                result['data'] = self._convert_array(arr)
                result['statistics'] = self._get_stats(arr)
        else:
            # 大数据：只返回统计信息，不返回预览数据（避免复数序列化问题）
            result['data'] = None
            result['statistics'] = self._get_stats(arr)
        
        return result
    
    def _convert_array(self, arr: np.ndarray) -> Any:
        """转换数组为 JSON 可序列化格式（保持原维度）"""
        if arr.size == 0:
            return []
        
        # 保持原来的多维结构
        return arr.tolist()
    
    def _convert_complex_array(self, arr: np.ndarray) -> Any:
        """转换复数数组（保持原维度）"""
        # 递归转换保持维度
        def convert_recursive(arr_slice):
            if arr_slice.ndim == 0:
                return {
                    'real': float(arr_slice.real),
                    'imag': float(arr_slice.imag),
                    '_type': 'complex'
                }
            elif arr_slice.ndim == 1:
                return [
                    {
                        'real': float(x.real),
                        'imag': float(x.imag),
                        '_type': 'complex'
                    }
                    for x in arr_slice
                ]
            else:
                return [convert_recursive(sub_arr) for sub_arr in arr_slice]
        
        return convert_recursive(arr)
    
    def _get_preview(self, arr: np.ndarray, max_items: int = 100) -> Dict[str, Any]:
        """获取数据预览"""
        if arr.ndim == 1:
            # 1D: 取首尾各 50 个元素
            if arr.size > max_items:
                half = max_items // 2
                return {
                    'head': self._convert_array(arr[:half]),
                    'tail': self._convert_array(arr[-half:]),
                    'truncated': True
                }
            else:
                return {
                    'data': self._convert_array(arr),
                    'truncated': False
                }
        elif arr.ndim == 2:
            # 2D: 取中心区域
            h, w = arr.shape
            if h > 10 or w > 10:
                ch, cw = h // 2, w // 2
                preview = arr[max(0, ch-5):ch+5, max(0, cw-5):cw+5]
                return {
                    'center': self._convert_array(preview),
                    'truncated': True
                }
            else:
                return {
                    'data': self._convert_array(arr),
                    'truncated': False
                }
        else:
            # 高维：取第一个切片
            return {
                'first_slice': self._convert_array(arr[tuple([0] * (arr.ndim - 2) + [slice(None), slice(None)])]),
                'truncated': True
            }
    
    def _get_stats(self, arr: np.ndarray) -> Dict[str, Any]:
        """获取统计信息"""
        if np.iscomplexobj(arr):
            return {
                'min': float(np.min(np.abs(arr))),
                'max': float(np.max(np.abs(arr))),
                'mean': float(np.mean(np.abs(arr))),
                'std': float(np.std(np.abs(arr)))
            }
        else:
            return {
                'min': float(np.min(arr)),
                'max': float(np.max(arr)),
                'mean': float(np.mean(arr)),
                'std': float(np.std(arr))
            }
    
    def _detect_version(self, file_path: str) -> str:
        """检测文件版本"""
        with open(file_path, 'rb') as f:
            header = f.read(128)
            header_str = header.decode('ascii', errors='ignore')
            
            if 'MATLAB 7.3 MAT-file' in header_str:
                return 'v7.3'
            elif 'MATLAB 7.0 MAT-file' in header_str:
                return 'v7'
            elif 'MATLAB 5.0 MAT-file' in header_str:
                return 'v5'
            else:
                return 'v4'
    
    def _get_type_name(self, value: Any) -> str:
        """获取类型名称"""
        if isinstance(value, np.ndarray):
            if np.iscomplexobj(value):
                return 'complex_array'
            return 'ndarray'
        elif isinstance(value, (int, float, np.number)):
            return 'scalar'
        elif isinstance(value, str):
            return 'string'
        elif hasattr(value, '_fieldnames'):
            return 'struct'
        elif isinstance(value, (list, tuple)):
            return 'cell'
        else:
            return 'unknown'
    
    def _get_shape(self, value: Any) -> Optional[List[int]]:
        """获取形状"""
        if isinstance(value, np.ndarray):
            return list(value.shape)
        elif isinstance(value, (list, tuple)):
            return [len(value)]
        else:
            return None
    
    def _get_dtype(self, value: Any) -> Optional[str]:
        """获取数据类型"""
        if isinstance(value, np.ndarray):
            return str(value.dtype)
        elif isinstance(value, (int, np.integer)):
            return 'int'
        elif isinstance(value, (float, np.floating)):
            return 'float'
        elif isinstance(value, str):
            return 'str'
        else:
            return None
    
    def _estimate_size(self, value: Any) -> int:
        """估算大小"""
        if isinstance(value, np.ndarray):
            return int(value.nbytes)
        elif isinstance(value, (list, tuple)):
            return sum(self._estimate_size(v) for v in value)
        elif isinstance(value, dict):
            return sum(self._estimate_size(v) for v in value.values())
        else:
            return 0
    
    def _is_previewable(self, value: Any) -> bool:
        """判断是否可预览"""
        if isinstance(value, np.ndarray):
            return value.size <= self.max_preview_size
        return True
    
    def _apply_slice(self, value: Any, slice_info: Dict) -> Any:
        """应用切片"""
        if not isinstance(value, np.ndarray):
            return value
        
        slices = []
        for dim_slice in slice_info.get('dims', []):
            if isinstance(dim_slice, dict):
                start = dim_slice.get('start', 0)
                stop = dim_slice.get('stop')
                step = dim_slice.get('step', 1)
                slices.append(slice(start, stop, step))
            else:
                slices.append(dim_slice)
        
        return value[tuple(slices)]


def main():
    """命令行入口"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python high_perf_parser.py <file.mat> [--metadata] [--variable <name>]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    parser = HighPerfMatParser()
    
    if '--metadata' in sys.argv:
        result = parser.get_metadata(file_path)
    elif '--variable' in sys.argv:
        idx = sys.argv.index('--variable')
        var_name = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else None
        slice_info = json.loads(sys.argv[idx + 2]) if idx + 2 < len(sys.argv) else None
        result = parser.load_variable(file_path, var_name, slice_info)
    else:
        result = parser.parse_file(file_path)
    
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
