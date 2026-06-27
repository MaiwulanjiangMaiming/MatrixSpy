import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { ParserResult } from '../types';
import { createError, ERROR_CODES } from '../utils/errorHandler';

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

/** Optional per-request options for sendRequest. */
interface SendRequestOptions {
    /** Override the default 60s timeout. */
    timeoutMs?: number;
    /** Progress callback keyed by requestId so concurrent loads don't crosstalk. */
    progressCallback?: (progress: number, stage: string) => void;
}

export class PythonBridge {
    private readonly scriptPath: string;
    private daemonProcess: ChildProcess | null = null;
    private disposed = false;
    private nextRequestId = 1;
    private pendingRequests = new Map<number, PendingRequest>();
    /** Per-requestId progress callbacks. Keyed by requestId (not by file path)
     *  so that two concurrent load_file calls never deliver each other's
     *  progress events. */
    private progressCallbacks = new Map<number, (progress: number, stage: string) => void>();
    private stdoutBuffer = '';
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private currentFilePath: string | null = null;
    /** Default request timeout. Long operations (load_file) override this. */
    private readonly defaultTimeoutMs = 60000;
    private restarting = false;
    /** Singleton lock so concurrent callers don't spawn multiple daemons. */
    private startPromise: Promise<void> | null = null;
    /** Bounded stdout buffer to avoid unbounded memory growth on malformed peers. */
    private static readonly MAX_STDOUT_BUFFER = 64 * 1024 * 1024;
    /** Bound on a single request line length accepted from the daemon. */
    private static readonly MAX_FILE_SIZE_MB = 100;
    /** Last pythonPath used to spawn the daemon. Tracked so we can detect
     *  setting changes and respawn the daemon with a new interpreter. */
    private lastPythonPath: string | null = null;

    constructor(private readonly context: vscode.ExtensionContext) {
        const extensionPath = context.extensionPath;
        this.scriptPath = path.join(extensionPath, 'python', 'high_perf_parser.py');
    }

    /**
     * Read the currently configured Python interpreter path.
     *
     * The setting is read on every call (not cached in the constructor) so
     * that users who change `matrixspy.pythonPath` in Settings get the new
     * interpreter on the next request without having to reload the window.
     */
    private get pythonPath(): string {
        const config = vscode.workspace.getConfiguration('matrixspy');
        const configured = config.get<string>('pythonPath', 'python3');
        // On Windows the default `python3` rarely exists; fall back to `python`
        // for users who never touched the setting. If the user explicitly set
        // a path, respect it as-is (checkDependencies will still try the
        // platform fallbacks as a safety net).
        if (configured === 'python3' && process.platform === 'win32') {
            return 'python';
        }
        return configured;
    }

