import * as vscode from 'vscode';
import { getFileDataCache } from '../extension';
import { MatFileData, MatVariable } from '../types';

function getActiveMatFilePath(): string | null {
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (tab?.input instanceof vscode.TabInputCustom) {
        if (tab.input.viewType === 'matrixspy.matFile') {
            return tab.input.uri.fsPath;
        }
    }
    return null;
}

function getActiveFileData(): { filePath: string; data: MatFileData } | null {
    const filePath = getActiveMatFilePath();
    if (!filePath) {
        return null;
    }

    const cache = getFileDataCache();
    const data = cache.get(filePath);
    if (data) {
        return { filePath, data };
    }

    return null;
}

export async function exportCSVCommand() {
    const activeFile = getActiveFileData();
    if (!activeFile) {
        vscode.window.showErrorMessage('No active MAT file. Please open a .mat file first.');
        return;
    }

    const { filePath, data } = activeFile;

    try {
        const variables = Object.keys(data);
        if (variables.length === 0) {
            vscode.window.showWarningMessage('No variables found in the MAT file.');
            return;
        }

        const selectedVar = await vscode.window.showQuickPick(variables, {
            placeHolder: 'Select variable to export as CSV'
        });

        if (!selectedVar) {
            return;
        }

        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'CSV Files': ['csv']
            },
            defaultUri: vscode.Uri.file(`${selectedVar}.csv`)
        });

        if (!saveUri) {
            return;
        }

        const varData = data[selectedVar];
        const csvContent = convertToCSV(varData);

        if (!csvContent) {
            vscode.window.showWarningMessage(`Variable "${selectedVar}" cannot be exported as CSV. Only numeric arrays are supported.`);
            return;
        }

        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(csvContent, 'utf-8'));
        vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function exportJSONCommand() {
    const activeFile = getActiveFileData();
    if (!activeFile) {
        vscode.window.showErrorMessage('No active MAT file. Please open a .mat file first.');
        return;
    }

    const { filePath, data } = activeFile;

    try {
        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'JSON Files': ['json']
            },
            defaultUri: vscode.Uri.file('data.json')
        });

        if (!saveUri) {
            return;
        }

        const jsonContent = JSON.stringify(data, null, 2);
        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(jsonContent, 'utf-8'));
        vscode.window.showInformationMessage(`Exported to ${saveUri.fsPath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function convertToCSV(data: MatVariable): string {
    if (!data || data._type !== 'ndarray' || !data.data) {
        return '';
    }

    const array = data.data;
    if (!Array.isArray(array)) {
        return String(array);
    }

    if (array.length === 0) {
        return '';
    }

    if (!Array.isArray(array[0])) {
        return array.map((v: any) => formatCSVValue(v)).join('\n');
    }

    return array.map(row => {
        if (Array.isArray(row)) {
            return row.map((v: any) => formatCSVValue(v)).join(',');
        }
        return formatCSVValue(row);
    }).join('\n');
}

function formatCSVValue(v: any): string {
    if (v === null || v === undefined) {
        return '';
    }
    if (typeof v === 'number') {
        return String(v);
    }
    if (v && v._type === 'complex') {
        return `${v.real}${v.imag >= 0 ? '+' : ''}${v.imag}i`;
    }
    const str = String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
