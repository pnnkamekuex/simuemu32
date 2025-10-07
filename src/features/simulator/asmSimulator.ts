import type {
  CpuState,
  Diagnostic,
  RegisterName,
  SimulationLogEntry,
  SimulationResult,
} from '../../types';

const REGISTER_NAMES: RegisterName[] = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP'];

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
  | { type: 'immediate'; value: number };

const isRegister = (value: string): value is RegisterName =>
  REGISTER_NAMES.includes(value.toUpperCase() as RegisterName);

const parseImmediate = (value: string): number | null => {
  const trimmed = value.trim().toLowerCase();
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
  if (isRegister(cleaned.toUpperCase())) {
    return { type: 'register', register: cleaned.toUpperCase() as RegisterName };
  }

  const immediate = parseImmediate(cleaned);
  if (immediate !== null) {
    return { type: 'immediate', value: immediate };
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

const getOperandValue = (state: CpuState, operand: Operand): number => {
  if (operand.type === 'register') {
    return state.registers[operand.register];
  }
  return operand.value;
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
    const mnemonic = mnemonicRaw.toLowerCase();
    const operands = operandsRaw.split(',').map((operand) => operand.trim()).filter(Boolean);

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

        const destination = parseOperand(operands[0]);
        const source = parseOperand(operands[1]);

        if (!destination || destination.type !== 'register') {
          recordError('El destino de mov debe ser un registro');
          return;
        }
        if (!source) {
          recordError('No se reconoce el operando de origen');
          return;
        }

        const value = getOperandValue(state, source);
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

        const destination = parseOperand(operands[0]);
        const source = parseOperand(operands[1]);

        if (!destination || destination.type !== 'register') {
          recordError('El destino debe ser un registro');
          return;
        }
        if (!source) {
          recordError('No se reconoce el operando de origen');
          return;
        }

        const currentValue = state.registers[destination.register];
        const operandValue = getOperandValue(state, source);
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
        const value = getOperandValue(state, operand);
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
  };
};

export const formatRegisterValue = (value: number) => `0x${(value >>> 0).toString(16).padStart(8, '0')}`;

export const getInitialCpuState = (): CpuState => cloneState(createInitialState());
