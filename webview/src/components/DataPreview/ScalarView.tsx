import React from 'react';

interface ScalarViewProps {
  value: any;
}

const ScalarView: React.FC<ScalarViewProps> = ({ value }) => {
  return (
    <div className="scalar-view">
      <div className="scalar-value">
        {String(value)}
      </div>
    </div>
  );
};

export default ScalarView;
