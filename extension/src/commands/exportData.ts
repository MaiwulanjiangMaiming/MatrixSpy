import * as vscode from 'vscode';
import * as zlib from 'zlib';
import { getFileDataCache, getPythonBridge } from '../extension';
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

        await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(Buffer.from(csvContent, 'utf-8')));
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
        await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(Buffer.from(jsonContent, 'utf-8')));
        vscode.window.showInformationMessage(`Exported to ${saveUri.fsPath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function exportNPYCommand() {
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
            placeHolder: 'Select variable to export as NPY'
        });

        if (!selectedVar) {
            return;
        }

        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'NumPy Files': ['npy']
            },
            defaultUri: vscode.Uri.file(`${selectedVar}.npy`)
        });

        if (!saveUri) {
            return;
        }

        const varData = data[selectedVar];
        const npyContent = convertToNPY(varData);

        if (!npyContent) {
            vscode.window.showWarningMessage(`Variable "${selectedVar}" cannot be exported as NPY. Only numeric arrays are supported.`);
            return;
        }

        await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(npyContent));
        vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function exportPNGCommand() {
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
            placeHolder: 'Select variable to export as PNG image'
        });

        if (!selectedVar) {
            return;
        }

        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'PNG Images': ['png']
            },
            defaultUri: vscode.Uri.file(`${selectedVar}.png`)
        });

        if (!saveUri) {
            return;
        }

        const varData = data[selectedVar];
        const pngContent = convertToPNG(varData);

        if (!pngContent) {
            vscode.window.showWarningMessage(`Variable "${selectedVar}" cannot be exported as PNG. Only 2D numeric arrays are supported.`);
            return;
        }

        await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(pngContent));
        vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
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

function convertToNPY(data: MatVariable): Buffer | null {
    if (!data || data._type !== 'ndarray' || !data.data) {
        return null;
    }

    const array = data.data;
    if (!Array.isArray(array)) {
        return null;
    }

    try {
        let flatData: number[] = [];
        let shape: number[] = [];

        if (!Array.isArray(array[0])) {
            flatData = array.map((v: any) => typeof v === 'number' ? v : 0);
            shape = [array.length];
        } else {
            shape = [array.length, array[0].length];
            for (let i = 0; i < array.length; i++) {
                const row = array[i];
                if (Array.isArray(row)) {
                    for (let j = 0; j < row.length; j++) {
                        flatData.push(typeof row[j] === 'number' ? row[j] : 0);
                    }
                }
            }
        }

        const dtype = '<f8';
        const header = `{'descr': '${dtype}', 'fortran_order': False, 'shape': (${shape.join(', ')},), }`;
        const headerLen = header.length;
        const padding = (64 - ((10 + headerLen) % 64)) % 64;
        const totalHeaderLen = 10 + headerLen + padding;

        const buffer = Buffer.alloc(8 + totalHeaderLen + flatData.length * 8);
        let offset = 0;

        buffer.writeUInt8(0x93, offset++);
        buffer.write('NUMPY', offset);
        offset += 5;
        buffer.writeUInt8(0x01, offset++);
        buffer.writeUInt8(0x00, offset++);
        buffer.writeUInt16LE(totalHeaderLen, offset);
        offset += 2;
        buffer.write(header + ' '.repeat(padding), offset);
        offset += headerLen + padding;

        for (let i = 0; i < flatData.length; i++) {
            buffer.writeDoubleLE(flatData[i], offset);
            offset += 8;
        }

        return buffer;
    } catch {
        return null;
    }
}

function convertToPNG(data: MatVariable): Buffer | null {
    if (!data || data._type !== 'ndarray' || !data.data) {
        return null;
    }

    const array = data.data;
    if (!Array.isArray(array) || array.length === 0) {
        return null;
    }

    if (!Array.isArray(array[0])) {
        return null;
    }

    const height = array.length;
    const width = Array.isArray(array[0]) ? array[0].length : 1;

    if (width === 0 || height === 0) {
        return null;
    }

    let min = Infinity, max = -Infinity;
    for (let y = 0; y < height; y++) {
        const row = array[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < width; x++) {
            const val = row[x];
            if (typeof val === 'number') {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
    }

    const range = max - min || 1;

    const pixelData = Buffer.alloc(width * height);
    for (let y = 0; y < height; y++) {
        const row = array[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < width; x++) {
            const val = row[x];
            const norm = typeof val === 'number' ? Math.max(0, Math.min(1, (val - min) / range)) : 0;
            pixelData[y * width + x] = Math.round(norm * 255);
        }
    }

    return encodeGrayscalePNG(width, height, pixelData);
}

function encodeGrayscalePNG(width: number, height: number, pixelData: Buffer): Buffer {
    const IDAT_DATA_SIZE = width * height + height;
    const idatData = Buffer.alloc(IDAT_DATA_SIZE);
    let offset = 0;
    for (let y = 0; y < height; y++) {
        idatData[offset++] = 0;
        for (let x = 0; x < width; x++) {
            idatData[offset++] = pixelData[y * width + x];
        }
    }

    const compressed = zlib.deflateSync(idatData, { level: 9 });

    const chunks: Buffer[] = [];

    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    chunks.push(PNG_SIGNATURE);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 0;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    chunks.push(createChunk('IHDR', ihdr));

    chunks.push(createChunk('IDAT', compressed));

    chunks.push(createChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function createChunk(type: string, data: Buffer): Buffer {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const crc = (zlib as any).crc32(Buffer.concat([typeBuffer, data]));
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

export async function exportHDF5Command() {
    const activeFile = getActiveMatFilePath();
    if (!activeFile) {
        vscode.window.showErrorMessage('No active MAT file. Please open a .mat file first.');
        return;
    }

    const bridge = getPythonBridge();
    if (!bridge) {
        vscode.window.showErrorMessage('Python bridge not available. Please reload the window.');
        return;
    }

    const activeFileData = getActiveFileData();
    if (!activeFileData) {
        vscode.window.showErrorMessage('No file data available.');
        return;
    }

    const { data } = activeFileData;

    try {
        const variables = Object.keys(data);
        if (variables.length === 0) {
            vscode.window.showWarningMessage('No variables found in the MAT file.');
            return;
        }

        const selectedVar = await vscode.window.showQuickPick(variables, {
            placeHolder: 'Select variable to export as HDF5'
        });

        if (!selectedVar) {
            return;
        }

        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'HDF5 Files': ['h5', 'hdf5']
            },
            defaultUri: vscode.Uri.file(`${selectedVar}.h5`)
        });

        if (!saveUri) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'MatrixSpy: Exporting HDF5...',
            cancellable: false
        }, async () => {
            const result = await bridge!.exportHdf5(activeFile, selectedVar, saveUri.fsPath);
            if (result.success) {
                vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
            } else {
                vscode.window.showErrorMessage(`Export failed: ${result.error || 'Unknown error'}`);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function exportXLSXCommand() {
    const activeFile = getActiveMatFilePath();
    if (!activeFile) {
        vscode.window.showErrorMessage('No active MAT file. Please open a .mat file first.');
        return;
    }

    const bridge = getPythonBridge();
    if (!bridge) {
        vscode.window.showErrorMessage('Python bridge not available. Please reload the window.');
        return;
    }

    const activeFileData = getActiveFileData();
    if (!activeFileData) {
        vscode.window.showErrorMessage('No file data available.');
        return;
    }

    const { data } = activeFileData;

    try {
        const variables = Object.keys(data);
        if (variables.length === 0) {
            vscode.window.showWarningMessage('No variables found in the MAT file.');
            return;
        }

        const selectedVar = await vscode.window.showQuickPick(variables, {
            placeHolder: 'Select variable to export as Excel'
        });

        if (!selectedVar) {
            return;
        }

        const saveUri = await vscode.window.showSaveDialog({
            filters: {
                'Excel Files': ['xlsx']
            },
            defaultUri: vscode.Uri.file(`${selectedVar}.xlsx`)
        });

        if (!saveUri) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'MatrixSpy: Exporting Excel...',
            cancellable: false
        }, async () => {
            const result = await bridge!.exportXlsx(activeFile, selectedVar, saveUri.fsPath);
            if (result.success) {
                vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
            } else {
                const errMsg = result.error || 'Unknown error';
                if (result.code === 'DEPENDENCY_MISSING') {
                    const action = await vscode.window.showErrorMessage(
                        `Export failed: ${errMsg}`,
                        'Install openpyxl'
                    );
                    if (action === 'Install openpyxl') {
                        const terminal = vscode.window.createTerminal('MatrixSpy: Install openpyxl');
                        terminal.show();
                        terminal.sendText('pip install openpyxl');
                    }
                } else {
                    vscode.window.showErrorMessage(`Export failed: ${errMsg}`);
                }
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
