// White-box unit tests for PythonBridge stdout protocol parsing.
// We mock the 'vscode' module (not available under jest) and exercise the
// private handleStdoutData / handleResponse methods directly by feeding
// daemon-shaped JSON lines. This covers the highest-risk logic: line
// splitting, partial-line buffering, ready handshake, per-requestId
// progress routing, and response routing.
jest.mock('vscode', () => ({
    workspace: { getConfiguration: () => ({ get: (_k: string, d: string) => d }) },
}), { virtual: true });

import { PythonBridge } from '../ipc/PythonBridge';

// Minimal fake ExtensionContext — only extensionPath is used by the constructor.
function makeContext(extensionPath: string): any {
    return { extensionPath };
}

// Register a fake pending request on the bridge so handleResponse can resolve it.
function registerPending(bridge: PythonBridge, id: number): { promise: Promise<any>; resolve: jest.Mock; reject: jest.Mock } {
    const resolve = jest.fn();
    const reject = jest.fn();
    const promise = new Promise((res, rej) => { resolve.mockImplementation(res); reject.mockImplementation(rej); });
    (bridge as any).pendingRequests.set(id, {
        resolve,
        reject,
        timer: setTimeout(() => {}, 100000)
    });
    return { promise, resolve, reject };
}

describe('PythonBridge stdout protocol', () => {
    let bridge: PythonBridge;

    beforeEach(() => {
        bridge = new PythonBridge(makeContext('/fake/ext'));
    });

    afterEach(() => {
        // Clear any timers left on pending requests so jest can exit cleanly.
        for (const pending of (bridge as any).pendingRequests.values()) {
            clearTimeout(pending.timer);
        }
        (bridge as any).pendingRequests.clear();
        (bridge as any).progressCallbacks.clear();
    });

    test('ready handshake is recognized and not routed to a pending request', () => {
        const { resolve } = registerPending(bridge, 1);
        (bridge as any).handleStdoutData(Buffer.from('{"action":"ready"}\n'));
        expect((bridge as any).daemonReadyReceived).toBe(true);
        // The ready line must NOT resolve any pending request.
        expect(resolve).not.toHaveBeenCalled();
    });

    test('complete JSON line resolves the matching pending request', async () => {
        const { resolve, promise } = registerPending(bridge, 5);
        (bridge as any).handleStdoutData(
            Buffer.from('{"_request_id":5,"success":true,"data":{"x":1}}\n')
        );
        const result = await promise;
        expect(resolve).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ x: 1 });
        // Pending entry is cleaned up after resolution.
        expect((bridge as any).pendingRequests.has(5)).toBe(false);
    });

    test('progress event routes to the correct requestId only', () => {
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        (bridge as any).progressCallbacks.set(1, cb1);
        (bridge as any).progressCallbacks.set(2, cb2);

        (bridge as any).handleStdoutData(
            Buffer.from('{"_request_id":1,"progress":42,"stage":"parsing"}\n')
        );

        expect(cb1).toHaveBeenCalledWith(42, 'parsing');
        expect(cb2).not.toHaveBeenCalled();
        // Progress events do NOT remove the progress callback (more may follow).
        expect((bridge as any).progressCallbacks.has(1)).toBe(true);
    });

    test('progress with missing stage defaults to empty string', () => {
        const cb = jest.fn();
        (bridge as any).progressCallbacks.set(3, cb);
        (bridge as any).handleStdoutData(
            Buffer.from('{"_request_id":3,"progress":10}\n')
        );
        expect(cb).toHaveBeenCalledWith(10, '');
    });

    test('final response clears the progress callback for that requestId', () => {
        const cb = jest.fn();
        (bridge as any).progressCallbacks.set(7, cb);
        registerPending(bridge, 7);
        (bridge as any).handleStdoutData(
            Buffer.from('{"_request_id":7,"success":true}\n')
        );
        expect((bridge as any).progressCallbacks.has(7)).toBe(false);
    });

    test('partial line is buffered across data chunks', () => {
        const { resolve } = registerPending(bridge, 9);
        // First chunk: a complete line + start of a partial line.
        (bridge as any).handleStdoutData(
            Buffer.from('{"action":"ready"}\n{"_request_id":9,"succ')
        );
        // Nothing resolved yet — the partial line is buffered.
        expect(resolve).not.toHaveBeenCalled();
        // Second chunk completes the line.
        (bridge as any).handleStdoutData(
            Buffer.from('ess":true}\n')
        );
        expect(resolve).toHaveBeenCalled();
    });

    test('multiple complete lines in one chunk are each parsed', async () => {
        const cb = jest.fn();
        (bridge as any).progressCallbacks.set(11, cb);
        const { resolve, promise } = registerPending(bridge, 11);
        (bridge as any).handleStdoutData(
            Buffer.from(
                '{"_request_id":11,"progress":50,"stage":"halfway"}\n' +
                '{"_request_id":11,"success":true,"data":"done"}\n'
            )
        );
        const result = await promise;
        expect(cb).toHaveBeenCalledWith(50, 'halfway');
        expect(resolve).toHaveBeenCalled();
        expect(result.data).toBe('done');
    });

    test('unparseable line is skipped without throwing', () => {
        const { resolve } = registerPending(bridge, 1);
        // A garbage line followed by a valid one.
        (bridge as any).handleStdoutData(
            Buffer.from('this is not json\n{"_request_id":1,"success":true}\n')
        );
        expect(resolve).toHaveBeenCalled();
    });

    test('empty lines are ignored', () => {
        const { resolve } = registerPending(bridge, 1);
        (bridge as any).handleStdoutData(
            Buffer.from('\n\n{"_request_id":1,"success":true}\n\n')
        );
        expect(resolve).toHaveBeenCalled();
    });

    test('response for unknown requestId is silently dropped', () => {
        // No pending request registered for id 99.
        expect(() => {
            (bridge as any).handleStdoutData(
                Buffer.from('{"_request_id":99,"success":true}\n')
            );
        }).not.toThrow();
    });

    test('stdout buffer truncation keeps the partial tail and stays under limit', () => {
        // Build a buffer > 64MB where the tail (after last newline) is a
        // partial JSON line with no trailing newline. The truncation should
        // preserve that partial tail (for reassembly with the next chunk) and
        // bring the buffer under the limit.
        const huge = 'x'.repeat(65 * 1024 * 1024) + '\n{"_request_id":1,"success":tru';
        (bridge as any).handleStdoutData(Buffer.from(huge));
        expect((bridge as any).stdoutBuffer.length).toBeLessThan(
            (PythonBridge as any).MAX_STDOUT_BUFFER
        );
        // The partial tail is preserved (buffered for the next chunk).
        expect((bridge as any).stdoutBuffer).toContain('_request_id');
    });

    test('stdout buffer truncation drops a single enormous line with no newline', () => {
        // A single line with no newline at all exceeding the limit: the
        // safety valve drops it entirely to avoid unbounded memory growth.
        const huge = 'x'.repeat(65 * 1024 * 1024);
        (bridge as any).handleStdoutData(Buffer.from(huge));
        expect((bridge as any).stdoutBuffer).toBe('');
    });
});
