import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import * as nls from 'vscode-nls';
import { MatFileEditorProvider } from './providers/CustomEditorProvider';
import { MatVariableTreeDataProvider, setCurrentData, setCurrentWebviewPanel, showVariable } from './providers/MatVariableTreeDataProvider';
import { PythonBridge, DependencyCheckResult } from './ipc/PythonBridge';
import { openFileCommand } from './commands/openFile';
import { exportCommand } from './commands/exportData';
import { generateCodeCommand } from './commands/generateCode';
import { installDepsCommand, testEnvironmentCommand } from './commands/walkthroughCommands';
import { compareFilesCommand } from './commands/compareFiles';
import { MatFileData } from './types';
import { TelemetryReporter } from '@vscode/extension-telemetry';

const localize = nls.loadMessageBundle();

const TELEMETRY_KEY = 'matrixspy-telemetry';

const WELCOME_SHOWN_KEY = 'matrixspy.welcomeShown';
const RECENT_FILES_KEY = 'matrixspy.recentFiles';
const MAX_RECENT_FILES = 10;

let currentTreeDataProvider: MatVariableTreeDataProvider | null = null;
let currentEditorProvider: MatFileEditorProvider | null = null;
const fileDataCache = new Map<string, MatFileData>();
let currentPythonBridge: PythonBridge | null = null;
let currentWebviewPanel: vscode.WebviewPanel | null = null;
let currentSetupPanel: vscode.WebviewPanel | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let telemetryReporter: TelemetryReporter | null = null;

