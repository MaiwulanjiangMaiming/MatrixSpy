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
