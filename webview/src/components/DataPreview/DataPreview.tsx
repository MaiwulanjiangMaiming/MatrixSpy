import React from 'react';
import ScalarView from './ScalarView';
import VectorView from './VectorView';
import MatrixView from './MatrixView';
import TensorView from './TensorView';
import './DataPreview.css';

interface DataPreviewProps {
  variableName: string;
  data: any;
  metadata?: any;
  vscode: any;
}

const DataPreview: React.FC<DataPreviewProps> = ({ variableName, data, metadata, vscode }) => {
  const renderPreview = () => {
    if (!data || typeof data !== 'object') {
      return <ScalarView value={data} />;
    }

    switch (data._type) {
      case 'ndarray':
        if (!data.shape || data.shape.length === 0) {
          return <ScalarView value={data.data} />;
        }
        
        if (data.shape.length === 1) {
          return <VectorView data={data} />;
        }
        
        if (data.shape.length === 2) {
          return <MatrixView data={data} />;
        }
        
        if (data.shape.length >= 3) {
          return <TensorView data={data} vscode={vscode} variableName={variableName} />;
        }
        break;
      
      case 'complex':
        return <ScalarView value={`${data.real} + ${data.imag}i`} />;
      
      case 'struct':
        return <StructView data={data} />;
      
      default:
        return <ScalarView value={JSON.stringify(data, null, 2)} />;
    }
  };

  return (
    <div className="data-preview">
      <div className="preview-header">
        <h2>{variableName}</h2>
        {metadata && (
          <div className="preview-info">
            {metadata.shape && <span>Shape: [{metadata.shape.join(', ')}]</span>}
            {metadata.dtype && <span>Type: {metadata.dtype}</span>}
            {metadata.size && <span>Size: {(metadata.size / 1024).toFixed(2)} KB</span>}
          </div>
        )}
      </div>
      <div className="preview-content">
        {renderPreview()}
      </div>
    </div>
  );
};

const StructView: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="struct-view">
      {Object.entries(data)
        .filter(([key]) => key !== '_type')
        .map(([key, value]) => (
          <div key={key} className="struct-field">
            <span className="field-name">{key}:</span>
            <span className="field-value">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </span>
          </div>
        ))}
    </div>
  );
};

export default DataPreview;
