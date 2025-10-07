import type {
  AssemblyAnalysisResult,
  InstructionCategory,
  InstructionSize,
  OperandAddressMode,
  ParsedLine,
  ParsedOperand,
} from '../../types';

type ParseContext = {
  line: number;
  label?: string;
  raw: string;
};

const SECTION_DIRECTIVES = new Set(['.text', '.data', '.bss', '.rodata']);
const DATA_DIRECTIVES = new Set(['.byte', '.word', '.int', '.quad', '.ascii', '.asciiz', '.string', '.space']);
const OTHER_DIRECTIVES = new Set(['.global']);

const PREFIXES = new Set(['rep', 'repe', 'repz', 'repne', 'repnz']);

const REGISTER_SIZES: Record<string, { normalized: string; size: InstructionSize }> = {
  '%al': { normalized: '%AL', size: 'b' },
  '%ah': { normalized: '%AH', size: 'b' },
  '%bl': { normalized: '%BL', size: 'b' },
  '%bh': { normalized: '%BH', size: 'b' },
  '%cl': { normalized: '%CL', size: 'b' },
  '%ch': { normalized: '%CH', size: 'b' },
  '%dl': { normalized: '%DL', size: 'b' },
  '%dh': { normalized: '%DH', size: 'b' },
  '%ax': { normalized: '%AX', size: 'w' },
  '%bx': { normalized: '%BX', size: 'w' },
  '%cx': { normalized: '%CX', size: 'w' },
  '%dx': { normalized: '%DX', size: 'w' },
  '%si': { normalized: '%SI', size: 'w' },
  '%di': { normalized: '%DI', size: 'w' },
  '%bp': { normalized: '%BP', size: 'w' },
  '%sp': { normalized: '%SP', size: 'w' },
  '%eax': { normalized: '%EAX', size: 'l' },
  '%ebx': { normalized: '%EBX', size: 'l' },
  '%ecx': { normalized: '%ECX', size: 'l' },
  '%edx': { normalized: '%EDX', size: 'l' },
  '%esi': { normalized: '%ESI', size: 'l' },
  '%edi': { normalized: '%EDI', size: 'l' },
  '%ebp': { normalized: '%EBP', size: 'l' },
  '%esp': { normalized: '%ESP', size: 'l' },
};

const isRegister = (value: string) => Object.prototype.hasOwnProperty.call(REGISTER_SIZES, value.toLowerCase());

const LABEL_PATTERN = /^[A-Za-z_][\w]*$/;

const NUMBER_DECIMAL = /^-?\d+$/;
const NUMBER_HEX = /^-?0x[0-9a-f]+$/i;
const NUMBER_BINARY = /^-?0b[01]+$/i;

const parseNumber = (text: string): number | null => {
  if (NUMBER_HEX.test(text)) {
    return Number.parseInt(text, 16);
  }
  if (NUMBER_BINARY.test(text)) {
    return Number.parseInt(text, 2);
  }
  if (NUMBER_DECIMAL.test(text)) {
    return Number.parseInt(text, 10);
  }
  return null;
};

const toDisplacement = (token: string) => {
  const trimmed = token.trim();
  if (!trimmed) {
    return { symbol: undefined, displacement: undefined, error: undefined };
  }

  const symbolMatch = trimmed.match(/^([A-Za-z_][\w]*)?(.*)$/);
  if (!symbolMatch) {
    return { symbol: undefined, displacement: undefined, error: 'Desplazamiento inválido' };
  }

  const [, symbol = '', rest] = symbolMatch;
  const remainder = rest.trim();

  let displacement: number | undefined;
  if (remainder) {
    const signMatch = remainder.match(/^([+-])\s*(.+)$/);
    if (signMatch) {
      const [, sign, valueText] = signMatch;
      const parsed = parseNumber(valueText);
      if (parsed === null) {
        return { symbol: symbol || undefined, displacement: undefined, error: 'Desplazamiento inválido' };
      }
      displacement = sign === '-' ? -parsed : parsed;
    } else {
      const parsed = parseNumber(remainder);
      if (parsed === null) {
        return { symbol: symbol || undefined, displacement: undefined, error: 'Desplazamiento inválido' };
      }
      displacement = parsed;
    }
  }

  return { symbol: symbol || undefined, displacement, error: undefined };
};

