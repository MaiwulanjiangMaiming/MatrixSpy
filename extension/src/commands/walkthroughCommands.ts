import * as vscode from 'vscode';
import * as path from 'path';
import { DependencyCheckResult, PythonBridge } from '../ipc/PythonBridge';

const IS_WINDOWS = process.platform === 'win32';

export async function installDepsCommand(): Promise<void> {
    const config = vscode.workspace.getConfiguration('matrixspy');
    const pythonPath = config.get<string>('pythonPath', 'python3');

    const installOptions: vscode.QuickPickItem[] = [
        {
            label: '$(package) Install with --user flag (Recommended)',
            description: 'Install to user directory, safe for system Python',
            detail: 'user'
        },
        {
            label: '$(package) Install with --break-system-packages',
            description: 'Force install to system Python (may cause issues)',
            detail: 'break-system'
        },
        {
            label: '$(terminal) Create virtual environment',
            description: 'Create a venv and install dependencies there',
            detail: 'venv'
        },
        {
            label: '$(info) Show manual installation instructions',
            description: 'Display installation commands in terminal',
            detail: 'manual'
        }
    ];

    const selected = await vscode.window.showQuickPick(installOptions, {
        placeHolder: 'Choose how to install Python dependencies'
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
            terminal.sendText(`${pythonPath} -m pip install --user ${packages}`);
            vscode.window.showInformationMessage(
                'Installing Python dependencies to user directory. Check terminal for progress.'
            );
            break;

        case 'break-system':
            terminal.sendText(`${pythonPath} -m pip install --break-system-packages ${packages}`);
            vscode.window.showWarningMessage(
                'Installing with --break-system-packages. This may affect your system Python installation.'
            );
            break;

        case 'venv': {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const venvPath = workspaceFolders
                ? path.join(workspaceFolders[0].uri.fsPath, '.matrixspy-venv')
                : path.join(process.env.HOME || process.env.USERPROFILE || '~', '.matrixspy-venv');

            const activateCmd = IS_WINDOWS
                ? `${path.join(venvPath, 'Scripts', 'activate')}`
                : `source ${path.join(venvPath, 'bin', 'activate')}`;
            const pythonInVenv = IS_WINDOWS
                ? path.join(venvPath, 'Scripts', 'python.exe')
                : path.join(venvPath, 'bin', 'python3');

            terminal.sendText(`${pythonPath} -m venv ${venvPath}`);
            terminal.sendText(activateCmd);
            terminal.sendText(`pip install ${packages}`);

            vscode.window.showInformationMessage(
                `Creating virtual environment at ${venvPath}.`
            );

            const updateSettings = await vscode.window.showInformationMessage(
                'Would you like to update MatrixSpy settings to use this virtual environment?',
                'Yes',
                'No'
            );

            if (updateSettings === 'Yes') {
                await config.update('pythonPath', pythonInVenv, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(
                    `Python path updated to: ${pythonInVenv}`
                );
            }
            break;
        }

        case 'manual':
            terminal.sendText('echo "MatrixSpy Python Dependencies Installation"');
            terminal.sendText('echo "============================================="');
            terminal.sendText(`echo "  ${pythonPath} -m pip install --user ${packages}"`);
            terminal.sendText(`echo "  ${pythonPath} -m pip install --break-system-packages ${packages}"`);
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
            `MatrixSpy: Python not found at "${pythonPath}". Configure pythonPath or install Python 3.8+ first.`,
            'Configure Settings',
            'Install Guide'
        );

        if (action === 'Configure Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'matrixspy.pythonPath');
        } else if (action === 'Install Guide') {
            await vscode.commands.executeCommand('matrixspy.showWelcome');
        }
        return depResult;
    }

    if (!depResult.allDependenciesMet) {
        const missing = depResult.missingPackages.join(', ');
        const action = await vscode.window.showWarningMessage(
            `MatrixSpy: Python detected (${depResult.pythonVersion ?? 'unknown version'}), but missing packages: ${missing}.`,
            'Install Dependencies',
            'Open Guide'
        );

        if (action === 'Install Dependencies') {
            await installDepsCommand();
        } else if (action === 'Open Guide') {
            await vscode.commands.executeCommand('matrixspy.showWelcome');
        }
        return depResult;
    }

    await vscode.window.showInformationMessage(
        `MatrixSpy environment is ready. ${depResult.pythonVersion ?? 'Python detected'} with all required packages.`
    );

    return depResult;
}
