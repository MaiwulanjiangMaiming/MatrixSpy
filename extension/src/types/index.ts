/*
Author: Maiwulanjiang Maiming
        Peking University, Institute of Medical Technology
        mawlan.momin@gmail.com
*/

export interface MatFileData {
    [key: string]: MatVariable;
}

export interface MatVariable {
    _type?: string;
    shape?: number[];
    dtype?: string;
    size?: number;
    data?: any;
    complex?: boolean;
    statistics?: MatStatistics;
    stats?: MatStatistics;
    magnitude?: any;
    phase?: any;
    [key: string]: any;
}

export interface MatStatistics {
    min?: number;
    max?: number;
    mean?: number;
    std?: number;
    error?: string;
    note?: string;
}

export interface ComplexNumber {
    real: number;
    imag: number;
    _type: 'complex';
}

export interface ParserResult {
    success: boolean;
    version?: string;
    file_path?: string;
    data?: MatFileData;
    metadata?: any;
    error?: string;
    variable_name?: string;
    message?: string;
    details?: any;
}

export interface WebviewMessage {
    command: string;
    data?: any;
    variableName?: string;
    variableValue?: any;
    error?: string;
    success?: boolean;
    retryable?: boolean;
}
