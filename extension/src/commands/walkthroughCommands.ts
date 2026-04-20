import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyCheckResult, PythonBridge } from '../ipc/PythonBridge';

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
            
        case 'venv':
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const venvPath = workspaceFolders 
                ? path.join(workspaceFolders[0].uri.fsPath, '.matrixspy-venv')
                : path.join(process.env.HOME || '~', '.matrixspy-venv');
            
            terminal.sendText(`${pythonPath} -m venv ${venvPath}`);
            terminal.sendText(`source ${venvPath}/bin/activate`);
            terminal.sendText(`pip install ${packages}`);
            
            vscode.window.showInformationMessage(
                `Creating virtual environment at ${venvPath}. Activate it with: source ${venvPath}/bin/activate`
            );
            
            const updateSettings = await vscode.window.showInformationMessage(
                'Would you like to update MatrixSpy settings to use this virtual environment?',
                'Yes',
                'No'
            );
            
            if (updateSettings === 'Yes') {
                const pythonInVenv = path.join(venvPath, 'bin', 'python3');
                await config.update('pythonPath', pythonInVenv, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(
                    `Python path updated to: ${pythonInVenv}`
                );
            }
            break;
            
        case 'manual':
            terminal.sendText('echo "MatrixSpy Python Dependencies Installation"');
            terminal.sendText('echo "============================================="');
            terminal.sendText('echo ""');
            terminal.sendText('echo "Option 1: Install to user directory (Recommended)"');
            terminal.sendText(`echo "  ${pythonPath} -m pip install --user ${packages}"`);
            terminal.sendText('echo ""');
            terminal.sendText('echo "Option 2: Force install to system Python"');
            terminal.sendText(`echo "  ${pythonPath} -m pip install --break-system-packages ${packages}"`);
            terminal.sendText('echo ""');
            terminal.sendText('echo "Option 3: Use virtual environment"');
            terminal.sendText('echo "  python3 -m venv ~/.matrixspy-venv"');
            terminal.sendText('echo "  source ~/.matrixspy-venv/bin/activate"');
            terminal.sendText(`echo "  pip install ${packages}"`);
            terminal.sendText('echo ""');
            terminal.sendText('echo "After installation, verify with:"');
            terminal.sendText(`echo "  ${pythonPath} -c 'import scipy, numpy, h5py, mat73; print("All dependencies installed!")'`);
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

export async function openSampleCommand(context: vscode.ExtensionContext): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    const sampleOptions: vscode.QuickPickItem[] = [
        {
            label: '$(file) shepp_logan_3d.mat',
            description: '3D MRI phantom data (v7.3)',
            detail: 'test-files/v7.3/shepp_logan_3d.mat'
        },
        {
            label: '$(file) shepp_logan_2d.mat',
            description: '2D MRI phantom data (v7.3)',
            detail: 'test-files/v7.3/shepp_logan_2d.mat'
        },
        {
            label: '$(file) basic_v73.mat',
            description: 'Basic test file (v7.3)',
            detail: 'test-files/v7.3/basic_v73.mat'
        },
        {
            label: '$(file) basic_v7.mat',
            description: 'Basic test file (v7)',
            detail: 'test-files/v7/basic_v7.mat'
        },
        {
            label: '$(file) basic_v5.mat',
            description: 'Basic test file (v5)',
            detail: 'test-files/v5/basic_v5.mat'
        },
        {
            label: '$(folder) Browse test-files...',
            description: 'Open the test-files folder',
            detail: 'test-files'
        }
    ];
    
    const selected = await vscode.window.showQuickPick(sampleOptions, {
        placeHolder: 'Select a sample MAT file to open'
    });
    
    if (!selected) {
        return;
    }
    
    let samplePath: string | undefined;
    
    if (selected.detail === 'test-files') {
        const testFilesUri = await findTestFilesFolder(context);
        if (testFilesUri) {
            vscode.commands.executeCommand('revealFileInOS', testFilesUri);
        }
        return;
    }
    
    samplePath = selected.detail;
    
    if (!samplePath) {
        return;
    }
    
    if (workspaceFolders && workspaceFolders.length > 0) {
        const fullPath = path.join(workspaceFolders[0].uri.fsPath, samplePath);
        
        if (fs.existsSync(fullPath)) {
            const uri = vscode.Uri.file(fullPath);
            await vscode.commands.executeCommand('vscode.openWith', uri, 'matrixspy.matFile');
            return;
        }
    }
    
    const testFilesUri = await findTestFilesFolder(context);
    if (testFilesUri && samplePath) {
        const fullPath = path.join(testFilesUri.fsPath, samplePath.replace('test-files/', ''));
        
        if (fs.existsSync(fullPath)) {
            const uri = vscode.Uri.file(fullPath);
            await vscode.commands.executeCommand('vscode.openWith', uri, 'matrixspy.matFile');
            return;
        }
    }
    
    vscode.window.showInformationMessage(
        'Sample file not found. Please open a workspace containing the MatrixSpy repository, or open any .mat file manually.'
    );
}

async function findTestFilesFolder(context: vscode.ExtensionContext): Promise<vscode.Uri | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const testFilesPath = path.join(folder.uri.fsPath, 'test-files');
            if (fs.existsSync(testFilesPath)) {
                return vscode.Uri.file(testFilesPath);
            }
        }
    }
    
    return undefined;
}
