#!/usr/bin/env python3
"""
Generate MRI test data
"""

import numpy as np
import scipy.io
import os
from pathlib import Path


def generate_kspace(shape=(256, 256, 32)):
    """Generate synthetic k-space data"""
    kspace = np.random.randn(*shape) + 1j * np.random.randn(*shape)
    
    center = [s // 2 for s in shape]
    for i, c in enumerate(center):
        kspace = np.roll(kspace, c, axis=i)
    
    return kspace


def generate_mri_image(shape=(256, 256, 32)):
    """Generate synthetic MRI image"""
    image = np.zeros(shape, dtype=np.complex128)
    
    center = [s // 2 for s in shape]
    
    for z in range(shape[2]):
        for y in range(shape[1]):
            for x in range(shape[0]):
                dist = np.sqrt((x - center[0])**2 + (y - center[1])**2)
                if dist < min(center[0], center[1]) * 0.8:
                    image[x, y, z] = np.random.rand() + 1j * np.random.rand() * 0.1
    
    return image


def generate_mri_data(output_dir):
    """Generate MRI test data"""
    print("Generating MRI test data...")
    
    kspace = generate_kspace((128, 128, 16))
    image = generate_mri_image((128, 128, 16))
    
    data = {
        'kspace': kspace,
        'image': image,
        'magnitude': np.abs(image),
        'phase': np.angle(image),
        'real_part': image.real,
        'imag_part': image.imag,
        'header': {
            'TR': 500.0,
            'TE': 30.0,
            'FOV': [256.0, 256.0],
            'matrix_size': [128, 128],
            'n_slices': 16,
            'patient_id': 'TEST001',
            'scan_date': '2026-04-04'
        }
    }
    
    scipy.io.savemat(
        os.path.join(output_dir, 'mri_data.mat'),
        data,
        format='5',
        do_compression=True
    )
    
    print(f"  ✓ Generated MRI data in {output_dir}")


def generate_multi_coil_data(output_dir):
    """Generate multi-coil MRI data"""
    print("Generating multi-coil MRI data...")
    
    n_coils = 8
    shape = (64, 64, 8, n_coils)
    
    coils = np.random.randn(*shape) + 1j * np.random.randn(*shape)
    
    data = {
        'coil_images': coils,
        'n_coils': n_coils,
        'combined_image': np.sqrt(np.sum(np.abs(coils)**2, axis=-1))
    }
    
    scipy.io.savemat(
        os.path.join(output_dir, 'multi_coil_mri.mat'),
        data,
        format='5',
        do_compression=True
    )
    
    print(f"  ✓ Generated multi-coil MRI data in {output_dir}")


def generate_large_mri_data(output_dir):
    """Generate large MRI dataset for performance testing"""
    print("Generating large MRI dataset...")
    
    shape_3d = (256, 256, 64)
    kspace_large = generate_kspace(shape_3d)
    
    data = {
        'kspace_large': kspace_large,
        'image_large': generate_mri_image(shape_3d)
    }
    
    scipy.io.savemat(
        os.path.join(output_dir, 'large_mri.mat'),
        data,
        format='5',
        do_compression=True
    )
    
    print(f"  ✓ Generated large MRI data in {output_dir}")


def main():
    """Main entry point"""
    base_dir = Path(__file__).parent.parent
    v73_dir = base_dir / 'v7.3'
    v73_dir.mkdir(exist_ok=True, parents=True)
    
    print("=" * 60)
    print("MRI Test Data Generator")
    print("=" * 60)
    
    generate_mri_data(v73_dir)
    generate_multi_coil_data(v73_dir)
    generate_large_mri_data(v73_dir)
    
    print("=" * 60)
    print("✓ All MRI test data generated successfully!")
    print("=" * 60)


if __name__ == '__main__':
    main()
