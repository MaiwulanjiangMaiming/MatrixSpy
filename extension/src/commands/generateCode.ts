import * as vscode from 'vscode';
import * as fs from 'fs';
import * as nls from 'vscode-nls';
import { getFileDataCache } from '../extension';
import { MatFileData, MatVariable } from '../types';

const localize = nls.loadMessageBundle();

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

/**
 * Detect MAT file version by reading the file header.
 * Returns 'v7.3' for HDF5-based files, otherwise 'v7' (scipy.io.loadmat supported).
 */
function detectMatVersion(filePath: string): 'v7.3' | 'v7' {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(128);
        fs.readSync(fd, buf, 0, 128, 0);
        fs.closeSync(fd);
        const header = buf.toString('ascii');
        return header.includes('MATLAB 7.3') ? 'v7.3' : 'v7';
    } catch {
        return 'v7';
    }
}

function generatePythonCode(filePath: string, varName: string, varData: MatVariable): string {
    // Use JSON.stringify to safely produce a Python-compatible string literal.
    // JSON string literals use the same quoting rules as Python for our cases,
    // and properly escape backslashes, quotes, and control characters.
    const filePathLiteral = JSON.stringify(filePath);
    const varNameLiteral = JSON.stringify(varName);
    const titleLiteral = JSON.stringify(varName);

    const version = detectMatVersion(filePath);
    const isV73 = version === 'v7.3';

    const lines: string[] = [
        'import numpy as np',
        'import matplotlib.pyplot as plt',
        ''
    ];

    if (isV73) {
        lines.push('# Load MAT file (v7.3 / HDF5 format requires mat73)');
        lines.push('# Install: pip install mat73');
        lines.push('import mat73');
        lines.push(`mat = mat73.loadmat(${filePathLiteral}, use_attrdict=True)`);
        lines.push('');
        lines.push('# Extract variable');
        lines.push(`data = mat[${varNameLiteral}]`);
    } else {
        lines.push('# Load MAT file');
        lines.push('import scipy.io');
        lines.push(`mat = scipy.io.loadmat(${filePathLiteral})`);
        lines.push('');
        lines.push('# Extract variable');
        lines.push(`data = mat[${varNameLiteral}]`);
    }

    lines.push(
        '',
        '# Print basic info',
        'print(f"Shape: {data.shape}")',
        'print(f"Dtype: {data.dtype}")',
        'print(f"Min: {np.nanmin(data):.4f}")',
        'print(f"Max: {np.nanmax(data):.4f}")',
        'print(f"Mean: {np.nanmean(data):.4f}")'
    );

    if (varData && varData._type === 'ndarray') {
        const shape = varData.shape || [];
        const ndim = shape.length;

        if (ndim === 1) {
            lines.push(
                '',
                '# Plot 1D array',
                'plt.figure(figsize=(10, 4))',
                'plt.plot(data)',
                'plt.xlabel("Index")',
                'plt.ylabel("Value")',
                `plt.title(${titleLiteral})`,
                'plt.grid(True, alpha=0.3)',
                'plt.tight_layout()',
                'plt.show()'
            );
        } else if (ndim === 2) {
            lines.push(
                '',
                '# Visualize 2D matrix',
                'plt.figure(figsize=(8, 6))',
                'plt.imshow(data, cmap="viridis", aspect="auto")',
                'plt.colorbar()',
                'plt.xlabel("Column")',
                'plt.ylabel("Row")',
                `plt.title(${titleLiteral})`,
                'plt.tight_layout()',
                'plt.show()'
            );
        } else if (ndim >= 3) {
            lines.push(
                '',
                '# Visualize 3D+ tensor (show first slice along last axis)',
                'slice_idx = 0',
                `slicing = [slice(None)] * ${ndim}`,
                `slicing[${ndim - 1}] = slice_idx`,
                'slice_2d = data[tuple(slicing)]',
                '',
                'plt.figure(figsize=(8, 6))',
                'plt.imshow(slice_2d, cmap="viridis", aspect="auto")',
                'plt.colorbar()',
                `plt.title(${titleLiteral} + " - Slice ${ndim - 1}=0")`,
                'plt.tight_layout()',
                'plt.show()'
            );
        }
    } else {
        lines.push(
            '',
            '# Variable is not an array, inspect manually',
            'print(data)'
        );
    }

    return lines.join('\n');
}

export async function generateCodeCommand() {
    const activeFile = getActiveFileData();
    if (!activeFile) {
        vscode.window.showErrorMessage(localize('noActiveFile', 'No active MAT file. Please open a .mat file first.'));
        return;
    }

    const { filePath, data } = activeFile;

    try {
        const variables = Object.keys(data);
        if (variables.length === 0) {
            vscode.window.showWarningMessage(localize('noVariables', 'No variables found in the MAT file.'));
            return;
        }

        const selectedVar = await vscode.window.showQuickPick(variables, {
            placeHolder: localize('selectVariableForCode', 'Select variable to generate Python code for')
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
        vscode.window.showInformationMessage(localize('codeGenerated', 'Generated Python code for "{0}"', selectedVar));
    } catch (error) {
        vscode.window.showErrorMessage(localize('codeGenerationFailed', 'Code generation failed: {0}', error instanceof Error ? error.message : String(error)));
    }
}
