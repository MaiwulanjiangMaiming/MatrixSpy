/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import { MatFileEditorProvider } from './providers/CustomEditorProvider';
import { MatVariableTreeDataProvider, setCurrentData, setCurrentWebviewPanel, showVariable } from './providers/MatVariableTreeDataProvider';
import { PythonBridge } from './ipc/PythonBridge';
import { openFileCommand } from './commands/openFile';
import { exportCSVCommand, exportJSONCommand } from './commands/exportData';
import { MatFileData, ParserResult } from './types';

const LOG_PREFIX = '[MatrixSpy]';

let currentTreeDataProvider: MatVariableTreeDataProvider | null = null;
let currentEditorProvider: MatFileEditorProvider | null = null;
const fileDataCache = new Map<string, MatFileData>();
let currentActiveFile: string | null = null;
let currentPythonBridge: PythonBridge | null = null;
let currentWebviewPanel: vscode.WebviewPanel | null = null;

export function activate(context: vscode.ExtensionContext): void {
    console.log(`${LOG_PREFIX} Extension is now active!`);

    currentPythonBridge = new PythonBridge(context);
    currentEditorProvider = new MatFileEditorProvider(context, currentPythonBridge);
    currentTreeDataProvider = new MatVariableTreeDataProvider(currentPythonBridge);

    registerEditorProvider(context);
    registerTreeDataProvider(context);
    registerCommands(context);
    registerEventHandlers(context);
}

function registerEditorProvider(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'matrixspy.matFile',
            currentEditorProvider!,
            {
                webviewOptions: { retainContextWhenHidden: false },
                supportsMultipleEditorsPerDocument: false
            }
        )
    );
}

function registerTreeDataProvider(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('matrixspyVariables', currentTreeDataProvider!)
    );
}

function registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('matrixspy.openFile', openFileCommand),
        vscode.commands.registerCommand('matrixspy.exportCSV', () => exportCSVCommand(currentPythonBridge!)),
        vscode.commands.registerCommand('matrixspy.exportJSON', () => exportJSONCommand(currentPythonBridge!)),
        vscode.commands.registerCommand('matrixspy.refreshVariables', () => {
            vscode.window.showInformationMessage('Variables refreshed!');
        }),
        vscode.commands.registerCommand('matrixspy.showVariable', (name: string, value: any) => {
            showVariable(name, value);
        })
    );
}

function registerEventHandlers(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            console.log(`${LOG_PREFIX} onDidChangeActiveTextEditor triggered`);
            
            if (editor?.document.fileName.endsWith('.mat')) {
                const filePath = editor.document.fileName;
                console.log(`${LOG_PREFIX} Tab changed to:`, filePath);
                await handleFileSwitch(filePath);
            } else if (!editor) {
                console.log(`${LOG_PREFIX} No active editor`);
                clearTreeData();
            }
        })
    );
}

async function handleFileSwitch(filePath: string): Promise<void> {
    console.log(`${LOG_PREFIX} handleFileSwitch:`, filePath);
    
    if (fileDataCache.has(filePath)) {
        console.log(`${LOG_PREFIX} Using cached data for:`, filePath);
        updateDisplayForFile(filePath, fileDataCache.get(filePath)!);
    } else {
        console.log(`${LOG_PREFIX} No cache, loading:`, filePath);
        await loadAndCacheFile(filePath);
    }
}

async function loadAndCacheFile(filePath: string): Promise<void> {
    if (!currentPythonBridge) return;
    
    try {
        console.log(`${LOG_PREFIX} Loading file for cache:`, filePath);
        const result: ParserResult = await currentPythonBridge.parseFile(filePath);
        console.log(`${LOG_PREFIX} File loaded successfully`);
        
        if (result.success && result.data) {
            cacheFileData(filePath, result.data);
            updateDisplayForFile(filePath, result.data);
        }
    } catch (error) {
        console.error(`${LOG_PREFIX} Error loading for cache:`, error);
        vscode.window.showErrorMessage(`Failed to load MAT file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function cacheFileData(filePath: string, data: MatFileData): void {
    console.log(`${LOG_PREFIX} Caching data for:`, filePath, 'keys:', Object.keys(data));
    fileDataCache.set(filePath, data);
    currentActiveFile = filePath;
}

export function updateDisplayForFile(filePath: string, data: MatFileData): void {
    console.log(`${LOG_PREFIX} updateDisplayForFile:`, filePath);
    console.log(`${LOG_PREFIX} Data keys:`, Object.keys(data));
    
    updateTreeData(data);
    currentActiveFile = filePath;
    
    if (currentWebviewPanel) {
        console.log(`${LOG_PREFIX} Sending fileLoaded to webview`);
        currentWebviewPanel.webview.postMessage({
            command: 'fileLoaded',
            data: { data, version: 'v?', file_path: filePath }
        });
    } else {
        console.log(`${LOG_PREFIX} No webview panel available`);
    }
}

export function deactivate(): void {
    console.log(`${LOG_PREFIX} Extension deactivated`);
    fileDataCache.clear();
}

export function updateTreeData(data: MatFileData): void {
    console.log(`${LOG_PREFIX} updateTreeData called with keys:`, Object.keys(data));
    setCurrentData(data);
    if (currentTreeDataProvider) {
        console.log(`${LOG_PREFIX} Setting data on tree provider`);
        currentTreeDataProvider.setData(data);
    } else {
        console.log(`${LOG_PREFIX} No tree data provider available`);
    }
}

export function clearTreeData(): void {
    if (currentTreeDataProvider) {
        currentTreeDataProvider.clear();
    }
    currentActiveFile = null;
}

export function updateCurrentWebviewPanel(panel: vscode.WebviewPanel | null): void {
    console.log(`${LOG_PREFIX} updateCurrentWebviewPanel called:`, panel ? 'panel set' : 'panel cleared');
    currentWebviewPanel = panel;
    setCurrentWebviewPanel(panel);
}