const parseScale = (value: string) => {
  const parsed = parseNumber(value.trim());
  if (parsed === null) {
    return { scale: undefined, error: 'Escala inválida' };
  }
  if (![1, 2, 4, 8].includes(parsed)) {
    return { scale: undefined, error: 'La escala debe ser 1, 2, 4 u 8' };
  }
  return { scale: parsed, error: undefined };
};

const determineOperandAddressMode = (operand: ParsedOperand[]): string => {
  if (operand.length === 0) {
    return 'sin-operandos';
  }
  if (operand.length === 1) {
    return operand[0].addrMode;
  }
  const parts = operand.map((op, index) => `${index === 0 ? 'src' : 'dst'}:${op.addrMode}`);
  return parts.join(' ');
};

const createOperand = (
  kind: ParsedOperand['kind'],
  text: string,
  addrMode: OperandAddressMode,
  parsed: Record<string, unknown>,
): ParsedOperand => ({
  kind,
  text,
  addrMode,
  parsed,
});

const splitOperands = (text: string): string[] => {
  const result: string[] = [];
  let buffer = '';
  let depth = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '(') {
      depth += 1;
      buffer += char;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
      buffer += char;
    } else if (char === ',' && depth === 0) {
      if (buffer.trim()) {
        result.push(buffer.trim());
      }
      buffer = '';
    } else {
      buffer += char;
    }
  }

  if (buffer.trim()) {
    result.push(buffer.trim());
  }

  return result;
};

const parseImmediate = (raw: string): ParsedOperand | { error: string } => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('$')) {
    return { error: 'Inmediato inválido' };
  }
  const valueText = trimmed.slice(1);
  if (LABEL_PATTERN.test(valueText)) {
    return createOperand('imm', raw, 'inmediato', { type: 'symbol', symbol: valueText });
  }
  const value = parseNumber(valueText);
  if (value === null) {
    return { error: 'Inmediato inválido' };
  }
  return createOperand('imm', raw, 'inmediato', { value });
};

const parseRegisterOperand = (raw: string): ParsedOperand | { error: string } => {
  const trimmed = raw.trim().toLowerCase();
  if (!isRegister(trimmed)) {
    return { error: 'Registro inválido' };
  }
  const info = REGISTER_SIZES[trimmed];
  return createOperand('reg', info.normalized, 'registro', { register: info.normalized, size: info.size });
};

const parseMemoryOperand = (raw: string): { operand?: ParsedOperand; error?: string } => {
  const cleaned = raw.trim();

  const star = cleaned.startsWith('*');
  const value = star ? cleaned.slice(1).trim() : cleaned;

  const parenIndex = value.indexOf('(');
  const hasParens = parenIndex !== -1;

  let displacementToken = '';
  let inside = '';

  if (hasParens) {
    const lastParen = value.lastIndexOf(')');
    if (lastParen === -1 || lastParen < parenIndex) {
      return { error: 'Paréntesis no balanceados en operando de memoria' };
    }
    displacementToken = value.slice(0, parenIndex).trim();
    inside = value.slice(parenIndex + 1, lastParen).trim();
  } else {
    displacementToken = value;
  }

  const displacementInfo = toDisplacement(displacementToken);
  if (displacementInfo.error) {
    return { error: displacementInfo.error };
  }

  const parsed: Record<string, unknown> = {
    symbol: displacementInfo.symbol,
    displacement: displacementInfo.displacement,
    indirect: star,
  };

  let addrMode: OperandAddressMode = 'directo';

  if (hasParens) {
    const parts = inside.split(',').map((part) => part.trim()).filter(Boolean);
    const [baseRaw, indexRaw, scaleRaw] = parts;

    if (baseRaw) {
      const baseLower = baseRaw.toLowerCase();
      if (!isRegister(baseLower)) {
        return { error: 'Registro base inválido' };
      }
      parsed.base = REGISTER_SIZES[baseLower].normalized;
    }

    if (indexRaw) {
      const indexLower = indexRaw.toLowerCase();
      if (!isRegister(indexLower)) {
        return { error: 'Registro índice inválido' };
      }
      parsed.index = REGISTER_SIZES[indexLower].normalized;
    }

    if (scaleRaw) {
      const { scale, error } = parseScale(scaleRaw);
      if (error) {
        return { error };
      }
      parsed.scale = scale;
    }

    const hasBase = Boolean(parsed.base);
    const hasIndex = Boolean(parsed.index);
    const hasDisplacement = parsed.displacement !== undefined || parsed.symbol !== undefined;
    const hasScale = parsed.scale !== undefined;

    if (hasBase && hasIndex && (hasDisplacement || hasScale)) {
      addrMode = 'base+indice+desp';
    } else if (hasBase && hasIndex) {
      addrMode = 'base+indice';
    } else if (!hasBase && hasIndex && (hasDisplacement || hasScale)) {
      addrMode = hasScale ? 'indice-escalado' : 'base+indice';
    } else if (hasBase && hasDisplacement) {
      addrMode = 'base+desp';
    } else if (hasBase) {
      addrMode = 'indirecto';
    } else if (hasIndex) {
      addrMode = hasScale ? 'indice-escalado' : 'indirecto';
    } else if (hasDisplacement) {
      addrMode = 'directo';
    } else {
      addrMode = 'desconocido';
    }
  } else if (displacementInfo.symbol || displacementInfo.displacement !== undefined) {
    addrMode = 'directo';
  }

  return {
    operand: createOperand('mem', cleaned, addrMode, parsed),
  };
};

