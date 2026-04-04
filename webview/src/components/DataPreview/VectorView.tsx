import React, { useRef, useEffect } from 'react';

interface VectorViewProps {
  data: any;
}

const VectorView: React.FC<VectorViewProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vectorData = data.data;
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    const min = Math.min(...vectorData);
    const max = Math.max(...vectorData);
    const range = max - min || 1;

    ctx.strokeStyle = '#4ec9b0';
    ctx.lineWidth = 2;
    ctx.beginPath();

    vectorData.forEach((val: number, i: number) => {
      const x = (i / (vectorData.length - 1)) * width;
      const y = height - ((val - min) / range) * height * 0.9 - height * 0.05;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data]);

  return (
    <div className="vector-view">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={300}
        style={{ width: '100%', maxWidth: '600px' }}
      />
    </div>
  );
};

export default VectorView;
