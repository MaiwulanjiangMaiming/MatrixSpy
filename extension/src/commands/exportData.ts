import * as vscode from 'vscode';
import * as zlib from 'zlib';
import * as nls from 'vscode-nls';
import { getFileDataCache, getPythonBridge, sendTelemetry } from '../extension';
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

type ExportFormat = 'csv' | 'json' | 'npy' | 'png' | 'hdf5' | 'xlsx';

interface FormatOption extends vscode.QuickPickItem {
    format: ExportFormat;
}

interface VariableOption extends vscode.QuickPickItem {
    /** Sentinel: when true, this option represents "all variables" (JSON only). */
    exportAll?: boolean;
}

/** In-session memory of the last export format. Defaults to undefined so the
 *  quick pick starts with no preconceived choice; after the first export the
 *  user's preferred format is surfaced in the placeHolder as a hint. */
let lastExportFormat: ExportFormat | undefined;

/**
 * Unified export command. Replaces the six per-format commands in the command
 * palette: the user picks a format, then a variable, then a save location.
 *
 * Backward-compatible per-format command functions are still exported below
 * for keybindings and programmatic callers; they all delegate here.
 */
export async function exportCommand(presetFormat?: ExportFormat): Promise<void> {
    const activeFile = getActiveFileData();
    if (!activeFile) {
        vscode.window.showErrorMessage(localize('noActiveFile', 'No active MAT file. Please open a .mat file first.'));
        return;
    }

    const { filePath, data } = activeFile;

    const variables = Object.keys(data);
    if (variables.length === 0) {
        vscode.window.showWarningMessage(localize('noVariables', 'No variables found in the MAT file.'));
        return;
    }

    // Step 1: pick format (unless a preset was passed in via keybinding).
    let format: ExportFormat;
    if (presetFormat) {
        format = presetFormat;
    } else {
        const formats: FormatOption[] = [
            { label: '$(table) CSV', description: 'Comma-separated values', format: 'csv' },
            { label: '$(json) JSON', description: 'JavaScript Object Notation', format: 'json' },
            { label: '$(package) NumPy (NPY)', description: 'NumPy binary format', format: 'npy' },
            { label: '$(file-media) PNG Image', description: 'Grayscale image', format: 'png' },
            { label: '$(database) HDF5', description: 'Hierarchical Data Format', format: 'hdf5' },
            { label: '$(spreadsheet) Excel (XLSX)', description: 'Microsoft Excel', format: 'xlsx' }
        ];
        const placeHolder = lastExportFormat
            ? localize('selectExportFormat', 'Select export format (last used: {0})', lastExportFormat)
            : localize('selectExportFormat', 'Select export format');
        const picked = await vscode.window.showQuickPick(formats, { placeHolder });
        if (!picked) {
            return;
        }
        format = picked.format;
        lastExportFormat = format;
    }

    // Step 2: pick variable. JSON also offers "all variables" for whole-file export.
    const variableOptions: VariableOption[] = variables.map(v => ({
        label: v,
        description: describeVariable(data[v])
    }));
    if (format === 'json') {
        variableOptions.unshift({
            label: '$(file) All variables',
            description: localize('allVariables', 'Export the entire file as a single JSON object'),
            exportAll: true
        });
    }
    const varPick = await vscode.window.showQuickPick(variableOptions, {
        placeHolder: localize('selectVariable', 'Select variable to export')
    });
    if (!varPick) {
        return;
    }
    const exportAll = varPick.exportAll === true;
    const selectedVar = exportAll ? '' : varPick.label;

    // Step 3: save dialog.
    const ext = format === 'hdf5' ? 'h5' : format;
    const saveUri = await vscode.window.showSaveDialog({
        filters: { [`${format.toUpperCase()} Files`]: [ext] },
        defaultUri: vscode.Uri.file(exportAll ? `data.${ext}` : `${selectedVar}.${ext}`)
    });
    if (!saveUri) {
        return;
    }

    // Step 4: perform the export.
    try {
        if (format === 'csv') {
            await exportCsv(filePath, data, selectedVar, saveUri);
        } else if (format === 'json') {
            await exportJson(filePath, data, selectedVar, saveUri);
        } else if (format === 'npy') {
            await exportNpy(filePath, data, selectedVar, saveUri);
        } else if (format === 'png') {
            await exportPng(filePath, data, selectedVar, saveUri);
        } else if (format === 'hdf5') {
            await exportHdf5(filePath, selectedVar, saveUri);
        } else if (format === 'xlsx') {
            await exportXlsx(filePath, selectedVar, saveUri);
        }
        sendTelemetry('exportComplete', { format });
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function describeVariable(value: any): string {
    if (!value) { return ''; }
    if (value._type === 'ndarray' && value.shape) {
        return value.shape.join('×');
    }
    if (typeof value === 'object') { return 'struct'; }
    return typeof value;
}

async function exportCsv(filePath: string, data: MatFileData, selectedVar: string, saveUri: vscode.Uri): Promise<void> {
    const varData = data[selectedVar];
    const csvContent = convertToCSV(varData);
    if (!csvContent) {
        vscode.window.showWarningMessage(`Variable "${selectedVar}" cannot be exported as CSV. Only numeric arrays are supported.`);
        return;
    }
    await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(Buffer.from(csvContent, 'utf-8')));
    vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
}

async function exportJson(filePath: string, data: MatFileData, selectedVar: string, saveUri: vscode.Uri): Promise<void> {
    const payload = selectedVar ? { [selectedVar]: data[selectedVar] } : data;
    const jsonContent = JSON.stringify(payload, null, 2);
    await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(Buffer.from(jsonContent, 'utf-8')));
    vscode.window.showInformationMessage(`Exported to ${saveUri.fsPath}`);
}

