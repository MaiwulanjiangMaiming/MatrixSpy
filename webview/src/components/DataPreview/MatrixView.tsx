import React, { useRef, useEffect, useState } from 'react';

interface MatrixViewProps {
  data: any;
}

const MatrixView: React.FC<MatrixViewProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'heatmap' | 'table'>('heatmap');

  useEffect(() => {
    if (!canvasRef.current || !data.data || viewMode !== 'heatmap') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const matrixData = data.complex ? data.magnitude : data.data;
    const rows = matrixData.length;
    const cols = matrixData[0]?.length || 1;

    canvas.width = cols;
    canvas.height = rows;

    const flatData = matrixData.flat();
    const min = Math.min(...flatData);
    const max = Math.max(...flatData);
    const range = max - min || 1;

    const imageData = ctx.createImageData(cols, rows);
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const val = matrixData[i][j];
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
  }, [data, viewMode]);

  if (viewMode === 'table' && data.data) {
    const maxRows = Math.min(data.data.length, 20);
    const maxCols = Math.min(data.data[0]?.length || 1, 20);
    
    return (
      <div className="matrix-view">
        <div className="view-controls">
          <button onClick={() => setViewMode('heatmap')}>Heatmap</button>
          <button className="active">Table</button>
        </div>
        <div className="table-container">
          <table>
            <tbody>
              {data.data.slice(0, maxRows).map((row: any[], i: number) => (
                <tr key={i}>
                  {row.slice(0, maxCols).map((val: any, j: number) => (
                    <td key={j}>{typeof val === 'number' ? val.toFixed(4) : val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {(data.data.length > maxRows || data.data[0]?.length > maxCols) && (
            <p className="table-truncated">
              Showing {maxRows}×{maxCols} of {data.data.length}×{data.data[0]?.length}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="matrix-view">
      <div className="view-controls">
        <button className="active">Heatmap</button>
        <button onClick={() => setViewMode('table')}>Table</button>
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

export default MatrixView;
