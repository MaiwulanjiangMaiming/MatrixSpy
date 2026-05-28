import * as vscode from 'vscode';
import { MatFileEditorProvider } from './providers/CustomEditorProvider';
import { MatVariableTreeDataProvider, setCurrentData, setCurrentWebviewPanel, showVariable } from './providers/MatVariableTreeDataProvider';
import { PythonBridge, DependencyCheckResult } from './ipc/PythonBridge';
import { openFileCommand } from './commands/openFile';
import { exportCSVCommand, exportJSONCommand, exportNPYCommand, exportPNGCommand } from './commands/exportData';
import { installDepsCommand, testEnvironmentCommand } from './commands/walkthroughCommands';
import { MatFileData } from './types';

const WELCOME_SHOWN_KEY = 'matrixspy.welcomeShown';

let currentTreeDataProvider: MatVariableTreeDataProvider | null = null;
let currentEditorProvider: MatFileEditorProvider | null = null;
const fileDataCache = new Map<string, MatFileData>();
let currentPythonBridge: PythonBridge | null = null;
let currentWebviewPanel: vscode.WebviewPanel | null = null;
let currentSetupPanel: vscode.WebviewPanel | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    currentPythonBridge = new PythonBridge(context);
    currentEditorProvider = new MatFileEditorProvider(context, currentPythonBridge);
    currentTreeDataProvider = new MatVariableTreeDataProvider(currentPythonBridge);

    context.subscriptions.push(currentPythonBridge);
    context.subscriptions.push(currentEditorProvider);

    registerEditorProvider(context);
    registerTreeDataProvider(context);
    registerCommands(context);
    registerEventHandlers(context);
    registerStatusBar(context);

    await checkAndShowWelcome(context);
}

async function checkAndShowWelcome(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration('matrixspy');
    const pythonPath = config.get<string>('pythonPath', 'python3');
    const depResult = await PythonBridge.checkDependencies(pythonPath);
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
        { enableScripts: true }
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
            if (message.command !== 'status' || !message.payload) return;
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
        vscode.commands.registerCommand('matrixspy.exportCSV', () => exportCSVCommand()),
        vscode.commands.registerCommand('matrixspy.exportJSON', () => exportJSONCommand()),
        vscode.commands.registerCommand('matrixspy.exportNPY', () => exportNPYCommand()),
        vscode.commands.registerCommand('matrixspy.exportPNG', () => exportPNGCommand()),
        vscode.commands.registerCommand('matrixspy.refreshVariables', async () => {
            const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
            if (tab?.input instanceof vscode.TabInputCustom && tab.input.viewType === 'matrixspy.matFile') {
                const filePath = tab.input.uri.fsPath;
                fileDataCache.delete(filePath);
                if (currentPythonBridge) {
                    try {
                        const result = await currentPythonBridge.parseFile(filePath);
                        if (result.success && result.data) {
                            cacheFileData(filePath, result.data);
                            updateTreeData(result.data);
                            if (currentWebviewPanel) {
                                currentWebviewPanel.webview.postMessage({
                                    command: 'fileLoaded',
                                    data: result
                                });
                            }
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(`Refresh failed: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
            } else {
                vscode.window.showInformationMessage('No active MAT file to refresh.');
            }
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
        vscode.window.tabGroups.onDidChangeTabs((e) => {
            for (const closed of e.closed) {
                if (closed.input instanceof vscode.TabInputCustom && closed.input.viewType === 'matrixspy.matFile') {
                    fileDataCache.delete(closed.input.uri.fsPath);
                }
            }
        })
    );
}

function registerStatusBar(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(symbol-array) MatrixSpy';
    statusBarItem.tooltip = 'MatrixSpy: No active MAT file';
    statusBarItem.command = 'matrixspy.showSetupWizard';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

export function updateStatusBar(fileName: string | null, varCount: number, activeVar: string | null, varInfo: { shape?: number[]; dtype?: string; memory_mb?: number } | null): void {
    if (!statusBarItem) return;

    if (!fileName) {
        statusBarItem.text = '$(symbol-array) MatrixSpy';
        statusBarItem.tooltip = 'MatrixSpy: No active MAT file';
        return;
    }

    let text = `$(symbol-array) ${fileName}`;
    if (varCount > 0) {
        text += ` | ${varCount} vars`;
    }
    if (activeVar && varInfo) {
        const shapeStr = varInfo.shape ? varInfo.shape.join('\u00D7') : '';
        const dtypeStr = varInfo.dtype || '';
        const memStr = varInfo.memory_mb ? `${varInfo.memory_mb.toFixed(1)} MB` : '';
        text += ` | ${activeVar}`;
        if (shapeStr) text += ` [${shapeStr}`;
        if (dtypeStr) text += ` ${dtypeStr}`;
        if (memStr) text += ` | ${memStr}`;
        if (shapeStr) text += `]`;
    }

    statusBarItem.text = text;
    statusBarItem.tooltip = `MatrixSpy: ${fileName}\nVariables: ${varCount}\n${activeVar ? 'Active: ' + activeVar : ''}`;
}

export function cacheFileData(filePath: string, data?: MatFileData): MatFileData | undefined {
    if (data !== undefined) {
        fileDataCache.set(filePath, data);
    }
    return fileDataCache.get(filePath);
}

export function getFileDataCache(): Map<string, MatFileData> {
    return fileDataCache;
}

export function updateTreeData(data: MatFileData): void {
    setCurrentData(data);
    if (currentTreeDataProvider) {
        currentTreeDataProvider.setData(data);
    }
}

export function clearTreeData(): void {
    if (currentTreeDataProvider) {
        currentTreeDataProvider.clear();
    }
}

export function updateCurrentWebviewPanel(panel: vscode.WebviewPanel | null): void {
    currentWebviewPanel = panel;
    setCurrentWebviewPanel(panel);
}

export function deactivate(): Thenable<void> | undefined {
    fileDataCache.clear();
    if (currentPythonBridge) {
        return currentPythonBridge.dispose();
    }
    return undefined;
}