async function exportNpy(filePath: string, data: MatFileData, selectedVar: string, saveUri: vscode.Uri): Promise<void> {
    const varData = data[selectedVar];
    const npyContent = convertToNPY(varData);
    if (!npyContent) {
        const ndim = varData?.shape?.length ?? 0;
        const reason = ndim > 2
            ? `NPY export only supports 1D/2D arrays (this variable is ${ndim}D).`
            : `Variable "${selectedVar}" cannot be exported as NPY. Only numeric arrays are supported.`;
        vscode.window.showWarningMessage(reason);
        return;
    }
    await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(npyContent));
    vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
}

async function exportPng(filePath: string, data: MatFileData, selectedVar: string, saveUri: vscode.Uri): Promise<void> {
    const varData = data[selectedVar];
    const pngContent = convertToPNG(varData);
    if (!pngContent) {
        vscode.window.showWarningMessage(`Variable "${selectedVar}" cannot be exported as PNG. Only 2D numeric arrays are supported.`);
        return;
    }
    await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(pngContent));
    vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
}

async function exportHdf5(filePath: string, selectedVar: string, saveUri: vscode.Uri): Promise<void> {
    const bridge = getPythonBridge();
    if (!bridge) {
        vscode.window.showErrorMessage(localize('pythonBridgeUnavailable', 'Python bridge not available. Please reload the window.'));
        return;
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'MatrixSpy: Exporting HDF5...',
        cancellable: false
    }, async () => {
        const result = await bridge!.exportHdf5(filePath, selectedVar, saveUri.fsPath);
        if (result.success) {
            vscode.window.showInformationMessage(`Exported ${selectedVar} to ${saveUri.fsPath}`);
        } else {
            vscode.window.showErrorMessage(`Export failed: ${result.error || 'Unknown error'}`);
        }
    });
}

