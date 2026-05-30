/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import { PythonBridge } from '../ipc/PythonBridge';
import { updateTreeData, updateCurrentWebviewPanel, cacheFileData, updateStatusBar } from '../extension';
import { getHtml } from '../webview/html';
import type { WebviewToExtension, ExtensionToWebview } from '../types/messages';

export class MatFileEditorProvider implements vscode.CustomReadonlyEditorProvider {
    private messageListenerDisposable: vscode.Disposable | null = null;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly pythonBridge: PythonBridge
    ) {
        this.context.subscriptions.push(this);
    }

    public dispose(): void {
        this.removeMessageListener();
    }

    private removeMessageListener(): void {
        if (this.messageListenerDisposable) {
            this.messageListenerDisposable.dispose();
            this.messageListenerDisposable = null;
        }
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
        updateCurrentWebviewPanel(webviewPanel);

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'webview-dist'),
                this.context.extensionUri
            ]
        };

        const version = this.context.extension.packageJSON.version || '1.3.13';
        webviewPanel.webview.html = getHtml(version);

        const loadingMsg: ExtensionToWebview = { command: 'loadingStart', message: 'Loading file...' };
        webviewPanel.webview.postMessage(loadingMsg);

        this.removeMessageListener();
        this.messageListenerDisposable = webviewPanel.webview.onDidReceiveMessage(
            this.createMessageHandler(document.uri.fsPath, webviewPanel)
        );

        webviewPanel.onDidDispose(() => {
            this.removeMessageListener();
            updateCurrentWebviewPanel(null);
        });

        await this.handleLoadFile(document.uri.fsPath, webviewPanel);
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
                vscode.env.openExternal(vscode.Uri.parse(message.url));
            } else if (message.command === 'variableSelected' && message.variableName) {
                const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
                const cachedData = cacheFileData(filePath);
                const varCount = cachedData ? Object.keys(cachedData).length : 0;
                updateStatusBar(fileName, varCount, message.variableName, message.varInfo || null);
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
                const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
                const varCount = Object.keys(result.data).length;
                updateStatusBar(fileName, varCount, null, null);
                vscode.commands.executeCommand('setContext', 'matrixspy:hasActiveFile', true);
            }

            webviewPanel.webview.postMessage({
                command: 'fileLoaded',
                data: result
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isRetryable = (error instanceof Error && error.message.includes('timeout')) ||
                (error && typeof error === 'object' && 'retryable' in error && (error as any).retryable);

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
