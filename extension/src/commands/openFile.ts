import * as vscode from 'vscode';

export async function openFileCommand() {
    const fileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
            'MAT Files': ['mat']
        }
    });

    if (fileUri && fileUri[0]) {
        await vscode.commands.executeCommand('vscode.openWith', fileUri[0], 'matrixspy.matFile');
    }
}
