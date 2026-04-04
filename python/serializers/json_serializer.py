"""
JSON Serializer for MAT data
"""

import json
import numpy as np
from typing import Any, Dict


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for NumPy types"""
    
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            if obj.size < 10000:
                return {
                    '_type': 'ndarray',
                    'shape': list(obj.shape),
                    'dtype': str(obj.dtype),
                    'data': obj.tolist()
                }
            else:
                return {
                    '_type': 'ndarray',
                    'shape': list(obj.shape),
                    'dtype': str(obj.dtype),
                    'data': None,
                    'large': True
                }
        elif isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, np.complex128):
            return {
                'real': float(obj.real),
                'imag': float(obj.imag),
                '_type': 'complex'
            }
        elif isinstance(obj, np.bool_):
            return bool(obj)
        return super().default(obj)


class JSONSerializer:
    """JSON serializer for MAT data"""
    
    def __init__(self):
        self.encoder = NumpyEncoder
    
    def serialize(self, data: Dict[str, Any]) -> str:
        """Serialize data to JSON string"""
        return json.dumps(data, cls=self.encoder, indent=2)
    
    def serialize_to_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize data to dictionary (for further processing)"""
        return json.loads(self.serialize(data))
