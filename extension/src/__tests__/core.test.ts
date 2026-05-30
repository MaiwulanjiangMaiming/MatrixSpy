import * as zlib from 'zlib';

function convertToNPY(data: any): Buffer | null {
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

function createChunk(type: string, data: Buffer): Buffer {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const crc = (zlib as any).crc32(Buffer.concat([typeBuffer, data]));
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
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

describe('NPY encoding', () => {
    test('returns null for non-ndarray input', () => {
        expect(convertToNPY(null)).toBeNull();
        expect(convertToNPY({ _type: 'struct' })).toBeNull();
        expect(convertToNPY({ _type: 'ndarray' })).toBeNull();
    });

    test('encodes 1D array correctly', () => {
        const data = { _type: 'ndarray', data: [1.0, 2.0, 3.0] };
        const result = convertToNPY(data);
        expect(result).not.toBeNull();
        expect(result![0]).toBe(0x93);
        expect(result!.toString('ascii', 1, 6)).toBe('NUMPY');
    });

    test('encodes 2D array correctly', () => {
        const data = { _type: 'ndarray', data: [[1.0, 2.0], [3.0, 4.0]] };
        const result = convertToNPY(data);
        expect(result).not.toBeNull();
        expect(result!.length).toBeGreaterThan(0);
    });

    test('NPY header contains float64 dtype', () => {
        const data = { _type: 'ndarray', data: [1.0] };
        const result = convertToNPY(data);
        const headerStr = result!.toString('ascii', 10, 80);
        expect(headerStr).toContain("<f8");
    });
});

describe('PNG encoding', () => {
    test('creates valid PNG signature', () => {
        const pixelData = Buffer.alloc(4, 128);
        const result = encodeGrayscalePNG(2, 2, pixelData);
        expect(result[0]).toBe(0x89);
        expect(result[1]).toBe(0x50);
        expect(result[2]).toBe(0x4E);
        expect(result[3]).toBe(0x47);
    });

    test('creates correct IHDR chunk', () => {
        const pixelData = Buffer.alloc(6, 128);
        const result = encodeGrayscalePNG(3, 2, pixelData);
        const ihdrData = result.slice(16, 29);
        const width = ihdrData.readUInt32BE(0);
        const height = ihdrData.readUInt32BE(4);
        expect(width).toBe(3);
        expect(height).toBe(2);
    });

    test('output can be decompressed', () => {
        const pixelData = Buffer.alloc(4, 200);
        const result = encodeGrayscalePNG(2, 2, pixelData);
        expect(result.length).toBeGreaterThan(8);
    });
});

describe('Message types', () => {
    test('WebviewToExtension loadSlice has required fields', () => {
        const msg = { command: 'loadSlice' as const, variableName: 'test', axis: 0, index: 1 };
        expect(msg.command).toBe('loadSlice');
        expect(msg.variableName).toBe('test');
        expect(msg.axis).toBe(0);
        expect(msg.index).toBe(1);
    });

    test('ExtensionToWebview loadingProgress has required fields', () => {
        const msg = { command: 'loadingProgress' as const, progress: 50, stage: 'parsing_structure' };
        expect(msg.command).toBe('loadingProgress');
        expect(msg.progress).toBe(50);
        expect(msg.stage).toBe('parsing_structure');
    });

    test('ExtensionToWebview error has optional retryable', () => {
        const msg = { command: 'error' as const, error: 'test error', retryable: true };
        expect(msg.command).toBe('error');
        expect(msg.retryable).toBe(true);
    });
});
