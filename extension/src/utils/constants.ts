export const EXTENSION_ID = 'matrixspy';
export const VIEW_ID = 'matrixspyVariables';
export const CUSTOM_EDITOR_VIEW_TYPE = 'matrixspy.matFile';

export const COMMANDS = {
    OPEN_FILE: 'matrixspy.openFile',
    EXPORT: 'matrixspy.export',
    REFRESH_VARIABLES: 'matrixspy.refreshVariables',
    INSTALL_DEPS: 'matrixspy.installDeps',
    SHOW_VARIABLE: 'matrixspy.showVariable',
    TEST_ENVIRONMENT: 'matrixspy.testEnvironment',
    SHOW_SETUP_WIZARD: 'matrixspy.showSetupWizard',
    SHOW_WELCOME: 'matrixspy.showWelcome',
    RESET_WELCOME: 'matrixspy.resetWelcome'
} as const;

export const CONFIG_KEYS = {
    PYTHON_PATH: 'matrixspy.pythonPath',
    MAX_DATA_SIZE: 'matrixspy.maxDataSize'
} as const;

export const PYTHON_SCRIPT = 'high_perf_parser.py';
export const PYTHON_TIMEOUT = 60000;

export const DATA_TYPES = {
    NDARRAY: 'ndarray',
    STRUCT: 'struct',
    COMPLEX: 'complex',
    SCALAR: 'scalar',
    STRING: 'string',
    SLICE: 'slice',
    ERROR: 'error'
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
