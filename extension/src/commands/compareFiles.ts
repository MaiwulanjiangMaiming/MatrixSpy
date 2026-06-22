import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import * as nls from 'vscode-nls';
import { getPythonBridge } from '../extension';

const localize = nls.loadMessageBundle();

interface CompareResult {
    success: boolean;
    path1?: string;
    path2?: string;
    deleted?: string[];
    added?: string[];
    modified?: string[];
    unchanged?: string[];
    diff_details?: Record<string, DiffDetail>;
    error?: string;
}

interface DiffDetail {
    shape?: number[];
    shape1?: number[];
    shape2?: number[];
    dtype1?: string;
    dtype2?: string;
    diff_min?: number | null;
    diff_max?: number | null;
    diff_mean?: number | null;
    diff_std?: number | null;
    diff_abs_mean?: number | null;
    diff_encoded_data?: string | null;
    diff_shape?: number[];
    diff_dtype?: string;
    type1?: string;
    type2?: string;
    note?: string;
}

export async function compareFilesCommand(uri?: vscode.Uri) {
    const bridge = getPythonBridge();
    if (!bridge) {
        vscode.window.showErrorMessage(localize('pythonBridgeUnavailable', 'Python bridge not available. Please reload the window.'));
        return;
    }

    let file1Path: string;
    if (uri && uri.fsPath.endsWith('.mat')) {
        file1Path = uri.fsPath;
    } else {
        const activeFile = getActiveMatFilePath();
        if (activeFile) {
            file1Path = activeFile;
        } else {
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { 'MAT Files': ['mat'] },
                title: localize('selectFirstFile', 'Select first MAT file to compare')
            });
            if (!picked || picked.length === 0) {
                return;
            }
            file1Path = picked[0].fsPath;
        }
    }

    const file2Uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { 'MAT Files': ['mat'] },
        title: localize('selectSecondFile', 'Select second MAT file to compare')
    });

    if (!file2Uri || file2Uri.length === 0) {
        return;
    }

    const file2Path = file2Uri[0].fsPath;

    if (file1Path === file2Path) {
        vscode.window.showWarningMessage(localize('cannotCompareSelf', 'Cannot compare a file with itself. Please select a different file.'));
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('comparingFiles', 'MatrixSpy: Comparing MAT files...'),
        cancellable: false
    }, async () => {
        try {
            const result = await bridge.compareFiles(file1Path, file2Path) as CompareResult;

            if (!result.success) {
                vscode.window.showErrorMessage(localize('comparisonFailed', 'Comparison failed: {0}', result.error || 'Unknown error'));
                return;
            }

            showComparePanel(file1Path, file2Path, result);
        } catch (error) {
            vscode.window.showErrorMessage(localize('comparisonFailed', 'Comparison failed: {0}', error instanceof Error ? error.message : String(error)));
        }
    });
}

function getActiveMatFilePath(): string | null {
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (tab?.input instanceof vscode.TabInputCustom) {
        if (tab.input.viewType === 'matrixspy.matFile') {
            return tab.input.uri.fsPath;
        }
    }
    return null;
}

