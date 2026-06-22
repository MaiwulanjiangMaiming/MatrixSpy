export function getJs(version: string): string {
    return `
function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isSpecialValue(v) { return v === 'NaN' || v === 'Inf' || v === '-Inf'; }
function isNumericOrNull(v) { return v === null || v === undefined || typeof v === 'number'; }

const VERSION = '${version}';
const vscode = acquireVsCodeApi();

// Global error handler - catches rendering errors and displays them
window.onerror = function(msg, url, lineNo, colNo, error) {
    console.error('[MatrixSpy] Unhandled error:', msg, 'at line', lineNo);
    var mc = document.getElementById('mainContent');
    if (mc) {
        mc.innerHTML = '<div class="error" style="padding:20px;">Unexpected error: ' + escapeHtml(String(msg)) + '<br><small>Line ' + lineNo + '</small></div>';
    }
    return false;
};

const mainContent = document.getElementById('mainContent');
const fileInfo = document.getElementById('fileInfo');
const settingsBtn = document.getElementById('settingsBtn');
const exportBtn = document.getElementById('exportBtn');
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
    windowWidth: 1.0,
    current1DViewMode: localStorage.getItem('matViewer1DViewMode') || 'grid',
    navigationPath: [],
    roiState: { active: false, startX: 0, startY: 0, endX: 0, endY: 0, dragging: false },
    currentStats: null
};

function MatViewerStore() {
    this._state = {};
    this._listeners = [];
    this._history = [];
    this._historyIndex = -1;
}
MatViewerStore.prototype.get = function(key) { return this._state[key]; };
MatViewerStore.prototype.set = function(key, value) {
    var old = this._state[key];
    this._state[key] = value;
    this._notify(key, old, value);
};
MatViewerStore.prototype.getAll = function() { return Object.assign({}, this._state); };
MatViewerStore.prototype.setMany = function(obj) {
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
            var old = this._state[k];
            this._state[k] = obj[k];
            this._notify(k, old, obj[k]);
        }
    }
};
MatViewerStore.prototype.subscribe = function(fn) { this._listeners.push(fn); };
MatViewerStore.prototype._notify = function(key, oldVal, newVal) {
    for (var i = 0; i < this._listeners.length; i++) {
        this._listeners[i](key, oldVal, newVal);
    }
};
MatViewerStore.prototype.snapshot = function() {
    this._history = this._history.slice(0, this._historyIndex + 1);
    var fullData = this._state.fullVariableData;
    var uiState = JSON.parse(JSON.stringify(this._state));
    delete uiState.fullVariableData;
    this._history.push({ ui: uiState, full: fullData });
    this._historyIndex = this._history.length - 1;
    if (this._history.length > 50) {
        this._history.shift();
        this._historyIndex--;
    }
};
MatViewerStore.prototype.undo = function() {
    if (this._historyIndex > 0) {
        this._historyIndex--;
        var entry = this._history[this._historyIndex];
        this._state = JSON.parse(JSON.stringify(entry.ui));
        this._state.fullVariableData = entry.full;
        this._notify('*', null, null);
    }
};
MatViewerStore.prototype.redo = function() {
    if (this._historyIndex < this._history.length - 1) {
        this._historyIndex++;
        var entry = this._history[this._historyIndex];
        this._state = JSON.parse(JSON.stringify(entry.ui));
        this._state.fullVariableData = entry.full;
        this._notify('*', null, null);
    }
};
MatViewerStore.prototype.persist = function() {
    try {
        var persistKeys = ['currentDisplayMode','currentViewMode','currentAxis','currentSlice','currentColormap','current1DViewMode','sidebarCollapsed'];
        var obj = {};
        for (var i = 0; i < persistKeys.length; i++) {
            if (this._state[persistKeys[i]] !== undefined) {
                obj[persistKeys[i]] = this._state[persistKeys[i]];
            }
        }
        vscode.setState(JSON.stringify(obj));
    } catch(e) {}
};
MatViewerStore.prototype.restore = function() {
    try {
        var saved = vscode.getState();
        if (saved) {
            var obj = JSON.parse(saved);
            this.setMany(obj);
        }
    } catch(e) {}
};

var store = new MatViewerStore();
store.setMany({
    currentDisplayMode: state.currentDisplayMode,
    currentViewMode: state.currentViewMode,
    currentAxis: state.currentAxis,
    currentSlice: state.currentSlice,
    currentColormap: state.currentColormap,
    current1DViewMode: state.current1DViewMode,
    sidebarCollapsed: state.sidebarCollapsed
});
store.subscribe(function(key, oldVal, newVal) {
    if (key !== '*') {
        state[key] = newVal;
    } else {
        var all = store.getAll();
        for (var k in all) {
            if (all.hasOwnProperty(k) && state.hasOwnProperty(k)) {
                state[k] = all[k];
            }
        }
    }
    store.persist();
});
store.restore();
store.snapshot();

var sliceCache = {};
var SLICE_CACHE_MAX = 10;
var prefetchQueue = [];
var isPrefetching = false;
var lastSliceDirection = 1;
var lastSliceIndex = -1;

function sliceCacheKey(axis, index) {
    return state.currentActiveVariable + ':' + axis + ':' + index;
}

function sliceCachePut(axis, index, data) {
    var key = sliceCacheKey(axis, index);
    sliceCache[key] = data;
    var keys = Object.keys(sliceCache);
    if (keys.length > SLICE_CACHE_MAX) {
        delete sliceCache[keys[0]];
    }
}

function sliceCacheGet(axis, index) {
    var key = sliceCacheKey(axis, index);
    return sliceCache[key] || null;
}

function sliceCacheClear() {
    sliceCache = {};
    prefetchQueue = [];
    lastSliceIndex = -1;
    lastSliceDirection = 1;
}

function prefetchSlices(axis, currentIndex, maxSlice) {
    if (lastSliceIndex >= 0 && currentIndex !== lastSliceIndex) {
        lastSliceDirection = currentIndex > lastSliceIndex ? 1 : -1;
    }
    lastSliceIndex = currentIndex;

    var indices;
    if (lastSliceDirection > 0) {
        indices = [currentIndex + 1, currentIndex + 2, currentIndex + 3, currentIndex - 1];
    } else {
        indices = [currentIndex - 1, currentIndex - 2, currentIndex - 3, currentIndex + 1];
    }
    for (var i = 0; i < indices.length; i++) {
        var idx = indices[i];
        if (idx >= 0 && idx < maxSlice && !sliceCacheGet(axis, idx) && prefetchQueue.indexOf(idx) === -1) {
            prefetchQueue.push(idx);
        }
    }
    processPrefetchQueue(axis);
}

function processPrefetchQueue(axis) {
    if (isPrefetching || prefetchQueue.length === 0) return;
    isPrefetching = true;
    var idx = prefetchQueue.shift();
    vscode.postMessage({
        command: 'loadSlice',
        variableName: state.currentActiveVariable,
        axis: axis,
        index: idx
    });
}

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

var BUILTIN_COLORMAP_NAMES = ['grayscale','viridis','inferno','plasma','hot','jet','turbo','coolwarm','rdbu'];

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

    var html = '<div class="sidebar-tree-item' + (isActive ? ' active' : '') + '" data-path="' + escapeHtml(path) + '" data-depth="' + depth + '" role="treeitem" aria-expanded="' + (hasChildren ? (isExpanded ? 'true' : 'false') : 'undefined') + '">';

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
        html += '<div class="sidebar-tree-children expanded" role="group">';
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

    store.setMany({
        currentDisplayMode: state.currentDisplayMode,
        currentViewMode: state.currentViewMode,
        currentAxis: state.currentAxis,
        currentSlice: 0,
        currentColormap: state.currentColormap,
        current1DViewMode: state.current1DViewMode
    });
    store.snapshot();

    state.navigationPath = [{ name: parts[0], path: parts[0] }];
    for (var ni = 1; ni < parts.length; ni++) {
        var prevPath = state.navigationPath[ni - 1].path;
        state.navigationPath.push({ name: parts[ni], path: prevPath + '.' + parts[ni] });
    }

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

    try {
        mainContent.innerHTML = renderBreadcrumb() + renderPreview(parts[parts.length - 1], value);
    } catch(e) {
        mainContent.innerHTML = renderBreadcrumb() + '<div class="error" style="padding:20px;">Error rendering variable: ' + escapeHtml(String(e)) + '</div>';
        console.error('[MatrixSpy] renderPreview error:', e);
    }

    initPreviewWidgets();

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
        var imagNum2 = value.imag;
        var imagNonNeg2 = (typeof imagNum2 === 'number' && imagNum2 >= 0) || imagNum2 === 'Inf';
        return escapeHtml(String(value.real)) + (imagNonNeg2 ? '+' : '') + escapeHtml(String(value.imag)) + 'i';
    } else if (value && value._type === 'ndarray') {
        return escapeHtml('ndarray: ' + value.shape.join('\\u00D7') + ' \\u00B7 ' + value.dtype);
    } else if (typeof value === 'object' && value !== null) {
        return escapeHtml('Object: ' + Object.keys(value).filter(function(k) { return k !== '_type'; }).join(', '));
    }
    return escapeHtml(String(value));
}

function renderStats(stats) {
    if (!stats || stats.min === undefined) return '';
    state.currentStats = stats;
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

    if (stats.percentiles) {
        html += '<div class="mini-histogram-container">';
        html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);margin-bottom:4px;">Distribution</div>';
        html += '<div id="miniHistogramContainer" class="mini-histogram-wrapper"></div>';
        html += '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--vscode-descriptionForeground);font-family:monospace;margin-top:2px;">';
        html += '<span>' + formatValue(stats.min) + '</span><span>' + formatValue(stats.max) + '</span>';
        html += '</div>';
        html += '<button id="expandHistogramBtn" class="expand-histogram-btn" title="Expand histogram">Expand Histogram</button>';
        html += '</div>';
    }

    return html;
}

function get2DSlice(value, viewMode) {
    if (!value.data) return null;

    var data = value.data;

    if (value.complex) {
        if (viewMode === 'magnitude') {
            return data.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        var r = typeof v.real === 'number' ? v.real : (v.real === 'Inf' ? Infinity : v.real === '-Inf' ? -Infinity : NaN);
                        var i = typeof v.imag === 'number' ? v.imag : (v.imag === 'Inf' ? Infinity : v.imag === '-Inf' ? -Infinity : NaN);
                        return Math.sqrt(r * r + i * i);
                    }
                    return v;
                });
            });
        } else if (viewMode === 'phase') {
            return data.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        var r = typeof v.real === 'number' ? v.real : (v.real === 'Inf' ? Infinity : v.real === '-Inf' ? -Infinity : NaN);
                        var i = typeof v.imag === 'number' ? v.imag : (v.imag === 'Inf' ? Infinity : v.imag === '-Inf' ? -Infinity : NaN);
                        return Math.atan2(i, r);
                    }
                    return v;
                });
            });
        } else if (viewMode === 'real') {
            return data.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        if (isSpecialValue(v.real)) return v.real;
                        return v.real;
                    }
                    return v;
                });
            });
        } else if (viewMode === 'imag') {
            return data.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        if (isSpecialValue(v.imag)) return v.imag;
                        return v.imag;
                    }
                    return v;
                });
            });
        }
    }
    return data;
}

function getNDSlice(value, axis, sliceIndex, viewMode) {
    if (!value.data) return null;

    function extractSlice(data, targetAxis, currentAxis, idx) {
        if (currentAxis === targetAxis) {
            return data[idx];
        }
        if (Array.isArray(data)) {
            return data.map(function(item) {
                return extractSlice(item, targetAxis, currentAxis + 1, idx);
            });
        }
        return data;
    }

    var sliceData = extractSlice(value.data, axis, 0, sliceIndex);

    function flattenTo2D(data) {
        if (!Array.isArray(data)) return [[data]];
        if (!Array.isArray(data[0])) return [data];
        if (Array.isArray(data[0][0])) {
            var result = [];
            for (var i = 0; i < data.length; i++) {
                var flat = flattenTo2D(data[i]);
                for (var j = 0; j < flat.length; j++) {
                    result.push(flat[j]);
                }
            }
            return result;
        }
        return data;
    }

    sliceData = flattenTo2D(sliceData);

    if (sliceData && value.complex) {
        if (viewMode === 'magnitude') {
            return sliceData.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        var r = typeof v.real === 'number' ? v.real : (v.real === 'Inf' ? Infinity : v.real === '-Inf' ? -Infinity : NaN);
                        var i = typeof v.imag === 'number' ? v.imag : (v.imag === 'Inf' ? Infinity : v.imag === '-Inf' ? -Infinity : NaN);
                        return Math.sqrt(r * r + i * i);
                    }
                    return v;
                });
            });
        } else if (viewMode === 'phase') {
            return sliceData.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        var r = typeof v.real === 'number' ? v.real : (v.real === 'Inf' ? Infinity : v.real === '-Inf' ? -Infinity : NaN);
                        var i = typeof v.imag === 'number' ? v.imag : (v.imag === 'Inf' ? Infinity : v.imag === '-Inf' ? -Infinity : NaN);
                        return Math.atan2(i, r);
                    }
                    return v;
                });
            });
        } else if (viewMode === 'real') {
            return sliceData.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        if (isSpecialValue(v.real)) return v.real;
                        return v.real;
                    }
                    return v;
                });
            });
        } else if (viewMode === 'imag') {
            return sliceData.map(function(row) {
                return row.map(function(v) {
                    if (v && v._type === 'complex') {
                        if (isSpecialValue(v.imag)) return v.imag;
                        return v.imag;
                    }
                    return v;
                });
            });
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

function toggleROI() {
    state.roiState.active = !state.roiState.active;
    var roiBtn = document.getElementById('roiBtn');
    if (roiBtn) {
        roiBtn.classList.toggle('active', state.roiState.active);
    }
    if (!state.roiState.active) {
        removeROIOverlay();
    }
}

function removeROIOverlay() {
    var overlay = document.getElementById('roiOverlay');
    if (overlay) overlay.remove();
    var statsPanel = document.getElementById('roiStatsPanel');
    if (statsPanel) statsPanel.remove();
}

function computeROIStats(data, x1, y1, x2, y2) {
    var minX = Math.min(x1, x2);
    var maxX = Math.max(x1, x2);
    var minY = Math.min(y1, y2);
    var maxY = Math.max(y1, y2);
    var values = [];
    for (var y = minY; y <= maxY && y < data.length; y++) {
        for (var x = minX; x <= maxX && x < (data[y] ? data[y].length : 0); x++) {
            var v = data[y][x];
            if (v !== null && v !== undefined && typeof v === 'number') {
                values.push(v);
            }
        }
    }
    if (values.length === 0) return null;
    var sum = 0, min = Infinity, max = -Infinity;
    for (var i = 0; i < values.length; i++) {
        sum += values[i];
        if (values[i] < min) min = values[i];
        if (values[i] > max) max = values[i];
    }
    var mean = sum / values.length;
    var sumSqDiff = 0;
    for (var j = 0; j < values.length; j++) {
        sumSqDiff += (values[j] - mean) * (values[j] - mean);
    }
    var std = Math.sqrt(sumSqDiff / values.length);
    return { mean: mean, std: std, min: min, max: max, count: values.length };
}

function renderROIOverlay() {
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;

    var viewer = canvas.closest('.image-viewer');
    if (!viewer) return;

    var roi = state.roiState;
    var canvasRect = canvas.getBoundingClientRect();
    var viewerRect = viewer.getBoundingClientRect();

    var offsetX = canvasRect.left - viewerRect.left;
    var offsetY = canvasRect.top - viewerRect.top;

    var scaleX = canvasRect.width / (canvasZoomState.naturalWidth || canvasRect.width);
    var scaleY = canvasRect.height / (canvasZoomState.naturalHeight || canvasRect.height);

    var left = offsetX + Math.min(roi.startX, roi.endX) * scaleX;
    var top = offsetY + Math.min(roi.startY, roi.endY) * scaleY;
    var width = Math.abs(roi.endX - roi.startX) * scaleX;
    var height = Math.abs(roi.endY - roi.startY) * scaleY;

    var overlay = document.getElementById('roiOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'roiOverlay';
        viewer.appendChild(overlay);
    }
    overlay.style.cssText = 'position:absolute;left:' + left + 'px;top:' + top + 'px;width:' + width + 'px;height:' + height + 'px;border:2px dashed #00ff00;pointer-events:none;z-index:5;background:rgba(0,255,0,0.05);';
}

function showROIStats(stats) {
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;
    var viewer = canvas.closest('.image-viewer');
    if (!viewer) return;

    var roi = state.roiState;
    var canvasRect = canvas.getBoundingClientRect();
    var viewerRect = viewer.getBoundingClientRect();
    var scaleX = canvasRect.width / (canvasZoomState.naturalWidth || canvasRect.width);
    var scaleY = canvasRect.height / (canvasZoomState.naturalHeight || canvasRect.height);

    var left = (canvasRect.left - viewerRect.left) + Math.min(roi.startX, roi.endX) * scaleX;
    var top = (canvasRect.top - viewerRect.top) + Math.min(roi.startY, roi.endY) * scaleY;
    var width = Math.abs(roi.endX - roi.startX) * scaleX;

    var panel = document.getElementById('roiStatsPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'roiStatsPanel';
        viewer.appendChild(panel);
    }
    var panelLeft = left + width + 8;
    if (panelLeft + 180 > viewerRect.width) {
        panelLeft = left - 188;
    }
    panel.style.cssText = 'position:absolute;left:' + panelLeft + 'px;top:' + top + 'px;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:6px;padding:8px 12px;font-size:12px;z-index:10;pointer-events:none;min-width:160px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    panel.innerHTML = '<div style="font-weight:600;margin-bottom:4px;color:var(--vscode-textLink-foreground);">ROI Stats</div>' +
        '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-family:monospace;">' +
        '<span style="color:var(--vscode-descriptionForeground);">Mean:</span><span>' + formatFixed(stats.mean, 4) + '</span>' +
        '<span style="color:var(--vscode-descriptionForeground);">Std:</span><span>' + formatFixed(stats.std, 4) + '</span>' +
        '<span style="color:var(--vscode-descriptionForeground);">Min:</span><span>' + formatFixed(stats.min, 4) + '</span>' +
        '<span style="color:var(--vscode-descriptionForeground);">Max:</span><span>' + formatFixed(stats.max, 4) + '</span>' +
        '<span style="color:var(--vscode-descriptionForeground);">Count:</span><span>' + stats.count + '</span>' +
        '</div>';
}

function initROIEvents() {
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;
    if (canvas.dataset.roiEventsInitialized) return;
    canvas.dataset.roiEventsInitialized = 'true';

    // Remove the previous document-level mouseup handler before adding a new
    // one. Without this, every call to initROIEvents (which fires on every
    // preview refresh) would leak a closure on 'document' that references the
    // now-detached canvas, causing unbounded memory growth.
    if (roiMouseUpHandler) {
        document.removeEventListener('mouseup', roiMouseUpHandler);
        roiMouseUpHandler = null;
    }

    canvas.addEventListener('mousedown', function(e) {
        if (!state.roiState.active) return;
        if (e.button !== 0) return;
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var scaleX = (canvasZoomState.naturalWidth || canvas.width) / rect.width;
        var scaleY = (canvasZoomState.naturalHeight || canvas.height) / rect.height;
        state.roiState.startX = Math.round((e.clientX - rect.left) * scaleX);
        state.roiState.startY = Math.round((e.clientY - rect.top) * scaleY);
        state.roiState.endX = state.roiState.startX;
        state.roiState.endY = state.roiState.startY;
        state.roiState.dragging = true;
        removeROIOverlay();
    });

    canvas.addEventListener('mousemove', function(e) {
        if (!state.roiState.dragging) return;
        var rect = canvas.getBoundingClientRect();
        var scaleX = (canvasZoomState.naturalWidth || canvas.width) / rect.width;
        var scaleY = (canvasZoomState.naturalHeight || canvas.height) / rect.height;
        state.roiState.endX = Math.max(0, Math.min(Math.round((e.clientX - rect.left) * scaleX), canvasZoomState.naturalWidth - 1));
        state.roiState.endY = Math.max(0, Math.min(Math.round((e.clientY - rect.top) * scaleY), canvasZoomState.naturalHeight - 1));
        renderROIOverlay();
    });

    var mouseUpHandler = function() {
        if (!state.roiState.dragging) return;
        state.roiState.dragging = false;
        var roi = state.roiState;
        if (Math.abs(roi.endX - roi.startX) < 2 || Math.abs(roi.endY - roi.startY) < 2) {
            removeROIOverlay();
            return;
        }
        var currentData = pendingCanvasData;
        if (!currentData) return;
        var stats = computeROIStats(currentData, roi.startX, roi.startY, roi.endX, roi.endY);
        if (stats) {
            showROIStats(stats);
        }
    };

    canvas.addEventListener('mouseup', mouseUpHandler);
    // Track the document-level handler so we can remove it on the next call.
    roiMouseUpHandler = mouseUpHandler;
    document.addEventListener('mouseup', mouseUpHandler);
}

/** Tracks the document-level ROI mouseup handler so it can be cleaned up. */
var roiMouseUpHandler = null;

var heatmapTooltip = null;

function initHeatmapTooltip() {
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;
    if (canvas.dataset.heatmapTooltipInitialized) return;
    canvas.dataset.heatmapTooltipInitialized = 'true';

    if (heatmapTooltip) {
        heatmapTooltip.remove();
        heatmapTooltip = null;
    }

    heatmapTooltip = document.createElement('div');
    heatmapTooltip.className = 'heatmap-tooltip';
    heatmapTooltip.style.display = 'none';
    document.body.appendChild(heatmapTooltip);

    canvas.addEventListener('mousemove', function(e) {
        try {
            if (state.roiState.dragging) {
                heatmapTooltip.style.display = 'none';
                return;
            }
            var rect = canvas.getBoundingClientRect();
            var nw = canvasZoomState.naturalWidth || canvas.width;
            var nh = canvasZoomState.naturalHeight || canvas.height;
            var scaleX = nw / rect.width;
            var scaleY = nh / rect.height;
            var col = Math.floor((e.clientX - rect.left) * scaleX);
            var row = Math.floor((e.clientY - rect.top) * scaleY);
            if (col < 0 || col >= nw || row < 0 || row >= nh) {
                heatmapTooltip.style.display = 'none';
                return;
            }
            var currentData = pendingCanvasData;
            if (!currentData || !currentData[row]) {
                heatmapTooltip.style.display = 'none';
                return;
            }
            var val = currentData[row][col];
            var valStr;
            if (val === null || val === undefined) {
                valStr = 'N/A';
            } else if (isSpecialValue(val)) {
                valStr = val;
            } else if (typeof val === 'object' && val._type === 'complex') {
                var rPart = formatFixed(val.real, 4);
                var iPart = formatFixed(val.imag, 4);
                var imagNonNeg = (typeof val.imag === 'number' && val.imag >= 0) || val.imag === 'Inf';
                valStr = rPart + (imagNonNeg ? '+' : '') + iPart + 'i';
            } else if (typeof val === 'number') {
                if (isNaN(val)) valStr = 'NaN';
                else if (!isFinite(val)) valStr = val > 0 ? '+Inf' : '-Inf';
                else valStr = formatValue(val);
            } else {
                valStr = String(val);
            }
            heatmapTooltip.innerHTML =
                '<span class="ht-row">Row ' + row + '</span>' +
                '<span class="ht-col">Col ' + col + '</span>' +
                '<span class="ht-val">' + valStr + '</span>';
            heatmapTooltip.style.display = 'block';
            var tx = e.clientX + 14;
            var ty = e.clientY + 14;
            if (tx + 180 > window.innerWidth) tx = e.clientX - 180;
            if (ty + 60 > window.innerHeight) ty = e.clientY - 60;
            heatmapTooltip.style.left = tx + 'px';
            heatmapTooltip.style.top = ty + 'px';
        } catch(err) {}
    });

    canvas.addEventListener('mouseleave', function() {
        if (heatmapTooltip) heatmapTooltip.style.display = 'none';
    });
}

var contextMenuEl = null;

function hideContextMenu() {
    if (contextMenuEl) {
        contextMenuEl.remove();
        contextMenuEl = null;
    }
}

function showContextMenu(items, x, y) {
    hideContextMenu();
    var menu = document.createElement('div');
    menu.className = 'context-menu';
    items.forEach(function(item) {
        var btn = document.createElement('div');
        btn.className = 'context-menu-item';
        btn.textContent = item.label;
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            hideContextMenu();
            item.action();
        });
        menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    var mw = menu.offsetWidth || 180;
    var mh = menu.offsetHeight || items.length * 32;
    var mx = x;
    var my = y;
    if (mx + mw > window.innerWidth) mx = window.innerWidth - mw - 4;
    if (my + mh > window.innerHeight) my = window.innerHeight - mh - 4;
    menu.style.left = mx + 'px';
    menu.style.top = my + 'px';
    contextMenuEl = menu;
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

function initTableContextMenu() {
    var table = document.querySelector('.data-table');
    if (!table) return;
    if (table.dataset.contextMenuInitialized) return;
    table.dataset.contextMenuInitialized = 'true';

    table.addEventListener('contextmenu', function(e) {
        var td = e.target;
        while (td && td.tagName !== 'TD') { td = td.parentElement; }
        if (!td) return;
        e.preventDefault();
        var tr = td.parentElement;
        var rowIdx = -1;
        var colIdx = -1;
        var cells = tr.querySelectorAll('td');
        for (var ci = 0; ci < cells.length; ci++) {
            if (cells[ci] === td) { colIdx = ci; break; }
        }
        var rows = table.querySelectorAll('tr');
        for (var ri = 0; ri < rows.length; ri++) {
            if (rows[ri] === tr) { rowIdx = ri - 1; break; }
        }
        var cellText = td.textContent || '';
        var items = [
            { label: 'Copy Cell Value', action: function() { copyToClipboard(cellText.trim()); } },
            { label: 'Copy Current Row', action: function() {
                var rowData = [];
                var tds = tr.querySelectorAll('td');
                for (var i = 0; i < tds.length; i++) { rowData.push(tds[i].textContent.trim()); }
                copyToClipboard(rowData.join('\\t'));
            }},
            { label: 'Copy Current Column', action: function() {
                var colData = [];
                for (var i = 0; i < rows.length; i++) {
                    var tds = rows[i].querySelectorAll('td');
                    if (tds[colIdx]) colData.push(tds[colIdx].textContent.trim());
                }
                copyToClipboard(colData.join('\\n'));
            }},
            { label: 'Copy as CSV', action: function() {
                var csvLines = [];
                for (var i = 0; i < rows.length; i++) {
                    var cells = rows[i].querySelectorAll('th, td');
                    var line = [];
                    for (var j = 0; j < cells.length; j++) {
                        var t = cells[j].textContent.trim();
                        if (t.indexOf(',') >= 0 || t.indexOf('"') >= 0) t = '"' + t.replace(/"/g, '""') + '"';
                        line.push(t);
                    }
                    csvLines.push(line.join(','));
                }
                copyToClipboard(csvLines.join('\\n'));
            }}
        ];
        showContextMenu(items, e.clientX, e.clientY);
    });
}

function initHeatmapContextMenu() {
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;
    if (canvas.dataset.heatmapContextMenuInitialized) return;
    canvas.dataset.heatmapContextMenuInitialized = 'true';

    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var nw = canvasZoomState.naturalWidth || canvas.width;
        var nh = canvasZoomState.naturalHeight || canvas.height;
        var scaleX = nw / rect.width;
        var scaleY = nh / rect.height;
        var col = Math.floor((e.clientX - rect.left) * scaleX);
        var row = Math.floor((e.clientY - rect.top) * scaleY);
        if (col < 0 || col >= nw || row < 0 || row >= nh) return;
        var currentData = pendingCanvasData;
        var val = (currentData && currentData[row]) ? currentData[row][col] : undefined;
        var valStr;
        if (val === null || val === undefined) valStr = 'N/A';
        else if (isSpecialValue(val)) valStr = val;
        else if (typeof val === 'number') {
            if (isNaN(val)) valStr = 'NaN';
            else if (!isFinite(val)) valStr = val > 0 ? '+Inf' : '-Inf';
            else valStr = formatValue(val);
        } else if (typeof val === 'object' && val._type === 'complex') {
            var rPart2 = formatFixed(val.real, 4);
            var iPart2 = formatFixed(val.imag, 4);
            var imagNonNeg2 = (typeof val.imag === 'number' && val.imag >= 0) || val.imag === 'Inf';
            valStr = rPart2 + (imagNonNeg2 ? '+' : '') + iPart2 + 'i';
        } else {
            valStr = String(val);
        }
        var items = [
            { label: 'Copy Value: ' + valStr, action: function() { copyToClipboard(valStr); } },
            { label: 'Copy Position [' + row + ', ' + col + ']', action: function() { copyToClipboard('[' + row + ', ' + col + '] = ' + valStr); } }
        ];
        showContextMenu(items, e.clientX, e.clientY);
    });
}

var valueSearchPanel = null;
var searchHighlightOverlay = null;

function toggleValueSearch() {
    if (valueSearchPanel) {
        valueSearchPanel.remove();
        valueSearchPanel = null;
        removeSearchHighlights();
        return;
    }
    removeSearchHighlights();
    valueSearchPanel = document.createElement('div');
    valueSearchPanel.className = 'value-search-panel';
    valueSearchPanel.innerHTML =
        '<div class="vs-header">' +
        '<span class="vs-title">Search Values</span>' +
        '<button class="vs-close" id="vsCloseBtn">✕</button>' +
        '</div>' +
        '<div class="vs-body">' +
        '<input type="text" id="vsInput" class="vs-input" placeholder="e.g. > 1e6, == NaN, < 0, Inf" />' +
        '<button class="vs-go" id="vsGoBtn">Search</button>' +
        '</div>' +
        '<div class="vs-results" id="vsResults"></div>';
    document.body.appendChild(valueSearchPanel);

    document.getElementById('vsCloseBtn').addEventListener('click', function() {
        if (valueSearchPanel) { valueSearchPanel.remove(); valueSearchPanel = null; }
        removeSearchHighlights();
    });

    document.getElementById('vsGoBtn').addEventListener('click', function() { executeValueSearch(); });
    document.getElementById('vsInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') executeValueSearch();
    });

    setTimeout(function() { document.getElementById('vsInput').focus(); }, 50);
}

function parseSearchCondition(expr) {
    expr = expr.trim();
    if (!expr) return null;
    var lower = expr.toLowerCase();
    if (lower === 'nan') return function(v) { return v === 'NaN' || (typeof v === 'number' && isNaN(v)); };
    if (lower === 'inf' || lower === '+inf') return function(v) { return v === 'Inf' || (typeof v === 'number' && v === Infinity); };
    if (lower === '-inf') return function(v) { return v === '-Inf' || (typeof v === 'number' && v === -Infinity); };
    if (lower === 'negative' || lower === '<0') return function(v) { return typeof v === 'number' && v < 0 && isFinite(v); };
    if (lower === 'positive' || lower === '>0') return function(v) { return typeof v === 'number' && v > 0 && isFinite(v); };
    if (lower === 'zero' || lower === '==0') return function(v) { return v === 0; };

    var m = expr.match(/^(>|>=|<|<=|==|!=|=) *(.+)$/);
    if (m) {
        var op = m[1];
        var val = parseFloat(m[2]);
        if (isNaN(val)) return null;
        switch (op) {
            case '>':  return function(v) { return typeof v === 'number' && isFinite(v) && v > val; };
            case '>=': return function(v) { return typeof v === 'number' && isFinite(v) && v >= val; };
            case '<':  return function(v) { return typeof v === 'number' && isFinite(v) && v < val; };
            case '<=': return function(v) { return typeof v === 'number' && isFinite(v) && v <= val; };
            case '==': case '=': return function(v) { return typeof v === 'number' && v === val; };
            case '!=': return function(v) { return typeof v === 'number' && v !== val; };
        }
    }
    var numVal = parseFloat(expr);
    if (!isNaN(numVal)) {
        return function(v) { return typeof v === 'number' && Math.abs(v - numVal) < Math.abs(numVal) * 1e-6 + 1e-10; };
    }
    return null;
}

function executeValueSearch() {
    var input = document.getElementById('vsInput');
    var resultsEl = document.getElementById('vsResults');
    if (!input || !resultsEl) return;

    var expr = input.value.trim();
    if (!expr) { resultsEl.innerHTML = '<div class="vs-empty">Enter a condition to search</div>'; return; }

    var cond = parseSearchCondition(expr);
    if (!cond) { resultsEl.innerHTML = '<div class="vs-error">Invalid expression. Try: > 1e6, == NaN, < 0, Inf</div>'; return; }

    var currentData = pendingCanvasData;
    if (!currentData) { resultsEl.innerHTML = '<div class="vs-error">No data to search</div>'; return; }

    var matches = [];
    var maxResults = 500;
    for (var r = 0; r < currentData.length; r++) {
        var row = currentData[r];
        if (!row) continue;
        for (var c = 0; c < row.length; c++) {
            if (cond(row[c])) {
                matches.push({ row: r, col: c, val: row[c] });
                if (matches.length >= maxResults) break;
            }
        }
        if (matches.length >= maxResults) break;
    }

    removeSearchHighlights();

    if (matches.length === 0) {
        resultsEl.innerHTML = '<div class="vs-empty">No matches found</div>';
        return;
    }

    var html = '<div class="vs-count">' + matches.length + (matches.length >= maxResults ? '+' : '') + ' matches</div>';
    html += '<div class="vs-list">';
    var showCount = Math.min(matches.length, 50);
    for (var i = 0; i < showCount; i++) {
        var m = matches[i];
        var valStr = typeof m.val === 'number' ? (isNaN(m.val) ? 'NaN' : isFinite(m.val) ? formatValue(m.val) : (m.val > 0 ? '+Inf' : '-Inf')) : String(m.val);
        html += '<div class="vs-match" data-row="' + m.row + '" data-col="' + m.col + '">[' + m.row + ', ' + m.col + '] = ' + valStr + '</div>';
    }
    if (matches.length > showCount) {
        html += '<div class="vs-more">... and ' + (matches.length - showCount) + ' more</div>';
    }
    html += '</div>';
    resultsEl.innerHTML = html;

    highlightSearchMatches(matches);
}

function removeSearchHighlights() {
    if (searchHighlightOverlay) {
        searchHighlightOverlay.remove();
        searchHighlightOverlay = null;
    }
    var existing = document.querySelectorAll('.vs-cell-highlight');
    for (var i = 0; i < existing.length; i++) { existing[i].classList.remove('vs-cell-highlight'); }
}

function highlightSearchMatches(matches) {
    if (state.currentDisplayMode === 'image') {
        var canvas = document.getElementById('imageCanvas');
        if (!canvas) return;
        var viewer = canvas.parentElement;
        if (!viewer) return;

        removeSearchHighlights();
        searchHighlightOverlay = document.createElement('div');
        searchHighlightOverlay.className = 'vs-highlight-overlay';

        var canvasRect = canvas.getBoundingClientRect();
        var viewerRect = viewer.getBoundingClientRect();
        var nw = canvasZoomState.naturalWidth || canvas.width;
        var nh = canvasZoomState.naturalHeight || canvas.height;
        var scaleX = canvasRect.width / nw;
        var scaleY = canvasRect.height / nh;
        var offsetX = canvasRect.left - viewerRect.left;
        var offsetY = canvasRect.top - viewerRect.top;

        var showCount = Math.min(matches.length, 200);
        for (var i = 0; i < showCount; i++) {
            var m = matches[i];
            var dot = document.createElement('div');
            dot.className = 'vs-highlight-dot';
            dot.style.left = (offsetX + m.col * scaleX) + 'px';
            dot.style.top = (offsetY + m.row * scaleY) + 'px';
            dot.style.width = Math.max(scaleX, 4) + 'px';
            dot.style.height = Math.max(scaleY, 4) + 'px';
            dot.title = '[' + m.row + ', ' + m.col + ']';
            searchHighlightOverlay.appendChild(dot);
        }
        viewer.appendChild(searchHighlightOverlay);
    } else {
        var table = document.querySelector('.data-table');
        if (!table) return;
        var rows = table.querySelectorAll('tr');
        var showCount = Math.min(matches.length, 200);
        var matchSet = {};
        for (var i = 0; i < showCount; i++) {
            matchSet[matches[i].row + ',' + matches[i].col] = true;
        }
        for (var ri = 1; ri < rows.length; ri++) {
            var cells = rows[ri].querySelectorAll('td');
            for (var ci = 0; ci < cells.length; ci++) {
                var key = (ri - 1) + ',' + ci;
                if (matchSet[key]) {
                    cells[ci].classList.add('vs-cell-highlight');
                }
            }
        }
    }
}

var fullHistogramPanel = null;

function showFullHistogram() {
    if (fullHistogramPanel) {
        fullHistogramPanel.remove();
        fullHistogramPanel = null;
        return;
    }
    var stats = state.currentStats;
    if (!stats || !stats.percentiles) return;
    var currentData = pendingCanvasData;

    fullHistogramPanel = document.createElement('div');
    fullHistogramPanel.className = 'full-histogram-panel';
    fullHistogramPanel.innerHTML =
        '<div class="fh-header">' +
        '<span class="fh-title">Histogram</span>' +
        '<div class="fh-controls">' +
        '<label class="fh-label">Bins</label>' +
        '<input type="range" id="fhBinSlider" min="5" max="100" value="30" class="fh-slider" />' +
        '<span id="fhBinCount" class="fh-bin-count">30</span>' +
        '<label class="fh-label"><input type="checkbox" id="fhLogY" /> Log Y</label>' +
        '</div>' +
        '<button class="fh-close" id="fhCloseBtn">✕</button>' +
        '</div>' +
        '<div class="fh-body">' +
        '<div id="fhSvgContainer" class="fh-svg-container"></div>' +
        '<div id="fhTooltip" class="fh-tooltip" style="display:none;"></div>' +
        '</div>';
    document.body.appendChild(fullHistogramPanel);

    document.getElementById('fhCloseBtn').addEventListener('click', function() {
        if (fullHistogramPanel) { fullHistogramPanel.remove(); fullHistogramPanel = null; }
    });
    document.getElementById('fhBinSlider').addEventListener('input', function() {
        document.getElementById('fhBinCount').textContent = this.value;
        drawFullHistogramSVG(currentData, stats, parseInt(this.value), document.getElementById('fhLogY').checked);
    });
    document.getElementById('fhLogY').addEventListener('change', function() {
        drawFullHistogramSVG(currentData, stats, parseInt(document.getElementById('fhBinSlider').value), this.checked);
    });

    drawFullHistogramSVG(currentData, stats, 30, false);
}

function drawFullHistogramSVG(data, stats, numBins, logY) {
    var container = document.getElementById('fhSvgContainer');
    if (!container) return;
    if (!stats || stats.min === null || stats.max === null || typeof stats.min !== 'number' || typeof stats.max !== 'number') return;

    var min = stats.min;
    var max = stats.max;
    var range = max - min || 1;

    var bins = new Array(numBins).fill(0);
    if (data) {
        for (var r = 0; r < data.length; r++) {
            var row = data[r];
            if (!row) continue;
            for (var c = 0; c < row.length; c++) {
                var v = row[c];
                if (typeof v === 'number' && isFinite(v)) {
                    var bi = Math.min(Math.floor((v - min) / range * numBins), numBins - 1);
                    if (bi >= 0) bins[bi]++;
                }
            }
        }
    } else if (stats.percentiles) {
        var pCounts = [0.05, 0.20, 0.25, 0.25, 0.20, 0.05];
        var pBounds = [min, stats.percentiles.p5, stats.percentiles.p25, stats.percentiles.p50, stats.percentiles.p75, stats.percentiles.p95, max];
        for (var seg = 0; seg < 6; seg++) {
            var segMin = pBounds[seg];
            var segMax = pBounds[seg + 1];
            var segRange = segMax - segMin || range * 0.01;
            var count = pCounts[seg];
            for (var bj = 0; bj < numBins; bj++) {
                var bCenter = min + range * (bj + 0.5) / numBins;
                if (bCenter >= segMin && bCenter < segMax) {
                    bins[bj] += count / (segRange / range * numBins);
                }
            }
        }
    }

    var maxBin = 0;
    for (var i = 0; i < bins.length; i++) {
        if (bins[i] > maxBin) maxBin = bins[i];
    }
    if (maxBin === 0) { container.innerHTML = ''; return; }

    var svgW = 600;
    var svgH = 300;
    var padL = 50;
    var padR = 15;
    var padT = 15;
    var padB = 35;
    var plotW = svgW - padL - padR;
    var plotH = svgH - padT - padB;
    var barW = plotW / numBins;

    var colormap = COLORMAPS[state.currentColormap] || COLORMAPS.grayscale;

    var maxVal = logY ? Math.log10(maxBin + 1) : maxBin;

    var bars = '';
    for (var bb = 0; bb < numBins; bb++) {
        var barVal = logY ? Math.log10(bins[bb] + 1) : bins[bb];
        var barH = maxVal > 0 ? (barVal / maxVal) * plotH : 0;
        var norm = bb / Math.max(numBins - 1, 1);
        var rgb = colormap(norm);
        var x = padL + bb * barW;
        var y = padT + plotH - barH;
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (barW - 0.8).toFixed(1) + '" height="' + barH.toFixed(1) + '" fill="rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')" opacity="0.85" rx="0.8" data-bin="' + bb + '" class="fh-bar" />';
    }

    var gridLines = '';
    var yLabels = '';
    for (var yi = 0; yi <= 4; yi++) {
        var yy = padT + plotH * (1 - yi / 4);
        gridLines += '<line x1="' + padL + '" y1="' + yy.toFixed(1) + '" x2="' + (padL + plotW) + '" y2="' + yy.toFixed(1) + '" stroke="var(--vscode-panel-border)" stroke-width="0.3" stroke-dasharray="3,3" />';
        var yval;
        if (logY) {
            yval = Math.pow(10, Math.log10(maxBin + 1) * yi / 4);
            yval = Math.round(yval);
        } else {
            yval = Math.round(maxBin * yi / 4);
        }
        yLabels += '<text x="' + (padL - 4) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end" font-size="7" fill="var(--vscode-descriptionForeground)" font-family="monospace">' + yval + '</text>';
    }

    var xLabels = '';
    var labelCount = Math.min(numBins, 8);
    for (var li = 0; li <= labelCount; li++) {
        var lx = padL + plotW * li / labelCount;
        var lval = min + range * li / labelCount;
        xLabels += '<text x="' + lx.toFixed(1) + '" y="' + (svgH - padB + 12) + '" text-anchor="middle" font-size="7" fill="var(--vscode-descriptionForeground)" font-family="monospace">' + formatValue(lval) + '</text>';
    }

    var medianLine = '';
    if (stats.percentiles && stats.percentiles.p50 !== undefined) {
        var medianX = padL + ((stats.percentiles.p50 - min) / range) * plotW;
        medianLine = '<line x1="' + medianX.toFixed(1) + '" y1="' + padT + '" x2="' + medianX.toFixed(1) + '" y2="' + (padT + plotH) + '" stroke="var(--vscode-descriptionForeground)" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.6" />';
        medianLine += '<text x="' + medianX.toFixed(1) + '" y="' + (padT - 3) + '" text-anchor="middle" font-size="6" fill="var(--vscode-descriptionForeground)" font-family="sans-serif">median</text>';
    }

    var svg = '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" preserveAspectRatio="xMidYMid meet" class="full-histogram-svg" xmlns="http://www.w3.org/2000/svg">';
    svg += gridLines + yLabels + xLabels + bars + medianLine;
    svg += '</svg>';

    container.innerHTML = svg;

    var svgEl = container.querySelector('svg');
    svgEl.addEventListener('mousemove', function(e) {
        var rect = svgEl.getBoundingClientRect();
        var scaleX = svgW / rect.width;
        var x = (e.clientX - rect.left) * scaleX;
        var binIdx = Math.floor((x - padL) / barW);
        if (binIdx < 0 || binIdx >= numBins) {
            document.getElementById('fhTooltip').style.display = 'none';
            return;
        }
        var binMin = min + range * binIdx / numBins;
        var binMax = min + range * (binIdx + 1) / numBins;
        var tip = document.getElementById('fhTooltip');
        tip.innerHTML = '<b>Bin ' + binIdx + '</b><br>Range: ' + formatValue(binMin) + ' ~ ' + formatValue(binMax) + '<br>Count: ' + Math.round(bins[binIdx]);
        tip.style.display = 'block';
        tip.style.left = (e.clientX + 12) + 'px';
        tip.style.top = (e.clientY - 30) + 'px';
    });
    svgEl.addEventListener('mouseleave', function() {
        document.getElementById('fhTooltip').style.display = 'none';
    });
}

var RENDER_WORKER_CODE = [
    'self.onmessage = function(e) {',
    '    var d = e.data;',
    '    var data = d.data;',
    '    var width = d.width;',
    '    var height = d.height;',
    '    var keyPoints = d.keyPoints;',
    '    var windowLevel = d.windowLevel;',
    '    var windowWidth = d.windowWidth;',
    '    var min = d.min;',
    '    var max = d.max;',
    '    var lut = new Array(256);',
    '    for (var i = 0; i < 256; i++) {',
    '        var t = i / 255;',
    '        var lower = keyPoints[0], upper = keyPoints[keyPoints.length - 1];',
    '        for (var j = 0; j < keyPoints.length - 1; j++) {',
    '            if (t >= keyPoints[j][0] && t <= keyPoints[j + 1][0]) {',
    '                lower = keyPoints[j];',
    '                upper = keyPoints[j + 1];',
    '                break;',
    '            }',
    '        }',
    '        var range = upper[0] - lower[0] || 1;',
    '        var f = (t - lower[0]) / range;',
    '        lut[i] = [',
    '            Math.round(lower[1] + (upper[1] - lower[1]) * f),',
    '            Math.round(lower[2] + (upper[2] - lower[2]) * f),',
    '            Math.round(lower[3] + (upper[3] - lower[3]) * f)',
    '        ];',
    '    }',
    '    var range = max - min || 1;',
    '    var windowCenter = min + range * windowLevel;',
    '    var windowHalf = range * windowWidth * 0.5;',
    '    var windowMin = windowCenter - windowHalf;',
    '    var windowMax = windowCenter + windowHalf;',
    '    var windowRange = windowMax - windowMin || 1;',
    '    var buf = new ArrayBuffer(width * height * 4);',
    '    var pixels = new Uint8ClampedArray(buf);',
    '    for (var y = 0; y < height; y++) {',
    '        for (var x = 0; x < width; x++) {',
    '            var val = data[y][x];',
    '            var pidx = (y * width + x) * 4;',
    '            if (val === "NaN" || (typeof val === "number" && isNaN(val))) {',
    '                pixels[pidx] = 180; pixels[pidx+1] = 60; pixels[pidx+2] = 60; pixels[pidx+3] = 200;',
    '            } else if (val === "Inf" || val === "-Inf" || (typeof val === "number" && !isFinite(val))) {',
    '                pixels[pidx] = 60; pixels[pidx+1] = 60; pixels[pidx+2] = 180; pixels[pidx+3] = 200;',
    '            } else {',
    '                var norm = typeof val === "number" ? (val - windowMin) / windowRange : 0;',
    '                norm = Math.max(0, Math.min(1, norm));',
    '                var idx = Math.min(255, Math.max(0, Math.round(norm * 255)));',
    '                var rgb = lut[idx];',
    '                pixels[pidx] = rgb[0];',
    '                pixels[pidx + 1] = rgb[1];',
    '                pixels[pidx + 2] = rgb[2];',
    '                pixels[pidx + 3] = 255;',
    '            }',
    '        }',
    '    }',
    '    self.postMessage({pixels: pixels, width: width, height: height}, [buf]);',
    '};'
].join('\\n');

var renderWorkerInstance = null;

function createRenderWorker() {
    try {
        var blob = new Blob([RENDER_WORKER_CODE], { type: 'application/javascript' });
        var url = URL.createObjectURL(blob);
        var worker = new Worker(url);
        URL.revokeObjectURL(url);
        worker.onmessage = function(e) {
            var result = e.data;
            var canvas = document.getElementById('imageCanvas');
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var imageData = new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height);
            ctx.putImageData(imageData, 0, 0);
            var colormap = COLORMAPS[state.currentColormap] || COLORMAPS.grayscale;
            var min = Infinity, max = -Infinity;
            var currentData = pendingCanvasData;
            if (currentData) {
                for (var y = 0; y < currentData.length; y++) {
                    for (var x = 0; x < currentData[y].length; x++) {
                        var v = currentData[y][x];
                        if (typeof v === 'number' && isFinite(v)) {
                            if (v < min) min = v;
                            if (v > max) max = v;
                        }
                    }
                }
            }
            if (min === Infinity || max === -Infinity) {
                min = 0; max = 1;
            }
            renderColorbar(colormap, min, max);
        };
        worker.onerror = function() {
            renderWorkerInstance = null;
        };
        return worker;
    } catch(e) {
        return null;
    }
}

function renderImageToCanvasFallback(data) {
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
            if (typeof val === 'number' && isFinite(val)) {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
    }

    // If no finite values exist, use 0-1 as default range
    if (min === Infinity || max === -Infinity) {
        min = 0; max = 1;
    }

    var range = max - min || 1;
    var colormap = COLORMAPS[state.currentColormap] || COLORMAPS.grayscale;

    var windowCenter = min + range * state.windowLevel;
    var windowHalf = range * state.windowWidth * 0.5;
    var windowMin = windowCenter - windowHalf;
    var windowMax = windowCenter + windowHalf;
    var windowRange = windowMax - windowMin || 1;

    // Special pixel colors for NaN / Inf values
    var NAN_COLOR  = [180, 60, 60, 200];   // muted red
    var INF_COLOR  = [60, 60, 180, 200];    // muted blue

    if (totalElements > 1000000) {
        var currentRow = 0;
        var CHUNK_SIZE = 100;

        function renderChunk() {
            var endRow = Math.min(currentRow + CHUNK_SIZE, height);
            for (var cy = currentRow; cy < endRow; cy++) {
                for (var cx = 0; cx < width; cx++) {
                    var cval = data[cy][cx];
                    var cidx = (cy * width + cx) * 4;
                    if (cval === 'NaN' || (typeof cval === 'number' && isNaN(cval))) {
                        imageData.data[cidx] = NAN_COLOR[0];
                        imageData.data[cidx + 1] = NAN_COLOR[1];
                        imageData.data[cidx + 2] = NAN_COLOR[2];
                        imageData.data[cidx + 3] = NAN_COLOR[3];
                    } else if (cval === 'Inf' || cval === '-Inf' || (typeof cval === 'number' && !isFinite(cval))) {
                        imageData.data[cidx] = INF_COLOR[0];
                        imageData.data[cidx + 1] = INF_COLOR[1];
                        imageData.data[cidx + 2] = INF_COLOR[2];
                        imageData.data[cidx + 3] = INF_COLOR[3];
                    } else {
                        var cnorm = typeof cval === 'number' ? (cval - windowMin) / windowRange : 0;
                        cnorm = Math.max(0, Math.min(1, cnorm));
                        var crgb = colormap(cnorm);
                        imageData.data[cidx] = crgb[0];
                        imageData.data[cidx + 1] = crgb[1];
                        imageData.data[cidx + 2] = crgb[2];
                        imageData.data[cidx + 3] = 255;
                    }
                }
            }
            currentRow = endRow;
            ctx.putImageData(imageData, 0, 0);

            if (currentRow < height) {
                requestAnimationFrame(renderChunk);
            } else {
                renderColorbar(colormap, min, max);
            }
        }

        requestAnimationFrame(renderChunk);
    } else {
        for (var ny = 0; ny < height; ny++) {
            for (var nx = 0; nx < width; nx++) {
                var nval = data[ny][nx];
                var nidx = (ny * width + nx) * 4;
                if (nval === 'NaN' || (typeof nval === 'number' && isNaN(nval))) {
                    imageData.data[nidx] = NAN_COLOR[0];
                    imageData.data[nidx + 1] = NAN_COLOR[1];
                    imageData.data[nidx + 2] = NAN_COLOR[2];
                    imageData.data[nidx + 3] = NAN_COLOR[3];
                } else if (nval === 'Inf' || nval === '-Inf' || (typeof nval === 'number' && !isFinite(nval))) {
                    imageData.data[nidx] = INF_COLOR[0];
                    imageData.data[nidx + 1] = INF_COLOR[1];
                    imageData.data[nidx + 2] = INF_COLOR[2];
                    imageData.data[nidx + 3] = INF_COLOR[3];
                } else {
                    var nnorm = typeof nval === 'number' ? (nval - windowMin) / windowRange : 0;
                    nnorm = Math.max(0, Math.min(1, nnorm));
                    var nrgb = colormap(nnorm);
                    imageData.data[nidx] = nrgb[0];
                    imageData.data[nidx + 1] = nrgb[1];
                    imageData.data[nidx + 2] = nrgb[2];
                    imageData.data[nidx + 3] = 255;
                }
            }
        }
        requestAnimationFrame(function() {
            ctx.putImageData(imageData, 0, 0);
            renderColorbar(colormap, min, max);
        });
    }
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

    if (totalElements > 500000) {
        var min = Infinity, max = -Infinity;
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var val = data[y][x];
                if (typeof val === 'number' && isFinite(val)) {
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
        }

        // If no finite values exist, use 0-1 as default range
        if (min === Infinity || max === -Infinity) {
            min = 0; max = 1;
        }

        var colormap = COLORMAPS[state.currentColormap] || COLORMAPS.grayscale;
        var keyPoints = null;
        if (typeof colormap === 'function') {
            for (var cmapName in COLORMAPS) {
                if (COLORMAPS[cmapName] === colormap) {
                    var cmapDefs = {
                        viridis: [[0.0,68,1,84],[0.07,72,20,103],[0.13,71,33,115],[0.2,65,53,130],[0.27,59,82,139],[0.33,52,96,141],[0.4,44,113,142],[0.47,37,130,142],[0.53,33,145,140],[0.6,35,158,134],[0.67,52,179,123],[0.73,78,195,108],[0.8,114,208,88],[0.87,155,217,64],[0.93,200,225,47],[1.0,253,231,37]],
                        inferno: [[0.0,0,0,4],[0.07,10,5,30],[0.13,25,10,60],[0.2,49,18,84],[0.27,74,12,107],[0.33,100,20,115],[0.4,130,34,110],[0.47,159,50,96],[0.53,186,67,79],[0.6,210,85,60],[0.67,230,108,42],[0.73,245,133,24],[0.8,250,162,17],[0.87,248,192,30],[0.93,245,225,70],[1.0,252,255,164]],
                        plasma: [[0.0,13,8,135],[0.07,34,4,148],[0.13,60,3,158],[0.2,88,12,162],[0.27,116,25,160],[0.33,142,38,152],[0.4,166,52,141],[0.47,188,66,126],[0.53,208,82,108],[0.6,225,100,88],[0.67,238,122,70],[0.73,247,147,54],[0.8,251,174,42],[0.87,250,204,35],[0.93,244,230,32],[1.0,240,249,33]],
                        hot: [[0.0,0,0,0],[0.07,32,0,0],[0.13,64,0,0],[0.2,96,0,0],[0.27,128,0,0],[0.33,160,0,0],[0.4,192,0,0],[0.47,224,0,0],[0.53,255,0,0],[0.6,255,32,0],[0.67,255,64,0],[0.73,255,96,0],[0.8,255,128,0],[0.87,255,160,0],[0.93,255,192,0],[1.0,255,255,255]],
                        jet: [[0.0,0,0,128],[0.07,0,0,255],[0.13,0,64,255],[0.2,0,128,255],[0.27,0,192,255],[0.33,0,255,255],[0.4,64,255,192],[0.47,128,255,128],[0.53,192,255,64],[0.6,255,255,0],[0.67,255,192,0],[0.73,255,128,0],[0.8,255,64,0],[0.87,255,0,0],[0.93,192,0,0],[1.0,128,0,0]],
                        turbo: [[0.0,48,18,59],[0.07,64,37,105],[0.13,80,60,140],[0.2,96,85,168],[0.27,112,110,190],[0.33,128,135,206],[0.4,148,160,216],[0.47,172,185,220],[0.53,196,208,216],[0.6,220,228,200],[0.67,232,236,164],[0.73,236,228,116],[0.8,232,208,72],[0.87,220,176,40],[0.93,200,136,20],[1.0,144,78,20]],
                        coolwarm: [[0.0,59,76,192],[0.07,80,100,200],[0.13,100,124,208],[0.2,120,148,216],[0.27,140,172,224],[0.33,160,196,232],[0.4,180,216,236],[0.47,200,228,236],[0.53,236,228,216],[0.6,236,208,180],[0.67,232,184,140],[0.73,224,156,100],[0.8,216,128,64],[0.87,208,100,32],[0.93,200,72,12],[1.0,180,4,38]],
                        rdbu: [[0.0,103,0,31],[0.07,140,20,48],[0.13,176,44,68],[0.2,208,72,92],[0.27,232,104,120],[0.33,248,140,156],[0.4,252,180,192],[0.47,252,216,224],[0.53,224,236,240],[0.6,180,224,232],[0.67,132,200,216],[0.73,88,172,196],[0.8,48,140,172],[0.87,20,104,144],[0.93,4,68,112],[1.0,5,48,97]]
                    };
                    keyPoints = cmapDefs[cmapName] || null;
                    break;
                }
            }
        }

        if (keyPoints) {
            if (!renderWorkerInstance) {
                renderWorkerInstance = createRenderWorker();
            }
            if (renderWorkerInstance) {
                renderWorkerInstance.postMessage({
                    data: data,
                    width: width,
                    height: height,
                    keyPoints: keyPoints,
                    windowLevel: state.windowLevel,
                    windowWidth: state.windowWidth,
                    min: min,
                    max: max
                });
                return;
            }
        }

        state.dirty = true;
        renderImageToCanvasFallback(data);
        return;
    }

    state.dirty = true;
    renderImageToCanvasFallback(data);
}

function renderColorbar(colormap, min, max) {
    var cbar = document.getElementById('colorbarCanvas');
    if (!cbar) return;
    var canvas = document.getElementById('imageCanvas');
    if (!canvas) return;

    var displayHeight = parseInt(canvas.style.height) || canvas.height;
    cbar.height = displayHeight;
    cbar.style.height = displayHeight + 'px';

    var ctx = cbar.getContext('2d');
    var w = cbar.width;
    var h = cbar.height;

    for (var y = 0; y < h; y++) {
        var norm = 1 - y / h;
        var rgb = colormap(norm);
        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        ctx.fillRect(0, y, w, 1);
    }

    var cbarLabels = document.getElementById('colorbarLabels');
    if (cbarLabels) {
        var range = max - min;
        cbarLabels.innerHTML =
            '<span class="cbar-max">' + formatValue(max) + '</span>' +
            '<span class="cbar-mid">' + formatValue(min + range * 0.5) + '</span>' +
            '<span class="cbar-min">' + formatValue(min) + '</span>';
    }
}

function formatValue(v) {
    if (v === null || v === undefined) return 'N/A';
    if (isSpecialValue(v)) return v;
    if (typeof v !== 'number') return escapeHtml(String(v));
    if (isNaN(v)) return 'NaN';
    if (!isFinite(v)) return v > 0 ? '+Inf' : '-Inf';
    if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) {
        return v.toExponential(2);
    }
    return v.toFixed(4);
}

function formatFixed(v, digits) {
    if (v === null || v === undefined) return 'N/A';
    if (isSpecialValue(v)) return v;
    if (typeof v !== 'number') return escapeHtml(String(v));
    if (isNaN(v)) return 'NaN';
    if (!isFinite(v)) return v > 0 ? '+Inf' : '-Inf';
    return v.toFixed(digits);
}

function formatFixedHtml(v, digits) {
    var s = formatFixed(v, digits);
    return isSpecialValue(s) ? '<span class="special-val">' + s + '</span>' : s;
}

function renderMiniHistogram(stats) {
    var container = document.getElementById('miniHistogramContainer');
    if (!container || !stats.percentiles) return;
    if (stats.min === null || stats.max === null || typeof stats.min !== 'number' || typeof stats.max !== 'number') return;

    var p = stats.percentiles;
    var min = stats.min;
    var max = stats.max;
    var range = max - min || 1;

    var numBins = 40;
    var bins = new Array(numBins).fill(0);
    var pCounts = [0.05, 0.20, 0.25, 0.25, 0.20, 0.05];
    var pBounds = [min, p.p5, p.p25, p.p50, p.p75, p.p95, max];

    for (var seg = 0; seg < 6; seg++) {
        var segMin = pBounds[seg];
        var segMax = pBounds[seg + 1];
        var segRange = segMax - segMin || range * 0.01;
        var count = pCounts[seg];
        for (var bj = 0; bj < numBins; bj++) {
            var bCenter = min + range * (bj + 0.5) / numBins;
            if (bCenter >= segMin && bCenter < segMax) {
                bins[bj] += count / (segRange / range * numBins);
            }
        }
    }

    var maxBin = 0;
    for (var bk = 0; bk < numBins; bk++) {
        if (bins[bk] > maxBin) maxBin = bins[bk];
    }
    if (maxBin === 0) return;

    var svgW = 220;
    var svgH = 28;
    var padL = 2;
    var padR = 2;
    var padT = 2;
    var padB = 2;
    var plotW = svgW - padL - padR;
    var plotH = svgH - padT - padB;
    var barW = plotW / numBins;

    var colormap = COLORMAPS[state.currentColormap] || COLORMAPS.grayscale;
    var bars = '';
    for (var bb = 0; bb < numBins; bb++) {
        var barH = (bins[bb] / maxBin) * plotH * 0.9;
        var norm = bb / (numBins - 1);
        var rgb = colormap(norm);
        var x = padL + bb * barW;
        var y = padT + plotH - barH;
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (barW - 0.3).toFixed(1) + '" height="' + barH.toFixed(1) + '" fill="rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')" opacity="0.8" />';
    }

    var medianX = padL + ((p.p50 - min) / range) * plotW;
    var medianLine = '<line x1="' + medianX.toFixed(1) + '" y1="' + padT + '" x2="' + medianX.toFixed(1) + '" y2="' + (padT + plotH) + '" stroke="var(--vscode-descriptionForeground)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.6" />';

    var svg = '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" preserveAspectRatio="xMidYMid meet" class="mini-histogram-svg" xmlns="http://www.w3.org/2000/svg">';
    svg += bars + medianLine;
    svg += '</svg>';

    container.innerHTML = svg;
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

    var values = [];
    for (var i = 0; i < data.length; i++) {
        var raw = data[i];
        var v = typeof raw === 'number' ? raw : (raw && raw.real !== undefined ? raw.real : NaN);
        values.push(v);
    }

    var min = Infinity, max = -Infinity;
    for (var j = 0; j < values.length; j++) {
        var fv = values[j];
        if (typeof fv === 'number' && isFinite(fv)) {
            if (fv < min) min = fv;
            if (fv > max) max = fv;
        }
    }
    if (!isFinite(min)) { min = 0; max = 1; }

    var range = max - min || 1;
    var step = (width - 2 * padding) / (values.length - 1 || 1);

    var points = '';
    var moveNext = true;
    for (var si = 0; si < values.length; si++) {
        var sv = values[si];
        if (typeof sv !== 'number' || !isFinite(sv)) {
            moveNext = true;
            continue;
        }
        var sx = padding + si * step;
        var sy = height - padding - ((sv - min) / range) * (height - 2 * padding);
        points += (moveNext ? 'M' : 'L') + sx.toFixed(1) + ' ' + sy.toFixed(1);
        moveNext = false;
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
            html += '<div><span class="complex-real">' + formatFixedHtml(v.real, 3) + '</span></div>';
            html += '<div><span class="complex-imag">' + formatFixedHtml(v.imag, 3) + 'i</span></div>';
        } else if (isSpecialValue(v)) {
            html += '<div class="special-val">' + v + '</div>';
        } else if (typeof v === 'number') {
            html += '<div>' + formatFixedHtml(v, 4) + '</div>';
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

function render1DLineChart(value) {
    if (!value.data) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No data available</div>';

    var data = value.data;
    if (data.length === 0) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">Empty array</div>';

    var numericData = [];
    for (var i = 0; i < data.length; i++) {
        var v = data[i];
        if (v && v._type === 'complex') {
            var cr = typeof v.real === 'number' ? v.real : NaN;
            var ci = typeof v.imag === 'number' ? v.imag : NaN;
            numericData.push(Math.sqrt(cr * cr + ci * ci));
        } else if (typeof v === 'number') {
            numericData.push(v);
        } else {
            numericData.push(NaN);
        }
    }

    var finitePoints = [];
    for (var fi = 0; fi < numericData.length; fi++) {
        if (typeof numericData[fi] === 'number' && isFinite(numericData[fi])) {
            finitePoints.push({ idx: fi, val: numericData[fi] });
        }
    }
    if (finitePoints.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No finite values to plot</div>';
    }

    var minVal = Infinity, maxVal = -Infinity;
    for (var mi = 0; mi < finitePoints.length; mi++) {
        if (finitePoints[mi].val < minVal) minVal = finitePoints[mi].val;
        if (finitePoints[mi].val > maxVal) maxVal = finitePoints[mi].val;
    }
    var valRange = maxVal - minVal || 1;
    var valPadding = valRange * 0.05;
    minVal -= valPadding;
    maxVal += valPadding;
    valRange = maxVal - minVal;

    var svgW = 100;
    var svgH = 50;
    var padL = 8;
    var padR = 2;
    var padT = 4;
    var padB = 8;
    var plotW = svgW - padL - padR;
    var plotH = svgH - padT - padB;

    var points = '';
    var step = Math.max(1, Math.floor(numericData.length / 500));
    var sampledIndices = [];
    for (var si = 0; si < numericData.length; si += step) {
        sampledIndices.push(si);
    }
    if (sampledIndices[sampledIndices.length - 1] !== numericData.length - 1) {
        sampledIndices.push(numericData.length - 1);
    }

    var moveNext = true;
    for (var pi = 0; pi < sampledIndices.length; pi++) {
        var idx = sampledIndices[pi];
        var nv = numericData[idx];
        if (typeof nv !== 'number' || !isFinite(nv)) {
            moveNext = true;
            continue;
        }
        var px = padL + (idx / Math.max(1, numericData.length - 1)) * plotW;
        var py = padT + plotH - ((nv - minVal) / valRange) * plotH;
        points += (moveNext ? 'M' : 'L') + px.toFixed(2) + ' ' + py.toFixed(2);
        moveNext = false;
    }

    var areaPath = points + ' L' + padL + ' ' + (padT + plotH) + ' L' + (padL + plotW) + ' ' + (padT + plotH) + ' Z';

    var numYTicks = 4;
    var yTickLabels = '';
    for (var yi = 0; yi <= numYTicks; yi++) {
        var yy = padT + plotH - (yi / numYTicks) * plotH;
        var tickVal = minVal + (yi / numYTicks) * valRange;
        yTickLabels += '<text x="' + (padL - 1) + '" y="' + (yy + 1.2) + '" text-anchor="end" font-size="2.5" fill="var(--vscode-descriptionForeground)" font-family="monospace">' + formatValue(tickVal) + '</text>';
        yTickLabels += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (padL + plotW) + '" y2="' + yy + '" stroke="var(--vscode-panel-border)" stroke-width="0.15" stroke-dasharray="0.8,0.8" />';
    }

    var numXTicks = 5;
    var xTickLabels = '';
    for (var xi = 0; xi <= numXTicks; xi++) {
        var xx = padL + (xi / numXTicks) * plotW;
        var tickIdx = Math.round((xi / numXTicks) * (numericData.length - 1));
        xTickLabels += '<text x="' + xx + '" y="' + (svgH - 1) + '" text-anchor="middle" font-size="2.5" fill="var(--vscode-descriptionForeground)" font-family="monospace">' + tickIdx + '</text>';
    }

    var html = '<div class="svg-chart-container">';
    html += '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" preserveAspectRatio="xMidYMid meet" class="line-chart-svg" xmlns="http://www.w3.org/2000/svg">';
    html += '<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--vscode-textLink-foreground)" stop-opacity="0.25"/><stop offset="100%" stop-color="var(--vscode-textLink-foreground)" stop-opacity="0.02"/></linearGradient></defs>';
    html += yTickLabels;
    html += xTickLabels;
    html += '<path d="' + areaPath + '" fill="url(#areaGrad)" />';
    html += '<path d="' + points + '" fill="none" stroke="var(--vscode-textLink-foreground)" stroke-width="0.5" stroke-linejoin="round" stroke-linecap="round" />';
    html += '</svg>';
    html += '<div id="svgChartTooltip" class="svg-chart-tooltip" style="display:none;"></div>';
    html += '</div>';

    html += '<script id="lineChartData" type="application/json">' + JSON.stringify(numericData) + '<\\/script>';

    return html;
}

function initLineChart() {
    var dataEl = document.getElementById('lineChartData');
    if (!dataEl) return;

    var data;
    try {
        data = JSON.parse(dataEl.textContent);
    } catch (e) {
        console.error('[MatrixSpy] Failed to parse lineChartData:', e);
        return;
    }
    var svg = document.querySelector('.line-chart-svg');
    var tooltip = document.getElementById('svgChartTooltip');
    if (!svg || !tooltip) return;
    if (svg.dataset.lineChartInitialized) return;
    svg.dataset.lineChartInitialized = 'true';

    var svgW = 100;
    var svgH = 50;
    var padL = 8;
    var padR = 2;
    var padT = 4;
    var padB = 8;
    var plotW = svgW - padL - padR;
    var plotH = svgH - padT - padB;

    svg.addEventListener('mousemove', function(e) {
        var rect = svg.getBoundingClientRect();
        var mx = (e.clientX - rect.left) / rect.width * svgW;
        var my = (e.clientY - rect.top) / rect.height * svgH;

        if (mx < padL || mx > padL + plotW || my < padT || my > padT + plotH) {
            tooltip.style.display = 'none';
            return;
        }

        var dataIdx = Math.round(((mx - padL) / plotW) * (data.length - 1));
        dataIdx = Math.max(0, Math.min(data.length - 1, dataIdx));
        var val = data[dataIdx];

        tooltip.style.display = 'block';
        tooltip.innerHTML = '<span class="tt-idx">[' + dataIdx + ']</span> <span class="tt-val">' + formatFixed(val, 6) + '</span>';

        var ttX = e.clientX - rect.left + 10;
        var ttY = e.clientY - rect.top - 30;
        if (ttX + 130 > rect.width) ttX = e.clientX - rect.left - 130;
        if (ttY < 0) ttY = e.clientY - rect.top + 14;
        tooltip.style.left = ttX + 'px';
        tooltip.style.top = ttY + 'px';
    });

    svg.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
    });
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

function render2DTableVirtual(value) {
    if (!value.data) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No data available</div>';

    var data = value.data;
    if (!value.shape || value.shape.length < 2) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">Invalid array shape</div>';
    if (value.shape[0] === 0 || value.shape[1] === 0) return '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">Empty array</div>';

    var totalRows = value.shape[0];
    var colsToShow = Math.min(state.currentShowCols2D, value.shape[1]);
    var ROW_HEIGHT = 28;
    var BUFFER = 10;
    var HEADER_HEIGHT = 30;

    var html = '<div class="virtual-table-wrapper" style="position:relative;overflow:auto;max-height:600px;" id="virtualTable2D">';
    html += '<div style="position:sticky;top:0;z-index:2;background:var(--vscode-editor-background);">';
    html += '<table class="data-table" style="table-layout:fixed;"><tr><th style="width:60px;"></th>';
    for (var j = 0; j < colsToShow; j++) {
        html += '<th>' + j + '</th>';
    }
    if (value.shape[1] > colsToShow) {
        html += '<th>...</th>';
    }
    html += '</tr></table></div>';

    html += '<div id="virtualTable2DBody" style="position:relative;height:' + (totalRows * ROW_HEIGHT) + 'px;">';
    html += '</div></div>';

    if (value.shape[1] > colsToShow) {
        html += '<div style="margin-top: 16px; text-align: center;">';
        html += '<button class="load-more-btn" data-action="loadMoreCols2D">Load more columns (' + colsToShow + '/' + value.shape[1] + ')</button>';
        html += '</div>';
    }

    html += '<script id="virtualTable2DData" type="application/json">' + JSON.stringify({ totalRows: totalRows, colsToShow: colsToShow, totalCols: value.shape[1], rowHeight: ROW_HEIGHT, buffer: BUFFER }) + '<\\/script>';

    return html;
}

function initVirtualTable2D() {
    var wrapper = document.getElementById('virtualTable2D');
    if (!wrapper) return;
    if (wrapper.dataset.virtualTableInitialized) return;
    wrapper.dataset.virtualTableInitialized = 'true';

    var dataEl = document.getElementById('virtualTable2DData');
    if (!dataEl) return;

    var config;
    try {
        config = JSON.parse(dataEl.textContent);
    } catch (e) {
        console.error('[MatrixSpy] Failed to parse virtualTable2DData:', e);
        return;
    }
    var value = state.fullVariableData;
    if (!value || !value.data) return;

    var data = value.data;
    var totalRows = config.totalRows;
    var colsToShow = config.colsToShow;
    var totalCols = config.totalCols;
    var ROW_HEIGHT = config.rowHeight;
    var BUFFER = config.buffer;

    var bodyEl = document.getElementById('virtualTable2DBody');
    if (!bodyEl) return;

    function renderVisibleRows() {
        var scrollTop = wrapper.scrollTop;
        var viewportHeight = wrapper.clientHeight - 30;

        var startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
        var endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER);

        var html = '<table class="data-table" style="table-layout:fixed;position:absolute;top:' + (startRow * ROW_HEIGHT) + 'px;left:0;width:100%;">';

        for (var i = startRow; i < endRow; i++) {
            html += '<tr style="height:' + ROW_HEIGHT + 'px;"><th>' + i + '</th>';
            var row = data[i];
            for (var jj = 0; jj < colsToShow; jj++) {
                var v = row ? row[jj] : null;
                html += '<td>' + formatTableCell(v) + '</td>';
            }
            if (totalCols > colsToShow) {
                html += '<td>...</td>';
            }
            html += '</tr>';
        }

        html += '</table>';
        bodyEl.innerHTML = html;
    }

    renderVisibleRows();

    var scrollTimeout = null;
    wrapper.addEventListener('scroll', function() {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(renderVisibleRows, 16);
    });
}

function render3DTableVirtual(value) {
    var sliceData = value.data
        ? getNDSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode)
        : state.currentLoadedSliceData;

    if (!sliceData) {
        return '<div style="padding: 20px; text-align: center;">' +
            '<p style="color: var(--vscode-descriptionForeground);">Large tensor - switch to <b>Image</b> mode for slice visualization, or the data is too large for table display.</p>' +
            '<p id="tableLoadingIndicator" style="margin-top:12px; color: var(--vscode-textLink-foreground); font-size:12px;"></p>' +
            '</div>';
    }

    var totalRows = sliceData.length;
    var totalCols = sliceData[0] ? sliceData[0].length : 0;
    var colsToShow = Math.min(state.currentShowCols2D, totalCols);
    var ROW_HEIGHT = 28;
    var BUFFER = 10;

    var html = '<div class="virtual-table-wrapper" style="position:relative;overflow:auto;max-height:600px;" id="virtualTable3D">';
    html += '<div style="position:sticky;top:0;z-index:2;background:var(--vscode-editor-background);">';
    html += '<table class="data-table" style="table-layout:fixed;"><tr><th style="width:60px;"></th>';
    for (var j = 0; j < colsToShow; j++) {
        html += '<th>' + j + '</th>';
    }
    if (totalCols > colsToShow) {
        html += '<th>...</th>';
    }
    html += '</tr></table></div>';

    html += '<div id="virtualTable3DBody" style="position:relative;height:' + (totalRows * ROW_HEIGHT) + 'px;">';
    html += '</div></div>';

    if (totalRows > 0 || totalCols > colsToShow) {
        html += '<div style="margin-top: 16px; text-align: center; display: flex; gap: 12px; justify-content: center;">';
        if (totalCols > colsToShow) {
            html += '<button class="load-more-btn" data-action="loadMoreCols2D">Load more columns (' + colsToShow + '/' + totalCols + ')</button>';
        }
        html += '</div>';
    }

    html += '<script id="virtualTable3DData" type="application/json">' + JSON.stringify({ totalRows: totalRows, colsToShow: colsToShow, totalCols: totalCols, rowHeight: ROW_HEIGHT, buffer: BUFFER }) + '<\\/script>';

    return html;
}

function initVirtualTable3D() {
    var wrapper = document.getElementById('virtualTable3D');
    if (!wrapper) return;
    if (wrapper.dataset.virtualTableInitialized) return;
    wrapper.dataset.virtualTableInitialized = 'true';

    var dataEl = document.getElementById('virtualTable3DData');
    if (!dataEl) return;

    var config;
    try {
        config = JSON.parse(dataEl.textContent);
    } catch (e) {
        console.error('[MatrixSpy] Failed to parse virtualTable3DData:', e);
        return;
    }
    var value = state.fullVariableData;
    if (!value) return;

    var sliceData = value.data
        ? getNDSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode)
        : state.currentLoadedSliceData;
    if (!sliceData) return;

    var totalRows = config.totalRows;
    var colsToShow = config.colsToShow;
    var totalCols = config.totalCols;
    var ROW_HEIGHT = config.rowHeight;
    var BUFFER = config.buffer;

    var bodyEl = document.getElementById('virtualTable3DBody');
    if (!bodyEl) return;

    function renderVisibleRows() {
        var scrollTop = wrapper.scrollTop;
        var viewportHeight = wrapper.clientHeight - 30;

        var startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
        var endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER);

        var html = '<table class="data-table" style="table-layout:fixed;position:absolute;top:' + (startRow * ROW_HEIGHT) + 'px;left:0;width:100%;">';

        for (var i = startRow; i < endRow; i++) {
            html += '<tr style="height:' + ROW_HEIGHT + 'px;"><th>' + i + '</th>';
            var row = sliceData[i];
            for (var jj = 0; jj < colsToShow; jj++) {
                var v = row ? row[jj] : null;
                html += '<td>' + formatTableCell(v) + '</td>';
            }
            if (totalCols > colsToShow) {
                html += '<td>...</td>';
            }
            html += '</tr>';
        }

        html += '</table>';
        bodyEl.innerHTML = html;
    }

    renderVisibleRows();

    var scrollTimeout = null;
    wrapper.addEventListener('scroll', function() {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(renderVisibleRows, 16);
    });
}

function formatTableCell(v) {
    if (v === null || v === undefined) return '';
    if (isSpecialValue(v)) return '<span class="special-val">' + v + '</span>';
    if (v && v._type === 'complex') {
        var rStr = formatFixedHtml(v.real, 4);
        var iStr = formatFixedHtml(v.imag, 4);
        return '<div class="complex-cell"><span class="complex-real">' + rStr + '</span><span class="complex-imag">' + iStr + 'i</span></div>';
    }
    if (typeof v === 'number') return formatFixedHtml(v, 4);
    return escapeHtml(String(v));
}

function render3DTable(value) {
    var sliceData = value.data
        ? getNDSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode)
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

function renderBreadcrumb() {
    if (!state.navigationPath || state.navigationPath.length <= 1) return '';

    var html = '<div class="breadcrumb-bar" style="display:flex;align-items:center;gap:4px;padding:6px 12px;background:var(--vscode-breadcrumbBackground,var(--vscode-editor-background));border-bottom:1px solid var(--vscode-panel-border);font-size:12px;flex-wrap:wrap;">';

    for (var i = 0; i < state.navigationPath.length; i++) {
        if (i > 0) {
            html += '<span class="breadcrumb-sep" style="color:var(--vscode-descriptionForeground);margin:0 2px;">\\u203A</span>';
        }
        var item = state.navigationPath[i];
        var isLast = (i === state.navigationPath.length - 1);
        if (isLast) {
            html += '<span class="breadcrumb-item breadcrumb-current" style="color:var(--vscode-foreground);font-weight:500;">' + escapeHtml(item.name) + '</span>';
        } else {
            html += '<a class="breadcrumb-item breadcrumb-link" data-action="breadcrumbNav" data-nav-index="' + i + '" style="color:var(--vscode-textLink-foreground);cursor:pointer;text-decoration:none;">' + escapeHtml(item.name) + '</a>';
        }
    }

    html += '</div>';
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
            '<select id="colormapSelect" data-action="setColormap">' +
            '<option value="grayscale"' + (state.currentColormap === 'grayscale' ? ' selected' : '') + '>Grayscale</option>' +
            '<option value="viridis"' + (state.currentColormap === 'viridis' ? ' selected' : '') + '>Viridis</option>' +
            '<option value="inferno"' + (state.currentColormap === 'inferno' ? ' selected' : '') + '>Inferno</option>' +
            '<option value="plasma"' + (state.currentColormap === 'plasma' ? ' selected' : '') + '>Plasma</option>' +
            '<option value="hot"' + (state.currentColormap === 'hot' ? ' selected' : '') + '>Hot</option>' +
            '<option value="jet"' + (state.currentColormap === 'jet' ? ' selected' : '') + '>Jet</option>' +
            '<option value="turbo"' + (state.currentColormap === 'turbo' ? ' selected' : '') + '>Turbo</option>' +
            '<option value="coolwarm"' + (state.currentColormap === 'coolwarm' ? ' selected' : '') + '>Coolwarm</option>' +
            '<option value="rdbu"' + (state.currentColormap === 'rdbu' ? ' selected' : '') + '>RdBu</option>';

        var builtInNames = BUILTIN_COLORMAP_NAMES;
        for (var cname in COLORMAPS) {
            if (COLORMAPS.hasOwnProperty(cname) && builtInNames.indexOf(cname) === -1) {
                html += '<option value="' + escapeHtml(cname) + '"' + (state.currentColormap === cname ? ' selected' : '') + '>' + escapeHtml(cname) + '</option>';
            }
        }

        html += '</select>' +
            '</div>';

        html += '<div class="image-toolbar">' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="canvasZoomOut" title="Zoom out" aria-label="Zoom out">-</button>' +
            '<span class="toolbar-text" id="canvasZoomLevel">100%</span>' +
            '<button class="toolbar-btn" id="canvasZoomIn" title="Zoom in" aria-label="Zoom in">+</button>' +
            '<button class="toolbar-btn" id="canvasZoomReset" title="Reset zoom" aria-label="Reset zoom">1:1</button>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<label>Window</label>' +
            '<input type="range" id="windowLevel" min="0" max="100" value="' + Math.round(state.windowLevel * 100) + '" data-action="windowLevel" aria-label="Window center">' +
            '<span class="toolbar-value" id="windowLevelValue">' + Math.round(state.windowLevel * 100) + '%</span>' +
            '</div>' +
            '<div class="toolbar-group">' +
            '<label>Level</label>' +
            '<input type="range" id="windowWidth" min="1" max="100" value="' + Math.round(state.windowWidth * 100) + '" data-action="windowWidth" aria-label="Window width">' +
            '<span class="toolbar-value" id="windowWidthValue">' + Math.round(state.windowWidth * 100) + '%</span>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="rotateLeft" title="Rotate left" aria-label="Rotate left">↺</button>' +
            '<button class="toolbar-btn" id="rotateRight" title="Rotate right" aria-label="Rotate right">↻</button>' +
            '<button class="toolbar-btn" id="flipH" title="Flip horizontal" aria-label="Flip horizontal">⇄</button>' +
            '<button class="toolbar-btn" id="flipV" title="Flip vertical" aria-label="Flip vertical">⇅</button>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn' + (state.roiState.active ? ' active' : '') + '" id="roiBtn" title="ROI Selection" aria-label="ROI Selection">⬚</button>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="valueSearchBtn" title="Search values" aria-label="Search values">🔍</button>' +
            '</div>' +
            '</div>' +
            '<div class="image-viewer">' +
            '<canvas id="imageCanvas" class="image-canvas" role="img" aria-label="Matrix visualization"></canvas>' +
            '<canvas id="colorbarCanvas" class="colorbar-canvas" width="30"></canvas>' +
            '<div class="colorbar-labels" id="colorbarLabels"></div>' +
            '<div class="canvas-dimensions" id="canvasDimensions"></div>' +
            '</div>';

        var sliceData = get2DSlice(value, state.currentViewMode);
        scheduleCanvasRender(sliceData);
    } else {
        html += (value.shape[0] > 200 ? render2DTableVirtual(value) : render2DTable(value));
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
            for (var ai = 0; ai < ndim; ai++) {
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
            '<select id="colormapSelect" data-action="setColormap">' +
            '<option value="grayscale"' + (state.currentColormap === 'grayscale' ? ' selected' : '') + '>Grayscale</option>' +
            '<option value="viridis"' + (state.currentColormap === 'viridis' ? ' selected' : '') + '>Viridis</option>' +
            '<option value="inferno"' + (state.currentColormap === 'inferno' ? ' selected' : '') + '>Inferno</option>' +
            '<option value="plasma"' + (state.currentColormap === 'plasma' ? ' selected' : '') + '>Plasma</option>' +
            '<option value="hot"' + (state.currentColormap === 'hot' ? ' selected' : '') + '>Hot</option>' +
            '<option value="jet"' + (state.currentColormap === 'jet' ? ' selected' : '') + '>Jet</option>' +
            '<option value="turbo"' + (state.currentColormap === 'turbo' ? ' selected' : '') + '>Turbo</option>' +
            '<option value="coolwarm"' + (state.currentColormap === 'coolwarm' ? ' selected' : '') + '>Coolwarm</option>' +
            '<option value="rdbu"' + (state.currentColormap === 'rdbu' ? ' selected' : '') + '>RdBu</option>';

        for (var cname2 in COLORMAPS) {
            if (COLORMAPS.hasOwnProperty(cname2) && BUILTIN_COLORMAP_NAMES.indexOf(cname2) === -1) {
                html += '<option value="' + escapeHtml(cname2) + '"' + (state.currentColormap === cname2 ? ' selected' : '') + '>' + escapeHtml(cname2) + '</option>';
            }
        }

        html += '</select>';

        if (ndim >= 3) {
            var numSlices = value.shape[state.currentAxis] || 0;
            html += '<label>Slice:</label>' +
                '<input type="range" id="sliceSlider" min="0" max="' + (numSlices - 1) + '" value="' + state.currentSlice + '" data-action="updateSlice" aria-label="Slice index">' +
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
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn' + (state.roiState.active ? ' active' : '') + '" id="roiBtn" title="ROI Selection" aria-label="ROI Selection">⬚</button>' +
            '</div>' +
            '<div class="toolbar-divider"></div>' +
            '<div class="toolbar-group">' +
            '<button class="toolbar-btn" id="valueSearchBtn" title="Search values" aria-label="Search values">🔍</button>' +
            '</div>' +
            '</div>' +
            '<div class="image-viewer">' +
            '<canvas id="imageCanvas" class="image-canvas"></canvas>' +
            '<div class="canvas-dimensions" id="canvasDimensions"></div>' +
            '</div>';

        if (hasData && ndim >= 3) {
            var sliceData = getNDSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode);
            scheduleCanvasRender(sliceData);
        } else if (!hasData && ndim >= 3) {
            setTimeout(function() { requestSliceFromBackend(state.currentAxis, state.currentSlice); }, 100);
        }
    } else {
        html += '<div class="tensor-controls">';

        if (ndim > 2) {
            html += '<label>View Axis:</label>' +
                '<select data-action="setAxis">';
            for (var tai = 0; tai < ndim; tai++) {
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

        var sliceDataForCheck = value.data
            ? getNDSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode)
            : state.currentLoadedSliceData;
        var useVirtual3D = sliceDataForCheck && sliceDataForCheck.length > 200;
        html += (useVirtual3D ? render3DTableVirtual(value) : render3DTable(value));
    }

    html += '</div></div>';
    return html;
}

function renderPreview(name, value) {
    if (value && value.error) {
        return '<div class="variable-preview">' +
            '<div class="preview-header">' +
            '<div class="preview-title">' + escapeHtml(name) + '</div>' +
            '</div>' +
            '<div class="preview-content">' +
            '<div class="error" style="padding:16px;">' + escapeHtml(String(value.error)) + '</div>' +
            '</div>' +
            '</div>';
    }
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
    } else if (isSpecialValue(value)) {
        return '<div class="variable-preview">' +
            '<div class="preview-header">' +
            '<div class="preview-title">' + escapeHtml(name) + '</div>' +
            '<div class="preview-meta">Special Value</div>' +
            '</div>' +
            '<div class="preview-content">' +
            '<div class="scalar-value special-val">' + value + '</div>' +
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
            '<div class="complex-value" style="color: var(--vscode-textLink-foreground);">' + escapeHtml(String(value.real)) + '</div>' +
            '</div>' +
            '<div class="complex-part">' +
            '<div class="complex-label">Imaginary</div>' +
            '<div class="complex-value" style="color: var(--vscode-errorForeground);">' + escapeHtml(String(value.imag)) + 'i</div>' +
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

            html += '<div class="view-tabs">' +
                '<button class="view-tab ' + (state.current1DViewMode === 'grid' ? 'active' : '') + '" data-action="set1DViewMode" data-mode="grid">Grid</button>' +
                '<button class="view-tab ' + (state.current1DViewMode === 'chart' ? 'active' : '') + '" data-action="set1DViewMode" data-mode="chart">Chart</button>' +
                '</div>';

            if (state.current1DViewMode === 'chart') {
                html += render1DLineChart(value);
            } else {
                html += render1DArray(value);
            }
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

function refreshPreview() {
    if (!state.fullVariableData || !state.currentVariableData) return;
    mainContent.innerHTML = renderBreadcrumb() + renderPreview(state.currentVariableData.name, state.fullVariableData);
    initPreviewWidgets();
}

function initPreviewWidgets() {
    var value = state.fullVariableData;
    if (!value) return;

    if (value._type === 'ndarray' && (value.statistics || value.stats) && (value.statistics || value.stats).percentiles) {
        setTimeout(function() { renderMiniHistogram(value.statistics || value.stats); }, 50);
    }

    if (value._type === 'ndarray' && value.shape) {
        if (value.shape.length === 1 && state.current1DViewMode === 'chart') {
            setTimeout(function() { initLineChart(); }, 50);
        }
        if (value.shape.length === 2 && value.shape[0] > 200 && state.currentDisplayMode === 'table') {
            setTimeout(function() { initVirtualTable2D(); }, 50);
        }
        if (value.shape.length >= 3 && state.currentDisplayMode === 'table') {
            var sliceDataForInit = value.data
                ? getNDSlice(value, state.currentAxis, state.currentSlice, state.currentViewMode)
                : state.currentLoadedSliceData;
            if (sliceDataForInit && sliceDataForInit.length > 200) {
                setTimeout(function() { initVirtualTable3D(); }, 50);
            }
        }
        if (value.shape.length >= 2 && state.currentDisplayMode === 'image') {
            setTimeout(function() { initROIEvents(); initHeatmapTooltip(); initHeatmapContextMenu(); }, 50);
        }
        if (value.shape.length >= 2 && state.currentDisplayMode === 'table') {
            setTimeout(function() { initTableContextMenu(); }, 50);
        }
    }
}

function setAxis(axis) {
    state.currentAxis = parseInt(axis);
    state.currentSlice = 0;
    state.currentLoadedSliceData = null;
    state.dirty = true;
    localStorage.setItem('matViewerAxis', axis);
    localStorage.setItem('matViewerSlice', '0');
    sliceCacheClear();
    store.setMany({ currentAxis: state.currentAxis, currentSlice: 0 });
    store.snapshot();

    if (state.fullVariableData && state.currentVariableData) {
        if (!state.fullVariableData.data && state.fullVariableData.shape.length >= 3) {
            var cached = sliceCacheGet(state.currentAxis, 0);
            if (cached) {
                state.currentLoadedSliceData = cached;
                scheduleCanvasRender(cached);
            } else {
                requestSliceFromBackend(state.currentAxis, state.currentSlice);
            }
            var maxSlice = state.fullVariableData.shape[state.currentAxis] || 0;
            prefetchSlices(state.currentAxis, 0, maxSlice);
        }
        refreshPreview();

        if (state.fullVariableData.data && state.currentDisplayMode === 'image') {
            var sliceData = getNDSlice(state.fullVariableData, state.currentAxis, state.currentSlice, state.currentViewMode);
            scheduleCanvasRender(sliceData);
        }
    }
}

function updateSlice(value) {
    state.currentSlice = parseInt(value);
    state.dirty = true;
    localStorage.setItem('matViewerSlice', value);
    var sliceValueEl = document.getElementById('sliceValue');
    if (sliceValueEl) sliceValueEl.textContent = value;

    if (state.fullVariableData && state.currentVariableData) {
        if (!state.fullVariableData.data && state.fullVariableData.shape.length >= 3) {
            var cached = sliceCacheGet(state.currentAxis, state.currentSlice);
            if (cached) {
                state.currentLoadedSliceData = cached;
                scheduleCanvasRender(cached);
            } else {
                requestSliceFromBackend(state.currentAxis, state.currentSlice);
            }
            var maxSlice = state.fullVariableData.shape[state.currentAxis] || 0;
            prefetchSlices(state.currentAxis, state.currentSlice, maxSlice);
            return;
        }

        if (state.currentDisplayMode === 'image') {
            var sliceData = getNDSlice(state.fullVariableData, state.currentAxis, state.currentSlice, state.currentViewMode);
            scheduleCanvasRender(sliceData);
        } else {
            refreshPreview();
        }
    }
}

function setColormap(colormap) {
    state.currentColormap = colormap;
    state.dirty = true;
    localStorage.setItem('matViewerColormap', colormap);
    store.set('currentColormap', colormap);
    store.snapshot();
    if (state.fullVariableData && state.currentVariableData) {
        refreshPreview();
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
            ? getNDSlice(state.fullVariableData, state.currentAxis, state.currentSlice, state.currentViewMode)
            : get2DSlice(state.fullVariableData, state.currentViewMode);
        scheduleCanvasRender(sliceData);
    }
}

function handleFileLoaded(message) {
    try {
    var matData = message.data;

    if (!matData.success || !matData.data) {
        mainContent.innerHTML = '<div class="error">Failed to load file: ' + escapeHtml(matData.error || 'No data') + '</div>';
        return;
    }

    sliceCacheClear();
    state.currentVariableData = matData.data;
    state.currentFilePath = matData.file_path;
    state.windowLevel = 0.5;
    state.windowWidth = 1.0;
    canvasTransformState = { rotation: 0, flipH: false, flipV: false };
    fileInfo.textContent = (matData.version || 'v?') + ' \\u00B7 ' + (matData.file_path || '');

    if (message.customColormaps && typeof message.customColormaps === 'object') {
        var cmaps = message.customColormaps;
        for (var name in cmaps) {
            if (cmaps.hasOwnProperty(name) && Array.isArray(cmaps[name])) {
                try {
                    var lut = buildLUT(cmaps[name]);
                    COLORMAPS[name] = (function(l) {
                        return function(t) { return l[Math.min(255, Math.max(0, Math.round(t * 255)))]; };
                    })(lut);
                } catch(e) {}
            }
        }
    }

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
    } catch(e) {
        mainContent.innerHTML = '<div class="error" style="padding:20px;">Error loading file: ' + escapeHtml(String(e)) + '</div>';
        console.error('[MatrixSpy] handleFileLoaded error:', e);
    }
}

function handleSliceLoaded(message) {
    if (message.success && message.data && message.data._type === 'slice') {
        var decoded = decodeBase64Slice(message.data);
        var sliceAxis = message.data.axis !== undefined ? message.data.axis : state.currentAxis;
        var sliceIndex = message.data.index !== undefined ? message.data.index : state.currentSlice;
        sliceCachePut(sliceAxis, sliceIndex, decoded);

        if (sliceIndex === state.currentSlice && sliceAxis === state.currentAxis) {
            state.currentLoadedSliceData = decoded;
            scheduleCanvasRender(decoded);
        }

        var loadingEl = document.getElementById('sliceLoadingIndicator');
        if (loadingEl) loadingEl.style.display = 'none';

        isPrefetching = false;
        if (prefetchQueue.length > 0) {
            processPrefetchQueue(state.currentAxis);
        }
    } else {
        isPrefetching = false;
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

function handleLoadingProgress(message) {
    var progressBar = document.getElementById('loadingProgressBar');
    var progressText = document.getElementById('loadingProgressText');
    if (progressBar) {
        progressBar.style.width = message.progress + '%';
    }
    if (progressText) {
        var stageLabels = {
            'detecting_format': 'Detecting format...',
            'parsing_structure': 'Parsing structure...',
            'loading_variables': 'Loading variables...',
            'generating_preview': 'Generating preview...'
        };
        progressText.textContent = stageLabels[message.stage] || message.stage;
    }
}

function handleError(message) {
    var errorText = message.error || 'Unknown error';
    var hint = '';
    var lowerError = errorText.toLowerCase();
    if (lowerError.indexOf('python') !== -1 || lowerError.indexOf('spawn') !== -1 || lowerError.indexOf('enoent') !== -1) {
        hint = '<div class="error-hint"><strong>Hint:</strong> Python 3.8+ is required. Configure the path in VS Code settings: <code>matrixspy.pythonPath</code></div>';
    } else if (lowerError.indexOf('import') !== -1 || lowerError.indexOf('module') !== -1 || lowerError.indexOf('no module') !== -1) {
        hint = '<div class="error-hint"><strong>Hint:</strong> Missing Python package. Run: <code>pip install scipy numpy h5py mat73</code></div>';
    } else if (lowerError.indexOf('memory') !== -1 || lowerError.indexOf('too large') !== -1) {
        hint = '<div class="error-hint"><strong>Hint:</strong> The file is too large to load. Try using a smaller file or increase <code>matrixspy.maxArrayElements</code> in settings.</div>';
    }
    mainContent.innerHTML = '<div class="error"><div class="error-message">Error: ' + escapeHtml(errorText) + '</div>' + hint + '</div>';
}

function handleMessage(event) {
    var message = event.data;

    if (message.command === 'fileLoaded') {
        handleFileLoaded(message);
    } else if (message.command === 'sliceLoaded') {
        handleSliceLoaded(message);
    } else if (message.command === 'showVariable') {
        handleShowVariable(message);
    } else if (message.command === 'loadingStart') {
        mainContent.innerHTML = '<div class="loading-container">' +
            '<div class="loading-spinner"></div>' +
            '<div class="loading-bar-container">' +
            '<div class="loading-bar" id="loadingProgressBar" style="width: 0%"></div>' +
            '</div>' +
            '<p id="loadingProgressText">Loading file...</p>' +
            '</div>';
    } else if (message.command === 'loadingProgress') {
        handleLoadingProgress(message);
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
    if (!(e.target instanceof Element)) return;
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {
        case 'loadMore1D':
            state.currentShowCount1D += 50;
            if (state.fullVariableData && state.currentVariableData) {
                refreshPreview();
            }
            break;
        case 'loadMoreRows2D':
            state.currentShowRows2D += 50;
            if (state.fullVariableData && state.currentVariableData) {
                refreshPreview();
            }
            break;
        case 'loadMoreCols2D':
            state.currentShowCols2D += 20;
            if (state.fullVariableData && state.currentVariableData) {
                refreshPreview();
            }
            break;
        case 'setDisplayMode':
            state.currentDisplayMode = target.getAttribute('data-mode');
            state.dirty = true;
            localStorage.setItem('matViewerDisplayMode', state.currentDisplayMode);
            store.set('currentDisplayMode', state.currentDisplayMode);
            store.snapshot();
            if (state.fullVariableData && state.currentVariableData) {
                refreshPreview();
            }
            break;
        case 'setViewMode':
            state.currentViewMode = target.getAttribute('data-mode');
            state.dirty = true;
            localStorage.setItem('matViewerViewMode', state.currentViewMode);
            if (state.fullVariableData && state.currentVariableData) {
                refreshPreview();
            }
            break;
        case 'set1DViewMode':
            state.current1DViewMode = target.getAttribute('data-mode');
            localStorage.setItem('matViewer1DViewMode', state.current1DViewMode);
            if (state.fullVariableData && state.currentVariableData) {
                refreshPreview();
            }
            break;
        case 'breadcrumbNav':
            var navIndex = parseInt(target.getAttribute('data-nav-index'));
            if (navIndex >= 0 && state.navigationPath && navIndex < state.navigationPath.length) {
                var navPath = state.navigationPath[navIndex].path;
                selectTreeItem(navPath);
            }
            break;
        case 'windowLevel':
        case 'windowWidth':
            updateWindowLevel();
            break;
    }
});

document.addEventListener('change', function(e) {
    if (!(e.target instanceof Element)) return;
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
    if (!(e.target instanceof Element)) return;
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {
        case 'updateSlice':
            updateSlice(target.value);
            break;
        case 'windowLevel':
        case 'windowWidth':
            updateWindowLevel();
            break;
    }
});

settingsBtn && settingsBtn.addEventListener('click', openSettings);
exportBtn && exportBtn.addEventListener('click', function() {
    // Delegate to the extension host, which runs the unified export
    // command (format + variable + save dialog). This keeps the webview
    // free of file-system concerns and reuses the same code path as the
    // command palette / keybinding.
    vscode.postMessage({ command: 'exportData' });
});
closeSettingsBtn && closeSettingsBtn.addEventListener('click', closeSettings);
overlay && overlay.addEventListener('click', closeSettings);

var currentTheme = localStorage.getItem('matViewerTheme') || 'auto';

function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('matViewerTheme', theme);

    document.querySelectorAll('.theme-option').forEach(function(opt) {
        opt.classList.remove('active');
        if (opt.getAttribute('data-theme') === theme) {
            opt.classList.add('active');
        }
    });

    document.body.classList.remove('theme-light', 'theme-dark');

    if (theme === 'auto') {
        return;
    }

    document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
}

document.querySelectorAll('.theme-option').forEach(function(opt) {
    opt.addEventListener('click', function(e) {
        e.stopPropagation();
        applyTheme(this.getAttribute('data-theme'));
    });
});

applyTheme(currentTheme);

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
    } else if (target.id === 'roiBtn') {
        toggleROI();
    } else if (target.id === 'valueSearchBtn' || (target.closest && target.closest('#valueSearchBtn'))) {
        toggleValueSearch();
    } else if (target.id === 'expandHistogramBtn' || (target.closest && target.closest('#expandHistogramBtn'))) {
        showFullHistogram();
    }
});

sidebarToggle && sidebarToggle.addEventListener('click', toggleSidebar);
headerToggle && headerToggle.addEventListener('click', toggleSidebar);

githubLink && githubLink.addEventListener('click', function() {
    vscode.postMessage({ command: 'openExternal', url: 'https://github.com/MaiwulanjiangMaiming/MatrixSpy' });
});

var starLink = document.getElementById('starLink');
var feedbackLink = document.getElementById('feedbackLink');

starLink && starLink.addEventListener('click', function() {
    vscode.postMessage({ command: 'openExternal', url: 'https://github.com/MaiwulanjiangMaiming/MatrixSpy' });
});

feedbackLink && feedbackLink.addEventListener('click', function() {
    vscode.postMessage({ command: 'openExternal', url: 'https://github.com/MaiwulanjiangMaiming/MatrixSpy/issues' });
});

var contactLink = document.getElementById('contactLink');
contactLink && contactLink.addEventListener('click', function() {
    vscode.postMessage({ command: 'openExternal', url: 'mailto:mawlan.momin@gmail.com?subject=MatrixSpy%20Feedback' });
});

var savedSidebarCollapsed = localStorage.getItem('matViewerSidebarCollapsed');
if (savedSidebarCollapsed === 'true') {
    state.sidebarCollapsed = true;
    sidebar.classList.add('collapsed');
    headerToggle.classList.add('visible');
}

var sidebarSearch = document.getElementById('sidebarSearch');
if (sidebarSearch) {
    // Debounce sidebar search to avoid rebuilding the entire sidebar DOM on
    // every keystroke, which is janky for MAT files with hundreds of vars.
    var sidebarSearchTimer = null;
    sidebarSearch.addEventListener('input', function(e) {
        var filterText = e.target.value;
        if (sidebarSearchTimer) clearTimeout(sidebarSearchTimer);
        sidebarSearchTimer = setTimeout(function() {
            if (state.currentFileData) {
                renderSidebar(state.currentFileData, filterText);
            }
        }, 150);
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
        refreshPreview();
    }
}

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
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
                    refreshPreview();
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
        case 'z':
            if (e.ctrlKey || e.metaKey) {
                if (e.shiftKey) {
                    store.redo();
                } else {
                    store.undo();
                }
                if (state.fullVariableData && state.currentVariableData) {
                    refreshPreview();
                }
                handled = true;
            }
            break;
        case 'Escape':
            if (state.roiState.active) {
                state.roiState.active = false;
                state.roiState.dragging = false;
                removeROIOverlay();
                var roiBtn = document.getElementById('roiBtn');
                if (roiBtn) roiBtn.classList.remove('active');
                handled = true;
            }
            break;
    }
    if (handled) {
        e.preventDefault();
        e.stopPropagation();
    }
});

window.addEventListener('message', handleMessage);
document.addEventListener('click', function() { hideContextMenu(); });
`;
}
