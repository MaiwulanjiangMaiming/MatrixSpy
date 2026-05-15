import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { ParserResult } from '../types';
import { createError, ERROR_CODES, ErrorCode } from '../utils/errorHandler';

export interface DependencyCheckResult {
    pythonFound: boolean;
    pythonVersion: string | null;
    missingPackages: string[];
    allDependenciesMet: boolean;
}

export class PythonBridge {
    private readonly pythonPath: string;
    private readonly scriptPath: string;
    private process: ChildProcess | null = null;
    private readonly maxProcessTimeout = 60000;
    private disposed = false;

    constructor(private readonly context: vscode.ExtensionContext) {
        const extensionPath = context.extensionPath;
        const config = vscode.workspace.getConfiguration('matrixspy');

        this.pythonPath = config.get<string>('pythonPath', 'python3');
        this.scriptPath = path.join(extensionPath, 'python', 'high_perf_parser.py');
    }

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

            proc.on('close', async () => {
                clearTimeout(timeoutId);

                if (!stdout && !stderr) {
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

                checkProc.on('close', () => {
                    clearTimeout(checkTimeoutId);
                    const missingStr = checkStdout.trim();
                    result.missingPackages = missingStr ? missingStr.split(',').filter(s => s) : [];
                    result.allDependenciesMet = result.missingPackages.length === 0;
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

    private killProcess(proc: ChildProcess | null): void {
        if (!proc || proc.exitCode !== null) return;

        try {
            proc.kill('SIGTERM');
            setTimeout(() => {
                if (proc.exitCode === null) {
                    try { proc.kill('SIGKILL'); } catch {}
                }
            }, 3000);
        } catch {
            try { proc.kill('SIGKILL'); } catch {}
        }
    }

    async parseFile(filePath: string): Promise<ParserResult> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        if (!fs.existsSync(filePath)) {
            throw createError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB > 100) {
            throw createError(
                `File too large (${fileSizeMB.toFixed(2)} MB). Maximum size is 100MB.`,
                ERROR_CODES.FILE_TOO_LARGE,
                { fileSize: fileSizeMB, maxSize: 100 },
                false
            );
        }

        this.killProcess(this.process);
        this.process = null;

        return new Promise((resolve, reject) => {
            const fullArgs = [this.scriptPath, filePath];
            const timeoutId = setTimeout(() => {
                this.killProcess(this.process);
                this.process = null;
                reject(createError('Python process timeout', ERROR_CODES.TIMEOUT, null, true));
            }, this.maxProcessTimeout);

            this.process = spawn(this.pythonPath, fullArgs);

            let stdout = '';
            let stderr = '';

            const cleanup = () => {
                clearTimeout(timeoutId);
            };

            this.process.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            this.process.on('close', (code: number) => {
                cleanup();
                this.process = null;

                if (code !== 0) {
                    let errorMsg = `Python process exited with code ${code}`;
                    let errorCode: ErrorCode = ERROR_CODES.DEPENDENCY_MISSING;

                    if (stderr.includes('ModuleNotFoundError') || stderr.includes('ImportError')) {
                        errorMsg = 'Missing Python dependencies. Please run: pip install scipy numpy h5py mat73';
                    } else if (stderr.includes('No module named') || stderr.includes('python3') || stderr.includes('python')) {
                        errorMsg = 'Python not found. Please install Python 3.8+ and update the matrixspy.pythonPath setting.';
                        errorCode = ERROR_CODES.PYTHON_NOT_FOUND;
                    }

                    reject(createError(errorMsg, errorCode, { stderr: stderr.substring(0, 500) }, true));
                    return;
                }

                try {
                    const result: ParserResult = JSON.parse(stdout);
                    if (!result.success) {
                        reject(createError(
                            result.error || 'Failed to parse MAT file',
                            ERROR_CODES.INVALID_FILE_FORMAT,
                            result,
                            false
                        ));
                        return;
                    }
                    resolve(result);
                } catch {
                    let errorCode: ErrorCode = ERROR_CODES.UNKNOWN;
                    if (stdout.includes('MemoryError') || stderr.includes('MemoryError')) {
                        errorCode = ERROR_CODES.MEMORY_ERROR;
                    }

                    reject(createError(
                        `Failed to parse Python output`,
                        errorCode,
                        { stdout: stdout.substring(0, 200), stderr: stderr.substring(0, 200) },
                        errorCode === ERROR_CODES.MEMORY_ERROR
                    ));
                }
            });

            this.process.on('error', (error: Error) => {
                cleanup();
                this.process = null;

                let errorCode: ErrorCode = ERROR_CODES.UNKNOWN;
                if (error.message.includes('ENOENT')) {
                    errorCode = ERROR_CODES.PYTHON_NOT_FOUND;
                }

                reject(createError(
                    `Failed to start Python process: ${error.message}`,
                    errorCode,
                    { pythonPath: this.pythonPath },
                    errorCode === ERROR_CODES.PYTHON_NOT_FOUND
                ));
            });
        });
    }

    async loadSlice(filePath: string, variableName: string, axis: number, index: number): Promise<any> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        if (!fs.existsSync(filePath)) {
            throw createError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        return new Promise((resolve, reject) => {
            const fullArgs = [this.scriptPath, filePath, '--slice', variableName, String(axis), String(index)];
            const proc = spawn(this.pythonPath, fullArgs);

            const timeoutId = setTimeout(() => {
                this.killProcess(proc);
                reject(createError('Slice load timeout', ERROR_CODES.TIMEOUT, null, true));
            }, this.maxProcessTimeout);

            let stdout = '';
            let stderr = '';

            const cleanup = () => {
                clearTimeout(timeoutId);
            };

            proc.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            proc.on('close', (code: number) => {
                cleanup();
                if (code !== 0) {
                    reject(createError(
                        `Slice load failed with code ${code}`,
                        ERROR_CODES.UNKNOWN,
                        { stderr: stderr.substring(0, 500) },
                        true
                    ));
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    if (!result.success) {
                        reject(createError(
                            result.error || 'Failed to load slice',
                            ERROR_CODES.INVALID_FILE_FORMAT,
                            result,
                            false
                        ));
                        return;
                    }
                    resolve(result);
                } catch {
                    reject(createError(
                        'Failed to parse slice output',
                        ERROR_CODES.UNKNOWN,
                        { stdout: stdout.substring(0, 200) },
                        true
                    ));
                }
            });

            proc.on('error', (error: Error) => {
                cleanup();
                reject(createError(
                    `Failed to start Python process for slice: ${error.message}`,
                    ERROR_CODES.UNKNOWN,
                    null,
                    true
                ));
            });
        });
    }

    dispose(): void {
        this.disposed = true;
        this.killProcess(this.process);
        this.process = null;
    }
}
