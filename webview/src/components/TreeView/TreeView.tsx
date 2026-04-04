import React from 'react';
import TreeNode from './TreeNode';
import './TreeView.css';

interface TreeViewProps {
  data: any;
  metadata?: any;
  onSelect: (variableName: string) => void;
  selectedVariable: string | null;
}

const TreeView: React.FC<TreeViewProps> = ({ data, metadata, onSelect, selectedVariable }) => {
  return (
    <div className="tree-view">
      <div className="tree-header">
        <h3>Variables ({Object.keys(data).length})</h3>
      </div>
      <div className="tree-content">
        {Object.entries(data).map(([key, value]) => (
          <TreeNode
            key={key}
            name={key}
            value={value}
            metadata={metadata?.[key]}
            depth={0}
            onSelect={onSelect}
            isSelected={selectedVariable === key}
          />
        ))}
      </div>
    </div>
  );
};

export default TreeView;
