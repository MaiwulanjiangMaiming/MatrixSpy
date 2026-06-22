/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import * as path from 'path';
import { PythonBridge } from '../ipc/PythonBridge';
import { updateTreeData, updateCurrentWebviewPanel, clearCurrentWebviewPanelIfMatching, cacheFileData, updateStatusBar, sendTelemetry, addRecentFile } from '../extension';
import { getHtml } from '../webview/html';
import type { WebviewToExtension, ExtensionToWebview } from '../types/messages';

export class MatFileEditorProvider implements vscode.CustomReadonlyEditorProvider {
    /**
     * Per-document message listeners.
     *
     * VS Code calls `resolveCustomEditor` once per opened MAT file. Previously
     * we stored a single `messageListenerDisposable` and disposed it before
     * registering a new one, which meant only the most recently opened file
     * could receive messages from its webview — older tabs silently dropped
     * slice requests and selection updates. Keying by document URI ensures
     * every open editor keeps its own listener for its lifetime.
     */
    private readonly messageListeners = new Map<string, vscode.Disposable>();

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly pythonBridge: PythonBridge
    ) {
        this.context.subscriptions.push(this);
    }

    public dispose(): void {
        for (const disposable of this.messageListeners.values()) {
            disposable.dispose();
        }
        this.messageListeners.clear();
    }

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
        const filePath = document.uri.fsPath;
        updateCurrentWebviewPanel(webviewPanel);
        addRecentFile(this.context, filePath);

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'webview-dist'),
                this.context.extensionUri
            ]
        };

        const version = this.context.extension.packageJSON.version || '1.3.17';
        webviewPanel.webview.html = getHtml(version);

        const loadingMsg: ExtensionToWebview = { command: 'loadingStart', message: 'Loading file...' };
        webviewPanel.webview.postMessage(loadingMsg);

        // Dispose any previous listener for this document (e.g. when the
        // same file is reopened after being closed) before registering a
        // fresh one. Other documents' listeners are left untouched.
        const existing = this.messageListeners.get(filePath);
        if (existing) {
            existing.dispose();
            this.messageListeners.delete(filePath);
        }
        const listener = webviewPanel.webview.onDidReceiveMessage(
            this.createMessageHandler(filePath, webviewPanel)
        );
        this.messageListeners.set(filePath, listener);

        webviewPanel.onDidDispose(() => {
            const l = this.messageListeners.get(filePath);
            if (l) {
                l.dispose();
                this.messageListeners.delete(filePath);
            }
            // Only clear the global active-panel pointer if this panel is
            // still the one registered as active. Otherwise we'd clobber a
            // newer panel that has since become active.
            clearCurrentWebviewPanelIfMatching(webviewPanel);
        });

        // Track this panel as active while it's visible.
        webviewPanel.onDidChangeViewState(() => {
            if (webviewPanel.active) {
                updateCurrentWebviewPanel(webviewPanel);
            }
        });

        await this.handleLoadFile(filePath, webviewPanel);
    }

    private createMessageHandler(filePath: string, webviewPanel: vscode.WebviewPanel) {
        return async (message: WebviewToExtension) => {
            if (message.command === 'loadSlice') {
                try {
                    const sliceResult = await this.pythonBridge.loadSlice(
                        filePath,
                        message.variableName!,
                        message.axis!,
                        message.index!
                    );

                    webviewPanel.webview.postMessage({
                        command: 'sliceLoaded',
                        variableName: message.variableName,
                        success: sliceResult.success,
                        data: sliceResult.success ? sliceResult.data : null,
                        error: sliceResult.success ? null : sliceResult.error
                    });
                } catch (error) {
                    webviewPanel.webview.postMessage({
                        command: 'sliceLoaded',
                        variableName: message.variableName,
                        success: false,
                        data: null,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            } else if (message.command === 'openExternal' && message.url) {
                try {
                    const url = message.url;
                    if (/^(https?:|mailto:)/i.test(url)) {
                        vscode.env.openExternal(vscode.Uri.parse(url));
                    }
                } catch {
                    // ignore malformed URLs
                }
            } else if (message.command === 'variableSelected' && message.variableName) {
                const fileName = path.basename(filePath);
                const cachedData = cacheFileData(filePath);
                const varCount = cachedData ? Object.keys(cachedData).length : 0;
                updateStatusBar(fileName, varCount, message.variableName, message.varInfo || null);
                const varInfo = message.varInfo || {};
                sendTelemetry('variableSelected', {
                    ndim: String(varInfo.shape?.length ?? 0),
                    dtype: varInfo.dtype || 'unknown'
                });
            } else if (message.command === 'exportData') {
                // The webview toolbar Export button delegates to the unified
                // export command. Ensure this panel is the active one so the
                // command's getActiveMatFilePath() resolves to this document.
                webviewPanel.reveal(vscode.ViewColumn.Active, false);
                vscode.commands.executeCommand('matrixspy.export');
            }
        };
    }

    private async handleLoadFile(filePath: string, webviewPanel: vscode.WebviewPanel, retryCount: number = 0) {
        const MAX_RETRIES = 3;

        try {
            this.pythonBridge.setProgressCallback((progress, stage) => {
                webviewPanel.webview.postMessage({ command: 'loadingProgress', progress, stage });
            });

            const result = await this.pythonBridge.parseFile(filePath);

            this.pythonBridge.setProgressCallback(null);

            if (result.success && result.data) {
                cacheFileData(filePath, result.data);
                updateTreeData(result.data);
                const fileName = path.basename(filePath);
                const varCount = Object.keys(result.data).length;
                updateStatusBar(fileName, varCount, null, null);
                vscode.commands.executeCommand('setContext', 'matrixspy:hasActiveFile', true);
                sendTelemetry('fileLoaded', {
                    fileVersion: result.version || 'unknown',
                    variableCount: String(varCount)
                });
            }

            webviewPanel.webview.postMessage({
                command: 'fileLoaded',
                data: result,
                customColormaps: vscode.workspace.getConfiguration('matrixspy').get<Record<string, number[][]>>('customColormaps', {})
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isRetryable = (error instanceof Error && error.message.includes('timeout')) ||
                (error && typeof error === 'object' && 'retryable' in error && (error as any).retryable);
            sendTelemetry('error', { errorCode: errorMsg.substring(0, 100) });

            webviewPanel.webview.postMessage({
                command: 'error',
                error: errorMsg,
                retryable: isRetryable && retryCount < MAX_RETRIES
            });

            if (isRetryable && retryCount < MAX_RETRIES) {
                const delay = 2000 * Math.pow(2, retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                await this.handleLoadFile(filePath, webviewPanel, retryCount + 1);
            }
        }
    }
}