async function exportXlsx(filePath: string, selectedVar: string, saveUri: vscode.Uri): Promise<void> {
    const bridge = getPythonBridge();
    if (!bridge) {
        vscode.window.showErrorMessage(localize('pythonBridgeUnavailable', 'Python bridge not available. Please reload the window.'));
        return;
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'MatrixSpy: Exporting Excel...',
        cancellable: false
    }, async () => {
        const result = await bridge!.exportXlsx(filePath, selectedVar, saveUri.fsPath);
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
}

// ---- Backward-compatible per-format entry points removed ----
// The unified exportCommand() above replaces the six per-format commands.
// Callers should use `vscode.commands.executeCommand('matrixspy.export')`
// or `exportCommand(presetFormat)` directly.

export function convertToCSV(data: MatVariable): string {
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

export function formatCSVValue(v: any): string {
    if (v === null || v === undefined) {
        return '';
    }
    if (v === 'NaN' || v === 'Inf' || v === '-Inf') {
        return v;
    }
    if (typeof v === 'number') {
        return String(v);
    }
    if (v && v._type === 'complex') {
        const r = String(v.real);
        const i = String(v.imag);
        const imagNonNeg = (typeof v.imag === 'number' && v.imag >= 0) || v.imag === 'Inf';
        return `${r}${imagNonNeg ? '+' : ''}${i}i`;
    }
    const str = String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function convertToNPY(data: MatVariable): Buffer | null {
    if (!data || data._type !== 'ndarray' || !data.data) {
        return null;
    }

    const array = data.data;
    if (!Array.isArray(array)) {
        return null;
    }

    // Reject 3D+ arrays instead of silently flattening them and producing
    // wrong data. Callers display a helpful message to the user.
    if (array.length > 0 && Array.isArray(array[0]) && Array.isArray(array[0][0])) {
        return null;
    }

    // Complex arrays are not yet supported by the NPY writer.
    if (data.complex) {
        return null;
    }

    function toNPYValue(v: any): number {
        if (typeof v === 'number') { return v; }
        if (v === 'NaN') { return NaN; }
        if (v === 'Inf') { return Infinity; }
        if (v === '-Inf') { return -Infinity; }
        return 0;
    }

    try {
        let flatData: number[] = [];
        let shape: number[] = [];

        if (!Array.isArray(array[0])) {
            flatData = array.map((v: any) => toNPYValue(v));
            shape = [array.length];
        } else {
            shape = [array.length, array[0].length];
            for (let i = 0; i < array.length; i++) {
                const row = array[i];
                if (Array.isArray(row)) {
                    for (let j = 0; j < row.length; j++) {
                        flatData.push(toNPYValue(row[j]));
                    }
                }
            }
        }

        const dtype = '<f8';
        const header = `{'descr': '${dtype}', 'fortran_order': False, 'shape': (${shape.join(', ')},), }`;
        const headerLen = header.length;
        const padding = (64 - ((10 + headerLen) % 64)) % 64;
        // NPY v1: the 2-byte length field holds the header *string* length
        // (header + padding), NOT including the 10-byte preamble (magic +
        // version + length field). Writing 10+headerLen+padding here would
        // make readers skip 10 bytes into the data section.
        const headerStrLen = headerLen + padding;

        // Layout: 10-byte preamble + headerStrLen + data.
        const buffer = Buffer.alloc(10 + headerStrLen + flatData.length * 8);
        let offset = 0;

        buffer.writeUInt8(0x93, offset++);
        buffer.write('NUMPY', offset);
        offset += 5;
        buffer.writeUInt8(0x01, offset++);
        buffer.writeUInt8(0x00, offset++);
        buffer.writeUInt16LE(headerStrLen, offset);
        offset += 2;
        buffer.write(header + ' '.repeat(padding), offset);
        offset += headerStrLen;

        for (let i = 0; i < flatData.length; i++) {
            buffer.writeDoubleLE(flatData[i], offset);
            offset += 8;
        }

        return buffer;
    } catch {
        return null;
    }
}

export function convertToPNG(data: MatVariable): Buffer | null {
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
        if (!Array.isArray(row)) { continue; }
        for (let x = 0; x < width; x++) {
            const val = row[x];
            if (typeof val === 'number' && isFinite(val)) {
                if (val < min) { min = val; }
                if (val > max) { max = val; }
            }
        }
    }
    if (!isFinite(min)) { min = 0; max = 1; }

    const range = max - min || 1;

    const pixelData = Buffer.alloc(width * height);
    for (let y = 0; y < height; y++) {
        const row = array[y];
        if (!Array.isArray(row)) { continue; }
        for (let x = 0; x < width; x++) {
            const val = row[x];
            if (val === 'NaN' || val === 'Inf' || val === '-Inf') {
                // NaN/Inf → 0 (black) in PNG; information lost but image valid
                pixelData[y * width + x] = 0;
            } else if (typeof val === 'number') {
                const norm = Math.max(0, Math.min(1, (val - min) / range));
                pixelData[y * width + x] = Math.round(norm * 255);
            } else {
                pixelData[y * width + x] = 0;
            }
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
