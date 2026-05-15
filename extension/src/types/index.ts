export interface MatVariable {
    _type?: string;
    shape?: number[];
    dtype?: string;
    size?: number;
    data?: any;
    complex?: boolean;
    statistics?: MatStatistics | null;
    error?: string;
    real?: number | null;
    imag?: number | null;
    [key: string]: any;
}

export interface MatStatistics {
    min?: number | null;
    max?: number | null;
    mean?: number | null;
    std?: number | null;
    note?: string;
    error?: string;
}

export interface MatFileData {
    [key: string]: MatVariable | number | string | any;
}

export interface ParserResult {
    success: boolean;
    data?: MatFileData;
    error?: string;
    version?: string;
    file_path?: string;
}

export interface SliceResult {
    success: boolean;
    data?: {
        _type: string;
        shape: number[];
        dtype: string;
        axis: number;
        index: number;
        encoded_data: string;
        statistics: MatStatistics;
    };
    error?: string;
    variable_name?: string;
}

export interface WebviewMessage {
    command: string;
    variableName?: string;
    variableValue?: any;
    axis?: number;
    index?: number;
}

export interface WebviewResponse {
    command: string;
    data?: any;
    error?: string;
    success?: boolean;
    variableName?: string;
    retryable?: boolean;
}