const normalizeMnemonic = (mnemonic: string) => mnemonic.trim().toLowerCase();

const extractSizeSuffix = (mnemonic: string): { base: string; size: InstructionSize } => {
  if (mnemonic.length > 1) {
    const suffix = mnemonic[mnemonic.length - 1];
    if (suffix === 'b' || suffix === 'w' || suffix === 'l') {
      return { base: mnemonic.slice(0, -1), size: suffix };
    }
  }
  return { base: mnemonic, size: 'inferido' };
};

const SIGNED_CONDITIONS = new Set(['g', 'ge', 'l', 'le', 's', 'ns']);
const UNSIGNED_CONDITIONS = new Set(['a', 'ae', 'b', 'be', 'na', 'nae', 'nb', 'nbe', 'c', 'nc']);

const CONDITION_FLAG_MAP: Record<string, string[]> = {
  e: ['ZF'],
  z: ['ZF'],
  ne: ['ZF'],
  nz: ['ZF'],
  s: ['SF'],
  ns: ['SF'],
  g: ['ZF', 'SF', 'OF'],
  ge: ['SF', 'OF'],
  l: ['SF', 'OF'],
  le: ['ZF', 'SF', 'OF'],
  a: ['CF', 'ZF'],
  ae: ['CF'],
  b: ['CF'],
  be: ['CF', 'ZF'],
  na: ['CF', 'ZF'],
  nae: ['CF'],
  nb: ['CF'],
  nbe: ['CF', 'ZF'],
  c: ['CF'],
  nc: ['CF'],
  o: ['OF'],
  no: ['OF'],
  p: ['PF'],
  pe: ['PF'],
  po: ['PF'],
  np: ['PF'],
};

const FLAG_WRITES: Record<string, string[]> = {
  add: ['CF', 'OF', 'SF', 'ZF'],
  adc: ['CF', 'OF', 'SF', 'ZF'],
  sub: ['CF', 'OF', 'SF', 'ZF'],
  sbb: ['CF', 'OF', 'SF', 'ZF'],
  inc: ['OF', 'SF', 'ZF'],
  dec: ['OF', 'SF', 'ZF'],
  neg: ['CF', 'OF', 'SF', 'ZF'],
  mul: ['CF', 'OF'],
  imul: ['CF', 'OF'],
  imul3: ['CF', 'OF'],
  div: [],
  idiv: [],
  and: ['CF', 'OF', 'SF', 'ZF'],
  or: ['CF', 'OF', 'SF', 'ZF'],
  xor: ['CF', 'OF', 'SF', 'ZF'],
  not: [],
  shl: ['CF', 'OF', 'SF', 'ZF'],
  sal: ['CF', 'OF', 'SF', 'ZF'],
  shr: ['CF', 'OF', 'SF', 'ZF'],
  sar: ['CF', 'OF', 'SF', 'ZF'],
  rol: ['CF', 'OF'],
  ror: ['CF', 'OF'],
  rcl: ['CF', 'OF'],
  rcr: ['CF', 'OF'],
  test: ['CF', 'OF', 'SF', 'ZF'],
  cmp: ['CF', 'OF', 'SF', 'ZF'],
};

