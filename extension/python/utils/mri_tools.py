"""
MRI Tools for k-space and image processing
"""

import numpy as np
from typing import Dict, Any, Tuple, Optional


class MRITools:
    """MRI-specific processing tools"""
    
    @staticmethod
    def kspace_to_image(kspace: np.ndarray, axes: Tuple[int, ...] = (-2, -1)) -> np.ndarray:
        """
        Convert k-space to image space using inverse FFT
        
        Args:
            kspace: k-space data (complex)
            axes: Axes along which to perform FFT
        
        Returns:
            Image space data (complex)
        """
        if not np.iscomplexobj(kspace):
            raise ValueError("k-space data must be complex")
        
        image = np.fft.ifftn(np.fft.ifftshift(kspace, axes=axes), axes=axes)
        return image
    
    @staticmethod
    def image_to_kspace(image: np.ndarray, axes: Tuple[int, ...] = (-2, -1)) -> np.ndarray:
        """
        Convert image space to k-space using forward FFT
        
        Args:
            image: Image space data (complex)
            axes: Axes along which to perform FFT
        
        Returns:
            k-space data (complex)
        """
        if not np.iscomplexobj(image):
            raise ValueError("Image data must be complex")
        
        kspace = np.fft.fftshift(np.fft.fftn(image, axes=axes), axes=axes)
        return kspace
    
    @staticmethod
    def get_magnitude(data: np.ndarray) -> np.ndarray:
        """Get magnitude of complex data"""
        return np.abs(data)
    
    @staticmethod
    def get_phase(data: np.ndarray) -> np.ndarray:
        """Get phase of complex data"""
        return np.angle(data)
    
    @staticmethod
    def get_real_imag(data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Get real and imaginary parts"""
        return data.real, data.imag
    
    @staticmethod
    def rss_combine(coils: np.ndarray, axis: int = -1) -> np.ndarray:
        """
        Root sum-of-squares coil combination
        
        Args:
            coils: Coil images (..., n_coils)
            axis: Axis along which to combine
        
        Returns:
            Combined image
        """
        return np.sqrt(np.sum(np.abs(coils) ** 2, axis=axis))
    
    @staticmethod
    def normalize_intensity(image: np.ndarray, 
                           percentile: float = 99.0) -> np.ndarray:
        """
        Normalize image intensity
        
        Args:
            image: Input image
            percentile: Percentile for normalization
        
        Returns:
            Normalized image
        """
        max_val = np.percentile(np.abs(image), percentile)
        return image / (max_val + 1e-10)
    
    @staticmethod
    def extract_slice(volume: np.ndarray, 
                     slice_index: int, 
                     axis: int = -1) -> np.ndarray:
        """
        Extract a 2D slice from a 3D volume
        
        Args:
            volume: 3D volume
            slice_index: Index of slice to extract
            axis: Axis along which to extract
        
        Returns:
            2D slice
        """
        if axis == 0:
            return volume[slice_index, :, :]
        elif axis == 1:
            return volume[:, slice_index, :]
        elif axis == 2 or axis == -1:
            return volume[:, :, slice_index]
        else:
            raise ValueError(f"Invalid axis: {axis}")
    
    @staticmethod
    def generate_mosaic(volume: np.ndarray, 
                       axis: int = -1,
                       cols: int = 8) -> np.ndarray:
        """
        Generate a mosaic of slices from a 3D volume
        
        Args:
            volume: 3D volume
            axis: Axis along which to slice
            cols: Number of columns in mosaic
        
        Returns:
            2D mosaic image
        """
        n_slices = volume.shape[axis]
        rows = int(np.ceil(n_slices / cols))
        
        slice_shape = list(volume.shape)
        del slice_shape[axis]
        
        mosaic_shape = (rows * slice_shape[0], cols * slice_shape[1])
        mosaic = np.zeros(mosaic_shape, dtype=volume.dtype)
        
        for i in range(n_slices):
            row = i // cols
            col = i % cols
            
            slice_2d = MRITools.extract_slice(volume, i, axis)
            
            y_start = row * slice_shape[0]
            y_end = (row + 1) * slice_shape[0]
            x_start = col * slice_shape[1]
            x_end = (col + 1) * slice_shape[1]
            
            mosaic[y_start:y_end, x_start:x_end] = slice_2d
        
        return mosaic
    
    @staticmethod
    def analyze_kspace(kspace: np.ndarray) -> Dict[str, Any]:
        """
        Analyze k-space data
        
        Returns:
            Dictionary with analysis results
        """
        return {
            'shape': list(kspace.shape),
            'dtype': str(kspace.dtype),
            'is_complex': np.iscomplexobj(kspace),
            'magnitude_stats': {
                'min': float(np.min(np.abs(kspace))),
                'max': float(np.max(np.abs(kspace))),
                'mean': float(np.mean(np.abs(kspace))),
                'std': float(np.std(np.abs(kspace)))
            },
            'phase_stats': {
                'min': float(np.min(np.angle(kspace))),
                'max': float(np.max(np.angle(kspace))),
                'mean': float(np.mean(np.angle(kspace))),
                'std': float(np.std(np.angle(kspace)))
            } if np.iscomplexobj(kspace) else None
        }
