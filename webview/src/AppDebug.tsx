import React, { useState, useEffect } from 'react';
import './App.css';

declare function acquireVsCodeApi(): any;

const App: React.FC = () => {
  const [vscode] = useState(acquireVsCodeApi());
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [receivedData, setReceivedData] = useState<any>(null);

  const addLog = (msg: string) => {
    console.log('[Webview]', msg);
    setMessageLog(prev => [...prev, msg]);
  };

  useEffect(() => {
    addLog('App mounted');
    addLog('acquireVsCodeApi() exists: ' + (typeof acquireVsCodeApi !== 'undefined'));

    window.addEventListener('message', handleMessage);
    addLog('Message listener added');

    addLog('Sending loadFile command...');
    vscode.postMessage({
      command: 'loadFile'
    });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    addLog('Received message: ' + JSON.stringify({ command: message.command }).substring(0, 100));

    switch (message.command) {
      case 'fileLoaded':
        addLog('fileLoaded received!');
        setReceivedData(message.data);
        break;
      case 'error':
        addLog('ERROR: ' + message.error);
        break;
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h1>MAT File Viewer - DEBUG VERSION</h1>
      <hr />
      
      <h2>Message Log:</h2>
      <div style={{ 
        background: '#1e1e1e', 
        color: '#00ff00', 
        padding: '10px',
        border: '1px solid #333',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {messageLog.map((msg, i) => (
          <div key={i}>{i + 1}. {msg}</div>
        ))}
      </div>

      <hr />
      
      <h2>Received Data:</h2>
      <div style={{ 
        background: '#000000', 
        color: '#00ff00', 
        padding: '10px',
        border: '1px solid #333',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {receivedData ? (
          JSON.stringify(receivedData, null, 2)
        ) : (
          'No data received yet...'
        )}
      </div>
    </div>
  );
};

export default App;