export function sendTelemetry(eventName: string, properties?: Record<string, string>): void {
    const config = vscode.workspace.getConfiguration('matrixspy');
    if (config.get('enableTelemetry', false) && telemetryReporter) {
        telemetryReporter.sendTelemetryEvent(eventName, properties);
    }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    telemetryReporter = new TelemetryReporter(TELEMETRY_KEY);
    context.subscriptions.push(telemetryReporter);

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

    // Fire-and-forget: the welcome / dependency check spawns a Python
    // process and can take a moment. Awaiting it would delay extension
    // activation (and thus command/view availability) until that check
    // completes. Commands and the sidebar are already registered above,
    // so we let the check run in the background.
    void checkAndShowWelcome(context);
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
            localize('envNotReady', 'MatrixSpy: Environment is not fully ready. Run setup now?'),
            localize('openSetupWizard', 'Open Setup Wizard'),
            localize('testEnvironment', 'Test Environment'),
            localize('dismiss', 'Dismiss')
        );

        if (action === localize('openSetupWizard', 'Open Setup Wizard')) {
            await showSetupWizard(context, depResult, false);
        } else if (action === localize('testEnvironment', 'Test Environment')) {
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
            case 'installDeps': {
                await installDepsCommand();
                // Auto-test the environment once the install terminal closes,
                // so the user doesn't have to manually click "Test Environment"
                // after pip finishes. The listener is one-shot and only fires
                // for terminals whose name matches the one created by
                // installDepsCommand(), so unrelated terminals are ignored.
                const autoTest = new Promise<void>(resolve => {
                    const disposable = vscode.window.onDidCloseTerminal(closedTerminal => {
                        if (closedTerminal.name === 'MatrixSpy - Install Dependencies') {
                            disposable.dispose();
                            resolve();
                        }
                    });
                });
                autoTest.then(async () => {
                    const result = await testEnvironmentCommand();
                    currentSetupPanel?.webview.postMessage({ command: 'status', payload: result });
                    if (result.allDependenciesMet) {
                        await context.globalState.update(WELCOME_SHOWN_KEY, true);
                    }
                });
                break;
            }
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
    const title = isFirstLaunch
        ? localize('setupWizardWelcomeTitle', 'Welcome to MatrixSpy')
        : localize('setupWizardSetupTitle', 'MatrixSpy Environment Setup');
    const intro = isFirstLaunch
        ? localize('setupWizardFirstLaunchIntro', 'Complete one-time environment setup so MatrixSpy can parse MAT files correctly.')
        : localize('setupWizardIncompleteIntro', 'Your environment is incomplete. Use the actions below to fix and verify dependencies.');
    const status = depResult.pythonFound
        ? (depResult.allDependenciesMet
            ? localize('setupWizardReady', 'Ready: {0} with all required packages.', depResult.pythonVersion ?? 'Python detected')
            : localize('setupWizardMissing', 'Python detected ({0}), missing packages: {1}', depResult.pythonVersion ?? 'unknown version', depResult.missingPackages.join(', ')))
        : localize('setupWizardPythonNotFound', 'Python not found. Please install Python 3.8+ or configure matrixspy.pythonPath.');

    // Per-webview nonce for CSP. Prevents injected <script>/<style> from
    // untrusted sources (e.g. malicious strings in package names) from
    // executing in the webview.
    const nonce = crypto.randomBytes(16).toString('base64');

    const envStatusLabel = localize('setupWizardEnvStatusLabel', 'Environment Status');
    const installLabel = localize('setupWizardInstall', 'Install Dependencies');
    const testLabel = localize('setupWizardTest', 'Test Environment');
    const settingsLabel = localize('setupWizardSettings', 'Open Python Settings');
    const walkthroughLabel = localize('setupWizardWalkthrough', 'Open Welcome Guide');
    const doneLabel = localize('setupWizardDone', 'Mark As Done');
    const closeLabel = localize('setupWizardClose', 'Close');
    // Strings used by the webview's <script> when status updates arrive.
    const jsPythonNotFound = localize('setupWizardJsPythonNotFound', 'Python not found. Please install Python 3.8+ or configure matrixspy.pythonPath.');
    const jsPythonDetected = localize('setupWizardJsPythonDetected', 'Python detected ({0})');
    const jsMissingSuffix = localize('setupWizardJsMissingSuffix', ', missing packages: {0}');
    const jsReady = localize('setupWizardJsReady', 'Ready: {0} with all required packages.');
    const jsUnknownVersion = localize('setupWizardJsUnknownVersion', 'unknown version');
    const jsPythonDetectedFallback = localize('setupWizardJsPythonDetectedFallback', 'Python detected');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>MatrixSpy Setup</title>
    <style nonce="${nonce}">
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
        <div class="label">${envStatusLabel}</div>
        <div id="status" class="status">${status}</div>
    </div>
    <div class="actions">
        <button id="install">${installLabel}</button>
        <button id="test" class="secondary">${testLabel}</button>
        <button id="settings" class="secondary">${settingsLabel}</button>
        <button id="walkthrough" class="secondary">${walkthroughLabel}</button>
        <button id="done" class="secondary">${doneLabel}</button>
        <button id="close" class="secondary">${closeLabel}</button>
    </div>
    <script nonce="${nonce}">
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
                statusEl.textContent = ${JSON.stringify(jsPythonNotFound)};
                return;
            }
            if (!dep.allDependenciesMet) {
                statusEl.textContent = ${JSON.stringify(jsPythonDetected)}.replace('{0}', dep.pythonVersion || ${JSON.stringify(jsUnknownVersion)})
                    + ${JSON.stringify(jsMissingSuffix)}.replace('{0}', dep.missingPackages.join(', '));
                return;
            }
            statusEl.textContent = ${JSON.stringify(jsReady)}.replace('{0}', dep.pythonVersion || ${JSON.stringify(jsPythonDetectedFallback)});
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
            localize('pythonNotFound', 'MatrixSpy: Python not found. Please install Python 3.8+ and configure the pythonPath setting.'),
            localize('configureSettings', 'Configure Settings'),
            localize('testEnvironment', 'Test Environment'),
            localize('dismiss', 'Dismiss')
        ).then(selection => {
            if (selection === localize('configureSettings', 'Configure Settings')) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'matrixspy.pythonPath');
            } else if (selection === localize('testEnvironment', 'Test Environment')) {
                vscode.commands.executeCommand('matrixspy.testEnvironment');
            }
        });
    } else if (!depResult.allDependenciesMet) {
        const missing = depResult.missingPackages.join(', ');
        const action = await vscode.window.showWarningMessage(
            localize('missingPackages', 'MatrixSpy: Missing Python packages: {0}. Install now?', missing),
            localize('installDeps', 'Install Dependencies'),
            localize('testEnvironment', 'Test Environment'),
            localize('dismiss', 'Dismiss')
        );

        if (action === localize('installDeps', 'Install Dependencies')) {
            await installDepsCommand();
        } else if (action === localize('testEnvironment', 'Test Environment')) {
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
        vscode.commands.registerCommand('matrixspy.export', () => exportCommand()),
        vscode.commands.registerCommand('matrixspy.generateCode', () => generateCodeCommand()),
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
                        vscode.window.showErrorMessage(localize('refreshFailed', 'Refresh failed: {0}', error instanceof Error ? error.message : String(error)));
                    }
                }
            } else {
                vscode.window.showInformationMessage(localize('noActiveFile', 'No active MAT file to refresh.'));
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
            vscode.window.showInformationMessage(localize('welcomeReset', 'MatrixSpy: Welcome page state reset. Restart VS Code to see the welcome page.'));
        }),
        vscode.commands.registerCommand('matrixspy.compareFiles', (uri?: vscode.Uri) => compareFilesCommand(uri)),
        vscode.commands.registerCommand('matrixspy.openRecent', async () => {
            const recent = context.globalState.get<string[]>(RECENT_FILES_KEY, []);
            if (recent.length === 0) {
                vscode.window.showInformationMessage(localize('noRecentFiles', 'No recent .mat files found.'));
                return;
            }
            const items = recent.map(f => ({
                label: path.basename(f),
                description: f,
                detail: f
            }));
            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: localize('selectRecentFile', 'Select a recent .mat file to open')
            });
            if (picked) {
                const uri = vscode.Uri.file(picked.detail);
                vscode.commands.executeCommand('vscode.openWith', uri, 'matrixspy.matFile');
            }
        })
    );
}

