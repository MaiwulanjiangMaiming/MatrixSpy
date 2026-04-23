export function getCss(): string {
    return `
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
    grid-template-columns: repeat(auto-fit, minmax(clamp(100px, 15vw, 140px), 1fr));
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
    grid-template-columns: repeat(auto-fill, minmax(clamp(70px, 10vw, 90px), 1fr));
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
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}
.theme-option {
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
.sidebar-tree-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
    border-left: 3px solid transparent;
    position: relative;
}
.sidebar-tree-item:hover {
    background: var(--bg-hover);
}
.sidebar-tree-item.active {
    background: var(--bg-primary);
    border-left-color: var(--accent-blue);
}
.sidebar-tree-toggle {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 10px;
    transition: transform 0.2s ease;
    flex-shrink: 0;
}
.sidebar-tree-toggle.expanded {
    transform: rotate(90deg);
}
.sidebar-tree-toggle:hover {
    color: var(--text-primary);
}
.sidebar-tree-toggle.empty {
    visibility: hidden;
}
.sidebar-tree-icon {
    font-size: 14px;
    width: 18px;
    text-align: center;
    flex-shrink: 0;
}
.sidebar-tree-name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}
.sidebar-tree-type {
    font-size: 10px;
    color: var(--text-secondary);
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    flex-shrink: 0;
    opacity: 0.7;
}
.sidebar-tree-children {
    display: none;
    padding-left: 16px;
}
.sidebar-tree-children.expanded {
    display: block;
}
.sidebar-tree-shape {
    font-size: 10px;
    color: var(--text-accent);
    opacity: 0.6;
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
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--text-secondary);
}
.loading-spinner {
    font-size: 48px;
    margin-bottom: 24px;
    animation: spin 1s linear infinite;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
.loading-progress {
    width: 100%;
    max-width: 400px;
}
.progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-hover);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 12px;
}
.progress-fill {
    height: 100%;
    background: var(--text-accent);
    width: 0%;
    animation: progress 2s ease-in-out infinite;
}
@keyframes progress {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
}
.loading-message {
    font-size: 14px;
    margin: 0;
}
.colormap-selector {
    display: inline-block;
    padding: 6px 12px;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 28px;
}
.colormap-selector:hover {
    border-color: var(--text-accent);
}
.colormap-selector:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 2px rgba(14, 99, 156, 0.2);
}
.histogram-canvas {
    height: 200px;
    width: 100%;
    display: block;
    border-radius: 8px;
    background: var(--bg-primary);
}
.sparkline {
    width: 60px;
    height: 16px;
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
}
`;
}
