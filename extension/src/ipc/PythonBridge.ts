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

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timer: ReturnType<typeof setTimeout>;
}

export class PythonBridge {
    private readonly pythonPath: string;
    private readonly scriptPath: string;
    private daemonProcess: ChildProcess | null = null;
    private disposed = false;
    private nextRequestId = 1;
    private pendingRequests = new Map<number, PendingRequest>();
    private stdoutBuffer = '';
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private currentFilePath: string | null = null;
    private readonly maxProcessTimeout = 60000;
    private restarting = false;
    private onProgressCallback: ((progress: number, stage: string) => void) | null = null;

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

    private async ensureDaemon(): Promise<void> {
        if (this.daemonProcess && this.daemonProcess.exitCode === null) {
            return;
        }

        await this.startDaemon();
    }

    private startDaemon(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.daemonProcess = spawn(this.pythonPath, [this.scriptPath, '--daemon'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let started = false;

            this.daemonProcess.stdout?.on('data', (data: Buffer) => {
                this.handleStdoutData(data);
                if (!started) {
                    started = true;
                    resolve();
                }
            });

            this.daemonProcess.stderr?.on('data', (data: Buffer) => {
                const msg = data.toString().trim();
                if (msg) {
                    console.warn('[MatrixSpy] Daemon stderr:', msg);
                }
            });

            this.daemonProcess.on('close', (code: number) => {
                this.daemonProcess = null;
                this.rejectAllPending(`Daemon process exited with code ${code}`);
                if (!started) {
                    reject(new Error(`Daemon process exited with code ${code}`));
                } else if (!this.disposed && !this.restarting) {
                    this.handleCrashRecovery();
                }
            });

            this.daemonProcess.on('error', (error: Error) => {
                this.daemonProcess = null;
                this.rejectAllPending(`Daemon process error: ${error.message}`);
                if (!started) {
                    reject(error);
                }
            });

            this.startHeartbeat();
        });
    }

