/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import { PythonBridge } from '../ipc/PythonBridge';
import { updateTreeData, updateCurrentWebviewPanel, cacheFileData } from '../extension';
import { getHtml } from '../webview/html';

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
                vscode.Uri.joinPath(this.context.extensionUri, 'webview-dist'),
                this.context.extensionUri
            ]
        };

        const version = this.context.extension.packageJSON.version || '1.1.2';
        webviewPanel.webview.html = getHtml(version);
        console.log('[MatrixSpy] HTML set');

        webviewPanel.webview.postMessage({
            command: 'loadingStart',
            message: 'Loading file...'
        });

        setTimeout(async () => {
            try {
                await this.handleLoadFile(document.uri.fsPath, webviewPanel);
            } catch (error) {
                webviewPanel.webview.postMessage({
                    command: 'loadingEnd'
                });
            }
        }, 0);

        webviewPanel.onDidDispose(() => {
            updateCurrentWebviewPanel(null);
        });
    }

    private async handleLoadFile(filePath: string, webviewPanel: vscode.WebviewPanel) {
        const retryLoad = async () => {
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

                webviewPanel.webview.onDidReceiveMessage(async (message) => {
                    console.log('[MatrixSpy] Received message:', message.command);

                    if (message.command === 'loadSlice') {
                        console.log('[MatrixSpy] Loading slice:', message.variableName, 'axis:', message.axis, 'index:', message.index);
                        try {
                            const sliceResult = await this.pythonBridge.loadSlice(
                                filePath,
                                message.variableName,
                                message.axis,
                                message.index
                            );

                            webviewPanel.webview.postMessage({
                                command: 'sliceLoaded',
                                variableName: message.variableName,
                                success: sliceResult.success,
                                data: sliceResult.success ? sliceResult.data : null,
                                error: sliceResult.success ? null : sliceResult.error
                            });
                        } catch (error) {
                            console.error('[MatrixSpy] Slice load error:', error);
                            webviewPanel.webview.postMessage({
                                command: 'sliceLoaded',
                                variableName: message.variableName,
                                success: false,
                                data: null,
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                    } else {
                        console.warn('[MatrixSpy] Unknown command:', message.command);
                    }
                });

            } catch (error) {
                console.error('[MatrixSpy] Error:', error);

                const errorMsg = error instanceof Error ? error.message : String(error);
                webviewPanel.webview.postMessage({
                    command: 'error',
                    error: errorMsg,
                    retryable: error instanceof Error && error.message.includes('timeout')
                });

                if (errorMsg.includes('timeout')) {
                    setTimeout(() => {
                        retryLoad();
                    }, 2000);
                }
            }
        };

        retryLoad();
    }
}
