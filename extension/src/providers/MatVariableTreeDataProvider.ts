/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import { PythonBridge } from '../ipc/PythonBridge';

let currentData: any = null;
let currentWebviewPanel: vscode.WebviewPanel | null = null;

export class MatVariableTreeDataProvider implements vscode.TreeDataProvider<MatVariableNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<MatVariableNode | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private data: any = null;

    constructor(private readonly pythonBridge: PythonBridge) {}

    public setData(data: any) {
        this.data = data;
        this._onDidChangeTreeData.fire();
    }

    public clear() {
        this.data = null;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MatVariableNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MatVariableNode): Thenable<MatVariableNode[]> {
        if (!this.data) {
            return Promise.resolve([]);
        }

        if (!element) {
            const keys = Object.keys(this.data).sort();
            return Promise.resolve(
                keys.map(key => new MatVariableNode(key, this.data[key], vscode.TreeItemCollapsibleState.None))
            );
        }

        return Promise.resolve([]);
    }
}

export class MatVariableNode extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly value: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        this.description = this.getTypeDescription();
        this.iconPath = this.getIcon();
        this.contextValue = 'matVariable';
        this.command = {
            command: 'matrixspy.showVariable',
            title: 'Show Variable',
            arguments: [this.label, this.value]
        };
    }

    private getTypeDescription(): string {
        const value = this.value;
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

    private getIcon(): vscode.ThemeIcon {
        const value = this.value;
        if (typeof value === 'number') return new vscode.ThemeIcon('symbol-number');
        if (typeof value === 'string') return new vscode.ThemeIcon('symbol-string');
        if (value && value._type === 'complex') return new vscode.ThemeIcon('symbol-variable');
        if (value && value._type === 'ndarray') return new vscode.ThemeIcon('symbol-array');
        if (typeof value === 'object') return new vscode.ThemeIcon('symbol-structure');
        return new vscode.ThemeIcon('symbol-file');
    }
}

export function setCurrentData(data: any) {
    currentData = data;
}

export function setCurrentWebviewPanel(panel: vscode.WebviewPanel | null) {
    currentWebviewPanel = panel;
}

export function showVariable(name: string, value: any) {
    if (currentWebviewPanel) {
        currentWebviewPanel.webview.postMessage({
            command: 'showVariable',
            variableName: name,
            variableValue: value
        });
    }
}
