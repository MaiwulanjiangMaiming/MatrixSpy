import React, { useState, useRef, useEffect } from 'react';

interface TensorViewProps {
  data: any;
  vscode: any;
  variableName: string;
}

const TensorView: React.FC<TensorViewProps> = ({ data, vscode, variableName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [axis, setAxis] = useState(2);

  if (!data.shape || data.shape.length < 3) {
    return <div className="error">Invalid tensor data</div>;
  }

  const maxSlice = data.shape[axis] - 1;
  const hasData = data.data && data.data.length > 0;

  useEffect(() => {
    if (!canvasRef.current || !hasData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sliceData = getSlice(data.data, sliceIndex, axis);
    if (!sliceData || !sliceData.length) return;

    const rows = sliceData.length;
    const cols = sliceData[0]?.length || 1;

    canvas.width = cols;
    canvas.height = rows;

    const flatData = sliceData.flat();
    const min = Math.min(...flatData);
    const max = Math.max(...flatData);
    const range = max - min || 1;

    const imageData = ctx.createImageData(cols, rows);
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const val = sliceData[i][j];
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
  }, [data, sliceIndex, axis, hasData]);

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

  if (!hasData) {
    return (
      <div className="tensor-view">
        <div className="no-data">
          <h3>Large Tensor (Size: {data.size?.toLocaleString()} elements)</h3>
          <p>Shape: [{data.shape.join(', ')}]</p>
          {data.stats && (
            <div className="stats">
              <p>Min: {data.stats.min?.toFixed(4)}</p>
              <p>Max: {data.stats.max?.toFixed(4)}</p>
              <p>Mean: {data.stats.mean?.toFixed(4)}</p>
              <p>Std: {data.stats.std?.toFixed(4)}</p>
            </div>
          )}
          <p className="hint">Use lazy loading to view specific slices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tensor-view">
      <div className="slice-controls">
        <div className="control-group">
          <label>Axis:</label>
          <select value={axis} onChange={(e) => {
            setAxis(parseInt(e.target.value));
            setSliceIndex(0);
          }}>
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
            onChange={(e) => setSliceIndex(parseInt(e.target.value))}
          />
        </div>
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
