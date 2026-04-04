import * as vscode from 'vscode';
import { PythonBridge } from '../ipc/PythonBridge';

export async function exportCSVCommand(pythonBridge: PythonBridge) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active MAT file');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    
    try {
        const result = await pythonBridge.parseFile(filePath);
        
        if (!result.success || !result.data) {
            vscode.window.showErrorMessage(`Failed to parse MAT file: ${result.error}`);
            return;
        }

        const variables = Object.keys(result.data);
        const selectedVar = await vscode.window.showQuickPick(variables, {
            placeHolder: 'Select variable to export'
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

        const data = result.data[selectedVar];
        const csvContent = convertToCSV(data);
        
        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(csvContent, 'utf-8'));
        vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function exportJSONCommand(pythonBridge: PythonBridge) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active MAT file');
        return;
    }

    const filePath = editor.document.uri.fsPath;
    
    try {
        const result = await pythonBridge.parseFile(filePath);
        
        if (!result.success || !result.data) {
            vscode.window.showErrorMessage(`Failed to parse MAT file: ${result.error}`);
            return;
        }

        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'JSON Files': ['json']
            },
            defaultUri: vscode.Uri.file('data.json')
        });

        if (!saveUri) {
            return;
        }

        const jsonContent = JSON.stringify(result.data, null, 2);
        await vscode.workspace.fs.writeFile(saveUri, Buffer.from(jsonContent, 'utf-8'));
        vscode.window.showInformationMessage(`Exported to ${saveUri.fsPath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function convertToCSV(data: any): string {
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
        return array.join('\n');
    }

    return array.map(row => row.join(',')).join('\n');
}
