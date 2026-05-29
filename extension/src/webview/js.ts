export function getJs(version: string): string {
    return `
function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const VERSION = '${version}';
const vscode = acquireVsCodeApi();
const mainContent = document.getElementById('mainContent');
const fileInfo = document.getElementById('fileInfo');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const overlay = document.getElementById('overlay');
const githubLink = document.getElementById('githubLink');
const sidebar = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebarContent');
const sidebarToggle = document.getElementById('sidebarToggle');
const headerToggle = document.getElementById('headerToggle');

const state = {
    currentVariableData: null,
    fullVariableData: null,
    currentDisplayMode: localStorage.getItem('matViewerDisplayMode') || 'image',
    currentViewMode: localStorage.getItem('matViewerViewMode') || 'magnitude',
    currentAxis: parseInt(localStorage.getItem('matViewerAxis') || '2'),
    currentSlice: parseInt(localStorage.getItem('matViewerSlice') || '0'),
    currentShowCount1D: parseInt(localStorage.getItem('matViewerShowCount1D') || '50'),
    currentShowRows2D: parseInt(localStorage.getItem('matViewerShowRows2D') || '50'),
    currentShowCols2D: parseInt(localStorage.getItem('matViewerShowCols2D') || '20'),
    currentFileData: null,
    currentActiveVariable: null,
    sidebarCollapsed: localStorage.getItem('matViewerSidebarCollapsed') === 'true',
    currentFilePath: null,
    currentLoadedSliceData: null,
    currentColormap: localStorage.getItem('matViewerColormap') || 'grayscale',
    expandedPaths: {},
    dirty: false,
    canvasScale: null,
    windowLevel: 0.5,
    windowWidth: 1.0
};

function buildLUT(keyPoints) {
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let lower = keyPoints[0], upper = keyPoints[keyPoints.length - 1];
        for (let j = 0; j < keyPoints.length - 1; j++) {
            if (t >= keyPoints[j][0] && t <= keyPoints[j + 1][0]) {
                lower = keyPoints[j];
                upper = keyPoints[j + 1];
                break;
            }
        }
        const range = upper[0] - lower[0] || 1;
        const f = (t - lower[0]) / range;
        lut[i] = [
            Math.round(lower[1] + (upper[1] - lower[1]) * f),
            Math.round(lower[2] + (upper[2] - lower[2]) * f),
            Math.round(lower[3] + (upper[3] - lower[3]) * f)
        ];
    }
    return lut;
}

var COLORMAPS = {
    grayscale: function(t) {
        var v = Math.round(t * 255);
        return [v, v, v];
    },
    viridis: (function() {
        var lut = buildLUT([
            [0.0, 68, 1, 84], [0.07, 72, 20, 103], [0.13, 71, 33, 115],
            [0.2, 65, 53, 130], [0.27, 59, 82, 139], [0.33, 52, 96, 141],
            [0.4, 44, 113, 142], [0.47, 37, 130, 142], [0.53, 33, 145, 140],
            [0.6, 35, 158, 134], [0.67, 52, 179, 123], [0.73, 78, 195, 108],
            [0.8, 114, 208, 88], [0.87, 155, 217, 64], [0.93, 200, 225, 47],
            [1.0, 253, 231, 37]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })(),
    inferno: (function() {
        var lut = buildLUT([
            [0.0, 0, 0, 4], [0.07, 10, 5, 30], [0.13, 25, 10, 60],
            [0.2, 49, 18, 84], [0.27, 74, 12, 107], [0.33, 100, 20, 115],
            [0.4, 130, 34, 110], [0.47, 159, 50, 96], [0.53, 186, 67, 79],
            [0.6, 210, 85, 60], [0.67, 230, 108, 42], [0.73, 245, 133, 24],
            [0.8, 250, 162, 17], [0.87, 248, 192, 30], [0.93, 245, 225, 70],
            [1.0, 252, 255, 164]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })(),
    plasma: (function() {
        var lut = buildLUT([
            [0.0, 13, 8, 135], [0.07, 34, 4, 148], [0.13, 60, 3, 158],
            [0.2, 88, 12, 162], [0.27, 116, 25, 160], [0.33, 142, 38, 152],
            [0.4, 166, 52, 141], [0.47, 188, 66, 126], [0.53, 208, 82, 108],
            [0.6, 225, 100, 88], [0.67, 238, 122, 70], [0.73, 247, 147, 54],
            [0.8, 251, 174, 42], [0.87, 250, 204, 35], [0.93, 244, 230, 32],
            [1.0, 240, 249, 33]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })(),
    hot: (function() {
        var lut = buildLUT([
            [0.0, 0, 0, 0], [0.07, 32, 0, 0], [0.13, 64, 0, 0],
            [0.2, 96, 0, 0], [0.27, 128, 0, 0], [0.33, 160, 0, 0],
            [0.4, 192, 0, 0], [0.47, 224, 0, 0], [0.53, 255, 0, 0],
            [0.6, 255, 32, 0], [0.67, 255, 64, 0], [0.73, 255, 96, 0],
            [0.8, 255, 128, 0], [0.87, 255, 160, 0], [0.93, 255, 192, 0],
            [1.0, 255, 255, 255]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })(),
    jet: (function() {
        var lut = buildLUT([
            [0.0, 0, 0, 128], [0.07, 0, 0, 255], [0.13, 0, 64, 255],
            [0.2, 0, 128, 255], [0.27, 0, 192, 255], [0.33, 0, 255, 255],
            [0.4, 64, 255, 192], [0.47, 128, 255, 128], [0.53, 192, 255, 64],
            [0.6, 255, 255, 0], [0.67, 255, 192, 0], [0.73, 255, 128, 0],
            [0.8, 255, 64, 0], [0.87, 255, 0, 0], [0.93, 192, 0, 0],
            [1.0, 128, 0, 0]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })(),
    turbo: (function() {
        var lut = buildLUT([
            [0.0, 48, 18, 59], [0.07, 64, 37, 105], [0.13, 80, 60, 140],
            [0.2, 96, 85, 168], [0.27, 112, 110, 190], [0.33, 128, 135, 206],
            [0.4, 148, 160, 216], [0.47, 172, 185, 220], [0.53, 196, 208, 216],
            [0.6, 220, 228, 200], [0.67, 232, 236, 164], [0.73, 236, 228, 116],
            [0.8, 232, 208, 72], [0.87, 220, 176, 40], [0.93, 200, 136, 20],
            [1.0, 144, 78, 20]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })(),
    coolwarm: (function() {
        var lut = buildLUT([
            [0.0, 59, 76, 192], [0.07, 80, 100, 200], [0.13, 100, 124, 208],
            [0.2, 120, 148, 216], [0.27, 140, 172, 224], [0.33, 160, 196, 232],
            [0.4, 180, 216, 236], [0.47, 200, 228, 236], [0.53, 236, 228, 216],
            [0.6, 236, 208, 180], [0.67, 232, 184, 140], [0.73, 224, 156, 100],
            [0.8, 216, 128, 64], [0.87, 208, 100, 32], [0.93, 200, 72, 12],
            [1.0, 180, 4, 38]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })(),
    rdbu: (function() {
        var lut = buildLUT([
            [0.0, 103, 0, 31], [0.07, 140, 20, 48], [0.13, 176, 44, 68],
            [0.2, 208, 72, 92], [0.27, 232, 104, 120], [0.33, 248, 140, 156],
            [0.4, 252, 180, 192], [0.47, 252, 216, 224], [0.53, 224, 236, 240],
            [0.6, 180, 224, 232], [0.67, 132, 200, 216], [0.73, 88, 172, 196],
            [0.8, 48, 140, 172], [0.87, 20, 104, 144], [0.93, 4, 68, 112],
            [1.0, 5, 48, 97]
        ]);
        return function(t) { return lut[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
    })()
};

var canvasRenderScheduled = false;
var pendingCanvasData = null;

function scheduleCanvasRender(data) {
    state.dirty = true;
    pendingCanvasData = data;
    if (!canvasRenderScheduled) {
        canvasRenderScheduled = true;
        requestAnimationFrame(function() {
            canvasRenderScheduled = false;
            if (state.dirty && pendingCanvasData) {
                renderImageToCanvas(pendingCanvasData);
            }
        });
    }
}

function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    if (state.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        headerToggle.classList.add('visible');
    } else {
        sidebar.classList.remove('collapsed');
        headerToggle.classList.remove('visible');
    }
    localStorage.setItem('matViewerSidebarCollapsed', String(state.sidebarCollapsed));
}

function getVariableIcon(value) {
    if (typeof value === 'number') return '\\u{1F522}';
    if (typeof value === 'string') return '\\u{1F4DD}';
    if (value && value._type === 'complex') return '\\u{1F500}';
    if (value && value._type === 'ndarray') {
        if (value.shape.length === 1) return '\\u{1F4C8}';
        if (value.shape.length === 2) return '\\u{1F4CA}';
        if (value.shape.length === 3) return '\\u{1F3B2}';
        return '\\u{1F4E6}';
    }
    if (typeof value === 'object') return '\\u{1F4C1}';
    return '\\u{2753}';
}

function renderSidebar(data, filterText) {
    if (!data || typeof data !== 'object') {
        sidebarContent.innerHTML = '<div class="sidebar-empty">No variables</div>';
        return;
    }

    state.currentFileData = data;
    var varNames = Object.keys(data).sort();

    var filter = filterText ? filterText.toLowerCase().trim() : '';
    var filterType = '';
    if (filter.startsWith('type:')) {
        filterType = filter.substring(5).trim();
        filter = '';
    }

    var html = '';
    var matchCount = 0;
    varNames.forEach(function(name) {
        var value = data[name];
        var typeStr = formatType(value).toLowerCase();
        var nameMatch = !filter || name.toLowerCase().indexOf(filter) !== -1;
        var typeMatch = !filterType || typeStr.indexOf(filterType) !== -1;

        if (nameMatch && typeMatch) {
            html += renderTreeItem(name, value, name, 0, filter);
            matchCount++;
        }
    });

    if (matchCount === 0) {
        html = '<div class="sidebar-empty">No matching variables</div>';
    }

    sidebarContent.innerHTML = html;

    attachTreeEventListeners();
}

function renderTreeItem(name, value, path, depth, highlightText) {
    var type = formatType(value);
    var icon = getVariableIcon(value);
    var isActive = state.currentActiveVariable === path;
    var isStruct = value && typeof value === 'object' && value._type !== 'ndarray' && value._type !== 'complex';
    var isExpanded = state.expandedPaths[path];

    var hasChildren = isStruct && Object.keys(value).some(function(k) { return k !== '_type'; });
    var childKeys = hasChildren ? Object.keys(value).filter(function(k) { return k !== '_type'; }).sort() : [];

    var displayName = escapeHtml(name);
    if (highlightText) {
        var idx = name.toLowerCase().indexOf(highlightText.toLowerCase());
        if (idx !== -1) {
            displayName = escapeHtml(name.substring(0, idx)) + '<mark>' + escapeHtml(name.substring(idx, idx + highlightText.length)) + '</mark>' + escapeHtml(name.substring(idx + highlightText.length));
        }
    }

    var html = '<div class="sidebar-tree-item' + (isActive ? ' active' : '') + '" data-path="' + escapeHtml(path) + '" data-depth="' + depth + '">';

    if (hasChildren) {
        html += '<span class="sidebar-tree-toggle' + (isExpanded ? ' expanded' : '') + '">' + (isExpanded ? '\\u25BC' : '\\u25B6') + '</span>';
    } else {
        html += '<span class="sidebar-tree-toggle empty"></span>';
    }

    html += '<span class="sidebar-tree-icon">' + icon + '</span>';
    html += '<span class="sidebar-tree-name">' + displayName + '</span>';

    if (value && value._type === 'ndarray' && value.shape.length === 1 && value.data) {
        html += '<span class="sidebar-tree-shape">' + renderSparkline(value.data) + '</span>';
    }

    html += '<span class="sidebar-tree-type">' + escapeHtml(type) + '</span>';
    html += '</div>';

    if (hasChildren && isExpanded) {
        html += '<div class="sidebar-tree-children expanded">';
        childKeys.forEach(function(childKey) {
            var childPath = path + '.' + childKey;
            html += renderTreeItem(childKey, value[childKey], childPath, depth + 1, highlightText);
        });
        html += '</div>';
    }

    return html;
}

function attachTreeEventListeners() {
    document.querySelectorAll('.sidebar-tree-toggle:not(.empty)').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            var item = this.closest('.sidebar-tree-item');
            var path = item.getAttribute('data-path');

            if (state.expandedPaths[path]) {
                delete state.expandedPaths[path];
            } else {
                state.expandedPaths[path] = true;
            }

            var searchFilter = sidebarSearch ? sidebarSearch.value : '';
            renderSidebar(state.currentFileData, searchFilter);
        });
    });

    document.querySelectorAll('.sidebar-tree-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            if (e.target.classList.contains('sidebar-tree-toggle')) return;

            var path = this.getAttribute('data-path');
            selectTreeItem(path);
        });
    });
}

function selectTreeItem(path) {
    var parts = path.split('.');
    var value = state.currentFileData;

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (value && typeof value === 'object') {
            value = value[part];
        } else {
            return;
        }
    }

    if (value === undefined) {
        return;
    }

    state.currentActiveVariable = path;
    state.fullVariableData = value;
    state.currentVariableData = { name: parts[parts.length - 1] };
    state.currentDisplayMode = localStorage.getItem('matViewerDisplayMode') || 'image';
    state.currentViewMode = localStorage.getItem('matViewerViewMode') || 'magnitude';
    state.currentAxis = parseInt(localStorage.getItem('matViewerAxis') || '2');
    state.currentSlice = 0;
    state.currentLoadedSliceData = null;
    state.canvasScale = null;
    canvasTransformState = { rotation: 0, flipH: false, flipV: false };
    state.dirty = true;

    var varInfo = null;
    if (value && typeof value === 'object') {
        varInfo = {
            shape: value.shape || null,
            dtype: value.dtype || null,
            memory_mb: value.stats && value.stats.memory_mb ? value.stats.memory_mb : null
        };
    }
    vscode.postMessage({
        command: 'variableSelected',
        variableName: path,
        varInfo: varInfo
    });

    mainContent.innerHTML = renderPreview(parts[parts.length - 1], value);

    document.querySelectorAll('.sidebar-tree-item').forEach(function(item) {
        item.classList.remove('active');
        if (item.getAttribute('data-path') === path) {
            item.classList.add('active');
        }
    });
}

function openSettings() {
    settingsPanel.classList.add('open');
    overlay.classList.add('visible');
}

function closeSettings() {
    settingsPanel.classList.remove('open');
    overlay.classList.remove('visible');
}

function formatType(value) {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (value && value._type === 'complex') return 'complex';
    if (value && value._type === 'ndarray') {
        if (value.shape.length === 1) return value.shape[0] + '\\u00D71';
        if (value.shape.length === 2) return value.shape[0] + '\\u00D7' + value.shape[1];
        if (value.shape.length === 3) return value.shape.join('\\u00D7');
        return 'ndarray';
    }
    if (typeof value === 'object') return 'struct';
    return typeof value;
}

function formatSize(size) {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatFieldValue(value) {
    if (typeof value === 'number') {
        return escapeHtml(value.toString());
    } else if (typeof value === 'string') {
        return '"' + escapeHtml(value) + '"';
    } else if (value && value._type === 'complex') {
        return escapeHtml(value.real + (value.imag >= 0 ? '+' : '') + value.imag + 'i');
    } else if (value && value._type === 'ndarray') {
        return escapeHtml('ndarray: ' + value.shape.join('\\u00D7') + ' \\u00B7 ' + value.dtype);
    } else if (typeof value === 'object' && value !== null) {
        return escapeHtml('Object: ' + Object.keys(value).filter(function(k) { return k !== '_type'; }).join(', '));
    }
    return escapeHtml(String(value));
}

function renderStats(stats) {
    if (!stats || stats.min === undefined) return '';
    var html = '<div class="stats-grid">' +
        '<div class="stat-item"><div class="stat-label">Min</div><div class="stat-value">' + (typeof stats.min === 'number' ? stats.min.toFixed(4) : escapeHtml(String(stats.min))) + '</div></div>' +
        '<div class="stat-item"><div class="stat-label">Max</div><div class="stat-value">' + (typeof stats.max === 'number' ? stats.max.toFixed(4) : escapeHtml(String(stats.max))) + '</div></div>';
    if (stats.mean !== undefined) {
        html += '<div class="stat-item"><div class="stat-label">Mean</div><div class="stat-value">' + (typeof stats.mean === 'number' ? stats.mean.toFixed(4) : escapeHtml(String(stats.mean))) + '</div></div>';
    }
    if (stats.std !== undefined) {
        html += '<div class="stat-item"><div class="stat-label">Std</div><div class="stat-value">' + (typeof stats.std === 'number' ? stats.std.toFixed(4) : escapeHtml(String(stats.std))) + '</div></div>';
    }
    html += '</div>';

    if (stats.percentiles) {
        html += '<div class="stats-grid">';
        var pKeys = ['p5', 'p25', 'p50', 'p75', 'p95'];
        var pLabels = ['P5', 'P25', 'P50', 'P75', 'P95'];
        for (var pi = 0; pi < pKeys.length; pi++) {
            var pv = stats.percentiles[pKeys[pi]];
            html += '<div class="stat-item"><div class="stat-label">' + pLabels[pi] + '</div><div class="stat-value">' + (typeof pv === 'number' ? pv.toFixed(4) : '\\u2014') + '</div></div>';
        }
        html += '</div>';
    }

    var extraItems = [];
    if (stats.nan_count && stats.nan_count > 0) {
        extraItems.push('NaN: ' + stats.nan_count);
    }
    if (stats.inf_count && stats.inf_count > 0) {
        extraItems.push('Inf: ' + stats.inf_count);
    }
    if (typeof stats.sparsity === 'number') {
        extraItems.push('Sparsity: ' + (stats.sparsity * 100).toFixed(1) + '%');
    }
    if (typeof stats.memory_mb === 'number') {
        extraItems.push('Memory: ' + stats.memory_mb.toFixed(2) + ' MB');
    }
    if (extraItems.length > 0) {
        html += '<div class="stats-extra" style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--vscode-descriptionForeground);margin-top:6px;">';
        for (var ei = 0; ei < extraItems.length; ei++) {
            html += '<span>' + escapeHtml(extraItems[ei]) + '</span>';
        }
        html += '</div>';
    }

    return html;
}

function get2DSlice(value, viewMode) {
    if (!value.data) return null;

    var data = value.data;

    if (value.complex) {
        if (viewMode === 'magnitude') {
            return data.map(function(row) { return row.map(function(v) { return Math.sqrt(v.real * v.real + v.imag * v.imag); }); });
        } else if (viewMode === 'phase') {
            return data.map(function(row) { return row.map(function(v) { return Math.atan2(v.imag, v.real); }); });
        } else if (viewMode === 'real') {
            return data.map(function(row) { return row.map(function(v) { return v.real; }); });
        } else if (viewMode === 'imag') {
            return data.map(function(row) { return row.map(function(v) { return v.imag; }); });
        }
    }
    return data;
}

function get3DSlice(value, axis, sliceIndex, viewMode) {
    if (!value.data) return null;

    var sliceData = null;

    if (axis === 0) {
        sliceData = value.data[sliceIndex];
    } else if (axis === 1) {
        sliceData = value.data.map(function(row) { return row[sliceIndex]; });
    } else if (axis === 2) {
        sliceData = value.data.map(function(row) { return row.map(function(col) { return col[sliceIndex]; }); });
    }

    if (sliceData && value.complex) {
        if (viewMode === 'magnitude') {
            return sliceData.map(function(row) { return row.map(function(v) { return Math.sqrt(v.real * v.real + v.imag * v.imag); }); });
        } else if (viewMode === 'phase') {
            return sliceData.map(function(row) { return row.map(function(v) { return Math.atan2(v.imag, v.real); }); });
        } else if (viewMode === 'real') {
            return sliceData.map(function(row) { return row.map(function(v) { return v.real; }); });
        } else if (viewMode === 'imag') {
            return sliceData.map(function(row) { return row.map(function(v) { return v.imag; }); });
        }
    }
    return sliceData;
}

var canvasZoomState = {
    scale: 1,
    minScale: 1,
    maxScale: 32,
    naturalWidth: 0,
    naturalHeight: 0
};

function computeCanvasDisplaySize(naturalWidth, naturalHeight) {
    var viewer = document.querySelector('.image-viewer');
    var maxDisplayWidth = viewer ? viewer.clientWidth - 64 : 600;
    var maxDisplayHeight = 520;
    var MIN_DISPLAY_SIZE = 200;

    var scaleW = maxDisplayWidth / naturalWidth;
    var scaleH = maxDisplayHeight / naturalHeight;
    var fitScale = Math.min(scaleW, scaleH, 1);

    var displayW = Math.max(Math.round(naturalWidth * fitScale), Math.min(naturalWidth, MIN_DISPLAY_SIZE));
    var displayH = Math.max(Math.round(naturalHeight * fitScale), Math.min(naturalHeight, MIN_DISPLAY_SIZE));

    if (naturalWidth < MIN_DISPLAY_SIZE && naturalHeight < MIN_DISPLAY_SIZE) {
        var upsample = Math.min(MIN_DISPLAY_SIZE / naturalWidth, MIN_DISPLAY_SIZE / naturalHeight, 8);
        displayW = Math.round(naturalWidth * upsample);
        displayH = Math.round(naturalHeight * upsample);
    }

    return { width: displayW, height: displayH, fitScale: fitScale };
}

function updateCanvasZoomDisplay() {
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;

    var displayW = Math.round(canvasZoomState.naturalWidth * canvasZoomState.scale);
    var displayH = Math.round(canvasZoomState.naturalHeight * canvasZoomState.scale);

    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';

    var zoomLevelEl = document.getElementById('canvasZoomLevel');
    if (zoomLevelEl) {
        zoomLevelEl.textContent = Math.round(canvasZoomState.scale * 100) + '%';
    }

    var zoomInBtn = document.getElementById('canvasZoomIn');
    var zoomOutBtn = document.getElementById('canvasZoomOut');
    if (zoomInBtn) zoomInBtn.disabled = canvasZoomState.scale >= canvasZoomState.maxScale;
    if (zoomOutBtn) zoomOutBtn.disabled = canvasZoomState.scale <= canvasZoomState.minScale;
}

function zoomCanvas(delta) {
    var newScale = canvasZoomState.scale * delta;
    newScale = Math.max(canvasZoomState.minScale, Math.min(canvasZoomState.maxScale, newScale));
    if (newScale !== canvasZoomState.scale) {
        canvasZoomState.scale = newScale;
        state.canvasScale = newScale;
        updateCanvasZoomDisplay();
    }
}

function resetCanvasZoom() {
    canvasZoomState.scale = canvasZoomState.minScale;
    state.canvasScale = null;
    updateCanvasZoomDisplay();
}

var canvasTransformState = { rotation: 0, flipH: false, flipV: false };

function rotateCanvas(deg) {
    canvasTransformState.rotation = (canvasTransformState.rotation + deg) % 360;
    applyCanvasTransform();
}

function flipCanvas(direction) {
    if (direction === 'horizontal') canvasTransformState.flipH = !canvasTransformState.flipH;
    if (direction === 'vertical') canvasTransformState.flipV = !canvasTransformState.flipV;
    applyCanvasTransform();
}

function applyCanvasTransform() {
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;
    var transform = '';
    if (canvasTransformState.rotation !== 0) transform += 'rotate(' + canvasTransformState.rotation + 'deg) ';
    if (canvasTransformState.flipH) transform += 'scaleX(-1) ';
    if (canvasTransformState.flipV) transform += 'scaleY(-1) ';
    canvas.style.transform = transform.trim();
    canvas.style.transformOrigin = 'center center';
}

function renderImageToCanvas(data) {
    if (!state.dirty) return;
    state.dirty = false;

    var canvas = document.getElementById('imageCanvas');
    if (!canvas || !data) return;

    var height = data.length;
    var width = data[0] ? data[0].length : 0;
    if (width === 0 || height === 0) return;

    var totalElements = height * width;

    canvas.width = width;
    canvas.height = height;

    canvasZoomState.naturalWidth = width;
    canvasZoomState.naturalHeight = height;

    var sizeInfo = computeCanvasDisplaySize(width, height);
    canvasZoomState.minScale = sizeInfo.width / width;

    if (state.canvasScale !== null) {
        canvasZoomState.scale = state.canvasScale;
    } else {
        canvasZoomState.scale = canvasZoomState.minScale;
    }

    canvas.style.width = Math.round(width * canvasZoomState.scale) + 'px';
    canvas.style.height = Math.round(height * canvasZoomState.scale) + 'px';

    var dimEl = document.getElementById('canvasDimensions');
    if (dimEl) {
        dimEl.textContent = width + ' x ' + height + ' px';
    }

    updateCanvasZoomDisplay();

    var ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(width, height);

    var min = Infinity, max = -Infinity;
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var val = data[y][x];
            if (val !== null && val !== undefined) {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
    }

    var range = max - min || 1;
    var colormap = COLORMAPS[state.currentColormap] || COLORMAPS.grayscale;

    var windowCenter = min + range * state.windowLevel;
    var windowHalf = range * state.windowWidth * 0.5;
    var windowMin = windowCenter - windowHalf;
    var windowMax = windowCenter + windowHalf;
    var windowRange = windowMax - windowMin || 1;

    if (totalElements > 1000000) {
        var currentRow = 0;
        var CHUNK_SIZE = 100;

        function renderChunk() {
            var endRow = Math.min(currentRow + CHUNK_SIZE, height);
            for (var cy = currentRow; cy < endRow; cy++) {
                for (var cx = 0; cx < width; cx++) {
                    var cval = data[cy][cx];
                    var cnorm = cval !== null && cval !== undefined ? (cval - windowMin) / windowRange : 0;
                    cnorm = Math.max(0, Math.min(1, cnorm));
                    var crgb = colormap(cnorm);
                    var cidx = (cy * width + cx) * 4;
                    imageData.data[cidx] = crgb[0];
                    imageData.data[cidx + 1] = crgb[1];
                    imageData.data[cidx + 2] = crgb[2];
                    imageData.data[cidx + 3] = 255;
                }
            }
            currentRow = endRow;
            ctx.putImageData(imageData, 0, 0);

            if (currentRow < height) {
                requestAnimationFrame(renderChunk);
            }
        }

        requestAnimationFrame(renderChunk);
    } else {
        for (var ny = 0; ny < height; ny++) {
            for (var nx = 0; nx < width; nx++) {
                var nval = data[ny][nx];
                var nnorm = nval !== null && nval !== undefined ? (nval - windowMin) / windowRange : 0;
                nnorm = Math.max(0, Math.min(1, nnorm));
                var nrgb = colormap(nnorm);
                var nidx = (ny * width + nx) * 4;
                imageData.data[nidx] = nrgb[0];
                imageData.data[nidx + 1] = nrgb[1];
                imageData.data[nidx + 2] = nrgb[2];
                imageData.data[nidx + 3] = 255;
            }
        }
        requestAnimationFrame(function() {
            ctx.putImageData(imageData, 0, 0);
        });
    }
}

function renderHistogram(data, canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;

    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;

    var numBins = 30;
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < data.length; i++) {
        if (typeof data[i] === 'number') {
            if (data[i] < min) min = data[i];
            if (data[i] > max) max = data[i];
        }
    }

    var range = max - min || 1;
    var bins = new Array(numBins).fill(0);
    for (var bi = 0; bi < data.length; bi++) {
        if (typeof data[bi] === 'number') {
            var binIndex = Math.min(Math.floor((data[bi] - min) / range * numBins), numBins - 1);
            if (binIndex >= 0) bins[binIndex]++;
        }
    }

    var maxBin = 0;
    for (var mi = 0; mi < bins.length; mi++) {
        if (bins[mi] > maxBin) maxBin = bins[mi];
    }

    var barWidth = width / numBins;

    ctx.clearRect(0, 0, width, height);

    var style = getComputedStyle(document.body);
    var accentColor = style.getPropertyValue('--vscode-textLink-foreground').trim() || '#3794ff';

    for (var hi = 0; hi < numBins; hi++) {
        var barHeight = maxBin > 0 ? (bins[hi] / maxBin) * height : 0;
        ctx.fillStyle = accentColor;
        ctx.fillRect(hi * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
}

function renderSparkline(data) {
    if (!data || data.length === 0) return '';

    var width = 60;
    var height = 16;
    var padding = 1;

    var min = Infinity, max = -Infinity;
    for (var i = 0; i < data.length; i++) {
        var v = typeof data[i] === 'number' ? data[i] : (data[i] && data[i].real !== undefined ? data[i].real : 0);
        if (v < min) min = v;
        if (v > max) max = v;
    }

    var range = max - min || 1;
    var step = (width - 2 * padding) / (data.length - 1 || 1);

    var points = '';
    for (var si = 0; si < data.length; si++) {
        var sv = typeof data[si] === 'number' ? data[si] : (data[si] && data[si].real !== undefined ? data[si].real : 0);
        var sx = padding + si * step;
        var sy = height - padding - ((sv - min) / range) * (height - 2 * padding);
        points += (si === 0 ? 'M' : 'L') + sx.toFixed(1) + ' ' + sy.toFixed(1);
    }

    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="' + points + '" fill="none" stroke="var(--vscode-textLink-foreground, #3794ff)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';
}

function flattenData(data) {
    var result = [];
    if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
            if (Array.isArray(data[i])) {
                var inner = flattenData(data[i]);
                for (var j = 0; j < inner.length; j++) result.push(inner[j]);
            } else if (data[i] && data[i]._type === 'complex') {
                result.push(data[i].real);
            } else if (typeof data[i] === 'number') {
                result.push(data[i]);
            }
        }
    }
    return result;
}

function render1DArray(value) {
    if (!value.data) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No data available</div>';

    var data = value.data;
    if (data.length === 0) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">Empty array</div>';
    var itemsToShow = Math.min(state.currentShowCount1D, data.length);

    var html = '<div class="vector-grid">';
    for (var i = 0; i < itemsToShow; i++) {
        var v = data[i];
        html += '<div class="vector-item">';
        html += '<div class="vector-index">[' + i + ']</div>';
        if (v && v._type === 'complex') {
            html += '<div><span class="complex-real">' + v.real.toFixed(3) + '</span></div>';
            html += '<div><span class="complex-imag">' + v.imag.toFixed(3) + 'i</span></div>';
        } else if (typeof v === 'number') {
            html += '<div>' + v.toFixed(4) + '</div>';
        } else if (v === null || v === undefined) {
            html += '<div>null</div>';
        } else {
            html += '<div>' + escapeHtml(String(v)) + '</div>';
        }
        html += '</div>';
    }
    html += '</div>';

    if (data.length > itemsToShow) {
        html += '<div style="margin-top: 16px; text-align: center;">';
        html += '<button class="load-more-btn" data-action="loadMore1D">Load more (showing ' + itemsToShow + '/' + data.length + ')</button>';
        html += '</div>';
    }
    return html;
}

function render2DTable(value) {
    if (!value.data) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No data available</div>';

    var data = value.data;
    if (!value.shape || value.shape.length < 2) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">Invalid array shape</div>';
    if (value.shape[0] === 0 || value.shape[1] === 0) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">Empty array</div>';
    var rowsToShow = Math.min(state.currentShowRows2D, value.shape[0]);
    var colsToShow = Math.min(state.currentShowCols2D, value.shape[1]);

    var html = '<table class="data-table">';
    html += '<tr><th></th>';
    for (var j = 0; j < colsToShow; j++) {
        html += '<th>' + j + '</th>';
    }
    if (value.shape[1] > colsToShow) {
        html += '<th>...</th>';
    }
    html += '</tr>';

    for (var i = 0; i < rowsToShow; i++) {
        html += '<tr><th>' + i + '</th>';
        var row = data[i];
        for (var jj = 0; jj < colsToShow; jj++) {
            var v = row ? row[jj] : null;
            html += '<td>' + formatTableCell(v) + '</td>';
        }
        if (value.shape[1] > colsToShow) {
            html += '<td>...</td>';
        }
        html += '</tr>';
    }

    if (value.shape[0] > rowsToShow) {
        html += '<tr><th>...</th>';
        for (var jc = 0; jc < colsToShow; jc++) {
            html += '<td>...</td>';
        }
        if (value.shape[1] > colsToShow) {
            html += '<td>...</td>';
        }
        html += '</tr>';
    }

    html += '</table>';

    if (value.shape[0] > rowsToShow || value.shape[1] > colsToShow) {
        html += '<div style="margin-top: 16px; text-align: center; display: flex; gap: 12px; justify-content: center;">';
        if (value.shape[0] > rowsToShow) {
            html += '<button class="load-more-btn" data-action="loadMoreRows2D">Load more rows (' + rowsToShow + '/' + value.shape[0] + ')</button>';
        }
        if (value.shape[1] > colsToShow) {
            html += '<button class="load-more-btn" data-action="loadMoreCols2D">Load more columns (' + colsToShow + '/' + value.shape[1] + ')</button>';
        }
        html += '</div>';
    }

    return html;
}

function formatTableCell(v) {
    if (v === null || v === undefined) return '';
    if (v && v._type === 'complex') {
        return '<div class="complex-cell"><span class="complex-real">' + v.real.toFixed(4) + '</span><span class="complex-imag">' + v.imag.toFixed(4) + 'i</span></div>';
    }
    if (typeof v === 'number') return v.toFixed(4);
    return escapeHtml(String(v));
}

function render3DTable(value) {
    var sliceData = value.data
        ? get3DSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode)
        : state.currentLoadedSliceData;

    if (!sliceData) {
        return '<div style="padding: 20px; text-align: center;">' +
            '<p style="color: var(--vscode-descriptionForeground);">Large tensor - switch to <b>Image</b> mode for slice visualization, or the data is too large for table display.</p>' +
            '<p id="tableLoadingIndicator" style="margin-top:12px; color: var(--vscode-textLink-foreground); font-size:12px;"></p>' +
            '</div>';
    }

    var rowsToShow = Math.min(state.currentShowRows2D, sliceData.length);
    var colsToShow = Math.min(state.currentShowCols2D, sliceData[0] ? sliceData[0].length : 0);

    var html = '<table class="data-table">';
    html += '<tr><th></th>';
    for (var j = 0; j < colsToShow; j++) {
        html += '<th>' + j + '</th>';
    }
    if (sliceData[0] && sliceData[0].length > colsToShow) {
        html += '<th>...</th>';
    }
    html += '</tr>';

    for (var i = 0; i < rowsToShow; i++) {
        html += '<tr><th>' + i + '</th>';
        var row = sliceData[i];
        for (var jj = 0; jj < colsToShow; jj++) {
            var v = row ? row[jj] : null;
            html += '<td>' + formatTableCell(v) + '</td>';
        }
        if (sliceData[0] && sliceData[0].length > colsToShow) {
            html += '<td>...</td>';
        }
        html += '</tr>';
    }

    if (sliceData.length > rowsToShow) {
        html += '<tr><th>...</th>';
        for (var jc = 0; jc < colsToShow; jc++) {
            html += '<td>...</td>';
        }
        if (sliceData[0] && sliceData[0].length > colsToShow) {
            html += '<td>...</td>';
        }
        html += '</tr>';
    }

    html += '</table>';

    if (sliceData.length > rowsToShow || (sliceData[0] && sliceData[0].length > colsToShow)) {
        html += '<div style="margin-top: 16px; text-align: center; display: flex; gap: 12px; justify-content: center;">';
        if (sliceData.length > rowsToShow) {
            html += '<button class="load-more-btn" data-action="loadMoreRows2D">Load more rows (' + rowsToShow + '/' + sliceData.length + ')</button>';
        }
        if (sliceData[0] && sliceData[0].length > colsToShow) {
            html += '<button class="load-more-btn" data-action="loadMoreCols2D">Load more columns (' + colsToShow + '/' + sliceData[0].length + ')</button>';
        }
        html += '</div>';
    }

    return html;
}

function renderStruct(name, value) {
    var fields = Object.keys(value).filter(function(k) { return k !== '_type'; });

    var html = '<div class="variable-preview">' +
        '<div class="preview-header">' +
        '<div class="preview-title">' + escapeHtml(name) + '</div>' +
        '<div class="preview-meta">Struct \\u00B7 ' + fields.length + ' fields</div>' +
        '</div>' +
        '<div class="preview-content">' +
        '<div class="struct-fields">';

    fields.forEach(function(field) {
        var fieldValue = value[field];
        html += '<div class="struct-field">' +
            '<div class="struct-field-name">' + escapeHtml(field) + '</div>' +
            '<div class="struct-field-meta">' + escapeHtml(formatType(fieldValue)) + '</div>' +
            '<div class="struct-field-value">' +
            formatFieldValue(fieldValue) +
            '</div>' +
            '</div>';
    });

    html += '</div></div></div>';
    return html;
}

function render2DArray(name, value) {
    var stats = value.statistics || value.stats || {};

    var html = '<div class="variable-preview">' +
        '<div class="preview-header">' +
        '<div class="preview-title">' + escapeHtml(name) + '</div>' +
        '<div class="preview-meta">' + value.shape.join(' \\u00D7 ') + ' \\u00B7 ' + escapeHtml(value.dtype) + ' \\u00B7 ' + formatSize(value.size * 8) + '</div>' +
        '</div>' +
        '<div class="preview-content">';

    html += renderStats(stats);

    html += '<div class="view-tabs">' +
        '<button class="view-tab ' + (state.currentDisplayMode === 'table' ? 'active' : '') + '" data-action="setDisplayMode" data-mode="table">Table</button>' +
        '<button class="view-tab ' + (state.currentDisplayMode === 'image' ? 'active' : '') + '" data-action="setDisplayMode" data-mode="image">Image</button>' +
        '</div>';

    if (state.currentDisplayMode === 'image') {
        if (value.complex) {
            html += '<div class="view-mode-selector">' +
                '<button class="' + (state.currentViewMode === 'magnitude' ? 'active' : '') + '" data-action="setViewMode" data-mode="magnitude">Magnitude</button>' +
                '<button class="' + (state.currentViewMode === 'phase' ? 'active' : '') + '" data-action="setViewMode" data-mode="phase">Phase</button>' +
                '<button class="' + (state.currentViewMode === 'real' ? 'active' : '') + '" data-action="setViewMode" data-mode="real">Real</button>' +
                '<button class="' + (state.currentViewMode === 'imag' ? 'active' : '') + '" data-action="setViewMode" data-mode="imag">Imag</button>' +
                '</div>';
        }

        html += '<div class="view-mode-selector">' +
            '<label>Colormap:</label>' +
            '<select data-action="setColormap">' +
            '<option value="grayscale"' + (state.currentColormap === 'grayscale' ? ' selected' : '') + '>Grayscale</option>' +
            '<option value="viridis"' + (state.currentColormap === 'viridis' ? ' selected' : '') + '>Viridis</option>' +
            '<option value="inferno"' + (state.currentColormap === 'inferno' ? ' selected' : '') + '>Inferno</option>' +
            '<option value="plasma"' + (state.currentColormap === 'plasma' ? ' selected' : '') + '>Plasma</option>' +
            '<option value="hot"' + (state.currentColormap === 'hot' ? ' selected' : '') + '>Hot</option>' +
            '<option value="jet"' + (state.currentColormap === 'jet' ? ' selected' : '') + '>Jet</option>' +
            '<option value="turbo"' + (state.currentColormap === 'turbo' ? ' selected' : '') + '>Turbo</option>' +
            '<option value="coolwarm"' + (state.currentColormap === 'coolwarm' ? ' selected' : '') + '>Coolwarm</option>' +
            '<option value="rdbu"' + (state.currentColormap === 'rdbu' ? ' selected' : '') + '>RdBu</option>' +
            '<option value="hot"' + (state.currentColormap === 'hot' ? ' selected' : '') + '>Hot</option>' +
            '<option value="jet"' + (state.currentColormap === 'jet' ? ' selected' : '') + '>Jet</option>' +
            '<option value="turbo"' + (state.currentColormap === 'turbo' ? ' selected' : '') + '>Turbo</option>' +
            '<option value="coolwarm"' + (state.currentColormap === 'coolwarm' ? ' selected' : '') + '>Coolwarm</option>' +
            '<option value="rdbu"' + (state.currentColormap === 'rdbu' ? ' selected' : '') + '>RdBu</option>' +
            '</select>' +
            '</div>';

        html += '<div class="image-toolbar">' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="canvasZoomOut" title="Zoom out">-</button>' +
            '<span class="toolbar-text" id="canvasZoomLevel">100%</span>' +
            '<button class="toolbar-btn" id="canvasZoomIn" title="Zoom in">+</button>' +
            '<button class="toolbar-btn" id="canvasZoomReset" title="Reset zoom">1:1</button>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<label>Window</label>' +
            '<input type="range" id="windowLevel" min="0" max="100" value="' + Math.round(state.windowLevel * 100) + '" data-action="windowLevel">' +
            '<span class="toolbar-value" id="windowLevelValue">' + Math.round(state.windowLevel * 100) + '%</span>' +
            '</div>' +
            '<div class="toolbar-group">' +
            '<label>Level</label>' +
            '<input type="range" id="windowWidth" min="1" max="100" value="' + Math.round(state.windowWidth * 100) + '" data-action="windowWidth">' +
            '<span class="toolbar-value" id="windowWidthValue">' + Math.round(state.windowWidth * 100) + '%</span>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="rotateLeft" title="Rotate left (↺)">↺</button>' +
            '<button class="toolbar-btn" id="rotateRight" title="Rotate right (↻)">↻</button>' +
            '<button class="toolbar-btn" id="flipH" title="Flip horizontal (⇄)">⇄</button>' +
            '<button class="toolbar-btn" id="flipV" title="Flip vertical (⇅)">⇅</button>' +
            '</div>' +
            '</div>' +
            '<div class="image-viewer">' +
            '<canvas id="imageCanvas" class="image-canvas"></canvas>' +
            '<div class="canvas-dimensions" id="canvasDimensions"></div>' +
            '</div>';

        var sliceData = get2DSlice(value, state.currentViewMode);
        scheduleCanvasRender(sliceData);
    } else {
        html += render2DTable(value);
    }

    html += '</div></div>';
    return html;
}

function renderNDArray(name, value) {
    var stats = value.statistics || value.stats || {};
    var ndim = value.shape.length;
    var hasData = value.data && value.data.length > 0;

    var html = '<div class="variable-preview">' +
        '<div class="preview-header">' +
        '<div class="preview-title">' + escapeHtml(name) + '</div>' +
        '<div class="preview-meta">' + value.shape.join(' \\u00D7 ') + ' \\u00B7 ' + escapeHtml(value.dtype) + ' \\u00B7 ' + formatSize(value.size * 8) + '</div>' +
        '</div>' +
        '<div class="preview-content">';

    html += renderStats(stats);

    if (!hasData) {
        html += '<p style="margin: 16px 0; color: var(--vscode-descriptionForeground); font-size: 13px;">Large tensor - using lazy loading. Select a slice below to visualize.</p>';
    }

    html += '<div class="view-tabs">' +
        '<button class="view-tab ' + (state.currentDisplayMode === 'table' ? 'active' : '') + '" data-action="setDisplayMode" data-mode="table">Table</button>' +
        '<button class="view-tab ' + (state.currentDisplayMode === 'image' ? 'active' : '') + '" data-action="setDisplayMode" data-mode="image">Image</button>' +
        '</div>';

    if (state.currentDisplayMode === 'image') {
        html += '<div class="tensor-controls">';

        if (ndim > 2) {
            html += '<label>View Axis:</label>' +
                '<select data-action="setAxis">';
            for (var ai = 0; ai < Math.min(ndim, 4); ai++) {
                html += '<option value="' + ai + '" ' + (state.currentAxis === ai ? 'selected' : '') + '>Axis ' + ai + ' (' + value.shape[ai] + ')</option>';
            }
            html += '</select>';
        }

        if (value.complex) {
            html += '<label>View Mode:</label>' +
                '<div class="view-mode-selector">' +
                '<button class="' + (state.currentViewMode === 'magnitude' ? 'active' : '') + '" data-action="setViewMode" data-mode="magnitude">Magnitude</button>' +
                '<button class="' + (state.currentViewMode === 'phase' ? 'active' : '') + '" data-action="setViewMode" data-mode="phase">Phase</button>' +
                '<button class="' + (state.currentViewMode === 'real' ? 'active' : '') + '" data-action="setViewMode" data-mode="real">Real</button>' +
                '<button class="' + (state.currentViewMode === 'imag' ? 'active' : '') + '" data-action="setViewMode" data-mode="imag">Imag</button>' +
                '</div>';
        }

        html += '<label>Colormap:</label>' +
            '<select data-action="setColormap">' +
            '<option value="grayscale"' + (state.currentColormap === 'grayscale' ? ' selected' : '') + '>Grayscale</option>' +
            '<option value="viridis"' + (state.currentColormap === 'viridis' ? ' selected' : '') + '>Viridis</option>' +
            '<option value="inferno"' + (state.currentColormap === 'inferno' ? ' selected' : '') + '>Inferno</option>' +
            '<option value="plasma"' + (state.currentColormap === 'plasma' ? ' selected' : '') + '>Plasma</option>' +
            '</select>';

        if (ndim >= 3) {
            var numSlices = value.shape[state.currentAxis] || 0;
            html += '<label>Slice:</label>' +
                '<input type="range" id="sliceSlider" min="0" max="' + (numSlices - 1) + '" value="' + state.currentSlice + '" data-action="updateSlice">' +
                '<span class="tensor-value" id="sliceValue">' + state.currentSlice + '</span>' +
                '<span id="sliceLoadingIndicator" style="display:none; margin-left:12px; color: var(--vscode-textLink-foreground); font-size:12px;"></span>';
        }

        html += '</div>';

        html += '<div class="image-toolbar">' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="canvasZoomOut" title="Zoom out">-</button>' +
            '<span class="toolbar-text" id="canvasZoomLevel">100%</span>' +
            '<button class="toolbar-btn" id="canvasZoomIn" title="Zoom in">+</button>' +
            '<button class="toolbar-btn" id="canvasZoomReset" title="Reset zoom">1:1</button>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<label>Window</label>' +
            '<input type="range" id="windowLevel" min="0" max="100" value="' + Math.round(state.windowLevel * 100) + '" data-action="windowLevel">' +
            '<span class="toolbar-value" id="windowLevelValue">' + Math.round(state.windowLevel * 100) + '%</span>' +
            '</div>' +
            '<div class="toolbar-group">' +
            '<label>Level</label>' +
            '<input type="range" id="windowWidth" min="1" max="100" value="' + Math.round(state.windowWidth * 100) + '" data-action="windowWidth">' +
            '<span class="toolbar-value" id="windowWidthValue">' + Math.round(state.windowWidth * 100) + '%</span>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="rotateLeft" title="Rotate left (↺)">↺</button>' +
            '<button class="toolbar-btn" id="rotateRight" title="Rotate right (↻)">↻</button>' +
            '<button class="toolbar-btn" id="flipH" title="Flip horizontal (⇄)">⇄</button>' +
            '<button class="toolbar-btn" id="flipV" title="Flip vertical (⇅)">⇅</button>' +
            '</div>' +
            '</div>' +
            '<div class="image-viewer">' +
            '<canvas id="imageCanvas" class="image-canvas"></canvas>' +
            '<div class="canvas-dimensions" id="canvasDimensions"></div>' +
            '</div>';

        if (hasData && ndim === 3) {
            var sliceData = get3DSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode);
            scheduleCanvasRender(sliceData);
        } else if (!hasData && ndim >= 3) {
            setTimeout(function() { requestSliceFromBackend(state.currentAxis, state.currentSlice); }, 100);
        }
    } else {
        html += '<div class="tensor-controls">';

        if (ndim > 2) {
            html += '<label>View Axis:</label>' +
                '<select data-action="setAxis">';
            for (var tai = 0; tai < Math.min(ndim, 4); tai++) {
                html += '<option value="' + tai + '" ' + (state.currentAxis === tai ? 'selected' : '') + '>Axis ' + tai + ' (' + value.shape[tai] + ')</option>';
            }
            html += '</select>';
        }

        if (ndim >= 3) {
            var tNumSlices = value.shape[state.currentAxis] || 0;
            html += '<label>Slice:</label>' +
                '<input type="range" id="sliceSlider" min="0" max="' + (tNumSlices - 1) + '" value="' + state.currentSlice + '" data-action="updateSlice">' +
                '<span class="tensor-value" id="sliceValue">' + state.currentSlice + '</span>';
        }

        html += '</div>';

        html += render3DTable(value);
    }

    html += '</div></div>';
    return html;
}

function renderPreview(name, value) {
    if (typeof value === 'number') {
        return '<div class="variable-preview">' +
            '<div class="preview-header">' +
            '<div class="preview-title">' + escapeHtml(name) + '</div>' +
            '<div class="preview-meta">Scalar</div>' +
            '</div>' +
            '<div class="preview-content">' +
            '<div class="scalar-value">' + value + '</div>' +
            '</div>' +
            '</div>';
    } else if (typeof value === 'string') {
        return '<div class="variable-preview">' +
            '<div class="preview-header">' +
            '<div class="preview-title">' + escapeHtml(name) + '</div>' +
            '<div class="preview-meta">String \\u00B7 ' + value.length + ' chars</div>' +
            '</div>' +
            '<div class="preview-content">' +
            '<div style="padding: 20px; background: var(--vscode-list-hoverBackground); border-radius: 12px; font-family: monospace;">"' + escapeHtml(value) + '"</div>' +
            '</div>' +
            '</div>';
    } else if (value && value._type === 'complex') {
        return '<div class="variable-preview">' +
            '<div class="preview-header">' +
            '<div class="preview-title">' + escapeHtml(name) + '</div>' +
            '<div class="preview-meta">Complex Number</div>' +
            '</div>' +
            '<div class="preview-content">' +
            '<div class="complex-view">' +
            '<div class="complex-part">' +
            '<div class="complex-label">Real</div>' +
            '<div class="complex-value" style="color: var(--vscode-textLink-foreground);">' + value.real + '</div>' +
            '</div>' +
            '<div class="complex-part">' +
            '<div class="complex-label">Imaginary</div>' +
            '<div class="complex-value" style="color: var(--vscode-errorForeground);">' + value.imag + 'i</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    } else if (value && value._type === 'ndarray') {
        if (value.shape.length === 1) {
            var stats = value.statistics || value.stats || {};
            var html = '<div class="variable-preview">' +
                '<div class="preview-header">' +
                '<div class="preview-title">' + escapeHtml(name) + '</div>' +
                '<div class="preview-meta">' + value.shape[0] + '\\u00D71 \\u00B7 ' + escapeHtml(value.dtype) + ' \\u00B7 ' + formatSize(value.size * 8) + '</div>' +
                '</div>' +
                '<div class="preview-content">';

            html += renderStats(stats);
            html += render1DArray(value);
            html += '</div></div>';
            return html;
        } else if (value.shape.length === 2) {
            return render2DArray(name, value);
        } else if (value.shape.length >= 3) {
            return renderNDArray(name, value);
        } else {
            return '<div class="variable-preview">' +
                '<div class="preview-header">' +
                '<div class="preview-title">' + escapeHtml(name) + '</div>' +
                '<div class="preview-meta">' + escapeHtml(formatType(value)) + '</div>' +
                '</div>' +
                '<div class="preview-content">' +
                '<pre style="background: var(--vscode-editor-background); padding: 20px; border-radius: 12px; overflow: auto;">' + escapeHtml(JSON.stringify(value, null, 2)) + '</pre>' +
                '</div>' +
                '</div>';
        }
    } else if (value && typeof value === 'object' && (!value._type || value._type === 'struct')) {
        return renderStruct(name, value);
    } else {
        return '<div class="variable-preview">' +
            '<div class="preview-header">' +
            '<div class="preview-title">' + escapeHtml(name) + '</div>' +
            '<div class="preview-meta">' + escapeHtml(formatType(value)) + '</div>' +
            '</div>' +
            '<div class="preview-content">' +
            '<pre style="background: var(--vscode-editor-background); padding: 20px; border-radius: 12px; overflow: auto;">' + escapeHtml(JSON.stringify(value, null, 2)) + '</pre>' +
            '</div>' +
            '</div>';
    }
}

var sliceDebounceTimer = null;

function setAxis(axis) {
    state.currentAxis = parseInt(axis);
    state.currentSlice = 0;
    state.currentLoadedSliceData = null;
    state.dirty = true;
    localStorage.setItem('matViewerAxis', axis);
    localStorage.setItem('matViewerSlice', '0');

    if (state.fullVariableData && state.currentVariableData) {
        if (!state.fullVariableData.data && state.fullVariableData.shape.length >= 3) {
            requestSliceFromBackend(state.currentAxis, state.currentSlice);
        }
        mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);

        if (state.fullVariableData.data && state.currentDisplayMode === 'image') {
            var sliceData = get3DSlice(state.fullVariableData, state.currentAxis, state.currentSlice, state.currentViewMode);
            scheduleCanvasRender(sliceData);
        }
    }
}

function updateSlice(value) {
    state.currentSlice = parseInt(value);
    state.currentLoadedSliceData = null;
    state.dirty = true;
    localStorage.setItem('matViewerSlice', value);
    var sliceValueEl = document.getElementById('sliceValue');
    if (sliceValueEl) sliceValueEl.textContent = value;

    if (sliceDebounceTimer) clearTimeout(sliceDebounceTimer);
    sliceDebounceTimer = setTimeout(function() {
        if (state.fullVariableData && state.currentVariableData) {
            if (!state.fullVariableData.data && state.fullVariableData.shape.length >= 3) {
                requestSliceFromBackend(state.currentAxis, state.currentSlice);
                return;
            }

            if (state.currentDisplayMode === 'image') {
                var sliceData = get3DSlice(state.fullVariableData, state.currentAxis, state.currentSlice, state.currentViewMode);
                scheduleCanvasRender(sliceData);
            } else {
                mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
            }
        }
    }, 50);
}

function setColormap(colormap) {
    state.currentColormap = colormap;
    state.dirty = true;
    localStorage.setItem('matViewerColormap', colormap);
    if (state.fullVariableData && state.currentVariableData) {
        mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
    }
}

function updateWindowLevel() {
    var levelEl = document.getElementById('windowLevel');
    var widthEl = document.getElementById('windowWidth');
    var levelValEl = document.getElementById('windowLevelValue');
    var widthValEl = document.getElementById('windowWidthValue');
    if (!levelEl || !widthEl) return;
    state.windowLevel = parseInt(levelEl.value) / 100;
    state.windowWidth = parseInt(widthEl.value) / 100;
    if (levelValEl) levelValEl.textContent = Math.round(state.windowLevel * 100) + '%';
    if (widthValEl) widthValEl.textContent = Math.round(state.windowWidth * 100) + '%';
    state.dirty = true;
    if (state.fullVariableData && state.currentVariableData) {
        var sliceData = state.fullVariableData.shape.length >= 3
            ? get3DSlice(state.fullVariableData, state.currentAxis, state.currentSlice, state.currentViewMode)
            : get2DSlice(state.fullVariableData, state.currentViewMode);
        scheduleCanvasRender(sliceData);
    }
}

function handleFileLoaded(message) {
    var matData = message.data;

    if (!matData.success || !matData.data) {
        mainContent.innerHTML = '<div class="error">Failed to load file: ' + escapeHtml(matData.error || 'No data') + '</div>';
        return;
    }

    state.currentVariableData = matData.data;
    state.currentFilePath = matData.file_path;
    state.windowLevel = 0.5;
    state.windowWidth = 1.0;
    canvasTransformState = { rotation: 0, flipH: false, flipV: false };
    fileInfo.textContent = (matData.version || 'v?') + ' \\u00B7 ' + (matData.file_path || '');

    state.currentActiveVariable = null;
    var searchFilter = sidebarSearch ? sidebarSearch.value : '';
    renderSidebar(matData.data, searchFilter);

    var varNames = Object.keys(matData.data).sort();
    var html = '<div class="success">';
    html += '<div class="success-icon">\\u2705</div>';
    html += '<h2>File loaded successfully!</h2>';
    html += '<p>Variables: ' + varNames.length + '</p>';
    html += '<p style="margin-top: 24px;">';
    html += 'Click a variable in the <span class="highlight">sidebar</span> (left)';
    html += '</p>';
    html += '<p style="opacity: 0.7;">to view its data here</p>';
    html += '</div>';

    mainContent.innerHTML = html;
}

function handleSliceLoaded(message) {
    if (message.success && message.data && message.data._type === 'slice') {
        state.currentLoadedSliceData = decodeBase64Slice(message.data);
        scheduleCanvasRender(state.currentLoadedSliceData);

        var loadingEl = document.getElementById('sliceLoadingIndicator');
        if (loadingEl) loadingEl.style.display = 'none';
    } else {
        var loadingEl2 = document.getElementById('sliceLoadingIndicator');
        if (loadingEl2) loadingEl2.textContent = 'Error loading slice: ' + escapeHtml(message.error || 'Unknown error');
    }
}

function handleShowVariable(message) {
    var name = message.variableName;

    if (state.currentFileData && name in state.currentFileData) {
        selectTreeItem(name);
    }
}

function handleError(message) {
    mainContent.innerHTML = '<div class="error">Error: ' + escapeHtml(message.error) + '</div>';
}

function handleMessage(event) {
    var message = event.data;

    if (message.command === 'fileLoaded') {
        handleFileLoaded(message);
    } else if (message.command === 'sliceLoaded') {
        handleSliceLoaded(message);
    } else if (message.command === 'showVariable') {
        handleShowVariable(message);
    } else if (message.command === 'error') {
        handleError(message);
    }
}

function decodeBase64Slice(sliceInfo) {
    if (!sliceInfo.encoded_data) return null;

    var binaryString = atob(sliceInfo.encoded_data);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    var float32Array = new Float32Array(bytes.buffer);
    var shape = sliceInfo.shape;
    var rows = shape[0];
    var cols = shape[1];

    var result = [];
    for (var ri = 0; ri < rows; ri++) {
        var row = [];
        for (var ci = 0; ci < cols; ci++) {
            row.push(float32Array[ri * cols + ci]);
        }
        result.push(row);
    }

    return result;
}

function requestSliceFromBackend(ax, idx) {
    if (!state.currentFilePath || !state.currentActiveVariable) {
        return;
    }

    state.currentLoadedSliceData = null;

    var loadingEl = document.getElementById('sliceLoadingIndicator');
    if (loadingEl) {
        loadingEl.style.display = 'inline';
        loadingEl.textContent = 'Loading slice...';
    }

    vscode.postMessage({
        command: 'loadSlice',
        variableName: state.currentActiveVariable,
        axis: ax,
        index: idx
    });
}

document.addEventListener('click', function(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {
        case 'loadMore1D':
            state.currentShowCount1D += 50;
            if (state.fullVariableData && state.currentVariableData) {
                mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
            }
            break;
        case 'loadMoreRows2D':
            state.currentShowRows2D += 50;
            if (state.fullVariableData && state.currentVariableData) {
                mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
            }
            break;
        case 'loadMoreCols2D':
            state.currentShowCols2D += 20;
            if (state.fullVariableData && state.currentVariableData) {
                mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
            }
            break;
        case 'setDisplayMode':
            state.currentDisplayMode = target.getAttribute('data-mode');
            state.dirty = true;
            localStorage.setItem('matViewerDisplayMode', state.currentDisplayMode);
            if (state.fullVariableData && state.currentVariableData) {
                mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
            }
            break;
        case 'setViewMode':
            state.currentViewMode = target.getAttribute('data-mode');
            state.dirty = true;
            localStorage.setItem('matViewerViewMode', state.currentViewMode);
            if (state.fullVariableData && state.currentVariableData) {
                mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
            }
            break;
        case 'windowLevel':
        case 'windowWidth':
            updateWindowLevel();
            break;
    }
});

document.addEventListener('change', function(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {
        case 'setAxis':
            setAxis(target.value);
            break;
        case 'setColormap':
            setColormap(target.value);
            break;
    }
});

document.addEventListener('input', function(e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {
        case 'updateSlice':
            updateSlice(target.value);
            break;
    }
});

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
overlay.addEventListener('click', closeSettings);

document.addEventListener('click', function(e) {
    var target = e.target;
    if (target.id === 'canvasZoomIn') {
        zoomCanvas(1.5);
    } else if (target.id === 'canvasZoomOut') {
        zoomCanvas(1 / 1.5);
    } else if (target.id === 'canvasZoomReset') {
        resetCanvasZoom();
    } else if (target.id === 'rotateLeft') {
        rotateCanvas(-90);
    } else if (target.id === 'rotateRight') {
        rotateCanvas(90);
    } else if (target.id === 'flipH') {
        flipCanvas('horizontal');
    } else if (target.id === 'flipV') {
        flipCanvas('vertical');
    }
});

sidebarToggle.addEventListener('click', toggleSidebar);
headerToggle.addEventListener('click', toggleSidebar);

githubLink.addEventListener('click', function() {
    vscode.postMessage({ command: 'openExternal', url: 'https://github.com/MaiwulanjiangMaiming/MatrixSpy' });
});

var starLink = document.getElementById('starLink');
var feedbackLink = document.getElementById('feedbackLink');

starLink.addEventListener('click', function() {
    vscode.postMessage({ command: 'openExternal', url: 'https://github.com/MaiwulanjiangMaiming/MatrixSpy' });
});

feedbackLink.addEventListener('click', function() {
    vscode.postMessage({ command: 'openExternal', url: 'https://github.com/MaiwulanjiangMaiming/MatrixSpy/issues' });
});

var savedSidebarCollapsed = localStorage.getItem('matViewerSidebarCollapsed');
if (savedSidebarCollapsed === 'true') {
    state.sidebarCollapsed = true;
    sidebar.classList.add('collapsed');
    headerToggle.classList.add('visible');
}

var sidebarSearch = document.getElementById('sidebarSearch');
if (sidebarSearch) {
    sidebarSearch.addEventListener('input', function(e) {
        var filterText = e.target.value;
        if (state.currentFileData) {
            renderSidebar(state.currentFileData, filterText);
        }
    });
}

var COLORMAP_LIST = ['grayscale', 'viridis', 'inferno', 'plasma', 'hot', 'jet', 'turbo', 'coolwarm', 'rdbu'];

function getNextColormap(direction) {
    var idx = COLORMAP_LIST.indexOf(state.currentColormap);
    if (idx === -1) idx = 0;
    idx = (idx + direction + COLORMAP_LIST.length) % COLORMAP_LIST.length;
    return COLORMAP_LIST[idx];
}

function switchDisplayMode() {
    state.currentDisplayMode = state.currentDisplayMode === 'image' ? 'table' : 'image';
    state.dirty = true;
    localStorage.setItem('matViewerDisplayMode', state.currentDisplayMode);
    if (state.fullVariableData && state.currentVariableData) {
        mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (settingsPanel.classList.contains('open')) return;

    var handled = false;
    switch (e.key) {
        case '+':
        case '=':
            zoomCanvas(1.5);
            handled = true;
            break;
        case '-':
        case '_':
            zoomCanvas(1 / 1.5);
            handled = true;
            break;
        case '0':
            resetCanvasZoom();
            handled = true;
            break;
        case 'ArrowRight':
        case ']':
            if (state.fullVariableData && state.fullVariableData.shape && state.fullVariableData.shape.length >= 3) {
                var maxSlice = state.fullVariableData.shape[state.currentAxis] - 1;
                if (state.currentSlice < maxSlice) {
                    updateSlice(state.currentSlice + 1);
                    var slider = document.getElementById('sliceSlider');
                    if (slider) slider.value = state.currentSlice;
                }
                handled = true;
            }
            break;
        case 'ArrowLeft':
        case '[':
            if (state.fullVariableData && state.fullVariableData.shape && state.fullVariableData.shape.length >= 3) {
                if (state.currentSlice > 0) {
                    updateSlice(state.currentSlice - 1);
                    var slider = document.getElementById('sliceSlider');
                    if (slider) slider.value = state.currentSlice;
                }
                handled = true;
            }
            break;
        case 't':
        case 'T':
            switchDisplayMode();
            handled = true;
            break;
        case 'i':
        case 'I':
            if (state.currentDisplayMode !== 'image') {
                state.currentDisplayMode = 'image';
                state.dirty = true;
                localStorage.setItem('matViewerDisplayMode', 'image');
                if (state.fullVariableData && state.currentVariableData) {
                    mainContent.innerHTML = renderPreview(state.currentVariableData.name, state.fullVariableData);
                }
            }
            handled = true;
            break;
        case 'c':
        case 'C':
            var nextCmap = getNextColormap(e.shiftKey ? -1 : 1);
            setColormap(nextCmap);
            var select = document.getElementById('colormapSelect');
            if (select) select.value = nextCmap;
            handled = true;
            break;
    }
    if (handled) {
        e.preventDefault();
        e.stopPropagation();
    }
});

window.addEventListener('message', handleMessage);
`;
}
