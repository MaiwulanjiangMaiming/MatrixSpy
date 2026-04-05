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

const LOG_PREFIX = '[MatrixSpy]';

export class PythonBridge {
    private readonly pythonPath: string;
    private readonly scriptPath: string;
    private process: ChildProcess | null = null;

    constructor(private readonly context: vscode.ExtensionContext) {
        const extensionPath = context.extensionPath;
        const config = vscode.workspace.getConfiguration('matrixspy');

        this.pythonPath = config.get<string>('pythonPath', 'python3');
        console.log(`${LOG_PREFIX} Using Python:`, this.pythonPath);

        this.scriptPath = path.join(extensionPath, 'python', 'high_perf_parser.py');
        console.log(`${LOG_PREFIX} Python script path:`, this.scriptPath);
    }

    async parseFile(filePath: string): Promise<ParserResult> {
        return new Promise((resolve, reject) => {
            const fullArgs = [this.scriptPath, filePath];

            console.log(`${LOG_PREFIX} Executing Python:`, this.pythonPath, fullArgs.join(' '));

            this.process = spawn(this.pythonPath, fullArgs);

            let stdout = '';
            let stderr = '';

            this.process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            this.process.stderr?.on('data', (data) => {
                stderr += data.toString();
                console.error(`${LOG_PREFIX} Python stderr:`, data.toString());
            });

            this.process.on('close', (code) => {
                console.log(`${LOG_PREFIX} Python process exited with code:`, code);

                if (code !== 0) {
                    const error = `Python process exited with code ${code}: ${stderr}`;
                    console.error(`${LOG_PREFIX}`, error);
                    reject(new Error(error));
                    return;
                }

                try {
                    const result: ParserResult = JSON.parse(stdout);
                    console.log(`${LOG_PREFIX} Parsed result successfully`);
                    resolve(result);
                } catch (error) {
                    console.error(`${LOG_PREFIX} Failed to parse Python output`);
                    console.error(`${LOG_PREFIX} Output length:`, stdout.length);
                    console.error(`${LOG_PREFIX} First 500 chars:`, stdout.substring(0, 500));
                    reject(new Error(`Failed to parse Python output: ${error}\nOutput: ${stdout.substring(0, 500)}`));
                }
            });

            this.process.on('error', (error) => {
                console.error(`${LOG_PREFIX} Failed to start Python process:`, error);
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }

    dispose(): void {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
}
