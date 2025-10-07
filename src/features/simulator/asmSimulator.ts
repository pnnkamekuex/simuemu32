import type {
  CpuState,
  Diagnostic,
  RegisterName,
  SimulationLogEntry,
  SimulationResult,
} from '../../types';
import { analyzeAssembly } from './asmParser';

const REGISTER_NAMES: RegisterName[] = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP'];

const stripPrefix = (value: string, prefix: string) =>
  value.startsWith(prefix) ? value.slice(prefix.length) : value;

const SIZE_SUFFIXES = new Set(['b', 'w', 'l']);

const DIRECTIVES = new Set([
  '.text',
  '.data',
  '.bss',
  '.rodata',
  '.byte',
  '.word',
  '.int',
  '.quad',
  '.ascii',
  '.asciiz',
  '.string',
  '.space',
  '.global',
]);

const normalizeMnemonic = (mnemonic: string) => {
  const lowered = mnemonic.toLowerCase();
  if (lowered.startsWith('.')) {
    return lowered;
  }
  if (lowered.length > 1) {
    const suffix = lowered[lowered.length - 1];
    if (SIZE_SUFFIXES.has(suffix)) {
      return lowered.slice(0, -1);
    }
  }
  return lowered;
};

const createInitialState = (): CpuState => ({
  registers: REGISTER_NAMES.reduce(
    (acc, register) => ({
      ...acc,
      [register]: register === 'ESP' ? 0x1000 : 0,
    }),
    {} as Record<RegisterName, number>,
  ),
  flags: {
    ZF: false,
    SF: false,
  },
  stack: [],
});

type Operand =
  | { type: 'register'; register: RegisterName }
  | { type: 'immediate'; value: number }
  | { type: 'memory'; reference: string };

const isRegister = (value: string): value is RegisterName =>
  REGISTER_NAMES.includes(value.toUpperCase() as RegisterName);