export async function addRecentFile(context: vscode.ExtensionContext, filePath: string): Promise<void> {
    const recent = context.globalState.get<string[]>(RECENT_FILES_KEY, []);
    const filtered = recent.filter(f => f !== filePath);
    filtered.unshift(filePath);
    if (filtered.length > MAX_RECENT_FILES) {
        filtered.length = MAX_RECENT_FILES;
    }
    await context.globalState.update(RECENT_FILES_KEY, filtered);
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
    // Default command opens the setup wizard. Once the environment is
    // verified ready, switch to opening a file picker so the status bar
    // becomes a quick-launch affordance instead of a nag.
    statusBarItem.command = 'matrixspy.showSetupWizard';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // After the first environment check completes, update the command so
    // clicking the status bar does the right thing based on readiness.
    void PythonBridge.checkDependencies(
        vscode.workspace.getConfiguration('matrixspy').get<string>('pythonPath', 'python3')
    ).then(depResult => {
        if (!statusBarItem) { return; }
        statusBarItem.command = depResult.allDependenciesMet
            ? 'matrixspy.openFile'
            : 'matrixspy.showSetupWizard';
    });
}

export function updateStatusBar(fileName: string | null, varCount: number, activeVar: string | null, varInfo: { shape?: number[]; dtype?: string; memory_mb?: number } | null): void {
    if (!statusBarItem) {return;}

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
        if (shapeStr) {text += ` [${shapeStr}`;}
        if (dtypeStr) {text += ` ${dtypeStr}`;}
        if (memStr) {text += ` | ${memStr}`;}
        if (shapeStr) {text += `]`;}
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

export function getPythonBridge(): PythonBridge | null {
    return currentPythonBridge;
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

/**
 * Clear the global active-panel pointer only if it currently points to the
 * given panel. This prevents a disposing panel from clobbering the pointer
 * when another panel has already become active in the meantime.
 */
export function clearCurrentWebviewPanelIfMatching(panel: vscode.WebviewPanel): void {
    if (currentWebviewPanel === panel) {
        currentWebviewPanel = null;
        setCurrentWebviewPanel(null);
    }
}

export function deactivate(): Promise<void> | undefined {
    fileDataCache.clear();
    if (telemetryReporter) {
        telemetryReporter.dispose();
        telemetryReporter = null;
    }
    if (currentPythonBridge) {
        return currentPythonBridge.dispose();
    }
    return undefined;
}
