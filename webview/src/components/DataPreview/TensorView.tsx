import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TensorViewProps {
  data: any;
  vscode: any;
  variableName: string;
}

const TensorView: React.FC<TensorViewProps> = ({ data, vscode, variableName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [axis, setAxis] = useState(2);
  const [sliceData, setSliceData] = useState<any[][] | null>(null);
  const [loading, setLoading] = useState(false);

  if (!data.shape || data.shape.length < 3) {
    return <div className="error">Invalid tensor data</div>;
  }

  const maxSlice = data.shape[axis] - 1;
  const hasFullData = data.data && data.data.length > 0;
  const stats = data.stats || data.statistics;

  const requestSlice = useCallback(async (ax: number, idx: number) => {
    if (hasFullData) return;

    setLoading(true);
    try {
      vscode.postMessage({
        command: 'loadSlice',
        variableName,
        axis: ax,
        index: idx
      });
    } catch (err) {
      console.error('Failed to load slice:', err);
      setLoading(false);
    }
  }, [hasFullData, vscode, variableName]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let currentSliceData: any[][] | null = null;

    if (hasFullData) {
      const rawSlice = getSlice(data.data, sliceIndex, axis);
      if (!rawSlice || !rawSlice.length) return;
      currentSliceData = rawSlice;
    } else if (sliceData) {
      currentSliceData = sliceData;
    } else {
      if (!hasFullData && !sliceData && !loading) {
        requestSlice(axis, sliceIndex);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || !currentSliceData) return;

    const rows = currentSliceData.length;
    const cols = currentSliceData[0]?.length || 1;

    canvas.width = cols;
    canvas.height = rows;

    const flatData = currentSliceData.flat();
    const min = Math.min(...flatData);
    const max = Math.max(...flatData);
    const range = max - min || 1;

    const imageData = ctx.createImageData(cols, rows);
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const val = currentSliceData[i][j];
        const normalized = (val - min) / range;
        
        const idx = (i * cols + j) * 4;
        
        const r = Math.floor(normalized * 255);
        const g = Math.floor(normalized * 200);
        const b = Math.floor((1 - normalized) * 150);
        
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [data, sliceIndex, axis, hasFullData, sliceData, loading]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'sliceLoaded' && message.variableName === variableName) {
        if (message.success && message.data?._type === 'slice') {
          const decoded = decodeBase64Slice(message.data);
          setSliceData(decoded);
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [variableName]);

  const getSlice = (tensor: any[], index: number, ax: number): any[][] => {
    if (!tensor || !tensor.length) return [[]];
    
    if (ax === 0) {
      return tensor[index] || [[]];
    } else if (ax === 1) {
      return tensor.map((row: any[]) => row?.[index] || []);
    } else {
      return tensor.map((row: any[]) => 
        row?.map((col: any[]) => col?.[index] || 0) || []
      );
    }
  };

  const decodeBase64Slice = (sliceInfo: any): number[][] => {
    if (!sliceInfo.encoded_data) return [[]];

    const binaryString = atob(sliceInfo.encoded_data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const float32Array = new Float32Array(bytes.buffer);
    const shape = sliceInfo.shape;
    const rows = shape[0];
    const cols = shape[1];

    const result: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(float32Array[i * cols + j]);
      }
      result.push(row);
    }

    return result;
  };

  const handleAxisChange = (newAxis: number) => {
    setAxis(newAxis);
    setSliceIndex(0);
    setSliceData(null);
    if (!hasFullData) {
      requestSlice(newAxis, 0);
    }
  };

  const handleSliceChange = (newIndex: number) => {
    setSliceIndex(newIndex);
    setSliceData(null);
    if (!hasFullData) {
      requestSlice(axis, newIndex);
    }
  };

  if (!hasFullData && !sliceData) {
    return (
      <div className="tensor-view">
        <div className="no-data">
          <h3>3D Tensor</h3>
          <p>Shape: [{data.shape.join(', ')}]</p>
          {stats && (
            <div className="stats">
              <p>Min: {stats.min?.toFixed(4)}</p>
              <p>Max: {stats.max?.toFixed(4)}</p>
              <p>Mean: {stats.mean?.toFixed(4)}</p>
              <p>Std: {stats.std?.toFixed(4)}</p>
            </div>
          )}
          <p className="hint">Select a slice below to visualize</p>
          
          <div className="slice-controls">
            <div className="control-group">
              <label>Axis:</label>
              <select value={axis} onChange={(e) => handleAxisChange(parseInt(e.target.value))}>
                <option value={0}>X (0)</option>
                <option value={1}>Y (1)</option>
                <option value={2}>Z (2)</option>
              </select>
            </div>
            
            <div className="control-group">
              <label>Slice: {sliceIndex}</label>
              <input
                type="range"
                min="0"
                max={maxSlice}
                value={sliceIndex}
                onChange={(e) => handleSliceChange(parseInt(e.target.value))}
              />
            </div>
          </div>

          {loading && <p className="loading-text">Loading slice...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="tensor-view">
      <div className="slice-controls">
        <div className="control-group">
          <label>Axis:</label>
          <select value={axis} onChange={(e) => handleAxisChange(parseInt(e.target.value))}>
            <option value={0}>X (0)</option>
            <option value={1}>Y (1)</option>
            <option value={2}>Z (2)</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>Slice: {sliceIndex}</label>
          <input
            type="range"
            min="0"
            max={maxSlice}
            value={sliceIndex}
            onChange={(e) => handleSliceChange(parseInt(e.target.value))}
          />
        </div>

        {loading && <span className="loading-indicator">Loading...</span>}
      </div>

      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          maxWidth: '600px',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
};

export default TensorView;
