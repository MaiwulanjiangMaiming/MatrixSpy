import * as vscode from 'vscode';

export async function openFileCommand(): Promise<void> {
    const fileUris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Open MAT File',
        filters: {
            'MAT Files': ['mat'],
            'All Files': ['*']
        }
    });

    if (!fileUris || fileUris.length === 0) {
        return;
    }

    const fileUri = fileUris[0];

    try {
        await vscode.commands.executeCommand('vscode.openWith', fileUri, 'matrixspy.matFile');
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to open MAT file: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