    static async checkDependencies(pythonPath: string): Promise<DependencyCheckResult> {
        const requiredPackages = ['scipy', 'numpy', 'h5py', 'mat73'];
        const result: DependencyCheckResult = {
            pythonFound: false,
            pythonVersion: null,
            missingPackages: [...requiredPackages],
            allDependenciesMet: false
        };

        // Try the configured interpreter first, then fall back to common
        // candidates. On Windows the default `python3` rarely exists, so we
        // also try `python` and the `py` launcher. This avoids a misleading
        // "Python not found" error for users who never touched the setting.
        let effectivePath: string | null = null;
        let version: string | null = null;
        for (const candidate of PythonBridge.pythonCandidates(pythonPath)) {
            const probe = await PythonBridge.probePythonVersion(candidate, 5000);
            if (probe.found) {
                effectivePath = candidate;
                version = probe.version;
                break;
            }
        }
        if (!effectivePath || !version) {
            return result;
        }

        result.pythonFound = true;
        result.pythonVersion = version;

        return new Promise((resolve) => {
            const checkProc = spawn(effectivePath!, [
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
    }

    /**
     * Build a de-duplicated list of Python interpreter candidates to try.
     * The configured path is always first; platform-appropriate fallbacks
     * follow so that Windows users with the default `python3` setting still
     * get discovered via `python` or `py`.
     */
    private static pythonCandidates(configuredPath: string): string[] {
        const isWin = process.platform === 'win32';
        const fallback = isWin ? ['python', 'py', 'python3'] : ['python3', 'python'];
        return Array.from(new Set([configuredPath, ...fallback]));
    }

    /**
     * Probe a single Python candidate by spawning `--version`. Resolves with
     * `found: true` and the version string on success, `found: false` on
     * timeout, spawn error, or empty output.
     */
    private static probePythonVersion(candidate: string, timeoutMs: number): Promise<{ found: boolean; version: string | null }> {
        return new Promise((resolve) => {
            let proc: ChildProcess;
            try {
                proc = spawn(candidate, ['--version']);
            } catch {
                resolve({ found: false, version: null });
                return;
            }
            let stdout = '';
            let stderr = '';
            const timeoutId = setTimeout(() => {
                try { proc.kill(); } catch { /* noop */ }
                resolve({ found: false, version: null });
            }, timeoutMs);
            proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
            proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
            proc.on('close', () => {
                clearTimeout(timeoutId);
                const out = (stdout || stderr).trim();
                if (!out) {
                    resolve({ found: false, version: null });
                } else {
                    resolve({ found: true, version: out });
                }
            });
            proc.on('error', () => {
                clearTimeout(timeoutId);
                resolve({ found: false, version: null });
            });
        });
    }

    private async ensureDaemon(): Promise<void> {
        // If the user changed matrixspy.pythonPath since the daemon was
        // spawned, tear down the old daemon so the next request starts a
        // fresh one with the new interpreter. Without this, the daemon would
        // keep using the old Python even after the user updated the setting.
        const currentPath = this.pythonPath;
        if (this.daemonProcess && this.daemonProcess.exitCode === null
            && this.lastPythonPath !== null && this.lastPythonPath !== currentPath) {
            this.stopHeartbeat();
            this.killProcess(this.daemonProcess);
            this.daemonProcess = null;
            this.daemonReadyReceived = false;
            this.lastPythonPath = null;
            // Reject any in-flight requests on the old daemon so callers
            // don't hang waiting for a response that will never come.
            this.rejectAllPending('Python interpreter changed; daemon restarting');
        }

        if (this.daemonProcess && this.daemonProcess.exitCode === null) {
            return;
        }
        // Singleton lock: concurrent callers share the same startup promise
        // so we never spawn two daemon processes.
        if (this.startPromise) {
            return this.startPromise;
        }
        this.startPromise = this.startDaemon().finally(() => {
            this.startPromise = null;
        });
        return this.startPromise;
    }

    private startDaemon(): Promise<void> {
        const pythonPath = this.pythonPath;
        return new Promise((resolve, reject) => {
            this.daemonProcess = spawn(pythonPath, [this.scriptPath, '--daemon'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Record the interpreter used for this daemon so ensureDaemon()
            // can detect setting changes and respawn with a new interpreter.
            this.lastPythonPath = pythonPath;

            let started = false;
            let stderrBuffer = '';
            const startupTimeout = setTimeout(() => {
                if (!started) {
                    this.killProcess(this.daemonProcess);
                    this.daemonProcess = null;
                    reject(new Error(`Daemon startup timeout. Stderr: ${stderrBuffer.slice(-500)}`));
                }
            }, 15000);

            this.daemonProcess.stdout?.on('data', (data: Buffer) => {
                this.handleStdoutData(data);
                // Resolve on the explicit "ready" handshake emitted by the daemon,
                // not on arbitrary stdout bytes. This removes the race where the
                // promise resolved on import warnings etc.
                if (!started && this.daemonReadyReceived) {
                    started = true;
                    clearTimeout(startupTimeout);
                    resolve();
                }
            });

            this.daemonProcess.stderr?.on('data', (data: Buffer) => {
                const msg = data.toString();
                stderrBuffer += msg;
                if (msg.trim()) {
                    console.warn('[MatrixSpy] Daemon stderr:', msg.trim());
                }
            });

            this.daemonProcess.on('close', (code: number) => {
                clearTimeout(startupTimeout);
                this.daemonProcess = null;
                this.daemonReadyReceived = false;
                this.rejectAllPending(`Daemon process exited with code ${code}`);
                if (!started) {
                    reject(new Error(`Daemon process exited with code ${code}`));
                } else if (!this.disposed && !this.restarting) {
                    this.handleCrashRecovery();
                }
            });

            this.daemonProcess.on('error', (error: Error) => {
                clearTimeout(startupTimeout);
                this.daemonProcess = null;
                this.daemonReadyReceived = false;
                this.rejectAllPending(`Daemon process error: ${error.message}`);
                if (!started) {
                    reject(error);
                }
            });

            this.startHeartbeat();
        });
    }

    /** Flag set when the daemon emits its ready handshake. */
    private daemonReadyReceived = false;

    private handleStdoutData(data: Buffer): void {
        this.stdoutBuffer += data.toString();
        // Guard against unbounded buffer growth. Instead of clearing the
        // entire buffer (which loses all pending responses mid-stream),
        // truncate to the tail after the last newline so the most recent
        // in-progress line is preserved.
        if (this.stdoutBuffer.length > PythonBridge.MAX_STDOUT_BUFFER) {
            const lastNewline = this.stdoutBuffer.lastIndexOf('\n');
            if (lastNewline >= 0) {
                this.stdoutBuffer = this.stdoutBuffer.slice(lastNewline + 1);
            } else {
                // No newline at all — a single line is enormous. Drop it.
                this.stdoutBuffer = '';
            }
            console.warn('[MatrixSpy] stdout buffer exceeded limit, truncated to last line.');
        }
        const lines = this.stdoutBuffer.split('\n');
        this.stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {continue;}

            try {
                const response = JSON.parse(trimmed);
                // Recognize the daemon's ready handshake so startDaemon can resolve.
                if (response && response.action === 'ready' && response._request_id === undefined) {
                    this.daemonReadyReceived = true;
                    continue;
                }
                this.handleResponse(response);
            } catch {
                console.warn('[MatrixSpy] Failed to parse daemon response:', trimmed.substring(0, 200));
            }
        }
    }

    private handleResponse(response: any): void {
        const requestId = response._request_id;

        if (requestId !== undefined && 'progress' in response && !('success' in response)) {
            // Route progress to the specific request that registered it,
            // so concurrent loads never receive each other's events.
            const cb = this.progressCallbacks.get(requestId);
            if (cb) {
                cb(response.progress, response.stage || '');
            }
            return;
        }

        if (requestId !== undefined && this.pendingRequests.has(requestId)) {
            const pending = this.pendingRequests.get(requestId)!;
            this.pendingRequests.delete(requestId);
            this.progressCallbacks.delete(requestId);
            clearTimeout(pending.timer);
            pending.resolve(response);
        }
    }

    private rejectAllPending(reason: string): void {
        for (const pending of this.pendingRequests.values()) {
            clearTimeout(pending.timer);
            pending.reject(createError(reason, ERROR_CODES.UNKNOWN, null, true));
        }
        this.pendingRequests.clear();
        this.progressCallbacks.clear();
    }

    private async handleCrashRecovery(): Promise<void> {
        if (this.disposed || this.restarting) {return;}
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
            // If there are pending requests, the daemon is alive and busy
            // (e.g. parsing a large file). Skip the heartbeat ping to avoid
            // killing a healthy-but-busy daemon whose ping response would
            // be queued behind a long-running operation. The request itself
            // is the liveness proof; its own timeout handles failures.
            if (this.pendingRequests.size > 0) {
                return;
            }

            try {
                const result = await this.sendRequest(
                    { action: 'ping' },
                    { timeoutMs: 10000 }
                );

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

    private async sendRequest(request: object, options?: SendRequestOptions): Promise<any> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        try {
            await this.ensureDaemon();
        } catch (err) {
            throw createError(
                `Failed to start daemon: ${err instanceof Error ? err.message : String(err)}`,
                ERROR_CODES.PYTHON_NOT_FOUND,
                null,
                true
            );
        }

        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        const requestId = this.nextRequestId++;
        const requestWithId = { ...request, _request_id: requestId };
        const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

        if (options?.progressCallback) {
            this.progressCallbacks.set(requestId, options.progressCallback);
        }

        return new Promise<any>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                this.progressCallbacks.delete(requestId);
                reject(createError('Daemon request timeout', ERROR_CODES.TIMEOUT, null, true));
            }, timeoutMs);

            this.pendingRequests.set(requestId, { resolve, reject, timer });

            try {
                const line = JSON.stringify(requestWithId) + '\n';
                this.daemonProcess!.stdin!.write(line);
            } catch (err) {
                this.pendingRequests.delete(requestId);
                this.progressCallbacks.delete(requestId);
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

    /**
     * Internal send that bypasses the disposed check. Used by dispose() to
     * deliver the shutdown request before the disposed flag is set.
     */
    private async sendRawRequest(request: object): Promise<any> {
        if (!this.daemonProcess || this.daemonProcess.exitCode !== null) {
            throw new Error('Daemon not running');
        }
        const requestId = this.nextRequestId++;
        const requestWithId = { ...request, _request_id: requestId };
        return new Promise<any>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('Shutdown request timeout'));
            }, 3000);
            this.pendingRequests.set(requestId, { resolve, reject, timer });
            try {
                const line = JSON.stringify(requestWithId) + '\n';
                this.daemonProcess!.stdin!.write(line);
            } catch (err) {
                this.pendingRequests.delete(requestId);
                clearTimeout(timer);
                reject(err);
            }
        });
    }

    private killProcess(proc: ChildProcess | null): void {
        if (!proc || proc.exitCode !== null) {return;}

        try {
            proc.kill('SIGTERM');
            setTimeout(() => {
                if (proc.exitCode === null) {
                    try { proc.kill('SIGKILL'); } catch { void 0; }
                }
            }, 3000);
        } catch {
            try { proc.kill('SIGKILL'); } catch { void 0; }
        }
    }

    async parseFile(
        filePath: string,
        progressCallback?: (progress: number, stage: string) => void
    ): Promise<ParserResult> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        if (!fs.existsSync(filePath)) {
            throw createError(`File not found: ${filePath}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        // Read the user-configurable threshold. The setting is documented as
        // "maximum data size in number of elements"; we treat it as MB here
        // so the gate is actually enforced (previously it was dead config).
        const maxSizeMB = this.getMaxFileSizeMB();

        if (fileSizeMB > maxSizeMB) {
            throw createError(
                `File too large (${fileSizeMB.toFixed(2)} MB). Maximum size is ${maxSizeMB} MB.`,
                ERROR_CODES.FILE_TOO_LARGE,
                { fileSize: fileSizeMB, maxSize: maxSizeMB },
                false
            );
        }

        this.currentFilePath = filePath;

        // Dynamic timeout: base 60s + 2s per MB, capped at 300s. This
        // prevents false timeouts on large v7.3 files whose mat73.loadmat
        // + per-variable processing can legitimately exceed 60s.
        const timeoutMs = Math.min(60000 + fileSizeMB * 2000, 300000);

        try {
            const result = await this.sendRequest(
                {
                    action: 'load_file',
                    path: filePath
                },
                { timeoutMs, progressCallback }
            );

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
            const result = await this.sendRequest(
                {
                    action: 'load_slice',
                    path: filePath,
                    variable: variableName,
                    axis,
                    index
                },
                { timeoutMs: 30000 }
            );

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

    async compareFiles(path1: string, path2: string): Promise<any> {
        if (this.disposed) {
            throw createError('PythonBridge has been disposed', ERROR_CODES.UNKNOWN, null, false);
        }

        if (!fs.existsSync(path1)) {
            throw createError(`File not found: ${path1}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        if (!fs.existsSync(path2)) {
            throw createError(`File not found: ${path2}`, ERROR_CODES.FILE_NOT_FOUND, null, false);
        }

        try {
            const result = await this.sendRequest({
                action: 'compare_files',
                path1,
                path2
            });

            if (!result.success) {
                throw createError(
                    result.error || 'Failed to compare files',
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
                `Failed to compare files: ${err instanceof Error ? err.message : String(err)}`,
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
        // Send shutdown BEFORE setting disposed=true, otherwise sendRequest
        // would reject immediately and the daemon would never receive it.
        this.stopHeartbeat();
        this.progressCallbacks.clear();

        if (this.daemonProcess && this.daemonProcess.exitCode === null) {
            try {
                await this.sendRawRequest({ action: 'shutdown' });
            } catch {
                // shutdown request failed or timed out — fall through to kill
            }
            this.killProcess(this.daemonProcess);
            this.daemonProcess = null;
        }

        // Now mark disposed and reject any straggling pending requests.
        this.disposed = true;
        this.rejectAllPending('PythonBridge disposed');
    }

    /**
     * Resolve the maximum allowed MAT file size in MB.
     *
     * Reads `matrixspy.maxFileSizeMB` (the canonical setting). For backward
     * compatibility, if only the legacy `matrixspy.maxDataSize` is set to a
     * non-default value, we honor it as MB. The result is clamped to
     * [1, 4096] MB.
     */
    private getMaxFileSizeMB(): number {
        const config = vscode.workspace.getConfiguration('matrixspy');
        const primary = config.get<number>('maxFileSizeMB');
        if (Number.isFinite(primary) && primary! >= 1) {
            return Math.min(primary!, 4096);
        }
        // Fall back to legacy setting (treated as MB) if the user had
        // customized it before the new setting existed.
        const legacy = config.get<number>('maxDataSize');
        if (Number.isFinite(legacy) && legacy! >= 1) {
            return Math.min(legacy!, 4096);
        }
        return PythonBridge.MAX_FILE_SIZE_MB;
    }
}
