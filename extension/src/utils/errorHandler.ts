import * as vscode from 'vscode';

export interface MatrixSpyError extends Error {
    code?: string;
    details?: any;
    retryable?: boolean;
}

export const ERROR_CODES = {
    PYTHON_NOT_FOUND: 'PYTHON_NOT_FOUND',
    DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
    TIMEOUT: 'TIMEOUT',
    MEMORY_ERROR: 'MEMORY_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNKNOWN: 'UNKNOWN'
} as const;

export function createError(
    message: string,
    code: string = ERROR_CODES.UNKNOWN,
    details?: any,
    retryable: boolean = false
): MatrixSpyError {
    const error = new Error(message) as MatrixSpyError;
    error.code = code;
    error.details = details;
    error.retryable = retryable;
    error.name = 'MatrixSpyError';
    return error;
}

export function isMatrixSpyError(error: any): error is MatrixSpyError {
    return error && error.name === 'MatrixSpyError';
}

export function showError(error: Error, details?: string): void {
    const message = details
        ? `${error.message}\n\nDetails: ${details}`
        : error.message;

    if (isMatrixSpyError(error) && error.retryable) {
        vscode.window.showErrorMessage(message, 'Retry', 'Dismiss').then(selection => {
            if (selection === 'Retry') {
                // This would be handled by the caller
                console.log('User chose to retry');
            }
        });
    } else {
        vscode.window.showErrorMessage(message);
    }
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (!isMatrixSpyError(error) || !error.retryable) {
                throw error;
            }

            if (attempt === maxRetries) {
                throw lastError;
            }

            await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        }
    }

    throw lastError!;
}