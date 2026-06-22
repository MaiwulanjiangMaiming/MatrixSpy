import * as vscode from 'vscode';
import * as path from 'path';
import * as nls from 'vscode-nls';
import { DependencyCheckResult, PythonBridge } from '../ipc/PythonBridge';

const localize = nls.loadMessageBundle();

const IS_WINDOWS = process.platform === 'win32';

/**
 * Quote a single shell argument for safe interpolation into a terminal command.
 *
 * On POSIX shells we wrap in double quotes and escape the characters that are
 * still special inside double quotes: `"`, `\`, `$`, `` ` ``, and `!` (history
 * expansion in interactive bash). We also reject embedded newlines/carriage
 * returns, which would otherwise let a malicious path inject a second command.
 *
 * On Windows we wrap in double quotes and escape `"` as `""` (cmd.exe rule)
 * plus reject `&`, `|`, `<`, `>`, `^`, newlines — all of which are command
 * separators / metacharacters in cmd.exe.
 */
function quoteShellArg(arg: string): string {
    if (arg === undefined || arg === null) {
        return '""';
    }
    const str = String(arg);

    if (IS_WINDOWS) {
        // Reject characters that break out of double-quoted segments in cmd.exe.
        if (/[\r\n&|<>^]/.test(str)) {
            throw new Error(`Refusing to quote shell argument with embedded metacharacter: ${JSON.stringify(str)}`);
        }
        return '"' + str.replace(/"/g, '""') + '"';
    }

    // POSIX shell.
    if (/[\r\n]/.test(str)) {
        throw new Error(`Refusing to quote shell argument with embedded newline: ${JSON.stringify(str)}`);
    }
    return '"' + str.replace(/(["\\$`!])/g, '\\$1') + '"';
}

export async function installDepsCommand(): Promise<void> {
    const config = vscode.workspace.getConfiguration('matrixspy');
    const pythonPath = config.get<string>('pythonPath', 'python3');

    let quotedPython: string;
    try {
        quotedPython = quoteShellArg(pythonPath);
    } catch {
        vscode.window.showErrorMessage(
            localize('pythonPathUnsafe', 'MatrixSpy: The configured pythonPath contains unsafe characters and cannot be used in a terminal command. Please fix "matrixspy.pythonPath" in Settings.')
        );
        return;
    }

    const installOptions: vscode.QuickPickItem[] = [
        {
            label: localize('installUser', '$(package) Install with --user flag (Recommended)'),
            description: localize('installUserDesc', 'Install to user directory, safe for system Python'),
            detail: 'user'
        },
        {
            label: localize('installBreakSystem', '$(package) Install with --break-system-packages'),
            description: localize('installBreakSystemDesc', 'Force install to system Python (may cause issues)'),
            detail: 'break-system'
        },
        {
            label: localize('installVenv', '$(terminal) Create virtual environment'),
            description: localize('installVenvDesc', 'Create a venv and install dependencies there'),
            detail: 'venv'
        },
        {
            label: localize('installManual', '$(info) Show manual installation instructions'),
            description: localize('installManualDesc', 'Display installation commands in terminal'),
            detail: 'manual'
        }
    ];

    const selected = await vscode.window.showQuickPick(installOptions, {
        placeHolder: localize('chooseInstallMethod', 'Choose how to install Python dependencies')
    });

    if (!selected) {
        return;
    }

    const packages = 'scipy numpy h5py mat73';
    const terminal = vscode.window.createTerminal({
        name: 'MatrixSpy - Install Dependencies',
        env: {}
    });

    terminal.show();

    switch (selected.detail) {
        case 'user':
            terminal.sendText(`${quotedPython} -m pip install --user ${packages}`);
            vscode.window.showInformationMessage(
                localize('installingUser', 'Installing Python dependencies to user directory. Check terminal for progress.')
            );
            break;

        case 'break-system':
            terminal.sendText(`${quotedPython} -m pip install --break-system-packages ${packages}`);
            vscode.window.showWarningMessage(
                localize('installingBreakSystem', 'Installing with --break-system-packages. This may affect your system Python installation.')
            );
            break;

        case 'venv': {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const venvPath = workspaceFolders
                ? path.join(workspaceFolders[0].uri.fsPath, '.matrixspy-venv')
                : path.join(process.env.HOME || process.env.USERPROFILE || '~', '.matrixspy-venv');

            let quotedVenvPath: string;
            let activateCmd: string;
            try {
                quotedVenvPath = quoteShellArg(venvPath);
                activateCmd = IS_WINDOWS
                    ? quoteShellArg(path.join(venvPath, 'Scripts', 'activate'))
                    : `source ${quoteShellArg(path.join(venvPath, 'bin', 'activate'))}`;
            } catch {
                vscode.window.showErrorMessage(
                    localize('venvPathUnsafe', 'MatrixSpy: The computed virtual environment path contains unsafe characters. Please choose a different workspace or home directory.')
                );
                return;
            }
            const pythonInVenv = IS_WINDOWS
                ? path.join(venvPath, 'Scripts', 'python.exe')
                : path.join(venvPath, 'bin', 'python3');

            terminal.sendText(`${quotedPython} -m venv ${quotedVenvPath}`);
            terminal.sendText(activateCmd);
            terminal.sendText(`pip install ${packages}`);

            vscode.window.showInformationMessage(
                localize('creatingVenv', 'Creating virtual environment at {0}.', venvPath)
            );

            const updateSettings = await vscode.window.showInformationMessage(
                localize('updatePythonPath', 'Would you like to update MatrixSpy settings to use this virtual environment?'),
                localize('yes', 'Yes'),
                localize('no', 'No')
            );

            if (updateSettings === localize('yes', 'Yes')) {
                await config.update('pythonPath', pythonInVenv, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(
                    localize('pythonPathUpdated', 'Python path updated to: {0}', pythonInVenv)
                );
            }
            break;
        }

        case 'manual':
            terminal.sendText('echo "MatrixSpy Python Dependencies Installation"');
            terminal.sendText('echo "============================================="');
            terminal.sendText(`echo "  ${quotedPython} -m pip install --user ${packages}"`);
            terminal.sendText(`echo "  ${quotedPython} -m pip install --break-system-packages ${packages}"`);
            terminal.sendText('echo "  python3 -m venv ~/.matrixspy-venv"');
            if (IS_WINDOWS) {
                terminal.sendText('echo "  ~/.matrixspy-venv/Scripts/activate"');
            } else {
                terminal.sendText('echo "  source ~/.matrixspy-venv/bin/activate"');
            }
            terminal.sendText(`echo "  pip install ${packages}"`);
            break;
    }
}

export async function testEnvironmentCommand(): Promise<DependencyCheckResult> {
    const config = vscode.workspace.getConfiguration('matrixspy');
    const pythonPath = config.get<string>('pythonPath', 'python3');
    const depResult = await PythonBridge.checkDependencies(pythonPath);

    if (!depResult.pythonFound) {
        const action = await vscode.window.showErrorMessage(
            localize('pythonNotFoundAtPath', 'MatrixSpy: Python not found at "{0}". Configure pythonPath or install Python 3.8+ first.', pythonPath),
            localize('configureSettings', 'Configure Settings'),
            localize('installGuide', 'Install Guide')
        );

        if (action === localize('configureSettings', 'Configure Settings')) {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'matrixspy.pythonPath');
        } else if (action === localize('installGuide', 'Install Guide')) {
            await vscode.commands.executeCommand('matrixspy.showWelcome');
        }
        return depResult;
    }

    if (!depResult.allDependenciesMet) {
        const missing = depResult.missingPackages.join(', ');
        const action = await vscode.window.showWarningMessage(
            localize('missingPackagesDetected', 'MatrixSpy: Python detected ({0}), but missing packages: {1}.', depResult.pythonVersion ?? 'unknown version', missing),
            localize('installDeps', 'Install Dependencies'),
            localize('openGuide', 'Open Guide')
        );

        if (action === localize('installDeps', 'Install Dependencies')) {
            await installDepsCommand();
        } else if (action === localize('openGuide', 'Open Guide')) {
            await vscode.commands.executeCommand('matrixspy.showWelcome');
        }
        return depResult;
    }

    await vscode.window.showInformationMessage(
        localize('environmentReady', 'MatrixSpy environment is ready. {0} with all required packages.', depResult.pythonVersion ?? 'Python detected')
    );

    return depResult;
}
