export const EXTENSION_ID = 'matrixspy';
export const VIEW_ID = 'matrixspyVariables';
export const CUSTOM_EDITOR_VIEW_TYPE = 'matrixspy.matFile';

export const COMMANDS = {
    OPEN_FILE: 'matrixspy.openFile',
    EXPORT_CSV: 'matrixspy.exportCSV',
    EXPORT_JSON: 'matrixspy.exportJSON',
    REFRESH_VARIABLES: 'matrixspy.refreshVariables',
    INSTALL_DEPS: 'matrixspy.installDeps',
    OPEN_SAMPLE: 'matrixspy.openSample',
    SHOW_VARIABLE: 'matrixspy.showVariable'
} as const;

export const CONFIG_KEYS = {
    PYTHON_PATH: 'matrixspy.pythonPath',
    MAX_DATA_SIZE: 'matrixspy.maxDataSize',
    ENABLE_IMAGE: 'matrixspy.enableImage'
} as const;

export const STORAGE_KEYS = {
    SIDEBAR_COLLAPSED: 'matViewerSidebarCollapsed',
    THEME: 'matViewerTheme',
    DISPLAY_MODE: 'matViewerDisplayMode',
    VIEW_MODE: 'matViewerViewMode',
    AXIS: 'matViewerAxis',
    SLICE: 'matViewerSlice',
    SHOW_COUNT_1D: 'matViewerShowCount1D',
    SHOW_ROWS_2D: 'matViewerShowRows2D',
    SHOW_COLS_2D: 'matViewerShowCols2D'
} as const;

export const PYTHON_SCRIPT = 'high_perf_parser.py';
export const PYTHON_TIMEOUT = 30000; // 30 seconds
export const MAX_FILE_SIZE_MB = 100; // 100MB

export const DATA_TYPES = {
    NDARRAY: 'ndarray',
    STRUCT: 'struct',
    COMPLEX: 'complex',
    SCALAR: 'scalar',
    STRING: 'string',
    LARGE_DATA: 'large_data',
    LARGE_ARRAY: 'large_array'
} as const;

export const VIEW_MODES = {
    IMAGE: 'image',
    TABLE: 'table'
} as const;

export const COMPLEX_VIEW_MODES = {
    MAGNITUDE: 'magnitude',
    PHASE: 'phase',
    REAL: 'real',
    IMAG: 'imag'
} as const;

export const LOG_PREFIX = '[MatrixSpy]';