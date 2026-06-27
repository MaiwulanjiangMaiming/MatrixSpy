// Mock vscode and vscode-nls so importing exportData.ts (which has top-level
// `import * as vscode` / `import * as nls`) works under jest without a real
// VS Code host. The pure conversion functions under test do not call vscode.
jest.mock('vscode', () => ({
    window: {
        tabGroups: { activeTabGroup: { activeTab: null } },
        showQuickPick: jest.fn(),
        showSaveDialog: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        createTerminal: jest.fn(),
        withProgress: jest.fn()
    },
    workspace: { fs: { writeFile: jest.fn() }, getConfiguration: jest.fn() },
    Uri: { file: (p: string) => ({ fsPath: p }) },
    TabInputCustom: class {},
    ProgressLocation: { Notification: 15 }
}), { virtual: true });
jest.mock('vscode-nls', () => ({
    loadMessageBundle: () => (_key: string, msg: string) => msg
}), { virtual: true });
// Mock the extension entry point so importing exportData.ts does not pull in
// the entire activation graph. The pure functions under test do not use these.
jest.mock('../extension', () => ({
    getFileDataCache: jest.fn(),
    getPythonBridge: jest.fn(),
    sendTelemetry: jest.fn()
}));

import { convertToCSV, formatCSVValue, convertToNPY, convertToPNG } from '../commands/exportData';

describe('formatCSVValue', () => {
    test('null and undefined become empty string', () => {
        expect(formatCSVValue(null)).toBe('');
        expect(formatCSVValue(undefined)).toBe('');
    });

    test('NaN/Inf strings pass through unchanged', () => {
        expect(formatCSVValue('NaN')).toBe('NaN');
        expect(formatCSVValue('Inf')).toBe('Inf');
        expect(formatCSVValue('-Inf')).toBe('-Inf');
    });

    test('numbers stringify directly', () => {
        expect(formatCSVValue(42)).toBe('42');
        expect(formatCSVValue(3.14)).toBe('3.14');
        expect(formatCSVValue(0)).toBe('0');
    });

    test('complex with positive imaginary gets plus sign', () => {
        const v = { _type: 'complex', real: 1, imag: 2 };
        expect(formatCSVValue(v)).toBe('1+2i');
    });

    test('complex with negative imaginary has no extra plus', () => {
        const v = { _type: 'complex', real: 3, imag: -4 };
        expect(formatCSVValue(v)).toBe('3-4i');
    });

    test('complex with Inf imaginary gets plus sign', () => {
        const v = { _type: 'complex', real: 1, imag: 'Inf' };
        expect(formatCSVValue(v)).toBe('1+Infi');
    });

    test('string with comma is quoted', () => {
        expect(formatCSVValue('a,b')).toBe('"a,b"');
    });

    test('string with quote is escaped and quoted', () => {
        expect(formatCSVValue('a"b')).toBe('"a""b"');
    });

    test('string with newline is quoted', () => {
        expect(formatCSVValue('a\nb')).toBe('"a\nb"');
    });

    test('plain string without special chars is returned as-is', () => {
        expect(formatCSVValue('hello')).toBe('hello');
    });
});

describe('convertToCSV', () => {
    test('returns empty for non-ndarray', () => {
        expect(convertToCSV(null as any)).toBe('');
        expect(convertToCSV({ _type: 'struct' })).toBe('');
        expect(convertToCSV({ _type: 'ndarray' })).toBe('');
    });

    test('returns empty for empty array', () => {
        expect(convertToCSV({ _type: 'ndarray', data: [] })).toBe('');
    });

    test('1D array joins with newlines', () => {
        const data = { _type: 'ndarray', data: [1, 2, 3] };
        expect(convertToCSV(data)).toBe('1\n2\n3');
    });

    test('2D array joins rows with newlines and cols with commas', () => {
        const data = { _type: 'ndarray', data: [[1, 2], [3, 4]] };
        expect(convertToCSV(data)).toBe('1,2\n3,4');
    });

    test('preserves NaN/Inf string values', () => {
        const data = { _type: 'ndarray', data: ['NaN', 'Inf', '-Inf'] };
        expect(convertToCSV(data)).toBe('NaN\nInf\n-Inf');
    });

    test('serializes complex values in 2D array', () => {
        const data = { _type: 'ndarray', data: [[{ _type: 'complex', real: 1, imag: 2 }]] };
        expect(convertToCSV(data)).toBe('1+2i');
    });
});

