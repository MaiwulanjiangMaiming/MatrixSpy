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

function generatePythonCode(filePath: string, varName: string, varData: MatVariable): string {
    const lines: string[] = [
        'import scipy.io',
        'import numpy as np',
        'import matplotlib.pyplot as plt',
        '',
        `# Load MAT file`,
        `mat = scipy.io.loadmat('${filePath.replace(/\\/g, '\\\\')}')`,
        '',
        `# Extract variable`,
        `data = mat['${varName}']`,
        '',
        `# Print basic info`,
        `print(f"Shape: {data.shape}")`,
        `print(f"Dtype: {data.dtype}")`,
        `print(f"Min: {np.nanmin(data):.4f}")`,
        `print(f"Max: {np.nanmax(data):.4f}")`,
        `print(f"Mean: {np.nanmean(data):.4f}")`,
    ];

    if (varData && varData._type === 'ndarray') {
        const shape = varData.shape || [];
        const ndim = shape.length;

        if (ndim === 1) {
            lines.push('');
            lines.push('# Plot 1D array');
            lines.push('plt.figure(figsize=(10, 4))');
            lines.push('plt.plot(data)');
            lines.push('plt.xlabel("Index")');
            lines.push('plt.ylabel("Value")');
            lines.push(`plt.title("${varName}")`);
            lines.push('plt.grid(True, alpha=0.3)');
            lines.push('plt.tight_layout()');
            lines.push('plt.show()');
        } else if (ndim === 2) {
            lines.push('');
            lines.push('# Visualize 2D matrix');
            lines.push('plt.figure(figsize=(8, 6))');
            lines.push('plt.imshow(data, cmap="viridis", aspect="auto")');
            lines.push('plt.colorbar()');
            lines.push('plt.xlabel("Column")');
            lines.push('plt.ylabel("Row")');
            lines.push(`plt.title("${varName}")`);
            lines.push('plt.tight_layout()');
            lines.push('plt.show()');
        } else if (ndim >= 3) {
            lines.push('');
            lines.push(`# Visualize 3D+ tensor (show first slice along last axis)`);
            lines.push(`slice_idx = 0`);
            lines.push(`slicing = [slice(None)] * ${ndim}`);
            lines.push(`slicing[${ndim - 1}] = slice_idx`);
            lines.push(`slice_2d = data[tuple(slicing)]`);
            lines.push('');
            lines.push('plt.figure(figsize=(8, 6))');
            lines.push('plt.imshow(slice_2d, cmap="viridis", aspect="auto")');
            lines.push('plt.colorbar()');
            lines.push(`plt.title("${varName} - Slice ${ndim - 1}=0")`);
            lines.push('plt.tight_layout()');
            lines.push('plt.show()');
        }
    } else {
        lines.push('');
        lines.push('# Variable is not an array, inspect manually');
        lines.push('print(data)');
    }

    return lines.join('\n');
}

export async function generateCodeCommand() {
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
            placeHolder: 'Select variable to generate Python code for'
        });

        if (!selectedVar) {
            return;
        }

        const varData = data[selectedVar];
        const code = generatePythonCode(filePath, selectedVar, varData);

        const doc = await vscode.workspace.openTextDocument({
            language: 'python',
            content: code
        });

        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        vscode.window.showInformationMessage(`Generated Python code for "${selectedVar}"`);
    } catch (error) {
        vscode.window.showErrorMessage(`Code generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
