export const ISA = {
  NOP: 0,
  LDI: 1,
  LDA: 2,
  STA: 3,
  ADD: 4,
  SUB: 5,
  AND: 6,
  OR: 7,
  XOR: 8,
  JMP: 9,
  JZ: 10,
  JC: 11,
  OUT: 12,
  HLT: 13,
} as const;
export type AssemblyError = { line: number; code: string; detail: string };
export type Assembly = {
  image: number[];
  sourceMap: Record<number, number>;
  errors: AssemblyError[];
};
export function assemble(source: string): Assembly {
  const image: number[] = [],
    sourceMap: Record<number, number> = {},
    errors: AssemblyError[] = [],
    labels = new Map<string, number>();
  const instructions: { line: number; op: string; args: string[] }[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    let text = raw.replace(/;.*/, "").trim();
    if (!text) return;
    const label = text.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (label) {
      const name = label[1].toUpperCase();
      if (labels.has(name))
        errors.push({
          line: index + 1,
          code: "duplicateLabel",
          detail: label[1],
        });
      else labels.set(name, instructions.length);
      text = text.slice(label[0].length).trim();
    }
    if (!text) return;
    const [op, ...args] = text.split(/[\s,]+/);
    instructions.push({ line: index + 1, op: op.toUpperCase(), args });
  });
  if (instructions.length > 256)
    errors.push({
      line: instructions[256].line,
      code: "programTooLong",
      detail: "256",
    });
  for (const [address, item] of instructions.entries()) {
    const { op, args, line } = item;
    if (!(op in ISA)) {
      errors.push({ line, code: "unknownInstruction", detail: op });
      continue;
    }
    const code = ISA[op as keyof typeof ISA],
      hasOperand = code >= 1 && code <= 11;
    if (args.length !== (hasOperand ? 1 : 0)) {
      errors.push({ line, code: "operandCount", detail: op });
      continue;
    }
    let value = 0;
    if (hasOperand) {
      const operand = args[0];
      if (labels.has(operand.toUpperCase()))
        value = labels.get(operand.toUpperCase())!;
      else if (/^(0x[0-9a-f]+|\d+)$/i.test(operand)) value = Number(operand);
      else {
        errors.push({ line, code: "unknownLabel", detail: operand });
        continue;
      }
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        errors.push({ line, code: "operandRange", detail: operand });
        continue;
      }
    }
    image[address] = (code << 8) | value;
    sourceMap[address] = line;
  }
  return {
    image: errors.length ? [] : image,
    sourceMap: errors.length ? {} : sourceMap,
    errors,
  };
}
export const sumSource = `; Sum 1 through 10. OUT = 55\nLDI 0\nSTA 0\nLDI 1\nSTA 1\nSTA 2\nLDI 11\nSTA 3\nloop:\nLDA 0\nADD 1\nSTA 0\nLDA 1\nADD 2\nSTA 1\nSUB 3\nJZ done\nJMP loop\ndone:\nLDA 0\nOUT\nHLT`;
export const programs: Record<string, string> = {
  sum: sumSource,
  output: "LDI 42\nOUT\nHLT",
  arithmetic: "LDI 250\nSTA 0\nLDI 10\nADD 0\nOUT\nHLT",
  loop: "LDI 1\nSTA 0\nLDI 0\nloop:\nADD 0\nOUT\nJMP loop",
};
