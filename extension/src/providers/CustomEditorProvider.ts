/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import { PythonBridge } from '../ipc/PythonBridge';
import { updateTreeData, updateCurrentWebviewPanel, cacheFileData } from '../extension';

export class MatFileEditorProvider implements vscode.CustomReadonlyEditorProvider {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly pythonBridge: PythonBridge
    ) {}

    public async openCustomDocument(
        uri: vscode.Uri,
        _openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
        return {
            uri,
            dispose: () => {}
        } as vscode.CustomDocument;
    }

    public async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        console.log('[MatrixSpy] resolveCustomEditor called');
        
        updateCurrentWebviewPanel(webviewPanel);
        
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'webview-dist')
            ]
        };

        webviewPanel.webview.html = this.getSimpleHtml();
        console.log('[MatrixSpy] HTML set');

        setTimeout(async () => {
            await this.handleLoadFile(document.uri.fsPath, webviewPanel);
        }, 100);

        webviewPanel.onDidDispose(() => {
            updateCurrentWebviewPanel(null);
        });
    }

    private async handleLoadFile(filePath: string, webviewPanel: vscode.WebviewPanel) {
        try {
            console.log('[MatrixSpy] Loading file:', filePath);
            const result = await this.pythonBridge.parseFile(filePath);
            console.log('[MatrixSpy] Parsed, sending to webview');
            
            if (result.success && result.data) {
                cacheFileData(filePath, result.data);
                updateTreeData(result.data);
            }
            
            webviewPanel.webview.postMessage({
                command: 'fileLoaded',
                data: result
            });
            
            console.log('[MatrixSpy] Message sent to webview');
        } catch (error) {
            console.error('[MatrixSpy] Error:', error);
            webviewPanel.webview.postMessage({
                command: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private getSimpleHtml(): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MatrixSpy</title>
    <style>
        :root {
            --bg-primary: #1e1e1e;
            --bg-secondary: #252526;
            --bg-tertiary: #2d2d2d;
            --bg-hover: #3c3c3c;
            --text-primary: #cccccc;
            --text-secondary: #888888;
            --text-accent: #3794ff;
            --text-success: #4ec9b0;
            --text-warning: #dcdcaa;
            --text-error: #f48771;
            --border-color: #333333;
            --accent-blue: #0e639c;
            --accent-green: #4ec9b0;
            --shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        body.light-theme {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f5;
            --bg-tertiary: #e8e8e8;
            --bg-hover: #dcdcdc;
            --text-primary: #333333;
            --text-secondary: #666666;
            --text-accent: #0066cc;
            --text-success: #008000;
            --text-warning: #996600;
            --text-error: #cc0000;
            --border-color: #cccccc;
            --accent-blue: #007acc;
            --accent-green: #008000;
            --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
            transition: background 0.3s ease, color 0.3s ease;
        }
        .app {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .header {
            background: var(--bg-secondary);
            padding: 12px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow);
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header h1 {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-accent);
            letter-spacing: -0.3px;
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .file-info {
            font-size: 12px;
            color: var(--text-secondary);
        }
        .icon-button {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: none;
            background: transparent;
            color: var(--text-primary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s ease;
        }
        .icon-button:hover {
            background: var(--bg-hover);
        }
        .content {
            flex: 1;
            padding: 24px;
            overflow: auto;
        }
        .success {
            text-align: center;
            padding: 60px 20px;
        }
        .success-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .success h2 {
            color: var(--text-success);
            margin-bottom: 12px;
            font-size: 20px;
            font-weight: 600;
            letter-spacing: -0.5px;
        }
        .success p {
            color: var(--text-secondary);
            margin: 6px 0;
            font-size: 14px;
        }
        .success .highlight {
            color: var(--text-accent);
            font-weight: 500;
        }
        .variables-list {
            margin-top: 32px;
            padding: 20px;
            background: var(--bg-tertiary);
            border-radius: 12px;
            border: 1px solid var(--border-color);
        }
        .variables-list h3 {
            margin-bottom: 14px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .var-item {
            padding: 10px 14px;
            margin: 6px 0;
            background: var(--bg-hover);
            border-radius: 8px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            transition: transform 0.15s ease, background 0.15s ease;
        }
        .var-item:hover {
            transform: translateX(4px);
            background: var(--bg-secondary);
        }
        .var-name {
            color: var(--text-warning);
            font-weight: 500;
        }
        .var-type {
            color: var(--text-accent);
            margin-left: 10px;
            opacity: 0.8;
        }
        .error {
            color: var(--text-error);
            padding: 24px;
            background: rgba(244, 135, 113, 0.1);
            border-radius: 12px;
            border: 1px solid var(--text-error);
            margin: 20px;
        }
        .variable-preview {
            margin-top: 24px;
            padding: 24px;
            background: var(--bg-tertiary);
            border-radius: 16px;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
        }
        .preview-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }
        .preview-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-warning);
            letter-spacing: -0.5px;
        }
        .preview-meta {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 8px;
        }
        .preview-content {
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            background: var(--bg-primary);
            padding: 20px;
            border-radius: 12px;
            overflow: auto;
            max-height: 650px;
            box-sizing: border-box;
            width: 100%;
        }
        .scalar-value {
            font-size: 48px;
            color: var(--text-success);
            font-weight: 700;
            letter-spacing: -1px;
        }
        .complex-view {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 20px;
        }
        .complex-part {
            padding: 20px;
            background: var(--bg-hover);
            border-radius: 12px;
            text-align: center;
        }
        .complex-label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .complex-value {
            font-size: 28px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-weight: 600;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin-top: 20px;
        }
        .stat-item {
            padding: 16px;
            background: var(--bg-hover);
            border-radius: 12px;
            text-align: center;
            transition: transform 0.2s ease;
        }
        .stat-item:hover {
            transform: translateY(-2px);
        }
        .stat-label {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-value {
            font-size: 18px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            color: var(--text-accent);
            font-weight: 600;
        }
        .view-tabs {
            margin-top: 20px;
            margin-bottom: 20px;
            display: flex;
            gap: 8px;
            background: var(--bg-hover);
            padding: 6px;
            border-radius: 10px;
            width: fit-content;
        }
        .view-tab {
            padding: 10px 20px;
            background: transparent;
            color: var(--text-primary);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .view-tab.active {
            background: var(--accent-blue);
            color: white;
            box-shadow: 0 2px 8px rgba(14, 99, 156, 0.3);
        }
        .view-tab:hover:not(.active) {
            background: var(--bg-secondary);
        }
        .image-viewer {
            margin-top: 20px;
            background: var(--bg-primary);
            padding: 24px;
            border-radius: 12px;
            text-align: center;
        }
        .image-canvas {
            width: 400px;
            height: 400px;
            image-rendering: pixelated;
            background: #000;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        .view-mode-selector {
            margin-bottom: 16px;
        }
        .view-mode-selector button {
            margin: 0 6px;
            padding: 10px 16px;
            background: var(--accent-blue);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .view-mode-selector button:hover {
            background: #1177bb;
            transform: translateY(-1px);
        }
        .view-mode-selector button.active {
            background: var(--accent-green);
            box-shadow: 0 2px 8px rgba(78, 201, 176, 0.3);
        }
        .tensor-controls {
            margin-top: 20px;
            padding: 20px;
            background: var(--bg-hover);
            border-radius: 12px;
        }
        .tensor-controls label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-right: 12px;
            font-weight: 500;
        }
        .tensor-controls select,
        .tensor-controls input[type="range"] {
            margin: 8px 10px;
            padding: 8px 12px;
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-size: 13px;
        }
        .tensor-controls select {
            cursor: pointer;
        }
        .tensor-value {
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-weight: 700;
            color: var(--text-success);
            font-size: 16px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 11px;
            margin-top: 20px;
            table-layout: fixed;
        }
        .data-table th,
        .data-table td {
            border: 1px solid var(--border-color);
            padding: 6px 8px;
            text-align: right;
            word-wrap: break-word;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .data-table th {
            background: var(--bg-secondary);
            font-weight: 600;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        .complex-cell {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .complex-real {
            color: var(--text-accent);
        }
        .complex-imag {
            color: var(--text-error);
        }
        .vector-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
            gap: 8px;
            margin-top: 20px;
        }
        .vector-item {
            padding: 10px;
            background: var(--bg-hover);
            border-radius: 8px;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 11px;
            text-align: center;
            transition: transform 0.15s ease, background 0.15s ease;
        }
        .vector-item:hover {
            transform: translateY(-2px);
            background: var(--bg-secondary);
        }
        .vector-index {
            font-size: 10px;
            color: var(--text-secondary);
            margin-bottom: 4px;
        }
        .struct-fields {
            margin-top: 20px;
        }
        .struct-field {
            padding: 16px;
            background: var(--bg-hover);
            margin: 10px 0;
            border-radius: 12px;
            border-left: 4px solid var(--text-warning);
            transition: transform 0.15s ease;
        }
        .struct-field:hover {
            transform: translateX(4px);
        }
        .struct-field-name {
            font-weight: 700;
            color: var(--text-warning);
            margin-bottom: 6px;
            font-size: 15px;
        }
        .struct-field-meta {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 10px;
        }
        .struct-field-value {
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            background: var(--bg-primary);
            padding: 12px;
            border-radius: 8px;
        }
        .load-more-btn {
            padding: 12px 24px;
            background: var(--accent-blue);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(14, 99, 156, 0.3);
        }
        .load-more-btn:hover {
            background: #1177bb;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(14, 99, 156, 0.4);
        }
        .load-more-btn:active {
            transform: translateY(0);
        }
        .settings-panel {
            position: fixed;
            top: 0;
            right: -360px;
            width: 360px;
            height: 100vh;
            background: var(--bg-secondary);
            border-left: 1px solid var(--border-color);
            box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1000;
            display: flex;
            flex-direction: column;
        }
        .settings-panel.open {
            right: 0;
        }
        .settings-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .settings-title {
            font-size: 18px;
            font-weight: 700;
        }
        .settings-content {
            flex: 1;
            padding: 24px;
            overflow: auto;
        }
        .settings-section {
            margin-bottom: 32px;
        }
        .settings-section-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 16px;
        }
        .theme-options {
            display: flex;
            gap: 12px;
        }
        .theme-option {
            flex: 1;
            padding: 16px;
            background: var(--bg-hover);
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s ease;
        }
        .theme-option:hover {
            background: var(--bg-secondary);
        }
        .theme-option.active {
            border-color: var(--accent-blue);
            background: var(--bg-primary);
        }
        .theme-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }
        .theme-name {
            font-size: 13px;
            font-weight: 500;
        }
        .version-info {
            padding: 20px;
            background: var(--bg-hover);
            border-radius: 12px;
            text-align: center;
        }
        .version-icon {
            font-size: 40px;
            margin-bottom: 12px;
        }
        .version-number {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-accent);
            margin-bottom: 4px;
        }
        .version-label {
            font-size: 12px;
            color: var(--text-secondary);
        }
        .github-link {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px;
            background: var(--bg-hover);
            border-radius: 10px;
            text-decoration: none;
            color: var(--text-primary);
            transition: all 0.2s ease;
            margin-top: 12px;
        }
        .github-link:hover {
            background: var(--accent-blue);
            color: white;
        }
        .github-icon {
            font-size: 20px;
        }
        .github-text {
            font-size: 14px;
            font-weight: 500;
        }
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 999;
        }
        .overlay.visible {
            opacity: 1;
            visibility: visible;
        }
        .app {
            display: flex;
            flex-direction: row;
            height: 100vh;
        }
        .sidebar {
            width: 280px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            flex-shrink: 0;
            overflow: hidden;
        }
        .sidebar.collapsed {
            width: 0;
            opacity: 0;
        }
        .sidebar.collapsed .sidebar-header,
        .sidebar.collapsed .sidebar-content {
            opacity: 0;
            pointer-events: none;
        }
        .sidebar-header {
            padding: 12px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            min-height: 57px;
        }
        .sidebar-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }
        .sidebar-toggle {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        .sidebar-toggle:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        .sidebar-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px 0;
        }
        .sidebar-item {
            padding: 10px 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.15s ease;
            border-left: 3px solid transparent;
        }
        .sidebar-item:hover {
            background: var(--bg-hover);
        }
        .sidebar-item.active {
            background: var(--bg-primary);
            border-left-color: var(--accent-blue);
        }
        .sidebar-item-icon {
            font-size: 16px;
            width: 20px;
            text-align: center;
            flex-shrink: 0;
        }
        .sidebar-item-name {
            flex: 1;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
        }
        .sidebar-item-type {
            font-size: 11px;
            color: var(--text-secondary);
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            flex-shrink: 0;
        }
        .main-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        .header-toggle {
            display: none;
            margin-right: 12px;
        }
        .header-toggle.visible {
            display: flex;
        }
    </style>
</head>
<body>
    <div class="app">
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <span class="sidebar-title">Variables</span>
                <button class="sidebar-toggle" id="sidebarToggle" title="Hide sidebar">◀</button>
            </div>
            <div class="sidebar-content" id="sidebarContent">
                <div style="padding: 20px; color: var(--text-secondary); font-size: 13px;">
                    Loading variables...
                </div>
            </div>
        </div>
        <div class="main-wrapper">
            <div class="header">
                <div class="header-left">
                    <button class="icon-button header-toggle visible" id="headerToggle" title="Show sidebar">☰</button>
                    <h1>🔍 MatrixSpy</h1>
                </div>
                <div class="header-right">
                    <span class="file-info" id="fileInfo">-</span>
                    <button class="icon-button" id="settingsBtn" title="Settings">⚙️</button>
                </div>
            </div>
            <div class="content" id="mainContent">
                <div class="success">
                    <div class="success-icon">⏳</div>
                    <h2>Loading...</h2>
                    <p>Please wait...</p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="overlay" id="overlay"></div>
    
    <div class="settings-panel" id="settingsPanel">
        <div class="settings-header">
            <span class="settings-title">Settings</span>
            <button class="icon-button" id="closeSettingsBtn">✕</button>
        </div>
        <div class="settings-content">
            <div class="settings-section">
                <div class="settings-section-title">Version</div>
                <div class="version-info">
                    <div class="version-icon">📦</div>
                    <div class="version-number">0.1.0</div>
                    <div class="version-label">MatrixSpy</div>
                    <a href="https://github.com/maiwulanjiang/mat-file-viewer" class="github-link" id="githubLink" target="_blank">
                        <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <span class="github-text">View on GitHub</span>
                    </a>
                </div>
            </div>
            
            <div class="settings-section">
                <div class="settings-section-title">Appearance</div>
                <div class="theme-options">
                    <div class="theme-option" id="darkTheme">
                        <div class="theme-icon">🌙</div>
                        <div class="theme-name">Dark</div>
                    </div>
                    <div class="theme-option" id="lightTheme">
                        <div class="theme-icon">☀️</div>
                        <div class="theme-name">Light</div>
                    </div>
                    <div class="theme-option" id="autoTheme">
                        <div class="theme-icon">🔄</div>
                        <div class="theme-name">Auto</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const mainContent = document.getElementById('mainContent');
        const fileInfo = document.getElementById('fileInfo');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const overlay = document.getElementById('overlay');
        const darkTheme = document.getElementById('darkTheme');
        const lightTheme = document.getElementById('lightTheme');
        const autoTheme = document.getElementById('autoTheme');
        const githubLink = document.getElementById('githubLink');
        const sidebar = document.getElementById('sidebar');
        const sidebarContent = document.getElementById('sidebarContent');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const headerToggle = document.getElementById('headerToggle');

        let currentVariableData = null;
        let fullVariableData = null;
        let currentDisplayMode = 'image';
        let currentViewMode = 'magnitude';
        let currentAxis = 2;
        let currentSlice = 0;
        let currentTheme = 'auto';
        let currentShowCount1D = 50;
        let currentShowRows2D = 50;
        let currentShowCols2D = 20;
        let currentFileData = null;
        let currentActiveVariable = null;
        let sidebarCollapsed = false;

        function detectSystemTheme() {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        function applyTheme(theme) {
            currentTheme = theme;
            localStorage.setItem('matViewerTheme', theme);
            
            let effectiveTheme = theme;
            if (theme === 'auto') {
                effectiveTheme = detectSystemTheme();
            }
            
            document.body.classList.remove('dark-theme', 'light-theme');
            if (effectiveTheme === 'light') {
                document.body.classList.add('light-theme');
            }
            
            updateThemeButtons();
        }

        function updateThemeButtons() {
            [darkTheme, lightTheme, autoTheme].forEach(el => el.classList.remove('active'));
            if (currentTheme === 'dark') darkTheme.classList.add('active');
            else if (currentTheme === 'light') lightTheme.classList.add('active');
            else autoTheme.classList.add('active');
        }

        function toggleSidebar() {
            sidebarCollapsed = !sidebarCollapsed;
            if (sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                headerToggle.classList.add('visible');
            } else {
                sidebar.classList.remove('collapsed');
                headerToggle.classList.remove('visible');
            }
            localStorage.setItem('matViewerSidebarCollapsed', sidebarCollapsed);
        }

        function getVariableIcon(value) {
            if (typeof value === 'number') return '🔢';
            if (typeof value === 'string') return '📝';
            if (value && value._type === 'complex') return '🔀';
            if (value && value._type === 'ndarray') {
                if (value.shape.length === 1) return '📈';
                if (value.shape.length === 2) return '📊';
                if (value.shape.length === 3) return '🎲';
                return '📦';
            }
            if (typeof value === 'object') return '📁';
            return '❓';
        }

        function renderSidebar(data) {
            currentFileData = data;
            const varNames = Object.keys(data).sort();
            
            let html = '';
            varNames.forEach(function(name) {
                const value = data[name];
                const type = formatType(value);
                const icon = getVariableIcon(value);
                const isActive = currentActiveVariable === name;
                
                html += '<div class="sidebar-item' + (isActive ? ' active' : '') + '" data-name="' + name + '">';
                html += '<span class="sidebar-item-icon">' + icon + '</span>';
                html += '<span class="sidebar-item-name">' + name + '</span>';
                html += '<span class="sidebar-item-type">' + type + '</span>';
                html += '</div>';
            });
            
            sidebarContent.innerHTML = html;
            
            document.querySelectorAll('.sidebar-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    const name = this.getAttribute('data-name');
                    selectSidebarVariable(name);
                });
            });
        }

        function selectSidebarVariable(name) {
            if (!currentFileData || !currentFileData[name]) return;
            
            currentActiveVariable = name;
            const value = currentFileData[name];
            
            fullVariableData = value;
            currentVariableData = { name: name };
            currentDisplayMode = 'image';
            currentViewMode = 'magnitude';
            currentAxis = 2;
            currentSlice = 0;
            currentShowCount1D = 50;
            currentShowRows2D = 50;
            currentShowCols2D = 20;
            
            mainContent.innerHTML = renderPreview(name, value);
            
            document.querySelectorAll('.sidebar-item').forEach(function(item) {
                item.classList.remove('active');
                if (item.getAttribute('data-name') === name) {
                    item.classList.add('active');
                }
            });
        }

        function openSettings() {
            settingsPanel.classList.add('open');
            overlay.classList.add('visible');
        }

        function closeSettings() {
            settingsPanel.classList.remove('open');
            overlay.classList.remove('visible');
        }

        function formatType(value) {
            if (typeof value === 'number') return 'number';
            if (typeof value === 'string') return 'string';
            if (value && value._type === 'complex') return 'complex';
            if (value && value._type === 'ndarray') {
                if (value.shape.length === 1) return value.shape[0] + '×1';
                if (value.shape.length === 2) return value.shape[0] + '×' + value.shape[1];
                if (value.shape.length === 3) return value.shape.join('×');
                return 'ndarray';
            }
            if (typeof value === 'object') return 'struct';
            return typeof value;
        }

        function formatSize(size) {
            if (size < 1024) return size + ' B';
            if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
            return (size / (1024 * 1024)).toFixed(1) + ' MB';
        }

        function get2DSlice(value, viewMode) {
            if (!value.data) return null;
            
            let data = value.data;
            
            if (value.complex) {
                if (viewMode === 'magnitude') {
                    return data.map(row => row.map(v => Math.sqrt(v.real * v.real + v.imag * v.imag)));
                } else if (viewMode === 'phase') {
                    return data.map(row => row.map(v => Math.atan2(v.imag, v.real)));
                } else if (viewMode === 'real') {
                    return data.map(row => row.map(v => v.real));
                } else if (viewMode === 'imag') {
                    return data.map(row => row.map(v => v.imag));
                }
            }
            return data;
        }

        function get3DSlice(value, axis, sliceIndex, viewMode) {
            if (!value.data) return null;
            
            const shape = value.shape;
            let sliceData = null;
            
            if (axis === 0) {
                sliceData = value.data[sliceIndex];
            } else if (axis === 1) {
                sliceData = value.data.map(row => row[sliceIndex]);
            } else if (axis === 2) {
                sliceData = value.data.map(row => row.map(col => col[sliceIndex]));
            }
            
            if (value.complex) {
                if (viewMode === 'magnitude') {
                    return sliceData.map(row => row.map(v => Math.sqrt(v.real * v.real + v.imag * v.imag)));
                } else if (viewMode === 'phase') {
                    return sliceData.map(row => row.map(v => Math.atan2(v.imag, v.real)));
                } else if (viewMode === 'real') {
                    return sliceData.map(row => row.map(v => v.real));
                } else if (viewMode === 'imag') {
                    return sliceData.map(row => row.map(v => v.imag));
                }
            }
            return sliceData;
        }

        function renderImageToCanvas(data) {
            const canvas = document.getElementById('imageCanvas');
            if (!canvas || !data) return;
            
            const height = data.length;
            const width = data[0].length;
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(width, height);
            
            let min = Infinity, max = -Infinity;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const val = data[y][x];
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
            
            const range = max - min || 1;
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const val = data[y][x];
                    const normalized = (val - min) / range;
                    const idx = (y * width + x) * 4;
                    const gray = Math.floor(normalized * 255);
                    imageData.data[idx] = gray;
                    imageData.data[idx + 1] = gray;
                    imageData.data[idx + 2] = gray;
                    imageData.data[idx + 3] = 255;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
        }

        function render1DArray(value) {
            if (!value.data) return '';
            
            const data = value.data;
            const itemsToShow = Math.min(currentShowCount1D, data.length);
            
            let html = '<div class="vector-grid">';
            for (let i = 0; i < itemsToShow; i++) {
                const v = data[i];
                html += '<div class="vector-item">';
                html += '<div class="vector-index">[' + i + ']</div>';
                if (v && v._type === 'complex') {
                    html += '<div><span class="complex-real">' + v.real.toFixed(3) + '</span></div>';
                    html += '<div><span class="complex-imag">' + v.imag.toFixed(3) + 'i</span></div>';
                } else {
                    html += '<div>' + (typeof v === 'number' ? v.toFixed(4) : v) + '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
            
            if (data.length > itemsToShow) {
                html += '<div style="margin-top: 16px; text-align: center;">';
                html += '<button class="load-more-btn" onclick="loadMore1D()">📥 Load more (showing ' + itemsToShow + '/' + data.length + ')</button>';
                html += '</div>';
            }
            return html;
        }
        
        window.loadMore1D = function() {
            currentShowCount1D += 50;
            if (fullVariableData && currentVariableData) {
                mainContent.innerHTML = renderPreview(currentVariableData.name, fullVariableData);
            }
        };

        function render2DTable(value) {
            if (!value.data) return '';
            
            const data = value.data;
            const rowsToShow = Math.min(currentShowRows2D, value.shape[0]);
            const colsToShow = Math.min(currentShowCols2D, value.shape[1]);
            
            let html = '<table class="data-table">';
            html += '<tr><th></th>';
            for (let j = 0; j < colsToShow; j++) {
                html += '<th>' + j + '</th>';
            }
            if (value.shape[1] > colsToShow) {
                html += '<th>...</th>';
            }
            html += '</tr>';
            
            for (let i = 0; i < rowsToShow; i++) {
                html += '<tr><th>' + i + '</th>';
                const row = data[i];
                for (let j = 0; j < colsToShow; j++) {
                    const v = row[j];
                    html += '<td>' + (v && v._type === 'complex' ? 
                        '<div class="complex-cell"><span class="complex-real">' + v.real.toFixed(4) + '</span><span class="complex-imag">' + v.imag.toFixed(4) + 'i</span></div>' :
                        (typeof v === 'number' ? v.toFixed(4) : v)
                    ) + '</td>';
                }
                if (value.shape[1] > colsToShow) {
                    html += '<td>...</td>';
                }
                html += '</tr>';
            }
            
            if (value.shape[0] > rowsToShow) {
                html += '<tr><th>...</th>';
                for (let j = 0; j < colsToShow; j++) {
                    html += '<td>...</td>';
                }
                if (value.shape[1] > colsToShow) {
                    html += '<td>...</td>';
                }
                html += '</tr>';
            }
            
            html += '</table>';
            
            if (value.shape[0] > rowsToShow || value.shape[1] > colsToShow) {
                html += '<div style="margin-top: 16px; text-align: center; display: flex; gap: 12px; justify-content: center;">';
                if (value.shape[0] > rowsToShow) {
                    html += '<button class="load-more-btn" onclick="loadMoreRows2D()">📥 Load more rows (' + rowsToShow + '/' + value.shape[0] + ')</button>';
                }
                if (value.shape[1] > colsToShow) {
                    html += '<button class="load-more-btn" onclick="loadMoreCols2D()">📥 Load more columns (' + colsToShow + '/' + value.shape[1] + ')</button>';
                }
                html += '</div>';
            }
            
            return html;
        }
        
        window.loadMoreRows2D = function() {
            currentShowRows2D += 50;
            if (fullVariableData && currentVariableData) {
                mainContent.innerHTML = renderPreview(currentVariableData.name, fullVariableData);
            }
        };
        
        window.loadMoreCols2D = function() {
            currentShowCols2D += 20;
            if (fullVariableData && currentVariableData) {
                mainContent.innerHTML = renderPreview(currentVariableData.name, fullVariableData);
            }
        };

        function render3DTable(value) {
            if (!value.data) return '';
            
            const shape = value.shape;
            let sliceData = null;
            
            if (currentAxis === 0) {
                sliceData = value.data[currentSlice];
            } else if (currentAxis === 1) {
                sliceData = value.data.map(row => row[currentSlice]);
            } else if (currentAxis === 2) {
                sliceData = value.data.map(row => row.map(col => col[currentSlice]));
            }
            
            const rowsToShow = Math.min(50, sliceData.length);
            const colsToShow = Math.min(20, sliceData[0].length);
            
            let html = '<table class="data-table">';
            html += '<tr><th></th>';
            for (let j = 0; j < colsToShow; j++) {
                html += '<th>' + j + '</th>';
            }
            if (sliceData[0].length > colsToShow) {
                html += '<th>...</th>';
            }
            html += '</tr>';
            
            for (let i = 0; i < rowsToShow; i++) {
                html += '<tr><th>' + i + '</th>';
                const row = sliceData[i];
                for (let j = 0; j < colsToShow; j++) {
                    const v = row[j];
                    html += '<td>' + (v && v._type === 'complex' ? 
                        '<div class="complex-cell"><span class="complex-real">' + v.real.toFixed(4) + '</span><span class="complex-imag">' + v.imag.toFixed(4) + 'i</span></div>' :
                        (typeof v === 'number' ? v.toFixed(4) : v)
                    ) + '</td>';
                }
                if (sliceData[0].length > colsToShow) {
                    html += '<td>...</td>';
                }
                html += '</tr>';
            }
            
            if (sliceData.length > rowsToShow) {
                html += '<tr><th>...</th>';
                for (let j = 0; j < colsToShow; j++) {
                    html += '<td>...</td>';
                }
                if (sliceData[0].length > colsToShow) {
                    html += '<td>...</td>';
                }
                html += '</tr>';
            }
            
            html += '</table>';
            return html;
        }

        function renderStruct(name, value) {
            const fields = Object.keys(value).filter(k => k !== '_type');
            
            let html = '<div class="variable-preview">' +
                '<div class="preview-header">' +
                '<div class="preview-title">' + name + '</div>' +
                '<div class="preview-meta">Struct · ' + fields.length + ' fields</div>' +
                '</div>' +
                '<div class="preview-content">' +
                '<div class="struct-fields">';
            
            fields.forEach(function(field) {
                const fieldValue = value[field];
                html += '<div class="struct-field">' +
                    '<div class="struct-field-name">' + field + '</div>' +
                    '<div class="struct-field-meta">' + formatType(fieldValue) + '</div>' +
                    '<div class="struct-field-value">' +
                    formatFieldValue(fieldValue) +
                    '</div>' +
                    '</div>';
            });
            
            html += '</div></div></div>';
            return html;
        }

        function formatFieldValue(value) {
            if (typeof value === 'number') {
                return value.toString();
            } else if (typeof value === 'string') {
                return '"' + value + '"';
            } else if (value && value._type === 'complex') {
                return value.real + (value.imag >= 0 ? '+' : '') + value.imag + 'i';
            } else if (value && value._type === 'ndarray') {
                return 'ndarray: ' + value.shape.join('×') + ' · ' + value.dtype;
            } else if (typeof value === 'object' && value !== null) {
                return 'Object: ' + Object.keys(value).filter(k => k !== '_type').join(', ');
            }
            return String(value);
        }

        function render2DArray(name, value) {
            const stats = value.statistics || value.stats || {};
            
            let html = '<div class="variable-preview">' +
                '<div class="preview-header">' +
                '<div class="preview-title">' + name + '</div>' +
                '<div class="preview-meta">' + value.shape.join(' × ') + ' · ' + value.dtype + ' · ' + formatSize(value.size * 8) + '</div>' +
                '</div>' +
                '<div class="preview-content">';
            
            let statsHtml = '';
            if (stats.min !== undefined) {
                statsHtml = '<div class="stats-grid">' +
                    '<div class="stat-item"><div class="stat-label">Min</div><div class="stat-value">' + (typeof stats.min === 'number' ? stats.min.toFixed(4) : stats.min) + '</div></div>' +
                    '<div class="stat-item"><div class="stat-label">Max</div><div class="stat-value">' + (typeof stats.max === 'number' ? stats.max.toFixed(4) : stats.max) + '</div></div>';
                if (stats.mean !== undefined) {
                    statsHtml += '<div class="stat-item"><div class="stat-label">Mean</div><div class="stat-value">' + (typeof stats.mean === 'number' ? stats.mean.toFixed(4) : stats.mean) + '</div></div>';
                }
                if (stats.std !== undefined) {
                    statsHtml += '<div class="stat-item"><div class="stat-label">Std</div><div class="stat-value">' + (typeof stats.std === 'number' ? stats.std.toFixed(4) : stats.std) + '</div></div>';
                }
                statsHtml += '</div>';
            }
            
            html += statsHtml;
            
            html += '<div class="view-tabs">' +
                '<button class="view-tab ' + (currentDisplayMode === 'table' ? 'active' : '') + '" onclick="setDisplayMode(' + "'table'" + ')">📊 Table</button>' +
                '<button class="view-tab ' + (currentDisplayMode === 'image' ? 'active' : '') + '" onclick="setDisplayMode(' + "'image'" + ')">🖼️ Image</button>' +
                '</div>';
            
            if (currentDisplayMode === 'image') {
                if (value.complex) {
                    html += '<div class="view-mode-selector">' +
                        '<button class="' + (currentViewMode === 'magnitude' ? 'active' : '') + '" onclick="setViewMode(' + "'magnitude'" + ')">Magnitude</button>' +
                        '<button class="' + (currentViewMode === 'phase' ? 'active' : '') + '" onclick="setViewMode(' + "'phase'" + ')">Phase</button>' +
                        '<button class="' + (currentViewMode === 'real' ? 'active' : '') + '" onclick="setViewMode(' + "'real'" + ')">Real</button>' +
                        '<button class="' + (currentViewMode === 'imag' ? 'active' : '') + '" onclick="setViewMode(' + "'imag'" + ')">Imag</button>' +
                        '</div>';
                }
                
                html += '<div class="image-viewer">' +
                    '<canvas id="imageCanvas" class="image-canvas"></canvas>' +
                    '</div>';
                
                const sliceData = get2DSlice(value, currentViewMode);
                setTimeout(() => renderImageToCanvas(sliceData), 10);
            } else {
                html += render2DTable(value);
            }
            
            html += '</div></div>';
            return html;
        }

        function render3DArray(name, value) {
            const stats = value.statistics || value.stats || {};
            const numSlices = value.shape[currentAxis];
            
            let html = '<div class="variable-preview">' +
                '<div class="preview-header">' +
                '<div class="preview-title">' + name + '</div>' +
                '<div class="preview-meta">' + value.shape.join(' × ') + ' · ' + value.dtype + ' · ' + formatSize(value.size * 8) + '</div>' +
                '</div>' +
                '<div class="preview-content">';
            
            let statsHtml = '';
            if (stats.min !== undefined) {
                statsHtml = '<div class="stats-grid">' +
                    '<div class="stat-item"><div class="stat-label">Min</div><div class="stat-value">' + (typeof stats.min === 'number' ? stats.min.toFixed(4) : stats.min) + '</div></div>' +
                    '<div class="stat-item"><div class="stat-label">Max</div><div class="stat-value">' + (typeof stats.max === 'number' ? stats.max.toFixed(4) : stats.max) + '</div></div>';
                if (stats.mean !== undefined) {
                    statsHtml += '<div class="stat-item"><div class="stat-label">Mean</div><div class="stat-value">' + (typeof stats.mean === 'number' ? stats.mean.toFixed(4) : stats.mean) + '</div></div>';
                }
                if (stats.std !== undefined) {
                    statsHtml += '<div class="stat-item"><div class="stat-label">Std</div><div class="stat-value">' + (typeof stats.std === 'number' ? stats.std.toFixed(4) : stats.std) + '</div></div>';
                }
                statsHtml += '</div>';
            }
            
            html += statsHtml;
            
            html += '<div class="view-tabs">' +
                '<button class="view-tab ' + (currentDisplayMode === 'table' ? 'active' : '') + '" onclick="setDisplayMode(' + "'table'" + ')">📊 Table</button>' +
                '<button class="view-tab ' + (currentDisplayMode === 'image' ? 'active' : '') + '" onclick="setDisplayMode(' + "'image'" + ')">🖼️ Image</button>' +
                '</div>';
            
            if (currentDisplayMode === 'image') {
                html += '<div class="tensor-controls">' +
                    '<label>View Axis:</label>' +
                    '<select onchange="setAxis(this.value);">' +
                    '<option value="0" ' + (currentAxis === 0 ? 'selected' : '') + '>Axis 0 (' + value.shape[0] + ')</option>' +
                    '<option value="1" ' + (currentAxis === 1 ? 'selected' : '') + '>Axis 1 (' + value.shape[1] + ')</option>' +
                    '<option value="2" ' + (currentAxis === 2 ? 'selected' : '') + '>Axis 2 (' + value.shape[2] + ')</option>' +
                    '</select>';
                
                if (value.complex) {
                    html += '<label>View Mode:</label>' +
                        '<div class="view-mode-selector">' +
                        '<button class="' + (currentViewMode === 'magnitude' ? 'active' : '') + '" onclick="setViewMode(' + "'magnitude'" + ')">Magnitude</button>' +
                        '<button class="' + (currentViewMode === 'phase' ? 'active' : '') + '" onclick="setViewMode(' + "'phase'" + ')">Phase</button>' +
                        '<button class="' + (currentViewMode === 'real' ? 'active' : '') + '" onclick="setViewMode(' + "'real'" + ')">Real</button>' +
                        '<button class="' + (currentViewMode === 'imag' ? 'active' : '') + '" onclick="setViewMode(' + "'imag'" + ')">Imag</button>' +
                        '</div>';
                }
                
                html += '<label>Slice:</label>' +
                    '<input type="range" id="sliceSlider" min="0" max="' + (numSlices - 1) + '" value="' + currentSlice + '" oninput="updateSlice(this.value);">' +
                    '<span class="tensor-value" id="sliceValue">' + currentSlice + '</span>' +
                    '</div>';
                
                html += '<div class="image-viewer">' +
                    '<canvas id="imageCanvas" class="image-canvas"></canvas>' +
                    '</div>';
                
                const sliceData = get3DSlice(value, currentAxis, currentSlice, currentViewMode);
                setTimeout(() => renderImageToCanvas(sliceData), 10);
            } else {
                html += '<div class="tensor-controls">' +
                    '<label>View Axis:</label>' +
                    '<select onchange="setAxis(this.value);">' +
                    '<option value="0" ' + (currentAxis === 0 ? 'selected' : '') + '>Axis 0 (' + value.shape[0] + ')</option>' +
                    '<option value="1" ' + (currentAxis === 1 ? 'selected' : '') + '>Axis 1 (' + value.shape[1] + ')</option>' +
                    '<option value="2" ' + (currentAxis === 2 ? 'selected' : '') + '>Axis 2 (' + value.shape[2] + ')</option>' +
                    '</select>';
                
                html += '<label>Slice:</label>' +
                    '<input type="range" id="sliceSlider" min="0" max="' + (numSlices - 1) + '" value="' + currentSlice + '" oninput="updateSlice(this.value);">' +
                    '<span class="tensor-value" id="sliceValue">' + currentSlice + '</span>' +
                    '</div>';
                
                html += render3DTable(value);
            }
            
            html += '</div></div>';
            return html;
        }

        function renderPreview(name, value) {
            if (typeof value === 'number') {
                return '<div class="variable-preview">' +
                    '<div class="preview-header">' +
                    '<div class="preview-title">' + name + '</div>' +
                    '<div class="preview-meta">Scalar</div>' +
                    '</div>' +
                    '<div class="preview-content">' +
                    '<div class="scalar-value">' + value + '</div>' +
                    '</div>' +
                    '</div>';
            } else if (typeof value === 'string') {
                return '<div class="variable-preview">' +
                    '<div class="preview-header">' +
                    '<div class="preview-title">' + name + '</div>' +
                    '<div class="preview-meta">String · ' + value.length + ' chars</div>' +
                    '</div>' +
                    '<div class="preview-content">' +
                    '<div style="padding: 20px; background: var(--bg-hover); border-radius: 12px; font-family: monospace;">"' + value + '"</div>' +
                    '</div>' +
                    '</div>';
            } else if (value && value._type === 'complex') {
                return '<div class="variable-preview">' +
                    '<div class="preview-header">' +
                    '<div class="preview-title">' + name + '</div>' +
                    '<div class="preview-meta">Complex Number</div>' +
                    '</div>' +
                    '<div class="preview-content">' +
                    '<div class="complex-view">' +
                    '<div class="complex-part">' +
                    '<div class="complex-label">Real</div>' +
                    '<div class="complex-value" style="color: var(--text-accent);">' + value.real + '</div>' +
                    '</div>' +
                    '<div class="complex-part">' +
                    '<div class="complex-label">Imaginary</div>' +
                    '<div class="complex-value" style="color: var(--text-error);">' + value.imag + 'i</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>';
            } else if (value && value._type === 'ndarray') {
                if (value.shape.length === 1) {
                    const stats = value.statistics || value.stats || {};
                    let html = '<div class="variable-preview">' +
                        '<div class="preview-header">' +
                        '<div class="preview-title">' + name + '</div>' +
                        '<div class="preview-meta">' + value.shape[0] + '×1 · ' + value.dtype + ' · ' + formatSize(value.size * 8) + '</div>' +
                        '</div>' +
                        '<div class="preview-content">';
                    
                    let statsHtml = '';
                    if (stats && stats.min !== undefined) {
                        statsHtml = '<div class="stats-grid">' +
                            '<div class="stat-item"><div class="stat-label">Min</div><div class="stat-value">' + (typeof stats.min === 'number' ? stats.min.toFixed(4) : stats.min) + '</div></div>' +
                            '<div class="stat-item"><div class="stat-label">Max</div><div class="stat-value">' + (typeof stats.max === 'number' ? stats.max.toFixed(4) : stats.max) + '</div></div>';
                        if (stats.mean !== undefined) {
                            statsHtml += '<div class="stat-item"><div class="stat-label">Mean</div><div class="stat-value">' + (typeof stats.mean === 'number' ? stats.mean.toFixed(4) : stats.mean) + '</div></div>';
                        }
                        if (stats.std !== undefined) {
                            statsHtml += '<div class="stat-item"><div class="stat-label">Std</div><div class="stat-value">' + (typeof stats.std === 'number' ? stats.std.toFixed(4) : stats.std) + '</div></div>';
                        }
                        statsHtml += '</div>';
                    }
                    html += statsHtml;
                    html += render1DArray(value);
                    html += '</div></div>';
                    return html;
                } else if (value.shape.length === 2) {
                    return render2DArray(name, value);
                } else if (value.shape.length === 3) {
                    return render3DArray(name, value);
                } else {
                    return '<div class="variable-preview">' +
                        '<div class="preview-header">' +
                        '<div class="preview-title">' + name + '</div>' +
                        '<div class="preview-meta">' + formatType(value) + '</div>' +
                        '</div>' +
                        '<div class="preview-content">' +
                        '<pre style="background: var(--bg-primary); padding: 20px; border-radius: 12px; overflow: auto;">' + JSON.stringify(value, null, 2) + '</pre>' +
                        '</div>' +
                        '</div>';
                }
            } else if (value && typeof value === 'object' && (!value._type || value._type === 'struct')) {
                return renderStruct(name, value);
            } else {
                return '<div class="variable-preview">' +
                    '<div class="preview-header">' +
                    '<div class="preview-title">' + name + '</div>' +
                    '<div class="preview-meta">' + formatType(value) + '</div>' +
                    '</div>' +
                    '<div class="preview-content">' +
                    '<pre style="background: var(--bg-primary); padding: 20px; border-radius: 12px; overflow: auto;">' + JSON.stringify(value, null, 2) + '</pre>' +
                    '</div>' +
                    '</div>';
            }
        }

        window.setDisplayMode = function(mode) {
            currentDisplayMode = mode;
            if (fullVariableData && currentVariableData) {
                mainContent.innerHTML = renderPreview(currentVariableData.name, fullVariableData);
            }
        };

        window.setViewMode = function(mode) {
            currentViewMode = mode;
            if (fullVariableData && currentVariableData) {
                mainContent.innerHTML = renderPreview(currentVariableData.name, fullVariableData);
            }
        };

        window.setAxis = function(axis) {
            currentAxis = parseInt(axis);
            currentSlice = 0;
            if (fullVariableData && currentVariableData) {
                mainContent.innerHTML = renderPreview(currentVariableData.name, fullVariableData);
            }
        };

        window.updateSlice = function(value) {
            currentSlice = parseInt(value);
            document.getElementById('sliceValue').textContent = value;
            if (fullVariableData && currentVariableData) {
                if (currentDisplayMode === 'image') {
                    const sliceData = get3DSlice(fullVariableData, currentAxis, currentSlice, currentViewMode);
                    renderImageToCanvas(sliceData);
                } else {
                    mainContent.innerHTML = renderPreview(currentVariableData.name, fullVariableData);
                }
            }
        };

        function handleMessage(event) {
            const message = event.data;
            console.log('[Webview] Received:', message.command);

            if (message.command === 'fileLoaded') {
                const matData = message.data;
                currentVariableData = matData.data;
                fileInfo.textContent = (matData.version || 'v?') + ' · ' + (matData.file_path || '');
                
                currentActiveVariable = null;
                renderSidebar(matData.data);

                const varNames = Object.keys(matData.data).sort();
                let html = '<div class="success">';
                html += '<div class="success-icon">✅</div>';
                html += '<h2>File loaded successfully!</h2>';
                html += '<p>Variables: ' + varNames.length + '</p>';
                html += '<p style="margin-top: 24px;">';
                html += '👆 Click a variable in the <span class="highlight">sidebar</span> (left)';
                html += '</p>';
                html += '<p style="opacity: 0.7;">to view its data here</p>';
                html += '</div>';

                mainContent.innerHTML = html;
            } else if (message.command === 'showVariable') {
                const name = message.variableName;
                const value = message.variableValue;
                console.log('[Webview] Showing variable:', name);
                
                selectSidebarVariable(name);
            } else if (message.command === 'error') {
                mainContent.innerHTML = '<div class="error">Error: ' + message.error + '</div>';
            }
        }

        settingsBtn.addEventListener('click', openSettings);
        closeSettingsBtn.addEventListener('click', closeSettings);
        overlay.addEventListener('click', closeSettings);
        
        darkTheme.addEventListener('click', () => applyTheme('dark'));
        lightTheme.addEventListener('click', () => applyTheme('light'));
        autoTheme.addEventListener('click', () => applyTheme('auto'));

        sidebarToggle.addEventListener('click', toggleSidebar);
        headerToggle.addEventListener('click', toggleSidebar);

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (currentTheme === 'auto') {
                applyTheme('auto');
            }
        });

        const savedTheme = localStorage.getItem('matViewerTheme') || 'auto';
        applyTheme(savedTheme);

        const savedSidebarCollapsed = localStorage.getItem('matViewerSidebarCollapsed');
        if (savedSidebarCollapsed === 'true') {
            sidebarCollapsed = true;
            sidebar.classList.add('collapsed');
            headerToggle.classList.add('visible');
        }

        window.addEventListener('message', handleMessage);
        console.log('[Webview] Ready');
    </script>
</body>
</html>`;
    }
}