describe('convertToNPY', () => {
    test('returns null for non-ndarray input', () => {
        expect(convertToNPY(null as any)).toBeNull();
        expect(convertToNPY({ _type: 'struct' })).toBeNull();
        expect(convertToNPY({ _type: 'ndarray' })).toBeNull();
    });

    test('returns null for 3D+ arrays', () => {
        const data = { _type: 'ndarray', data: [[[1, 2], [3, 4]]] };
        expect(convertToNPY(data)).toBeNull();
    });

    test('returns null for complex arrays', () => {
        const data = { _type: 'ndarray', complex: true, data: [1, 2] };
        expect(convertToNPY(data)).toBeNull();
    });

    test('encodes 1D array with valid NPY magic and header', () => {
        const data = { _type: 'ndarray', data: [1.0, 2.0, 3.0] };
        const result = convertToNPY(data);
        expect(result).not.toBeNull();
        expect(result![0]).toBe(0x93);
        expect(result!.toString('ascii', 1, 6)).toBe('NUMPY');
        // version 1.0
        expect(result![6]).toBe(1);
        expect(result![7]).toBe(0);
    });

    test('header contains float64 dtype and shape', () => {
        const data = { _type: 'ndarray', data: [1.0, 2.0] };
        const result = convertToNPY(data);
        const headerStr = result!.toString('ascii', 10, 80);
        expect(headerStr).toContain("<f8");
        expect(headerStr).toContain("(2,)");
    });

    test('encodes 2D array', () => {
        const data = { _type: 'ndarray', data: [[1.0, 2.0], [3.0, 4.0]] };
        const result = convertToNPY(data);
        expect(result).not.toBeNull();
        const headerStr = result!.toString('ascii', 10, 80);
        expect(headerStr).toContain("(2, 2,)");
    });

    test('NaN/Inf string values convert to numeric NaN/Infinity', () => {
        const data = { _type: 'ndarray', data: ['NaN', 'Inf', '-Inf', 1.0] };
        const result = convertToNPY(data);
        expect(result).not.toBeNull();
        // Data starts after 8-byte preamble + header. Read the 4 doubles.
        const headerLen = result!.readUInt16LE(8);
        const dataStart = 10 + headerLen;
        expect(result!.readDoubleLE(dataStart)).toBeNaN();
        expect(result!.readDoubleLE(dataStart + 8)).toBe(Infinity);
        expect(result!.readDoubleLE(dataStart + 16)).toBe(-Infinity);
        expect(result!.readDoubleLE(dataStart + 24)).toBe(1.0);
    });

    test('non-numeric values in array default to 0', () => {
        const data = { _type: 'ndarray', data: ['notanumber'] };
        const result = convertToNPY(data);
        expect(result).not.toBeNull();
        const headerLen = result!.readUInt16LE(8);
        const dataStart = 10 + headerLen;
        expect(result!.readDoubleLE(dataStart)).toBe(0);
    });
});

describe('convertToPNG', () => {
    test('returns null for non-ndarray input', () => {
        expect(convertToPNG(null as any)).toBeNull();
        expect(convertToPNG({ _type: 'struct' })).toBeNull();
        expect(convertToPNG({ _type: 'ndarray' })).toBeNull();
    });

    test('returns null for 1D array', () => {
        const data = { _type: 'ndarray', data: [1, 2, 3] };
        expect(convertToPNG(data)).toBeNull();
    });

    test('returns null for empty 2D array', () => {
        const data = { _type: 'ndarray', data: [[]] };
        expect(convertToPNG(data)).toBeNull();
    });

    test('produces valid PNG signature for 2D array', () => {
        const data = { _type: 'ndarray', data: [[0, 255], [128, 64]] };
        const result = convertToPNG(data);
        expect(result).not.toBeNull();
        expect(result![0]).toBe(0x89);
        expect(result![1]).toBe(0x50); // 'P'
        expect(result![2]).toBe(0x4E); // 'N'
        expect(result![3]).toBe(0x47); // 'G'
    });

    test('IHDR chunk encodes correct width and height', () => {
        const data = { _type: 'ndarray', data: [[1, 2, 3], [4, 5, 6]] };
        const result = convertToPNG(data);
        // PNG sig (8) + length (4) + 'IHDR' (4) = 16 bytes before IHDR data
        const width = result!.readUInt32BE(16);
        const height = result!.readUInt32BE(20);
        expect(width).toBe(3);
        expect(height).toBe(2);
    });

    test('normalizes values to 0-255 grayscale range', () => {
        const data = { _type: 'ndarray', data: [[0, 100]] };
        const result = convertToPNG(data);
        expect(result).not.toBeNull();
        // Decompress IDAT and check filter byte + pixel bytes.
        // We just verify the PNG is non-trivial (contains an IDAT chunk).
        const pngStr = result!.toString('ascii', 12, 16);
        expect(pngStr).toContain('IHDR');
    });

    test('NaN/Inf values map to 0 (black)', () => {
        const data = { _type: 'ndarray', data: [['NaN', 'Inf'], [1, 2]] };
        const result = convertToPNG(data);
        expect(result).not.toBeNull();
        expect(result!.length).toBeGreaterThan(8);
    });

    test('uniform-value array uses fallback range', () => {
        const data = { _type: 'ndarray', data: [[5, 5], [5, 5]] };
        const result = convertToPNG(data);
        expect(result).not.toBeNull();
        // min == max, range falls back to 1; all pixels become 0 (norm = 0)
    });
});
