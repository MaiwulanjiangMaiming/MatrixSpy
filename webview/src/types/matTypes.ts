export interface MatVariable {
  _type: 'ndarray' | 'struct' | 'complex' | 'scalar' | 'string';
  shape?: number[];
  dtype?: string;
  data?: any;
  complex?: boolean;
  magnitude?: any;
  phase?: any;
  [key: string]: any;
}

export interface MatMetadata {
  type: string;
  shape?: number[];
  dtype?: string;
  size?: number;
}

export interface SliceInfo {
  dims: Array<{
    start: number;
    stop?: number;
    step?: number;
  }>;
}

export interface PlotConfig {
  type: 'line' | 'heatmap' | 'image' | 'volume' | 'scatter';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
}

export interface MRIConfig {
  showMagnitude: boolean;
  showPhase: boolean;
  showReal: boolean;
  showImag: boolean;
  sliceIndex: number;
  axis: number;
}
