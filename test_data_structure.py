#!/usr/bin/env python3

import sys
import json

sys.path.insert(0, 'python')
import subprocess

result = json.loads(
    subprocess.check_output([sys.executable, 'python/high_perf_parser.py', 'test-files/v7.3/test_3d_mri.mat'])
)

print('=== phantom_2d ===')
print('Type:', type(result['data']['phantom_2d']))
print('Has _type:', result['data']['phantom_2d'].get('_type', 'N/A'))
print('Shape:', result['data']['phantom_2d'].get('shape', 'N/A'))
print('Has complex:', result['data']['phantom_2d'].get('complex', False))
print('Has data:', 'data' in result['data']['phantom_2d'])
if 'data' in result['data']['phantom_2d']:
    print('Data is 2D:', isinstance(result['data']['phantom_2d']['data'], list) and len(result['data']['phantom_2d']['data']) > 0 and isinstance(result['data']['phantom_2d']['data'][0], list))

print()
print('=== kspace_2d ===')
print('Has complex:', result['data']['kspace_2d'].get('complex', False))
print('Has data:', 'data' in result['data']['kspace_2d'])
if 'data' in result['data']['kspace_2d'] and len(result['data']['kspace_2d']['data']) > 0:
    print('Data[0][0]:', result['data']['kspace_2d']['data'][0][0])

print()
print('=== phantom_3d ===')
print('Shape:', result['data']['phantom_3d'].get('shape', 'N/A'))
print('Has data:', 'data' in result['data']['phantom_3d'])
if 'data' in result['data']['phantom_3d']:
    print('Data length:', len(result['data']['phantom_3d']['data']))
    if len(result['data']['phantom_3d']['data']) > 0:
        print('Data[0] length:', len(result['data']['phantom_3d']['data'][0]))
        if len(result['data']['phantom_3d']['data'][0]) > 0:
            print('Data[0][0] length:', len(result['data']['phantom_3d']['data'][0][0]))
