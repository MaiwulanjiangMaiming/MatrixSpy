export function getCss(): string {
    return `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    height: 100vh;
    overflow: hidden;
    transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1), color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.main-content,
.main-content * {
    user-select: text;
    -webkit-user-select: text;
}
.image-canvas,
.toolbar-btn,
.sidebar-tree-item {
    user-select: none;
    -webkit-user-select: none;
}
.app {
    display: flex;
    flex-direction: row;
    height: 100vh;
}
.header {
    background: var(--vscode-sideBar-background);
    padding: 12px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}
.header h1 {
    font-size: 15px;
    font-weight: 600;
    color: var(--vscode-textLink-foreground);
    letter-spacing: -0.3px;
}
.header-right {
    display: flex;
    align-items: center;
    gap: 8px;
}
.file-info {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
}
.icon-button {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--vscode-editor-foreground);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.2s ease;
}
.icon-button:hover {
    background: var(--vscode-list-hoverBackground);
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
    color: var(--vscode-testing-iconPassed);
    margin-bottom: 12px;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.5px;
}
.success p {
    color: var(--vscode-descriptionForeground);
    margin: 6px 0;
    font-size: 14px;
}
.success .highlight {
    color: var(--vscode-textLink-foreground);
    font-weight: 500;
}
.variables-list {
    margin-top: 32px;
    padding: 20px;
    background: var(--vscode-editor-inactiveSelectionBackground);
    border-radius: 12px;
    border: 1px solid var(--vscode-panel-border);
}
.variables-list h3 {
    margin-bottom: 14px;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
}
.var-item {
    padding: 10px 14px;
    margin: 6px 0;
    background: var(--vscode-list-hoverBackground);
    border-radius: 8px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 13px;
    transition: transform 0.15s ease, background 0.15s ease;
}
.var-item:hover {
    transform: translateX(4px);
    background: var(--vscode-sideBar-background);
}
.var-name {
    color: var(--vscode-editorWarning-foreground);
    font-weight: 500;
}
.var-type {
    color: var(--vscode-textLink-foreground);
    margin-left: 10px;
    opacity: 0.8;
}
.error {
    color: var(--vscode-errorForeground);
    padding: 24px;
    background: rgba(244, 135, 113, 0.1);
    border-radius: 12px;
    border: 1px solid var(--vscode-errorForeground);
    margin: 20px;
}
.error-hint {
    margin-top: 12px;
    padding: 12px;
    background: var(--vscode-textBlockQuote-background);
    border-radius: 8px;
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
}
.error-hint code {
    background: var(--vscode-textCodeBlock-background);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
}
.variable-preview {
    margin-top: 24px;
    padding: 24px;
    background: var(--vscode-editor-inactiveSelectionBackground);
    border-radius: 16px;
    border: 1px solid var(--vscode-panel-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.preview-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
}
.preview-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--vscode-editorWarning-foreground);
    letter-spacing: -0.5px;
}
.preview-meta {
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
}
.preview-content {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 13px;
    background: var(--vscode-editor-background);
    padding: 20px;
    border-radius: 12px;
    overflow: auto;
    transition: background 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 650px;
    box-sizing: border-box;
    width: 100%;
}
.scalar-value {
    font-size: 48px;
    color: var(--vscode-testing-iconPassed);
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
    background: var(--vscode-list-hoverBackground);
    border-radius: 12px;
    text-align: center;
}
.complex-label {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
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
.mini-histogram-container {
    margin-top: 12px;
    text-align: center;
}
.mini-histogram {
    border-radius: 6px;
    background: var(--vscode-list-hoverBackground);
    max-width: 100%;
}
.stat-item {
    padding: 16px;
    background: var(--vscode-list-hoverBackground);
    border-radius: 12px;
    text-align: center;
    transition: transform 0.2s ease;
}
.stat-item:hover {
    transform: translateY(-2px);
}
.stat-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.stat-value {
    font-size: 18px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    color: var(--vscode-textLink-foreground);
    font-weight: 600;
}
.view-tabs {
    margin-top: 20px;
    margin-bottom: 20px;
    display: flex;
    gap: 8px;
    background: var(--vscode-list-hoverBackground);
    padding: 6px;
    border-radius: 10px;
    width: fit-content;
}
.view-tab {
    padding: 10px 20px;
    background: transparent;
    color: var(--vscode-editor-foreground);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
}
.view-tab.active {
    background: var(--vscode-button-background);
    color: white;
    box-shadow: 0 2px 8px rgba(14, 99, 156, 0.3);
}
.view-tab:hover:not(.active) {
    background: var(--vscode-sideBar-background);
}
.image-viewer {
    margin-top: 12px;
    background: var(--vscode-editor-background);
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    overflow: auto;
    max-height: 600px;
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
}
.image-canvas {
    image-rendering: pixelated;
    background: var(--vscode-editor-background);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    cursor: crosshair;
    transition: width 0.15s ease, height 0.15s ease;
}
.colorbar-canvas {
    border-radius: 3px;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.3));
    flex-shrink: 0;
}
.colorbar-labels {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    font-family: monospace;
    padding: 0 6px;
    flex-shrink: 0;
    min-width: 60px;
}
.cbar-max, .cbar-mid, .cbar-min {
    white-space: nowrap;
}
.image-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    background: var(--vscode-editorWidget-background);
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid var(--vscode-panel-border);
    margin-top: 12px;
}
.toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
}
.toolbar-group label {
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 4px;
}
.toolbar-btn {
    width: 32px;
    height: 32px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    line-height: 1;
    padding: 0;
}
.toolbar-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
    border-color: var(--vscode-focusBorder);
}
.toolbar-btn:active {
    transform: scale(0.95);
}
.toolbar-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
    min-width: 44px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}
.toolbar-value {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    min-width: 32px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}
.toolbar-divider {
    width: 1px;
    height: 24px;
    background: var(--vscode-panel-border);
}
.image-toolbar input[type="range"] {
    width: 80px;
    cursor: pointer;
}
.canvas-zoom-btn:hover {
    background: var(--vscode-button-background);
    color: white;
}
.canvas-zoom-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
.canvas-zoom-level {
    font-size: 13px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    color: var(--vscode-descriptionForeground);
    min-width: 60px;
    text-align: center;
}
.canvas-dimensions {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}
.view-mode-selector {
    margin-bottom: 16px;
}
.view-mode-selector button {
    margin: 0 6px;
    padding: 10px 16px;
    background: var(--vscode-button-background);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
}
.view-mode-selector button:hover {
    background: var(--vscode-button-hoverBackground);
    transform: translateY(-1px);
}
.view-mode-selector button.active {
    background: var(--vscode-testing-iconPassed);
    box-shadow: 0 2px 8px rgba(78, 201, 176, 0.3);
}
.tensor-controls {
    margin-top: 20px;
    padding: 20px;
    background: var(--vscode-list-hoverBackground);
    border-radius: 12px;
}
.tensor-controls label {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-right: 12px;
    font-weight: 500;
}
.tensor-controls select,
.tensor-controls input[type="range"] {
    margin: 8px 10px;
    padding: 8px 12px;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    font-size: 13px;
}
.tensor-controls select {
    cursor: pointer;
}
.tensor-value {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-weight: 700;
    color: var(--vscode-testing-iconPassed);
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
    border: 1px solid var(--vscode-panel-border);
    padding: 6px 8px;
    text-align: right;
    word-wrap: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
}
.data-table th {
    background: var(--vscode-sideBar-background);
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
    color: var(--vscode-textLink-foreground);
}
.complex-imag {
    color: var(--vscode-errorForeground);
}
.vector-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(clamp(70px, 10vw, 90px), 1fr));
    gap: 8px;
    margin-top: 20px;
}
.vector-item {
    padding: 10px;
    background: var(--vscode-list-hoverBackground);
    border-radius: 8px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 11px;
    text-align: center;
    transition: transform 0.15s ease, background 0.15s ease;
}
.vector-item:hover {
    transform: translateY(-2px);
    background: var(--vscode-sideBar-background);
}
.vector-index {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
}
.struct-fields {
    margin-top: 20px;
}
.struct-field {
    padding: 16px;
    background: var(--vscode-list-hoverBackground);
    margin: 10px 0;
    border-radius: 12px;
    border-left: 4px solid var(--vscode-editorWarning-foreground);
    transition: transform 0.15s ease;
}
.struct-field:hover {
    transform: translateX(4px);
}
.struct-field-name {
    font-weight: 700;
    color: var(--vscode-editorWarning-foreground);
    margin-bottom: 6px;
    font-size: 15px;
}
.struct-field-meta {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
}
.struct-field-value {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 13px;
    background: var(--vscode-editor-background);
    padding: 12px;
    border-radius: 8px;
}
.load-more-btn {
    padding: 12px 24px;
    background: var(--vscode-button-background);
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
    background: var(--vscode-button-hoverBackground);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(14, 99, 156, 0.4);
}
.load-more-btn:active {
    transform: translateY(0);
}
.settings-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 360px;
    height: 100vh;
    background: var(--vscode-sideBar-background);
    border-left: 1px solid var(--vscode-panel-border);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    display: flex;
    flex-direction: column;
}
.settings-panel.open {
    transform: translateX(0);
}
.settings-header {
    padding: 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
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
    color: var(--vscode-descriptionForeground);
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
    background: var(--vscode-list-hoverBackground);
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    text-align: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}
.theme-option:hover {
    background: var(--vscode-sideBar-background);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.theme-option:active {
    transform: translateY(0) scale(0.97);
    box-shadow: none;
}
.theme-option.active {
    border-color: var(--vscode-button-background);
    background: var(--vscode-editor-background);
    box-shadow: 0 0 0 1px var(--vscode-button-background), 0 2px 8px rgba(0,0,0,0.1);
}
.theme-option.active .theme-icon {
    animation: themeIconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.theme-icon {
    font-size: 28px;
    margin-bottom: 8px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.theme-option:hover .theme-icon {
    transform: scale(1.15);
}
.theme-name {
    font-size: 13px;
    font-weight: 500;
    transition: color 0.3s ease;
}
@keyframes themeIconPop {
    0% { transform: scale(0.5); opacity: 0.3; }
    60% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
}
.version-info {
    padding: 20px;
    background: var(--vscode-list-hoverBackground);
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
    color: var(--vscode-textLink-foreground);
    margin-bottom: 4px;
}
.version-label {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
}
.github-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px;
    background: var(--vscode-list-hoverBackground);
    border-radius: 10px;
    text-decoration: none;
    color: var(--vscode-editor-foreground);
    transition: all 0.2s ease;
    margin-top: 12px;
}
.github-link:hover {
    background: var(--vscode-button-background);
    color: white;
}
.github-icon {
    font-size: 20px;
}
.github-text {
    font-size: 14px;
    font-weight: 500;
}
.settings-footer {
    padding: 20px;
    border-top: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
}
.support-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.support-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
}
.support-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--vscode-panel-border);
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-editor-foreground);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
}
.support-btn:hover {
    background: var(--vscode-button-background);
    color: white;
    border-color: var(--vscode-button-background);
}
.support-btn .support-icon {
    font-size: 16px;
}
.support-divider {
    height: 1px;
    background: var(--vscode-panel-border);
    margin: 12px 0;
}
.support-note {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
    line-height: 1.5;
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
.sidebar {
    width: 280px;
    background: var(--vscode-sideBar-background);
    border-right: 1px solid var(--vscode-panel-border);
    display: flex;
    flex-direction: column;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, background 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
    border-bottom: 1px solid var(--vscode-panel-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    min-height: 57px;
}
.sidebar-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--vscode-descriptionForeground);
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
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
}
.sidebar-toggle:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-editor-foreground);
}
.sidebar-search {
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
}
.sidebar-search input {
    width: 100%;
    padding: 6px 10px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s ease;
}
.sidebar-search input:focus {
    border-color: var(--vscode-focusBorder);
}
.sidebar-search input::placeholder {
    color: var(--vscode-input-placeholderForeground);
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
    background: var(--vscode-list-hoverBackground);
}
.sidebar-item.active {
    background: var(--vscode-editor-background);
    border-left-color: var(--vscode-button-background);
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
    color: var(--vscode-descriptionForeground);
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
    background: var(--vscode-list-hoverBackground);
}
.sidebar-tree-item.active {
    background: var(--vscode-editor-background);
    border-left-color: var(--vscode-button-background);
}
.sidebar-tree-toggle {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    transition: transform 0.2s ease;
    flex-shrink: 0;
}
.sidebar-tree-toggle.expanded {
    transform: rotate(90deg);
}
.sidebar-tree-toggle:hover {
    color: var(--vscode-editor-foreground);
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
.sidebar-tree-name mark {
    background: var(--vscode-editor-findMatchHighlightBackground);
    color: var(--vscode-editor-foreground);
    border-radius: 2px;
    padding: 0 1px;
}
.sidebar-tree-type {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
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
    color: var(--vscode-textLink-foreground);
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
    color: var(--vscode-descriptionForeground);
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
.loading-bar-container {
    width: 100%;
    max-width: 400px;
    height: 6px;
    background: var(--vscode-list-hoverBackground);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 16px;
}
.loading-bar {
    height: 100%;
    background: var(--vscode-textLink-foreground);
    border-radius: 3px;
    transition: width 0.3s ease;
}
.loading-message {
    font-size: 14px;
    margin: 0;
}
.colormap-selector {
    display: inline-block;
    padding: 6px 12px;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-panel-border);
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
    border-color: var(--vscode-textLink-foreground);
}
.colormap-selector:focus {
    outline: none;
    border-color: var(--vscode-button-background);
    box-shadow: 0 0 0 2px rgba(14, 99, 156, 0.2);
}
.histogram-canvas {
    height: 200px;
    width: 100%;
    display: block;
    border-radius: 8px;
    background: var(--vscode-editor-background);
}
.sparkline {
    width: 60px;
    height: 16px;
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
}
.svg-chart-container {
    position: relative;
    margin-top: 16px;
    background: var(--vscode-list-hoverBackground);
    border-radius: 10px;
    padding: 12px 16px;
}
.line-chart-svg {
    width: 100%;
    height: 180px;
    display: block;
    cursor: crosshair;
}
.svg-chart-tooltip {
    position: absolute;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    pointer-events: none;
    z-index: 10;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.svg-chart-tooltip .tt-idx {
    color: var(--vscode-descriptionForeground);
    margin-right: 4px;
}
.svg-chart-tooltip .tt-val {
    color: var(--vscode-textLink-foreground);
    font-weight: 600;
}
.heatmap-tooltip {
    position: fixed;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    pointer-events: none;
    z-index: 100;
    white-space: nowrap;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    display: flex;
    gap: 10px;
    align-items: center;
}
.heatmap-tooltip .ht-row,
.heatmap-tooltip .ht-col {
    color: var(--vscode-descriptionForeground);
}
.heatmap-tooltip .ht-val {
    color: var(--vscode-textLink-foreground);
    font-weight: 600;
}
.context-menu {
    position: fixed;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 4px 0;
    min-width: 180px;
    z-index: 200;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    font-size: 13px;
}
.context-menu-item {
    padding: 6px 16px;
    cursor: pointer;
    color: var(--vscode-editor-foreground);
    transition: background 0.15s ease;
}
.context-menu-item:hover {
    background: var(--vscode-list-hoverBackground);
}
body.theme-light {
    --vscode-editor-background: #ffffff !important;
    --vscode-sideBar-background: #f3f3f3 !important;
    --vscode-editor-foreground: #1e1e1e !important;
    --vscode-descriptionForeground: #616161 !important;
    --vscode-panel-border: #e0e0e0 !important;
    --vscode-list-hoverBackground: rgba(0,0,0,0.06) !important;
    --vscode-textLink-foreground: #0066b8 !important;
    --vscode-editor-inactiveSelectionBackground: rgba(0,0,0,0.04) !important;
    --vscode-editorWidget-background: #f3f3f3 !important;
    --vscode-input-background: #ffffff !important;
    --vscode-input-foreground: #1e1e1e !important;
    --vscode-button-background: #0078d4 !important;
    --vscode-button-secondaryBackground: rgba(0,0,0,0.08) !important;
    --vscode-button-secondaryForeground: #1e1e1e !important;
    --vscode-focusBorder: #0078d4 !important;
    --vscode-editorWarning-foreground: #895503 !important;
    --vscode-testing-iconPassed: #388a34 !important;
    --vscode-errorForeground: #d32f2f !important;
    --vscode-breadcrumbBackground: #f3f3f3 !important;
}
body.theme-dark {
    --vscode-editor-background: #1e1e1e !important;
    --vscode-sideBar-background: #252526 !important;
    --vscode-editor-foreground: #cccccc !important;
    --vscode-descriptionForeground: #888888 !important;
    --vscode-panel-border: #3c3c3c !important;
    --vscode-list-hoverBackground: rgba(255,255,255,0.06) !important;
    --vscode-textLink-foreground: #3794ff !important;
    --vscode-editor-inactiveSelectionBackground: rgba(255,255,255,0.04) !important;
    --vscode-editorWidget-background: #252526 !important;
    --vscode-input-background: #3c3c3c !important;
    --vscode-input-foreground: #cccccc !important;
    --vscode-button-background: #0e639c !important;
    --vscode-button-secondaryBackground: rgba(255,255,255,0.1) !important;
    --vscode-button-secondaryForeground: #cccccc !important;
    --vscode-focusBorder: #0078d4 !important;
    --vscode-editorWarning-foreground: #cca700 !important;
    --vscode-testing-iconPassed: #4ec9b0 !important;
    --vscode-errorForeground: #f48771 !important;
    --vscode-breadcrumbBackground: #252526 !important;
}
`;
}
