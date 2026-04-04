import * as vscode from 'vscode';
import { PythonBridge } from '../ipc/PythonBridge';

export class MatTreeDataProvider implements vscode.TreeDataProvider<MatTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MatTreeItem | undefined | null | void> = new vscode.EventEmitter<MatTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MatTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private data: any = null;

    constructor(private readonly pythonBridge: PythonBridge) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setData(data: any): void {
        this.data = data;
        this.refresh();
    }

    getTreeItem(element: MatTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: MatTreeItem): Thenable<MatTreeItem[]> {
        if (!this.data) {
            return Promise.resolve([]);
        }

        if (!element) {
            return Promise.resolve(this.getRootItems());
        }

        return Promise.resolve(this.getChildItems(element));
    }

    private getRootItems(): MatTreeItem[] {
        if (!this.data || !this.data.data) {
            return [];
        }

        const items: MatTreeItem[] = [];
        for (const [key, value] of Object.entries(this.data.data)) {
            items.push(this.createTreeItem(key, value, true));
        }

        return items;
    }

    private getChildItems(parent: MatTreeItem): MatTreeItem[] {
        const items: MatTreeItem[] = [];

        if (parent.metadata && parent.metadata._type === 'struct') {
            for (const [key, value] of Object.entries(parent.metadata)) {
                if (key !== '_type') {
                    items.push(this.createTreeItem(key, value, false));
                }
            }
        } else if (parent.metadata && parent.metadata._type === 'ndarray') {
            items.push(new MatTreeItem(
                `Shape: [${parent.metadata.shape.join(', ')}]`,
                vscode.TreeItemCollapsibleState.None,
                'info',
                parent.metadata
            ));
            items.push(new MatTreeItem(
                `Type: ${parent.metadata.dtype}`,
                vscode.TreeItemCollapsibleState.None,
                'info',
                parent.metadata
            ));
            if (parent.metadata.complex) {
                items.push(new MatTreeItem(
                    'Complex: Yes',
                    vscode.TreeItemCollapsibleState.None,
                    'info',
                    parent.metadata
                ));
            }
        }

        return items;
    }

    private createTreeItem(key: string, value: any, isRoot: boolean): MatTreeItem {
        let collapsibleState = vscode.TreeItemCollapsibleState.None;
        let description = '';
        let type = 'unknown';

        if (value && typeof value === 'object') {
            if (value._type === 'ndarray') {
                type = 'array';
                description = `[${value.shape.join('×')}] ${value.dtype}`;
                if (value.complex) {
                    description += ' (complex)';
                }
            } else if (value._type === 'struct') {
                type = 'struct';
                collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                const fieldCount = Object.keys(value).filter(k => k !== '_type').length;
                description = `${fieldCount} fields`;
            } else if (value._type === 'complex') {
                type = 'complex';
                description = `${value.real} + ${value.imag}i`;
            } else {
                type = 'object';
                collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            }
        } else if (typeof value === 'number') {
            type = 'number';
            description = String(value);
        } else if (typeof value === 'string') {
            type = 'string';
            description = value.length > 30 ? value.substring(0, 30) + '...' : value;
        }

        const item = new MatTreeItem(key, collapsibleState, type, value);
        item.description = description;
        item.tooltip = `${key}: ${type}`;

        if (isRoot) {
            item.contextValue = 'variable';
        }

        return item;
    }
}

class MatTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: string,
        public readonly metadata?: any
    ) {
        super(label, collapsibleState);

        this.iconPath = this.getIcon();
    }

    private getIcon(): vscode.ThemeIcon {
        switch (this.type) {
            case 'array':
                return new vscode.ThemeIcon('symbol-array');
            case 'struct':
                return new vscode.ThemeIcon('symbol-struct');
            case 'string':
                return new vscode.ThemeIcon('symbol-string');
            case 'number':
                return new vscode.ThemeIcon('symbol-number');
            case 'complex':
                return new vscode.ThemeIcon('symbol-number');
            case 'info':
                return new vscode.ThemeIcon('info');
            default:
                return new vscode.ThemeIcon('symbol-misc');
        }
    }
}