    private handleStdoutData(data: Buffer): void {
        this.stdoutBuffer += data.toString();
        const lines = this.stdoutBuffer.split('\n');
        this.stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
                const response = JSON.parse(trimmed);
                this.handleResponse(response);
            } catch {
                console.warn('[MatrixSpy] Failed to parse daemon response:', trimmed.substring(0, 200));
            }
        }
    }

    private handleResponse(response: any): void {
        const requestId = response._request_id;

        if (requestId !== undefined && 'progress' in response && !('success' in response)) {
            if (this.onProgressCallback) {
                this.onProgressCallback(response.progress, response.stage || '');
            }
            return;
        }

        if (requestId !== undefined && this.pendingRequests.has(requestId)) {
            const pending = this.pendingRequests.get(requestId)!;
            this.pendingRequests.delete(requestId);
            clearTimeout(pending.timer);
            pending.resolve(response);
        }
    }

    private rejectAllPending(reason: string): void {
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timer);
            pending.reject(createError(reason, ERROR_CODES.UNKNOWN, null, true));
        }
        this.pendingRequests.clear();
    }

    private async handleCrashRecovery(): Promise<void> {
        if (this.disposed || this.restarting) return;
        this.restarting = true;

        try {
            await this.startDaemon();

            if (this.currentFilePath) {
                try {
                    await this.sendRequest({
                        action: 'load_file',
                        path: this.currentFilePath
                    });
                } catch {
                    // best effort
                }
            }
        } catch {
            // restart failed, will try again on next request
        } finally {
            this.restarting = false;
        }
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(async () => {
            if (this.disposed || !this.daemonProcess || this.daemonProcess.exitCode !== null) {
                return;
            }

            try {
                const result = await Promise.race([
                    this.sendRequest({ action: 'ping' }),
                    new Promise<null>((_, reject) =>
                        setTimeout(() => reject(new Error('Heartbeat timeout')), 5000)
                    )
                ]);

                if (!result || result.action !== 'pong') {
                    throw new Error('Invalid heartbeat response');
                }
            } catch {
                if (!this.disposed && this.daemonProcess && this.daemonProcess.exitCode === null) {
                    this.killProcess(this.daemonProcess);
                    this.daemonProcess = null;
                    this.handleCrashRecovery();
                }
            }
        }, 30000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private sendRequest(request: object): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if (this.disposed) {
                reject(createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false));
                return;
            }

            try {
                await this.ensureDaemon();
            } catch (err) {
                reject(createError(
                    `Failed to start daemon: ${err instanceof Error ? err.message : String(err)}`,
                    ERROR_CODES.PYTHON_NOT_FOUND,
                    null,
                    true
                ));
                return;
            }

            const requestId = this.nextRequestId++;
            const requestWithId = { ...request, _request_id: requestId };

            const timer = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(createError('Daemon request timeout', ERROR_CODES.TIMEOUT, null, true));
            }, this.maxProcessTimeout);

            this.pendingRequests.set(requestId, { resolve, reject, timer });

            try {
                const line = JSON.stringify(requestWithId) + '\n';
                this.daemonProcess!.stdin!.write(line);
            } catch (err) {
                this.pendingRequests.delete(requestId);
                clearTimeout(timer);
                reject(createError(
                    `Failed to write to daemon stdin: ${err instanceof Error ? err.message : String(err)}`,
                    ERROR_CODES.UNKNOWN,
                    null,
                    true
                ));
            }
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

        this.currentFilePath = filePath;

        try {
            const result = await this.sendRequest({
                action: 'load_file',
                path: filePath
            });

            if (!result.success) {
                throw createError(
                    result.error || 'Failed to parse MAT file',
                    ERROR_CODES.INVALID_FILE_FORMAT,
                    result,
                    false
                );
            }

            return result as ParserResult;
        } catch (err) {
            if (err && typeof err === 'object' && 'code' in err) {
                throw err;
            }
            throw createError(
                `Failed to parse file: ${err instanceof Error ? err.message : String(err)}`,
                ERROR_CODES.UNKNOWN,
                null,
                true
            );
        }
    }

    async loadSlice(filePath: string, variableName: string, axis: number, index: number): Promise<any> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        if (!fs.existsSync(filePath)) {
            throw createError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        try {
            const result = await this.sendRequest({
                action: 'load_slice',
                path: filePath,
                variable: variableName,
                axis,
                index
            });

            if (!result.success) {
                throw createError(
                    result.error || 'Failed to load slice',
                    ERROR_CODES.SLICE_ERROR,
                    result,
                    false
                );
            }

            return result;
        } catch (err) {
            if (err && typeof err === 'object' && 'code' in err) {
                throw err;
            }
            throw createError(
                `Failed to load slice: ${err instanceof Error ? err.message : String(err)}`,
                ERROR_CODES.SLICE_ERROR,
                null,
                true
            );
        }
    }

    async exportHdf5(filePath: string, variableName: string, destPath: string): Promise<any> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        if (!fs.existsSync(filePath)) {
            throw createError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        try {
            const result = await this.sendRequest({
                action: 'export_hdf5',
                path: filePath,
                variable: variableName,
                dest_path: destPath
            });

            if (!result.success) {
                throw createError(
                    result.error || 'Failed to export HDF5',
                    ERROR_CODES.UNKNOWN,
                    result,
                    false
                );
            }

            return result;
        } catch (err) {
            if (err && typeof err === 'object' && 'code' in err) {
                throw err;
            }
            throw createError(
                `Failed to export HDF5: ${err instanceof Error ? err.message : String(err)}`,
                ERROR_CODES.UNKNOWN,
                null,
                true
            );
        }
    }

    async exportXlsx(filePath: string, variableName: string, destPath: string): Promise<any> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        if (!fs.existsSync(filePath)) {
            throw createError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        try {
            const result = await this.sendRequest({
                action: 'export_xlsx',
                path: filePath,
                variable: variableName,
                dest_path: destPath
            });

            if (!result.success) {
                throw createError(
                    result.error || 'Failed to export XLSX',
                    ERROR_CODES.UNKNOWN,
                    result,
                    false
                );
            }

            return result;
        } catch (err) {
            if (err && typeof err === 'object' && 'code' in err) {
                throw err;
            }
            throw createError(
                `Failed to export XLSX: ${err instanceof Error ? err.message : String(err)}`,
                ERROR_CODES.UNKNOWN,
                null,
                true
            );
        }
    }

    async dispose(): Promise<void> {
        this.disposed = true;
        this.stopHeartbeat();
        this.onProgressCallback = null;

        if (this.daemonProcess && this.daemonProcess.exitCode === null) {
            try {
                const shutdownResult = await Promise.race([
                    this.sendRequest({ action: 'shutdown' }),
                    new Promise<null>((_, reject) =>
                        setTimeout(() => reject(new Error('Shutdown timeout')), 3000)
                    )
                ]);
            } catch {
                // shutdown request failed or timed out
            }

            this.killProcess(this.daemonProcess);
            this.daemonProcess = null;
        }

        this.rejectAllPending('PythonBridge disposed');
    }

    setProgressCallback(callback: ((progress: number, stage: string) => void) | null): void {
        this.onProgressCallback = callback;
    }
}
