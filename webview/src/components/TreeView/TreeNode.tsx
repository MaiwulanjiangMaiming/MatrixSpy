import React, { useState } from 'react';
import './TreeNode.css';

interface TreeNodeProps {
  name: string;
  value: any;
  metadata?: any;
  depth: number;
  onSelect: (variableName: string) => void;
  isSelected: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ name, value, metadata, depth, onSelect, isSelected }) => {
  const [expanded, setExpanded] = useState(false);

  const getType = (val: any): string => {
    if (!val || typeof val !== 'object') {
      return typeof val;
    }
    return val._type || 'object';
  };

  const getDescription = (val: any, meta?: any): string => {
    if (meta) {
      const parts = [];
      if (meta.shape) parts.push(`[${meta.shape.join('×')}]`);
      if (meta.dtype) parts.push(meta.dtype);
      if (meta.size) {
        const sizeKB = meta.size / 1024;
        if (sizeKB > 1024) {
          parts.push(`${(sizeKB / 1024).toFixed(2)} MB`);
        } else {
          parts.push(`${sizeKB.toFixed(2)} KB`);
        }
      }
      return parts.join(' ');
    }

    if (!val || typeof val !== 'object') {
      return String(val).substring(0, 30);
    }

    if (val._type === 'ndarray') {
      let desc = `[${val.shape?.join('×') || '?'}] ${val.dtype || 'unknown'}`;
      if (val.complex) {
        desc += ' (complex)';
      }
      return desc;
    }

    if (val._type === 'struct') {
      const fieldCount = Object.keys(val).filter(k => k !== '_type').length;
      return `${fieldCount} fields`;
    }

    if (val._type === 'complex') {
      return `${val.real.toFixed(3)} + ${val.imag.toFixed(3)}i`;
    }

    return '';
  };

  const type = getType(value);
  const description = getDescription(value, metadata);
  const hasChildren = type === 'struct';

  const handleClick = () => {
    onSelect(name);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className="tree-node">
      <div 
        className={`node-content ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <span 
            className={`expand-icon ${expanded ? 'expanded' : ''}`}
            onClick={handleExpand}
          >
            ▶
          </span>
        )}
        <span className={`node-icon icon-${type}`}>●</span>
        <span className="node-name">{name}</span>
        <span className="node-description">{description}</span>
      </div>
      
      {expanded && type === 'struct' && (
        <div className="node-children">
          {Object.entries(value)
            .filter(([key]) => key !== '_type')
            .map(([key, val]) => (
              <TreeNode
                key={key}
                name={key}
                value={val}
                depth={depth + 1}
                onSelect={onSelect}
                isSelected={false}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