const categorizeMnemonic = (mnemonic: string): InstructionCategory => {
  const base = mnemonic.startsWith('mov') ? 'mov' : mnemonic;

  if (['mov', 'movzb', 'movsb', 'movsw', 'movsl', 'cbt', 'cwt', 'cwd', 'clt', 'xchg', 'lea'].some((prefix) => base.startsWith(prefix))) {
    return 'data';
  }
  if (['push', 'pop'].includes(base)) {
    return 'stack';
  }
  if (['add', 'sub', 'adc', 'sbb', 'inc', 'dec', 'neg', 'mul', 'imul', 'div', 'idiv'].includes(base)) {
    return 'arith';
  }
  if (['and', 'or', 'xor', 'not'].includes(base)) {
    return 'logic';
  }
  if (['shl', 'sal', 'shr', 'sar', 'rol', 'ror', 'rcl', 'rcr'].includes(base)) {
    return 'shift';
  }
  if (['cmp', 'test'].includes(base)) {
    return 'verify';
  }
  if (base.startsWith('set')) {
    return 'setcc';
  }
  if (base.startsWith('cmov')) {
    return 'cmov';
  }
  if (base.startsWith('j') || base === 'loop' || base === 'call' || base === 'ret') {
    return 'branch';
  }
  if (['lods', 'stos', 'movs', 'scas', 'cmps'].some((prefix) => base.startsWith(prefix))) {
    return 'string';
  }
  if (PREFIXES.has(base)) {
    return 'string';
  }
  if (['cld', 'std'].includes(base)) {
    return 'string';
  }
  return 'misc';
};

const normalizeMovVariant = (mnemonic: string) => {
  if (mnemonic.startsWith('movz')) {
    return 'movz';
  }
  if (mnemonic.startsWith('movs')) {
    return 'movs';
  }
  return 'mov';
};

const getFlagWrites = (mnemonic: string, operands: ParsedOperand[]): string[] => {
  const base = mnemonic.startsWith('mov') ? normalizeMovVariant(mnemonic) : mnemonic;
  if (FLAG_WRITES[base]) {
    return FLAG_WRITES[base];
  }
  if (FLAG_WRITES[mnemonic]) {
    return FLAG_WRITES[mnemonic];
  }
  if (mnemonic === 'cbtw' || mnemonic === 'cwtl' || mnemonic === 'cwtd' || mnemonic === 'cltd') {
    return [];
  }
  if (mnemonic.startsWith('set')) {
    return [];
  }
  if (mnemonic.startsWith('cmov')) {
    return [];
  }
  if (mnemonic === 'push' || mnemonic === 'pop' || mnemonic === 'lea') {
    return [];
  }
  if (mnemonic.startsWith('j') || mnemonic === 'call' || mnemonic === 'ret' || mnemonic === 'loop') {
    return [];
  }
  if (PREFIXES.has(mnemonic) || ['lodsb', 'lodsw', 'lodsl', 'stosb', 'stosw', 'stosl', 'movsb', 'movsw', 'movsl', 'scasb', 'scasw', 'scasl', 'cmpsb', 'cmpsw', 'cmpsl'].includes(mnemonic)) {
    return [];
  }
  if (mnemonic === 'cld' || mnemonic === 'std') {
    return [];
  }
  return [];
};

const getFlagReads = (mnemonic: string, operands: ParsedOperand[]): string[] => {
  if (mnemonic.startsWith('j')) {
    const condition = mnemonic.slice(1);
    return CONDITION_FLAG_MAP[condition] ?? [];
  }
  if (mnemonic.startsWith('set')) {
    const condition = mnemonic.slice(3);
    return CONDITION_FLAG_MAP[condition] ?? [];
  }
  if (mnemonic.startsWith('cmov')) {
    const condition = mnemonic.slice(4);
    return CONDITION_FLAG_MAP[condition] ?? [];
  }
  if (mnemonic === 'loop') {
    return [];
  }
  if (mnemonic === 'ret') {
    return [];
  }
  if (mnemonic === 'call') {
    return [];
  }
  if (mnemonic === 'imul' && operands.length === 3) {
    return ['CF', 'OF'];
  }
  return [];
};

