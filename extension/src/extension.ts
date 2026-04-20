/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

import * as vscode from 'vscode';
import { MatFileEditorProvider } from './providers/CustomEditorProvider';
import { MatVariableTreeDataProvider, setCurrentData, setCurrentWebviewPanel, showVariable } from './providers/MatVariableTreeDataProvider';
import { PythonBridge, DependencyCheckResult } from './ipc/PythonBridge';
import { openFileCommand } from './commands/openFile';
import { exportCSVCommand, exportJSONCommand } from './commands/exportData';
import { installDepsCommand, testEnvironmentCommand } from './commands/walkthroughCommands';
import { MatFileData, ParserResult } from './types';

const LOG_PREFIX = '[MatrixSpy]';
const WELCOME_SHOWN_KEY = 'matrixspy.welcomeShown';

let currentTreeDataProvider: MatVariableTreeDataProvider | null = null;
let currentEditorProvider: MatFileEditorProvider | null = null;
const fileDataCache = new Map<string, MatFileData>();
let currentActiveFile: string | null = null;
let currentPythonBridge: PythonBridge | null = null;
let currentWebviewPanel: vscode.WebviewPanel | null = null;
let currentSetupPanel: vscode.WebviewPanel | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log(`${LOG_PREFIX} Extension is now active!`);

    currentPythonBridge = new PythonBridge(context);
    currentEditorProvider = new MatFileEditorProvider(context, currentPythonBridge);
    currentTreeDataProvider = new MatVariableTreeDataProvider(currentPythonBridge);

    registerEditorProvider(context);
    registerTreeDataProvider(context);
    registerCommands(context);
    registerEventHandlers(context);

    await checkAndShowWelcome(context);
}

async function checkAndShowWelcome(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration('matrixspy');
    const pythonPath = config.get<string>('pythonPath', 'python3');
    const depResult = await PythonBridge.checkDependencies(pythonPath);
    console.log(`${LOG_PREFIX} Dependency check result:`, depResult);
    const welcomeShown = context.globalState.get<boolean>(WELCOME_SHOWN_KEY, false);

    if (!welcomeShown) {
        await showSetupWizard(context, depResult, true);
        return;
    }

    if (!depResult.allDependenciesMet) {
        const action = await vscode.window.showWarningMessage(
            'MatrixSpy: Environment is not fully ready. Run setup now?',
            'Open Setup Wizard',
            'Test Environment',
            'Dismiss'
        );

        if (action === 'Open Setup Wizard') {
            await showSetupWizard(context, depResult, false);
        } else if (action === 'Test Environment') {
            const testResult = await testEnvironmentCommand();
            if (testResult.allDependenciesMet) {
                await context.globalState.update(WELCOME_SHOWN_KEY, true);
            }
        }
    }
}

async function showSetupWizard(
    context: vscode.ExtensionContext,
    depResult: DependencyCheckResult,
    isFirstLaunch: boolean
): Promise<void> {
    if (currentSetupPanel) {
        currentSetupPanel.reveal(vscode.ViewColumn.One);
        currentSetupPanel.webview.postMessage({
            command: 'status',
            payload: depResult
        });
        return;
    }

    currentSetupPanel = vscode.window.createWebviewPanel(
        'matrixspySetupWizard',
        'MatrixSpy Setup',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    currentSetupPanel.webview.html = getSetupWizardHtml(depResult, isFirstLaunch);

    currentSetupPanel.onDidDispose(() => {
        currentSetupPanel = null;
    });

    currentSetupPanel.webview.onDidReceiveMessage(async (message: { command?: string }) => {
        switch (message.command) {
            case 'installDeps':
                await installDepsCommand();
                break;
            case 'testEnvironment': {
                const result = await testEnvironmentCommand();
                currentSetupPanel?.webview.postMessage({ command: 'status', payload: result });
                if (result.allDependenciesMet) {
                    await context.globalState.update(WELCOME_SHOWN_KEY, true);
                }
                break;
            }
            case 'openSettings':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'matrixspy.pythonPath');
                break;
            case 'openWalkthrough': {
                const config = vscode.workspace.getConfiguration('matrixspy');
                const pythonPath = config.get<string>('pythonPath', 'python3');
                const freshDepResult = await PythonBridge.checkDependencies(pythonPath);
                await showWelcomePage(context, freshDepResult);
                break;
            }
            case 'markDone':
                await context.globalState.update(WELCOME_SHOWN_KEY, true);
                currentSetupPanel?.dispose();
                break;
            case 'close':
                currentSetupPanel?.dispose();
                break;
            default:
                break;
        }
    });
}

