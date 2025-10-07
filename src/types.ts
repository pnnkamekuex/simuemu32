export type ProjectTemplate = 'normal' | 'simplificado';

export interface Project {
  id: string;
  name: string;
  template: ProjectTemplate;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export type RegisterName =
  | 'EAX'
  | 'EBX'
  | 'ECX'
  | 'EDX'
  | 'ESI'
  | 'EDI'
  | 'EBP'
  | 'ESP';

export interface CpuState {
  registers: Record<RegisterName, number>;
  flags: {
    ZF: boolean;
    SF: boolean;
  };
  stack: number[];
}

export interface Diagnostic {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface SimulationLogEntry {
  line: number;
  instruction: string;
  description: string;
}

export interface SimulationResult {
  state: CpuState;
  diagnostics: Diagnostic[];
  log: SimulationLogEntry[];
}
