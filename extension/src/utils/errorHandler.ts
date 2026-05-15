export const ERROR_CODES = {
    UNKNOWN: 'UNKNOWN',
    PYTHON_NOT_FOUND: 'PYTHON_NOT_FOUND',
    DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
    MEMORY_ERROR: 'MEMORY_ERROR',
    TIMEOUT: 'TIMEOUT',
    PARSE_ERROR: 'PARSE_ERROR',
    SLICE_ERROR: 'SLICE_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export interface AppError {
    message: string;
    code: ErrorCode;
    details?: any;
    retryable: boolean;
    timestamp: number;
}

export function createError(
    message: string,
    code: ErrorCode = ERROR_CODES.UNKNOWN,
    details?: any,
    retryable: boolean = false
): AppError {
    return {
        message,
        code,
        details,
        retryable,
        timestamp: Date.now()
    };
}

export function isRetryable(error: unknown): boolean {
    if (error && typeof error === 'object' && 'retryable' in error) {
        return (error as AppError).retryable === true;
    }
    return false;
}

export function getErrorCode(error: unknown): ErrorCode {
    if (error && typeof error === 'object' && 'code' in error) {
        return (error as AppError).code;
    }
    return ERROR_CODES.UNKNOWN;
}

export function getUserMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as AppError).message);
    }
    return String(error);
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    shouldRetry: (error: unknown) => boolean = isRetryable
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries && shouldRetry(error)) {
                const backoffDelay = delayMs * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue;
            }

            throw error;
        }
    }

    throw lastError;
}