function showComparePanel(file1Path: string, file2Path: string, result: CompareResult) {
    const file1Name = path.basename(file1Path);
    const file2Name = path.basename(file2Path);

    const panel = vscode.window.createWebviewPanel(
        'matrixspyCompare',
        `Compare: ${file1Name} ↔ ${file2Name}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: []
        }
    );

    panel.webview.html = getCompareHtml(file1Name, file2Name, result);

    panel.webview.onDidReceiveMessage(async (message: { command: string; variable?: string }) => {
        if (message.command === 'showDiff' && message.variable) {
            const detail = result.diff_details?.[message.variable];
            if (detail && detail.diff_encoded_data) {
                panel.webview.postMessage({
                    command: 'renderDiff',
                    variable: message.variable,
                    detail
                });
            }
        }
    });
}

function getCompareHtml(file1Name: string, file2Name: string, result: CompareResult): string {
    const deleted = result.deleted || [];
    const added = result.added || [];
    const modified = result.modified || [];
    const unchanged = result.unchanged || [];

    // Per-webview nonce for CSP. Variable names from MAT files are rendered
    // in the DOM; even though they are HTML-escaped, a CSP nonce is defense-
    // in-depth against any future escape bug becoming an XSS.
    const nonce = crypto.randomBytes(16).toString('base64');

    let tableRows = '';

    for (const name of deleted) {
        tableRows += `<tr class="deleted"><td>${escapeHtml(name)}</td><td><span class="badge deleted">Deleted</span></td><td>Only in ${escapeHtml(file1Name)}</td><td>—</td></tr>`;
    }
    for (const name of added) {
        tableRows += `<tr class="added"><td>${escapeHtml(name)}</td><td><span class="badge added">Added</span></td><td>Only in ${escapeHtml(file2Name)}</td><td>—</td></tr>`;
    }
    for (const name of modified) {
        const detail = result.diff_details?.[name];
        let diffInfo = 'Modified';
        if (detail) {
            if (detail.note) {
                diffInfo = detail.note;
            } else if (detail.diff_min !== undefined) {
                diffInfo = `diff range: [${formatNum(detail.diff_min)}, ${formatNum(detail.diff_max)}], mean: ${formatNum(detail.diff_mean)}`;
            }
        }
        const hasDiffData = detail?.diff_encoded_data ? 'data-has-diff="true"' : '';
        tableRows += `<tr class="modified" data-variable="${escapeHtml(name)}" ${hasDiffData}><td>${escapeHtml(name)}</td><td><span class="badge modified">Modified</span></td><td>${escapeHtml(diffInfo)}</td><td>${detail?.diff_encoded_data ? '<button class="diff-btn">View Diff</button>' : '—'}</td></tr>`;
    }
    for (const name of unchanged) {
        tableRows += `<tr class="unchanged"><td>${escapeHtml(name)}</td><td><span class="badge unchanged">Unchanged</span></td><td>Identical</td><td>—</td></tr>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>MAT File Comparison</title>
    <style nonce="${nonce}">
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            padding: 16px;
            margin: 0;
        }
        h1 { font-size: 1.3em; margin-bottom: 4px; }
        .subtitle { color: var(--vscode-descriptionForeground); margin-bottom: 16px; }
        .summary {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .summary-card {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 6px;
            padding: 10px 16px;
            min-width: 100px;
            text-align: center;
        }
        .summary-card .count { font-size: 1.8em; font-weight: 700; }
        .summary-card .label { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
        .summary-card.added .count { color: #4ec9b0; }
        .summary-card.deleted .count { color: #f44747; }
        .summary-card.modified .count { color: #dcdcaa; }
        .summary-card.unchanged .count { color: var(--vscode-descriptionForeground); }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-editorWidget-border);
        }
        th {
            background: var(--vscode-editorWidget-background);
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        tr:hover { background: var(--vscode-list-hoverBackground); }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .badge.added { background: rgba(78, 201, 176, 0.2); color: #4ec9b0; }
        .badge.deleted { background: rgba(244, 71, 71, 0.2); color: #f44747; }
        .badge.modified { background: rgba(220, 221, 170, 0.2); color: #dcdcaa; }
        .badge.unchanged { background: rgba(128, 128, 128, 0.2); color: var(--vscode-descriptionForeground); }

        .diff-btn {
            border: 1px solid var(--vscode-button-border, transparent);
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 4px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.85em;
        }
        .diff-btn:hover { opacity: 0.9; }

        #diffPanel {
            display: none;
            margin-top: 16px;
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 6px;
            padding: 12px;
            background: var(--vscode-editorWidget-background);
        }
        #diffPanel h3 { margin-top: 0; }
        #diffCanvas {
            border: 1px solid var(--vscode-editorWidget-border);
            max-width: 100%;
        }
        .diff-stats {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin-top: 8px;
            font-size: 0.9em;
        }
        .diff-stats span { color: var(--vscode-descriptionForeground); }
        .colorbar-container {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
        }
        .colorbar {
            width: 200px;
            height: 16px;
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 2px;
        }
        .colorbar-labels {
            display: flex;
            justify-content: space-between;
            width: 200px;
            font-size: 0.75em;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h1>MAT File Comparison</h1>
    <div class="subtitle">${escapeHtml(file1Name)} ↔ ${escapeHtml(file2Name)}</div>

    <div class="summary">
        <div class="summary-card added"><div class="count">${added.length}</div><div class="label">Added</div></div>
        <div class="summary-card deleted"><div class="count">${deleted.length}</div><div class="label">Deleted</div></div>
        <div class="summary-card modified"><div class="count">${modified.length}</div><div class="label">Modified</div></div>
        <div class="summary-card unchanged"><div class="count">${unchanged.length}</div><div class="label">Unchanged</div></div>
    </div>

    <table>
        <thead>
            <tr><th>Variable</th><th>Status</th><th>Details</th><th>Action</th></tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>

    <div id="diffPanel">
        <h3 id="diffTitle">Diff: </h3>
        <canvas id="diffCanvas" width="400" height="300"></canvas>
        <div class="colorbar-container">
            <canvas id="colorbarCanvas" width="200" height="16"></canvas>
        </div>
        <div class="colorbar-labels">
            <span id="colorbarMin"></span>
            <span id="colorbarMid"></span>
            <span id="colorbarMax"></span>
        </div>
        <div class="diff-stats" id="diffStats"></div>
    </div>

    <script nonce="${nonce}">
const vscode = acquireVsCodeApi();

function buildLUT(points) {
    var lut = new Array(256);
    for (var i = 0; i < 256; i++) {
        var t = i / 255;
        var lo = points[0], hi = points[points.length - 1];
        for (var j = 0; j < points.length - 1; j++) {
            if (t >= points[j][0] && t <= points[j + 1][0]) {
                lo = points[j]; hi = points[j + 1]; break;
            }
        }
        var range = hi[0] - lo[0] || 1;
        var f = (t - lo[0]) / range;
        lut[i] = [
            Math.round(lo[1] + (hi[1] - lo[1]) * f),
            Math.round(lo[2] + (hi[2] - lo[2]) * f),
            Math.round(lo[3] + (hi[3] - lo[3]) * f)
        ];
    }
    return lut;
}

var RDBU_LUT = buildLUT([
    [0.0, 103, 0, 31], [0.07, 140, 20, 48], [0.13, 176, 44, 68],
    [0.2, 208, 72, 92], [0.27, 232, 104, 120], [0.33, 248, 140, 156],
    [0.4, 252, 180, 192], [0.47, 252, 216, 224], [0.53, 224, 236, 240],
    [0.6, 180, 224, 232], [0.67, 132, 200, 216], [0.73, 88, 172, 196],
    [0.8, 48, 140, 172], [0.87, 20, 104, 144], [0.93, 4, 68, 112],
    [1.0, 5, 48, 97]
]);

function rdbuColor(t) {
    return RDBU_LUT[Math.min(255, Math.max(0, Math.round(t * 255)))];
}

document.querySelectorAll('.diff-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var row = btn.closest('tr');
        var varName = row.getAttribute('data-variable');
        if (varName) {
            vscode.postMessage({ command: 'showDiff', variable: varName });
        }
    });
});

window.addEventListener('message', function(event) {
    var msg = event.data;
    if (msg.command === 'renderDiff' && msg.detail) {
        renderDiff(msg.variable, msg.detail);
    }
});

function renderDiff(variableName, detail) {
    var panel = document.getElementById('diffPanel');
    panel.style.display = 'block';
    document.getElementById('diffTitle').textContent = 'Diff: ' + variableName;

    if (!detail.diff_encoded_data) {
        panel.innerHTML = '<h3>Diff: ' + variableName + '</h3><p>No diff data available (array too large or shape mismatch).</p>';
        return;
    }

    var shape = detail.diff_shape || detail.shape || [];
    var rows = shape.length > 0 ? shape[0] : 0;
    var cols = shape.length > 1 ? shape[1] : 1;

    var raw = atob(detail.diff_encoded_data);
    var buf = new ArrayBuffer(raw.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < raw.length; i++) {
        view[i] = raw.charCodeAt(i);
    }
    var floatView = new Float32Array(buf);

    var diffMin = detail.diff_min != null ? detail.diff_min : 0;
    var diffMax = detail.diff_max != null ? detail.diff_max : 0;
    var absMax = Math.max(Math.abs(diffMin), Math.abs(diffMax)) || 1;

    var canvas = document.getElementById('diffCanvas');
    var cellSize = Math.max(2, Math.min(12, Math.floor(600 / Math.max(rows, cols))));
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    var ctx = canvas.getContext('2d');

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var val = floatView[r * cols + c];
            var norm = (val + absMax) / (2 * absMax);
            norm = Math.max(0, Math.min(1, norm));
            var rgb = rdbuColor(norm);
            ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
    }

    var colorbarCanvas = document.getElementById('colorbarCanvas');
    var cbCtx = colorbarCanvas.getContext('2d');
    for (var x = 0; x < 200; x++) {
        var t = x / 199;
        var rgb2 = rdbuColor(t);
        cbCtx.fillStyle = 'rgb(' + rgb2[0] + ',' + rgb2[1] + ',' + rgb2[2] + ')';
        cbCtx.fillRect(x, 0, 1, 16);
    }

    document.getElementById('colorbarMin').textContent = formatNum(-absMax);
    document.getElementById('colorbarMid').textContent = '0';
    document.getElementById('colorbarMax').textContent = formatNum(absMax);

    var statsHtml = '';
    statsHtml += '<span>Min: ' + formatNum(detail.diff_min) + '</span>';
    statsHtml += '<span>Max: ' + formatNum(detail.diff_max) + '</span>';
    statsHtml += '<span>Mean: ' + formatNum(detail.diff_mean) + '</span>';
    statsHtml += '<span>Std: ' + formatNum(detail.diff_std) + '</span>';
    statsHtml += '<span>Abs Mean: ' + formatNum(detail.diff_abs_mean) + '</span>';
    statsHtml += '<span>Shape: [' + shape.join('\\u00D7') + ']</span>';
    document.getElementById('diffStats').innerHTML = statsHtml;

    panel.scrollIntoView({ behavior: 'smooth' });
}

function formatNum(v) {
    if (v === null || v === undefined) return '—';
    if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(3);
    return Number(v.toFixed(6)).toString();
}

function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
    </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNum(v: number | null | undefined): string {
    if (v === null || v === undefined) { return '—'; }
    if (Math.abs(v) < 0.001 && v !== 0) { return v.toExponential(3); }
    return Number(v.toFixed(6)).toString();
}