const validateInstructionOperands = (mnemonic: string, operands: ParsedOperand[]): string[] => {
  const errors: string[] = [];

  const baseMnemonic = mnemonic.startsWith('mov') ? 'mov' : mnemonic;

  if (baseMnemonic === 'mov' && operands.length === 2) {
    if (operands[0].kind === 'mem' && operands[1].kind === 'mem') {
      errors.push('mov no permite memoria a memoria');
    }
  }

  if (['push', 'pop'].includes(baseMnemonic) && operands.length !== 1) {
    errors.push(`${baseMnemonic} requiere un operando`);
  }

  if (['add', 'sub', 'and', 'or', 'xor', 'cmp', 'test', 'mov', 'xchg', 'lea'].includes(baseMnemonic) && operands.length !== 2) {
    errors.push(`${baseMnemonic} requiere dos operandos`);
  }

  if (['mul', 'div', 'idiv', 'neg', 'not'].includes(baseMnemonic) && operands.length !== 1) {
    errors.push(`${baseMnemonic} requiere un operando`);
  }

  if (baseMnemonic.startsWith('j') && operands.length !== 1) {
    errors.push(`${mnemonic} requiere un destino`);
  }

  if (baseMnemonic.startsWith('set') && operands.length !== 1) {
    errors.push(`${mnemonic} requiere un destino`);
  }

  if (baseMnemonic.startsWith('cmov') && operands.length !== 2) {
    errors.push(`${mnemonic} requiere dos operandos`);
  }

  if (baseMnemonic === 'loop' && operands.length !== 1) {
    errors.push('loop requiere una etiqueta destino');
  }

  if (baseMnemonic === 'call' && operands.length !== 1) {
    errors.push('call requiere un destino');
  }

  if (baseMnemonic === 'ret' && operands.length > 1) {
    errors.push('ret admite a lo sumo un operando inmediato');
  }

  return errors;
};

const normalizeLabelUsage = (mnemonic: string, operands: ParsedOperand[]): ParsedOperand[] => {
  const category = categorizeMnemonic(mnemonic);
  if (category !== 'branch') {
    return operands;
  }

  return operands.map((operand) => {
    if (operand.kind === 'mem') {
      const { base, index, scale } = operand.parsed;
      if (!base && !index && scale === undefined) {
        const next: ParsedOperand = {
          ...operand,
          kind: 'label',
          addrMode: 'relativo',
        };
        return next;
      }
    }
    return operand;
  });
};

const parseOperands = (operandsText: string): (ParsedOperand | { error: string })[] => {
  if (!operandsText.trim()) {
    return [];
  }
  const rawOperands = splitOperands(operandsText);
  return rawOperands.map((operandText) => {
    if (operandText.startsWith('$')) {
      return parseImmediate(operandText);
    }
    if (operandText.startsWith('%')) {
      return parseRegisterOperand(operandText);
    }
    if (operandText.startsWith('*')) {
      const { operand, error } = parseMemoryOperand(operandText);
      return operand ?? { error: error ?? 'Operando indirecto inválido' };
    }
    if (operandText.includes('(') || operandText.includes(')')) {
      const { operand, error } = parseMemoryOperand(operandText);
      return operand ?? { error: error ?? 'Operando de memoria inválido' };
    }
    if (LABEL_PATTERN.test(operandText) || operandText.includes('+') || operandText.includes('-')) {
      const { operand, error } = parseMemoryOperand(operandText);
      return operand ?? { error: error ?? 'Operando simbólico inválido' };
    }
    const { operand, error } = parseMemoryOperand(operandText);
    return operand ?? { error: error ?? 'Operando inválido' };
  });
};

const buildInstructionLine = (context: ParseContext, mnemonic: string, operands: ParsedOperand[], prefixes: string[] = []): ParsedLine => {
  const { base, size } = extractSizeSuffix(mnemonic);
  const normalizedMnemonic = base;
  const normalizedOperands = normalizeLabelUsage(normalizedMnemonic, operands);
  const addrMode = determineOperandAddressMode(normalizedOperands);
  const category = categorizeMnemonic(normalizedMnemonic);
  const writes = getFlagWrites(normalizedMnemonic, normalizedOperands);
  const reads = getFlagReads(normalizedMnemonic, normalizedOperands);

  return {
    line: context.line,
    label: context.label,
    mnemonic: normalizedMnemonic,
    size,
    category,
    operands: normalizedOperands,
    addrMode,
    flags: { writes, reads },
    errors: [],
    prefixes: prefixes.length > 0 ? prefixes : undefined,
  };
};

const buildDirectiveLine = (context: ParseContext, mnemonic: string, operands: ParsedOperand[], rawOperands: string[]): ParsedLine => {
  const addrMode = rawOperands.length > 0 ? rawOperands.join(', ') : 'sin-operandos';
  return {
    line: context.line,
    label: context.label,
    mnemonic,
    size: 'inferido',
    category: 'directive',
    operands,
    addrMode,
    flags: { writes: [], reads: [] },
    errors: [],
  };
};

