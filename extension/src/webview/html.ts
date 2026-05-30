import * as crypto from 'crypto';
import { getCss } from './css';
import { getJs } from './js';

export function getHtml(version: string): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; img-src data:;">
    <title>MatrixSpy</title>
    <style nonce="${nonce}">${getCss()}</style>
</head>
<body>
    <div class="app">
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <span class="sidebar-title">Variables</span>
                <button class="sidebar-toggle" id="sidebarToggle" title="Hide sidebar">◀</button>
            </div>
            <div class="sidebar-search">
                <input type="text" id="sidebarSearch" placeholder="🔍 Search variables..." />
            </div>
            <div class="sidebar-content" id="sidebarContent" role="tree" aria-label="Variables">
                <div style="padding: 20px; color: var(--vscode-descriptionForeground); font-size: 13px;">
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
                    <div class="version-number">${version}</div>
                    <div class="version-label">MatrixSpy</div>
                    <a href="#" class="github-link" id="githubLink" onclick="return false;">
                        <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <span class="github-text">View on GitHub</span>
                    </a>
                </div>
            </div>

        </div>
        <div class="settings-footer">
            <div class="support-section">
                <div class="support-title">Support MatrixSpy</div>
                <a href="#" class="support-btn" id="starLink" onclick="return false;">
                    <span class="support-icon">⭐</span>
                    <span>Star on GitHub</span>
                </a>
                <a href="#" class="support-btn" id="feedbackLink" onclick="return false;">
                    <span class="support-icon">💬</span>
                    <span>Feedback & Issues</span>
                </a>
                <div class="support-divider"></div>
                <div class="support-note">
                    Your support helps keep MatrixSpy free and actively maintained. Thank you!
                </div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">${getJs(version)}</script>
</body>
</html>`;
}
