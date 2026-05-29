export type WebviewToExtension =
    | { command: 'loadSlice'; variableName: string; axis: number; index: number }
    | { command: 'variableSelected'; variableName: string; varInfo: { shape: number[] | null; dtype: string | null; memory_mb: number | null } | null }
    | { command: 'openExternal'; url: string };

export type ExtensionToWebview =
    | { command: 'fileLoaded'; data: any }
    | { command: 'sliceLoaded'; success: boolean; data?: any; error?: string }
    | { command: 'showVariable'; variableName: string }
    | { command: 'error'; error: string; retryable?: boolean }
    | { command: 'loadingStart'; message: string };
