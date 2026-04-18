import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { LOG_PREFIX } from './constants';

export class FileHelper {
    /**
     * Check if a file exists and is accessible
     */
    static async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file size in bytes
     */
    static getFileSize(filePath: string): number {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    /**
     * Get file size in MB
     */
    static getFileSizeMB(filePath: string): number {
        const bytes = this.getFileSize(filePath);
        return bytes / (1024 * 1024);
    }

    /**
     * Normalize a file path to prevent directory traversal
     */
    static normalizeFilePath(filePath: string): string {
        // Ensure we're working with absolute paths
        const absolutePath = path.resolve(filePath);

        // Get the workspace root if available
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let workspaceRoot = '';

        if (workspaceFolders && workspaceFolders.length > 0) {
            workspaceRoot = workspaceFolders[0].uri.fsPath;
        }

        // If the path is outside the workspace, allow it but with caution
        if (workspaceRoot && absolutePath.startsWith(workspaceRoot)) {
            return absolutePath;
        }

        // For paths outside workspace, ensure no parent directory traversal
        const normalized = path.normalize(absolutePath);
        const dirname = path.dirname(normalized);
        const basename = path.basename(normalized);

        // Check for potential directory traversal attempts
        if (basename === '..' || basename === '.') {
            throw new Error(`Invalid file path: ${filePath}`);
        }

        return path.join(dirname, basename);
    }

    /**
     * Validate file extension
     */
    static isValidFileExtension(filePath: string, extensions: string[]): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return extensions.includes(ext);
    }

    /**
     * Find sample files in the workspace
     */
    static findSampleFiles(): string[] {
        const sampleFiles: string[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            return sampleFiles;
        }

        workspaceFolders.forEach(folder => {
            const testFilesPath = path.join(folder.uri.fsPath, 'test-files');
            if (fs.existsSync(testFilesPath)) {
                try {
                    const files = fs.readdirSync(testFilesPath);
                    const matFiles = files
                        .filter(file => file.endsWith('.mat'))
                        .map(file => path.join(testFilesPath, file));
                    sampleFiles.push(...matFiles);
                } catch (error) {
                    console.error(`${LOG_PREFIX} Error reading test files:`, error);
                }
            }
        });

        return sampleFiles;
    }

    /**
     * Create a safe temporary directory
     */
    static createTempDir(): string {
        const tempDir = path.join(os.tmpdir(), 'matrixspy-tmp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        return tempDir;
    }

    /**
     * Clean up temporary files
     */
    static cleanupTempDir(): void {
        try {
            const tempDir = path.join(os.tmpdir(), 'matrixspy-tmp');
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.error(`${LOG_PREFIX} Error cleaning temp directory:`, error);
        }
    }
}

// Add os import
import * as os from 'os';