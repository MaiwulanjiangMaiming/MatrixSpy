/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { ParserResult } from '../types';
import { createError, ERROR_CODES, isMatrixSpyError } from '../utils/errorHandler';

const LOG_PREFIX = '[MatrixSpy]';

export interface DependencyCheckResult {
    pythonFound: boolean;
    pythonVersion: string | null;
    missingPackages: string[];
    allDependenciesMet: boolean;
}

export class PythonBridge {
    static async checkDependencies(pythonPath: string): Promise<DependencyCheckResult> {
        const requiredPackages = ['scipy', 'numpy', 'h5py', 'mat73'];
        const result: DependencyCheckResult = {
            pythonFound: false,
            pythonVersion: null,
            missingPackages: [...requiredPackages],
            allDependenciesMet: false
        };

        return new Promise((resolve) => {
            const proc = spawn(pythonPath, ['--version']);
            let stdout = '';
            let stderr = '';

            const timeoutId = setTimeout(() => {
                proc.kill();
                resolve(result);
            }, 5000);

            proc.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            proc.on('close', async (code: number) => {
                clearTimeout(timeoutId);

                if (code !== 0 && !stdout && !stderr) {
                    resolve(result);
                    return;
                }

                result.pythonFound = true;
                result.pythonVersion = (stdout || stderr).trim();

                const checkProc = spawn(pythonPath, [
                    '-c',
                    `import sys; packages = ['scipy', 'numpy', 'h5py', 'mat73']; missing = []; 
for p in packages: 
    try: 
        __import__(p)
    except ImportError: 
        missing.append(p)
print(','.join(missing))`
                ]);

                let checkStdout = '';

                const checkTimeoutId = setTimeout(() => {
                    checkProc.kill();
                    resolve(result);
                }, 10000);

                checkProc.stdout?.on('data', (data: Buffer) => {
                    checkStdout += data.toString();
                });

                checkProc.on('close', (checkCode: number) => {
                    clearTimeout(checkTimeoutId);

                    if (checkCode === 0) {
                        const missingStr = checkStdout.trim();
                        result.missingPackages = missingStr ? missingStr.split(',').filter(s => s) : [];
                        result.allDependenciesMet = result.missingPackages.length === 0;
                    }

                    resolve(result);
                });

                checkProc.on('error', () => {
                    clearTimeout(checkTimeoutId);
                    resolve(result);
                });
            });

            proc.on('error', () => {
                clearTimeout(timeoutId);
                resolve(result);
            });
        });
    }
    private readonly pythonPath: string;
    private readonly scriptPath: string;
    private process: ChildProcess | null = null;
    private readonly maxProcessTimeout = 30000; // 30 seconds

    constructor(private readonly context: vscode.ExtensionContext) {
        const extensionPath = context.extensionPath;
        const config = vscode.workspace.getConfiguration('matrixspy');

        this.pythonPath = config.get<string>('pythonPath', 'python3');
        console.log(`${LOG_PREFIX} Using Python:`, this.pythonPath);

        this.scriptPath = path.join(extensionPath, 'python', 'high_perf_parser.py');
        console.log(`${LOG_PREFIX} Python script path:`, this.scriptPath);
    }