const buildLabelLine = (context: ParseContext): ParsedLine => ({
  line: context.line,
  label: context.label,
  mnemonic: 'label',
  size: 'inferido',
  category: 'label',
  operands: [],
  addrMode: 'sin-operandos',
  flags: { writes: [], reads: [] },
  errors: [],
});

const parseDirectiveOperands = (operandsText: string): { operands: ParsedOperand[]; raw: string[]; errors: string[] } => {
  const errors: string[] = [];
  if (!operandsText.trim()) {
    return { operands: [], raw: [], errors };
  }

  const tokens = splitOperands(operandsText);
  const operands: ParsedOperand[] = tokens.map((token) => {
    const trimmed = token.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return createOperand('imm', trimmed, 'inmediato', { string: trimmed.slice(1, -1) });
    }
    const number = parseNumber(trimmed);
    if (number !== null) {
      return createOperand('imm', trimmed, 'inmediato', { value: number });
    }
    if (LABEL_PATTERN.test(trimmed)) {
      return createOperand('label', trimmed, 'directo', { symbol: trimmed });
    }
    errors.push(`Operando de directiva inválido: ${trimmed}`);
    return createOperand('mem', trimmed, 'desconocido', {});
  });

  return { operands, raw: tokens, errors };
};

const parseDirective = (context: ParseContext, directive: string, rest: string): ParsedLine => {
  const { operands, raw, errors } = parseDirectiveOperands(rest);
  const line = buildDirectiveLine(context, directive, operands, raw);
  line.errors.push(...errors);
  return line;
};

const parseInstruction = (context: ParseContext, mnemonic: string, rest: string, prefixes: string[] = []): ParsedLine => {
  const operandResults = parseOperands(rest);
  const parsedOperands: ParsedOperand[] = [];
  const errors: string[] = [];

  operandResults.forEach((result) => {
    if ('error' in result) {
      errors.push(result.error);
    } else {
      parsedOperands.push(result);
    }
  });

  const line = buildInstructionLine(context, mnemonic, parsedOperands, prefixes);
  line.errors.push(...errors);
  line.errors.push(...validateInstructionOperands(line.mnemonic, line.operands));

  return line;
};

const parsePrefixedInstruction = (context: ParseContext, prefix: string, remainder: string): ParsedLine => {
  const trimmed = remainder.trim();
  if (!trimmed) {
    const line = buildInstructionLine(context, prefix, [], [prefix]);
    line.errors.push('Falta la instrucción asociada al prefijo');
    return line;
  }
  const [mnemonic, rest = ''] = trimmed.split(/\s+/, 2);
  return parseInstruction(context, mnemonic, rest, [prefix]);
};

const parseLine = (lineText: string, lineNumber: number): ParsedLine[] => {
  const commentIndex = lineText.indexOf(';');
  const content = commentIndex >= 0 ? lineText.slice(0, commentIndex) : lineText;
  const trimmed = content.trim();

  if (!trimmed) {
    return [];
  }

  let remaining = trimmed;
  let label: string | undefined;

  const labelMatch = remaining.match(/^([A-Za-z_][\w]*):/);
  if (labelMatch) {
    label = labelMatch[1];
    remaining = remaining.slice(labelMatch[0].length).trim();
  }

  const context: ParseContext = { line: lineNumber, label, raw: lineText };

  if (!remaining) {
    return [buildLabelLine(context)];
  }

  const [mnemonicRaw, restRaw = ''] = remaining.split(/\s+/, 2);
  const mnemonic = normalizeMnemonic(mnemonicRaw);

  if (SECTION_DIRECTIVES.has(mnemonic) || DATA_DIRECTIVES.has(mnemonic) || OTHER_DIRECTIVES.has(mnemonic)) {
    return [parseDirective(context, mnemonic, restRaw)];
  }

  if (PREFIXES.has(mnemonic)) {
    return [parsePrefixedInstruction(context, mnemonic, restRaw)];
  }

  return [parseInstruction(context, mnemonic, restRaw)];
};

export const analyzeAssembly = (code: string): AssemblyAnalysisResult => {
  const lines = code.split(/\r?\n/);
  const parsed: ParsedLine[] = [];

  lines.forEach((line, index) => {
    const results = parseLine(line, index + 1);
    parsed.push(...results);
  });

  return { lines: parsed };
};

