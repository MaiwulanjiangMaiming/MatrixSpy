import * as vscode from 'vscode';
import { WebviewMessage } from '../types';

export class WebViewMessageHelper {
    /**
     * Send a file loaded message to webview
     */
    static sendFileLoaded(
        webviewPanel: vscode.WebviewPanel,
        data: any
    ): void {
        this.sendMessage(webviewPanel, {
            command: 'fileLoaded',
            data: data
        });
    }

    /**
     * Send a slice loaded message to webview
     */
    static sendSliceLoaded(
        webviewPanel: vscode.WebviewPanel,
        variableName: string,
        success: boolean,
        data?: any,
        error?: string
    ): void {
        this.sendMessage(webviewPanel, {
            command: 'sliceLoaded',
            variableName: variableName,
            success: success,
            data: data,
            error: error
        });
    }

    /**
     * Send an error message to webview
     */
    static sendError(
        webviewPanel: vscode.WebviewPanel,
        error: string,
        retryable: boolean = false
    ): void {
        this.sendMessage(webviewPanel, {
            command: 'error',
            error: error,
            retryable: retryable
        });
    }

    /**
     * Send a show variable message to webview
     */
    static sendShowVariable(
        webviewPanel: vscode.WebviewPanel,
        variableName: string,
        value: any
    ): void {
        this.sendMessage(webviewPanel, {
            command: 'showVariable',
            variableName: variableName,
            variableValue: value
        });
    }

    /**
     * Send a custom command to webview
     */
    static sendCommand(
        webviewPanel: vscode.WebviewPanel,
        command: string,
        data?: any
    ): void {
        this.sendMessage(webviewPanel, {
            command: command,
            data: data
        });
    }

    /**
     * Generic message sender
     */
    private static sendMessage(
        webviewPanel: vscode.WebviewPanel,
        message: WebviewMessage
    ): void {
        try {
            webviewPanel.webview.postMessage(message);
        } catch (error) {
            console.error('Failed to send message to webview:', error);
        }
    }

    /**
     * Handle webview messages with error handling
     */
    static handleMessage(
        handler: (message: any) => Promise<void> | void
    ): (event: any) => void {
        return async (event: any) => {
            try {
                await handler(event.data);
            } catch (error) {
                console.error('Error handling webview message:', error);
            }
        };
    }

    /**
     * Validate incoming message structure
     */
    static validateMessage(message: any): boolean {
        if (!message || typeof message !== 'object') {
            return false;
        }

        if (typeof message.command !== 'string') {
            return false;
        }

        return true;
    }
}