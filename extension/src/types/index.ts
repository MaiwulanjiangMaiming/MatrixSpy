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
    percentiles?: {
        p5?: number | null;
        p25?: number | null;
        p50?: number | null;
        p75?: number | null;
        p95?: number | null;
    } | null;
    nan_count?: number | null;
    inf_count?: number | null;
    sparsity?: number | null;
    memory_mb?: number | null;
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