const parseImmediate = (value: string): number | null => {
  const trimmed = stripPrefix(value.trim(), '$').toLowerCase();
  if (trimmed.startsWith('0x')) {
    const parsed = Number.parseInt(trimmed.slice(2), 16);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (trimmed.startsWith('0b')) {
    const parsed = Number.parseInt(trimmed.slice(2), 2);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  return null;
};

const parseOperand = (rawOperand: string): Operand | null => {
  const cleaned = rawOperand.trim();
  const registerCandidate = stripPrefix(cleaned, '%');
  if (isRegister(registerCandidate.toUpperCase())) {
    return { type: 'register', register: registerCandidate.toUpperCase() as RegisterName };
  }

  const immediate = parseImmediate(cleaned);
  if (immediate !== null) {
    return { type: 'immediate', value: immediate };
  }

  if (cleaned.startsWith('(') || cleaned.includes('(') || cleaned.includes(')')) {
    return { type: 'memory', reference: cleaned };
  }

  if (/^[A-Za-z_][\w]*(\+|-)?/.test(cleaned)) {
    return { type: 'memory', reference: cleaned };
  }

  return null;
};

const cloneState = (state: CpuState): CpuState => ({
  registers: { ...state.registers },
  flags: { ...state.flags },
  stack: [...state.stack],
});

const setRegister = (state: CpuState, register: RegisterName, value: number) => {
  state.registers[register] = value;
};

const getOperandValue = (state: CpuState, operand: Operand): number | null => {
  if (operand.type === 'register') {
    return state.registers[operand.register];
  }
  if (operand.type === 'immediate') {
    return operand.value;
  }
  return null;
};

const updateArithmeticFlags = (state: CpuState, result: number) => {
  state.flags.ZF = result === 0;
  state.flags.SF = result < 0;
};

const normalizeInstruction = (instruction: string) => instruction.trim().replace(/\s+/g, ' ');

export const simulateProgram = (code: string): SimulationResult => {
  const state = createInitialState();
  const diagnostics: Diagnostic[] = [];
  const log: SimulationLogEntry[] = [];

  const analysis = analyzeAssembly(code);

  analysis.lines.forEach((line) => {
    line.errors.forEach((message) => {
      diagnostics.push({
        line: line.line,
        message,
        severity: 'error',
      });
    });
  });

  const lines = code.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    const commentIndex = line.indexOf(';');
    const lineWithoutComment = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const trimmed = lineWithoutComment.trim();

    if (!trimmed) {
      return;
    }

    const possibleLabel = trimmed.split(':');
    let instructionBody = trimmed;
    if (possibleLabel.length > 1 && possibleLabel[0].match(/^[A-Za-z_][\w]*$/)) {
      instructionBody = possibleLabel.slice(1).join(':').trim();
      if (!instructionBody) {
        return;
      }
    }

    const [mnemonicRaw, operandsRaw = ''] = instructionBody.split(/\s+/, 2);
    const loweredMnemonic = mnemonicRaw.toLowerCase();
    if (DIRECTIVES.has(loweredMnemonic)) {
      return;
    }
    const mnemonic = normalizeMnemonic(mnemonicRaw);
    if (DIRECTIVES.has(mnemonic)) {
      return;
    }
    const operands = operandsRaw
      .split(',')
      .map((operand) => operand.trim())
      .filter(Boolean);

    const recordError = (message: string) => {
      diagnostics.push({
        line: lineNumber,
        message,
        severity: 'error',
      });
    };

    const appendLog = (description: string) => {
      log.push({
        line: lineNumber,
        instruction: normalizeInstruction(instructionBody),
        description,
      });
    };

    switch (mnemonic) {
      case 'mov': {
        if (operands.length !== 2) {
          recordError('mov requiere dos operandos');
          return;
        }

        const source = parseOperand(operands[0]);
        const destination = parseOperand(operands[1]);

        if (!destination || destination.type !== 'register') {
          recordError('El destino de mov debe ser un registro');
          return;
        }
        if (!source) {
          recordError('No se reconoce el operando de origen');
          return;
        }
        if (source.type === 'memory') {
          recordError('Operaciones de memoria aún no están soportadas');
          return;
        }

        const value = getOperandValue(state, source);
        if (value === null) {
          recordError('Operando de origen inválido');
          return;
        }

        setRegister(state, destination.register, value);
        if (destination.register === 'ESP') {
          state.stack = [];
        }
        appendLog(`Se movió ${value} a ${destination.register}`);
        break;
      }
      case 'add':
      case 'sub': {
        if (operands.length !== 2) {
          recordError(`${mnemonic} requiere dos operandos`);
          return;
        }

        const source = parseOperand(operands[0]);
        const destination = parseOperand(operands[1]);

        if (!destination || destination.type !== 'register') {
          recordError('El destino debe ser un registro');
          return;
        }
        if (!source) {
          recordError('No se reconoce el operando de origen');
          return;
        }
        if (source.type === 'memory') {
          recordError('Operaciones de memoria aún no están soportadas');
          return;
        }

        const currentValue = state.registers[destination.register];
        const operandValue = getOperandValue(state, source);
        if (operandValue === null) {
          recordError('Operando de origen inválido');
          return;
        }
        const result = mnemonic === 'add' ? currentValue + operandValue : currentValue - operandValue;
        setRegister(state, destination.register, result);
        updateArithmeticFlags(state, result);
        appendLog(`Resultado en ${destination.register}: ${result}`);
        break;
      }
      case 'push': {
        if (operands.length !== 1) {
          recordError('push requiere un operando');
          return;
        }
        const operand = parseOperand(operands[0]);
        if (!operand) {
          recordError('Operando inválido para push');
          return;
        }
        if (operand.type === 'memory') {
          recordError('Operaciones de memoria aún no están soportadas');
          return;
        }
        const value = getOperandValue(state, operand);
        if (value === null) {
          recordError('Operando inválido para push');
          return;
        }
        const newEsp = state.registers.ESP - 4;
        setRegister(state, 'ESP', newEsp);
        state.stack = [value, ...state.stack];
        appendLog(`Se apiló el valor ${value}`);
        break;
      }
      case 'pop': {
        if (operands.length !== 1) {
          recordError('pop requiere un operando');
          return;
        }
        const operand = parseOperand(operands[0]);
        if (!operand || operand.type !== 'register') {
          recordError('El destino de pop debe ser un registro');
          return;
        }
        if (state.stack.length === 0) {
          recordError('La pila está vacía, no se puede hacer pop');
          return;
        }
        const [top, ...rest] = state.stack;
        state.stack = rest;
        const newEsp = state.registers.ESP + 4;
        setRegister(state, 'ESP', newEsp);
        setRegister(state, operand.register, top);
        appendLog(`Se extrajo ${top} de la pila hacia ${operand.register}`);
        break;
      }
      case 'nop': {
        appendLog('No operation');
        break;
      }
      case 'int': {
        appendLog('Interrupción simulada (sin efecto)');
        break;
      }
      default: {
        recordError(`Instrucción no soportada: ${mnemonic}`);
      }
    }
  });

  return {
    state: cloneState(state),
    diagnostics,
    log,
    analysis: analysis.lines,
  };
};

export const formatRegisterValue = (value: number) => `0x${(value >>> 0).toString(16).padStart(8, '0')}`;

export const getInitialCpuState = (): CpuState => cloneState(createInitialState());
