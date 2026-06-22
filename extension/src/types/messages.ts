export type WebviewToExtension =
    | { command: 'loadSlice'; variableName: string; axis: number; index: number }
    | { command: 'variableSelected'; variableName: string; varInfo: { shape?: number[]; dtype?: string; memory_mb?: number } | null }
    | { command: 'openExternal'; url: string }
    | { command: 'exportData' };

export type ExtensionToWebview =
    | { command: 'fileLoaded'; data: any }
    | { command: 'sliceLoaded'; success: boolean; data?: any; error?: string }
    | { command: 'showVariable'; variableName: string }
    | { command: 'error'; error: string; retryable?: boolean }
    | { command: 'loadingStart'; message: string }
    | { command: 'loadingProgress'; progress: number; stage: string };
