import React, { useState, useEffect } from 'react';
import TreeView from './components/TreeView/TreeView';
import DataPreview from './components/DataPreview/DataPreview';
import './App.css';

declare function acquireVsCodeApi(): any;

interface MatData {
  success: boolean;
  version: string;
  file_path: string;
  data: any;
  metadata?: any;
  error?: string;
}

const App: React.FC = () => {
  const [vscode] = useState(acquireVsCodeApi());
  const [matData, setMatData] = useState<MatData | null>(null);
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    
    vscode.postMessage({
      command: 'loadFile'
    });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    
    console.log('[Webview] Received message:', message.command);
    
    switch (message.command) {
      case 'fileLoaded':
        console.log('[Webview] File loaded successfully');
        setMatData(message.data);
        setLoading(false);
        setError(null);
        break;
      case 'error':
        console.error('[Webview] Error:', message.error);
        setError(message.error);
        setLoading(false);
        break;
      case 'variableLoaded':
        if (matData && selectedVariable) {
          setMatData({
            ...matData,
            data: {
              ...matData.data,
              [selectedVariable]: message.data.data
            }
          });
        }
        break;
    }
  };

  const handleVariableSelect = (variableName: string) => {
    setSelectedVariable(variableName);
  };

  if (loading) {
    return <div className="loading">Loading MAT file...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!matData || !matData.success) {
    return <div className="error">Failed to load MAT file: {matData?.error || 'Unknown error'}</div>;
  }

  return (
    <div className="app">
      <div className="header">
        <h1>MAT File Viewer</h1>
        <div className="file-info">
          <span className="version">Version: {matData.version}</span>
          <span className="path">{matData.file_path}</span>
        </div>
      </div>
      
      <div className="content">
        <div className="sidebar">
          <TreeView 
            data={matData.data}
            metadata={matData.metadata}
            onSelect={handleVariableSelect}
            selectedVariable={selectedVariable}
          />
        </div>
        
        <div className="main">
          {selectedVariable && matData.data[selectedVariable] ? (
            <DataPreview 
              variableName={selectedVariable}
              data={matData.data[selectedVariable]}
              metadata={matData.metadata?.[selectedVariable]}
              vscode={vscode}
            />
          ) : (
            <div className="placeholder">
              Select a variable from the tree to view its data
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
