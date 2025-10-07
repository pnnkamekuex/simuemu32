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
  analysis?: ParsedLine[];
}

export type OperandKind = 'imm' | 'reg' | 'mem' | 'label';

export type OperandAddressMode =
  | 'inmediato'
  | 'registro'
  | 'directo'
  | 'indirecto'
  | 'base+desp'
  | 'base+indice'
  | 'base+indice+desp'
  | 'indice-escalado'
  | 'mixto'
  | 'relativo'
  | 'desconocido';

export type InstructionSize = 'b' | 'w' | 'l' | 'inferido';

export type InstructionCategory =
  | 'data'
  | 'arith'
  | 'logic'
  | 'shift'
  | 'verify'
  | 'setcc'
  | 'branch'
  | 'cmov'
  | 'string'
  | 'stack'
  | 'misc'
  | 'directive'
  | 'label';

export interface ParsedOperand {
  kind: OperandKind;
  text: string;
  addrMode: OperandAddressMode;
  parsed: Record<string, unknown>;
}

export interface ParsedLine {
  line: number;
  label?: string;
  mnemonic: string;
  size: InstructionSize;
  category: InstructionCategory;
  operands: ParsedOperand[];
  addrMode: string;
  flags: { writes: string[]; reads: string[] };
  errors: string[];
  prefixes?: string[];
}

export interface AssemblyAnalysisResult {
  lines: ParsedLine[];
}