    async parseFile(filePath: string): Promise<ParserResult> {
        if (!fs.existsSync(filePath)) {
            throw createError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        const stats = fs.statSync(filePath);
        const maxSize = vscode.workspace.getConfiguration('matrixspy').get<number>('maxDataSize', 10000);
        const fileSize = stats.size / (1024 * 1024); // MB

        if (fileSize > 100) { // 100MB limit
            throw createError(
                `File too large (${fileSize.toFixed(2)} MB). Maximum size is 100MB.`,
                ERROR_CODES.FILE_TOO_LARGE,
                { fileSize, maxSize: 100 },
                false
            );
        }

        // Clean up any existing process
        if (this.process) {
            this.dispose();
        }

        return new Promise((resolve, reject) => {
            const fullArgs = [this.scriptPath, filePath];
            const timeoutId = setTimeout(() => {
                this.dispose();
                reject(createError('Python process timeout', ERROR_CODES.TIMEOUT, null, true));
            }, this.maxProcessTimeout);

            console.log(`${LOG_PREFIX} Executing Python:`, this.pythonPath, fullArgs.join(' '));

            this.process = spawn(this.pythonPath, fullArgs);

            let stdout = '';
            let stderr = '';

            const cleanup = () => {
                clearTimeout(timeoutId);
                this.process?.stdout?.off('data', onData);
                this.process?.stderr?.off('data', onStdError);
                this.process?.off('close', onClose);
                this.process?.off('error', onProcessError);
            };

            const onData = (data: Buffer) => {
                stdout += data.toString();
            };

            const onStdError = (data: Buffer) => {
                stderr += data.toString();
                console.error(`${LOG_PREFIX} Python stderr:`, data.toString());
            };

            const onClose = (code: number) => {
                cleanup();
                console.log(`${LOG_PREFIX} Python process exited with code:`, code);

                if (code !== 0) {
                    let error = createError(
                        `Python process exited with code ${code}`,
                        ERROR_CODES.DEPENDENCY_MISSING,
                        { stderr },
                        true
                    );

                    if (stderr.includes('python3') || stderr.includes('python')) {
                        error = createError(
                            'Python not found. Please install Python 3.8+ and update the matrixspy.pythonPath setting.',
                            ERROR_CODES.PYTHON_NOT_FOUND,
                            { pythonPath: this.pythonPath },
                            true
                        );
                    }

                    reject(error);
                    return;
                }

                try {
                    const result: ParserResult = JSON.parse(stdout);
                    if (!result.success) {
                        throw createError(
                            result.error || 'Failed to parse MAT file',
                            ERROR_CODES.INVALID_FILE_FORMAT,
                            result,
                            false
                        );
                    }
                    console.log(`${LOG_PREFIX} Parsed result successfully`);
                    resolve(result);
                } catch (error) {
                    const parseError = error as Error;
                    console.error(`${LOG_PREFIX} Failed to parse Python output`);
                    console.error(`${LOG_PREFIX} Output length:`, stdout.length);
                    console.error(`${LOG_PREFIX} First 500 chars:`, stdout.substring(0, 500));

                    let errorCode: string = ERROR_CODES.UNKNOWN;
                    if (stdout.includes('MemoryError') || stderr.includes('MemoryError')) {
                        errorCode = ERROR_CODES.MEMORY_ERROR;
                    }

                    reject(createError(
                        `Failed to parse Python output: ${parseError.message}`,
                        errorCode,
                        { stdout: stdout.substring(0, 500) },
                        errorCode === ERROR_CODES.MEMORY_ERROR
                    ));
                }
            };

            const onProcessError = (error: Error) => {
                cleanup();
                console.error(`${LOG_PREFIX} Failed to start Python process:`, error);

                let errorCode: string = ERROR_CODES.UNKNOWN;
                if (error.message.includes('ENOENT')) {
                    errorCode = ERROR_CODES.PYTHON_NOT_FOUND;
                }

                reject(createError(
                    `Failed to start Python process: ${error.message}`,
                    errorCode,
                    { pythonPath: this.pythonPath },
                    errorCode === ERROR_CODES.PYTHON_NOT_FOUND
                ));
            };

            this.process.stdout?.on('data', onData);
            this.process.stderr?.on('data', onStdError);
            this.process.on('close', onClose);
            this.process.on('error', onProcessError);
        });
    }

    async loadSlice(filePath: string, variableName: string, axis: number, index: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const fullArgs = [this.scriptPath, filePath, '--slice', variableName, String(axis), String(index)];
            const timeoutId = setTimeout(() => {
                reject(createError('Slice load timeout', ERROR_CODES.TIMEOUT, null, true));
            }, this.maxProcessTimeout);

            console.log(`${LOG_PREFIX} Loading slice:`, variableName, 'axis:', axis, 'index:', index);

            const proc = spawn(this.pythonPath, fullArgs);

            let stdout = '';
            let stderr = '';

            const cleanup = () => {
                clearTimeout(timeoutId);
                proc.stdout?.off('data', onData);
                proc.stderr?.off('data', onSliceStdError);
                proc.off('close', onSliceClose);
                proc.off('error', onSliceProcessError);
            };

            const onData = (data: Buffer) => {
                stdout += data.toString();
            };

            const onSliceStdError = (data: Buffer) => {
                stderr += data.toString();
            };

            const onSliceClose = (code: number) => {
                cleanup();
                if (code !== 0) {
                    reject(createError(
                        `Slice load failed with code ${code}`,
                        ERROR_CODES.UNKNOWN,
                        { stderr },
                        true
                    ));
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    if (!result.success) {
                        throw createError(
                            result.error || 'Failed to load slice',
                            ERROR_CODES.INVALID_FILE_FORMAT,
                            result,
                            false
                        );
                    }
                    resolve(result);
                } catch (error) {
                    const parseError = error as Error;
                    reject(createError(
                        `Failed to parse slice output: ${parseError.message}`,
                        ERROR_CODES.UNKNOWN,
                        { stdout: stdout.substring(0, 500) },
                        true
                    ));
                }
            };

            const onSliceProcessError = (error: Error) => {
                cleanup();
                reject(createError(
                    `Failed to start Python process for slice: ${error.message}`,
                    ERROR_CODES.UNKNOWN,
                    null,
                    true
                ));
            };

            proc.stdout?.on('data', onData);
            proc.stderr?.on('data', onSliceStdError);
            proc.on('close', onSliceClose);
            proc.on('error', onSliceProcessError);
        });
    }

    dispose(): void {
        try {
            if (this.process) {
                // Force kill with SIGKILL if it doesn't respond to SIGTERM
                this.process.kill('SIGKILL');
                this.process = null;
            }
        } catch (error) {
            console.error(`${LOG_PREFIX} Error disposing Python process:`, error);
        }
    }

    // Ensure process is cleaned up when extension is deactivated
    async safeExecute<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } finally {
            // Clean up after operation completes
            this.dispose();
        }
    }
}
