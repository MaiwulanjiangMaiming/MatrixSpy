import * as vscode from 'vscode';
import { PythonBridge } from '../ipc/PythonBridge';
import { MatFileData } from '../types';

let currentData: MatFileData | null = null;
let currentWebviewPanel: vscode.WebviewPanel | null = null;

export function setCurrentData(data: MatFileData | null): void {
    currentData = data;
}

export function setCurrentWebviewPanel(panel: vscode.WebviewPanel | null): void {
    currentWebviewPanel = panel;
}

export function showVariable(name: string, value: any): void {
    if (currentWebviewPanel) {
        currentWebviewPanel.webview.postMessage({
            command: 'showVariable',
            variableName: name,
            variableValue: value
        });
    }
}

export class MatVariableTreeDataProvider implements vscode.TreeDataProvider<MatTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<MatTreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private data: MatFileData | null = null;

    constructor(private readonly pythonBridge: PythonBridge) {}

    setData(data: MatFileData): void {
        this.data = data;
        this._onDidChangeTreeData.fire(undefined);
    }

    clear(): void {
        this.data = null;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: MatTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MatTreeItem): MatTreeItem[] {
        if (!this.data && !currentData) {
            return [];
        }

        const sourceData = this.data || currentData;

        if (!element) {
            return Object.keys(sourceData!)
                .sort()
                .map(key => this.createTreeItem(key, sourceData![key]));
        }

        const value = element.metadata?.value;
        if (value && typeof value === 'object' && value._type !== 'ndarray' && value._type !== 'complex') {
            const keys = Object.keys(value).filter(k => k !== '_type');
            return keys.map(key => this.createTreeItem(key, value[key], element.label as string));
        }

        return [];
    }

    private createTreeItem(name: string, value: any, parentPath?: string): MatTreeItem {
        const type = this.formatType(value);
        const icon = this.getIcon(value);
        const path = parentPath ? `${parentPath}.${name}` : name;

        const isStruct = value && typeof value === 'object' &&
            value._type !== 'ndarray' && value._type !== 'complex';
        const hasChildren = isStruct && Object.keys(value).some(k => k !== '_type');

        const item = new MatTreeItem(
            name,
            hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            {
                command: 'matrixspy.showVariable',
                title: 'Show Variable',
                arguments: [path, value]
            }
        );

        item.description = type;
        item.iconPath = icon;
        item.tooltip = this.getTooltip(name, value);
        item.metadata = { value, path };

        return item;
    }

    private formatType(value: any): string {
        if (typeof value === 'number') {return 'number';}
        if (typeof value === 'string') {return 'string';}
        if (value && value._type === 'complex') {return 'complex';}
        if (value && value._type === 'ndarray') {
            const shape = value.shape;
            if (shape.length === 1) {return `${shape[0]}`;}
            if (shape.length === 2) {return `${shape[0]}×${shape[1]}`;}
            return shape.join('×');
        }
        if (typeof value === 'object') {
            const fieldCount = Object.keys(value).filter(k => k !== '_type').length;
            return `struct (${fieldCount})`;
        }
        return typeof value;
    }

    private getIcon(value: any): vscode.ThemeIcon {
        if (typeof value === 'number') {return new vscode.ThemeIcon('symbol-numeric');}
        if (typeof value === 'string') {return new vscode.ThemeIcon('symbol-string');}
        if (value && value._type === 'complex') {return new vscode.ThemeIcon('symbol-operator');}
        if (value && value._type === 'ndarray') {
            if (value.shape.length === 1) {return new vscode.ThemeIcon('graph-line');}
            if (value.shape.length === 2) {return new vscode.ThemeIcon('table');}
            return new vscode.ThemeIcon('symbol-array');
        }
        if (typeof value === 'object') {return new vscode.ThemeIcon('folder');}
        return new vscode.ThemeIcon('symbol-misc');
    }

    private getTooltip(name: string, value: any): string {
        if (value && value._type === 'ndarray') {
            return `${name}: ${value.shape.join('×')} ${value.dtype} array`;
        }
        if (typeof value === 'object' && value._type !== 'complex') {
            const fields = Object.keys(value).filter(k => k !== '_type');
            return `${name}: struct with fields [${fields.join(', ')}]`;
        }
        return `${name}: ${this.formatType(value)}`;
    }
}

export class MatTreeItem extends vscode.TreeItem {
    metadata?: { value: any; path: string };

    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);
        if (command) {
            this.command = command;
        }
    }
}