function getSetupWizardHtml(depResult: DependencyCheckResult, isFirstLaunch: boolean): string {
    const title = isFirstLaunch ? 'Welcome to MatrixSpy' : 'MatrixSpy Environment Setup';
    const intro = isFirstLaunch
        ? 'Complete one-time environment setup so MatrixSpy can parse MAT files correctly.'
        : 'Your environment is incomplete. Use the actions below to fix and verify dependencies.';
    const status = depResult.pythonFound
        ? (depResult.allDependenciesMet
            ? `Ready: ${depResult.pythonVersion ?? 'Python detected'} with all required packages.`
            : `Python detected (${depResult.pythonVersion ?? 'unknown version'}), missing packages: ${depResult.missingPackages.join(', ')}`)
        : 'Python not found. Please install Python 3.8+ or configure matrixspy.pythonPath.';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MatrixSpy Setup</title>
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 20px; max-width: 760px; margin: 0 auto; }
        h1 { margin-bottom: 8px; }
        .muted { color: var(--vscode-descriptionForeground); margin-bottom: 16px; }
        .panel { background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); border-radius: 6px; padding: 14px; margin-bottom: 16px; }
        .label { font-weight: 600; margin-bottom: 6px; }
        .status { line-height: 1.5; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
        button { border: 1px solid var(--vscode-button-border, transparent); background: var(--vscode-button-background); color: var(--vscode-button-foreground); padding: 8px 12px; border-radius: 4px; cursor: pointer; }
        button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="muted">${intro}</div>
    <div class="panel">
        <div class="label">Environment Status</div>
        <div id="status" class="status">${status}</div>
    </div>
    <div class="actions">
        <button id="install">Install Dependencies</button>
        <button id="test" class="secondary">Test Environment</button>
        <button id="settings" class="secondary">Open Python Settings</button>
        <button id="walkthrough" class="secondary">Open Welcome Guide</button>
        <button id="done" class="secondary">Mark As Done</button>
        <button id="close" class="secondary">Close</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const statusEl = document.getElementById('status');

        document.getElementById('install').addEventListener('click', () => vscode.postMessage({ command: 'installDeps' }));
        document.getElementById('test').addEventListener('click', () => vscode.postMessage({ command: 'testEnvironment' }));
        document.getElementById('settings').addEventListener('click', () => vscode.postMessage({ command: 'openSettings' }));
        document.getElementById('walkthrough').addEventListener('click', () => vscode.postMessage({ command: 'openWalkthrough' }));
        document.getElementById('done').addEventListener('click', () => vscode.postMessage({ command: 'markDone' }));
        document.getElementById('close').addEventListener('click', () => vscode.postMessage({ command: 'close' }));

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command !== 'status' || !message.payload) {
                return;
            }
            const dep = message.payload;
            if (!dep.pythonFound) {
                statusEl.textContent = 'Python not found. Please install Python 3.8+ or configure matrixspy.pythonPath.';
                return;
            }
            if (!dep.allDependenciesMet) {
                statusEl.textContent = 'Python detected (' + (dep.pythonVersion || 'unknown version') + '), missing packages: ' + dep.missingPackages.join(', ');
                return;
            }
            statusEl.textContent = 'Ready: ' + (dep.pythonVersion || 'Python detected') + ' with all required packages.';
        });
    </script>
</body>
</html>`;
}

async function showWelcomePage(context: vscode.ExtensionContext, depResult: DependencyCheckResult): Promise<void> {
    await vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        { category: 'maiwulanjiangmaiming.matrixspy#matrixspy.welcome' }
    );

    if (!depResult.pythonFound) {
        vscode.window.showWarningMessage(
            'MatrixSpy: Python not found. Please install Python 3.8+ and configure the pythonPath setting.',
            'Configure Settings',
            'Test Environment',
            'Dismiss'
        ).then(selection => {
            if (selection === 'Configure Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'matrixspy.pythonPath');
            } else if (selection === 'Test Environment') {
                vscode.commands.executeCommand('matrixspy.testEnvironment');
            }
        });
    } else if (!depResult.allDependenciesMet) {
        const missing = depResult.missingPackages.join(', ');
        const action = await vscode.window.showWarningMessage(
            `MatrixSpy: Missing Python packages: ${missing}. Install now?`,
            'Install Dependencies',
            'Test Environment',
            'Dismiss'
        );

        if (action === 'Install Dependencies') {
            await installDepsCommand();
        } else if (action === 'Test Environment') {
            await vscode.commands.executeCommand('matrixspy.testEnvironment');
        }
    } else {
        await context.globalState.update(WELCOME_SHOWN_KEY, true);
    }
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
        }),
        vscode.commands.registerCommand('matrixspy.installDeps', () => installDepsCommand()),
        vscode.commands.registerCommand('matrixspy.testEnvironment', async () => {
            const result = await testEnvironmentCommand();
            if (result.allDependenciesMet) {
                await context.globalState.update(WELCOME_SHOWN_KEY, true);
            }
        }),
        vscode.commands.registerCommand('matrixspy.showSetupWizard', async () => {
            const config = vscode.workspace.getConfiguration('matrixspy');
            const pythonPath = config.get<string>('pythonPath', 'python3');
            const depResult = await PythonBridge.checkDependencies(pythonPath);
            await showSetupWizard(context, depResult, false);
        }),
        vscode.commands.registerCommand('matrixspy.showWelcome', async () => {
            const config = vscode.workspace.getConfiguration('matrixspy');
            const pythonPath = config.get<string>('pythonPath', 'python3');
            const depResult = await PythonBridge.checkDependencies(pythonPath);
            await showWelcomePage(context, depResult);
        }),
        vscode.commands.registerCommand('matrixspy.resetWelcome', async () => {
            await context.globalState.update(WELCOME_SHOWN_KEY, false);
            vscode.window.showInformationMessage('MatrixSpy: Welcome page state reset. Restart VS Code to see the welcome page.');
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
    if (!currentPythonBridge) {
        return;
    }
    
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
