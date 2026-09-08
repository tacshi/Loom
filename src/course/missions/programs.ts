import { assemble } from "../../cpu/assembler";
import { courseReference } from "../referenceExercises";
import { ref } from "../../model/nets";
import type { Project, TestCase } from "../../model/types";
export type ProgramTask = {
  source: string;
  cases: {
    memory: Record<number, number>;
    output?: number;
    expectedMemory?: Record<number, number>;
  }[];
  cycles: number;
};
export const programTasks: Record<string, ProgramTask> = {
  "core-49": {
    source: "LDI 42\nOUT\nHLT",
    cases: [{ memory: {}, output: 42 }],
    cycles: 16,
  },
  "core-50": {
    source: "LDI 73\nOUT\nHLT",
    cases: [{ memory: {}, output: 73 }],
    cycles: 16,
  },
  "core-51": {
    source: "LDA 0\nSTA 1\nLDI 0\nLDA 1\nOUT\nHLT",
    cases: [0, 1, 42, 255].map((value) => ({
      memory: { 0: value },
      output: value,
      expectedMemory: { 1: value },
    })),
    cycles: 24,
  },
  "core-52": {
    source: "LDA 0\nJZ off\nLDI 1\nOUT\nHLT\noff:\nLDI 0\nOUT\nHLT",
    cases: [0, 1, 42, 255].map((value) => ({
      memory: { 0: value },
      output: Number(value !== 0),
    })),
    cycles: 32,
  },
  "core-53": {
    source:
      "LDI 1\nSTA 200\nLDI 0\nSTA 2\nLDA 0\nSTA 1\nloop:\nLDA 1\nJZ end\nSUB 200\nSTA 1\nLDA 2\nADD 200\nSTA 2\nJMP loop\nend:\nLDA 1\nOUT\nHLT",
    cases: [0, 1, 5, 17].map((value) => ({
      memory: { 0: value },
      output: 0,
      expectedMemory: { 1: 0, 2: value },
    })),
    cycles: 512,
  },
  "core-54": {
    source:
      "LDI 1\nSTA 200\nLDI 0\nSTA 1\nLDA 0\nSTA 2\nloop:\nLDA 2\nJZ done\nADD 1\nSTA 1\nLDA 2\nSUB 200\nSTA 2\nJMP loop\ndone:\nLDA 1\nOUT\nHLT",
    cases: [0, 1, 3, 10, 22].map((n) => ({
      memory: { 0: n },
      output: (n * (n + 1)) / 2,
    })),
    cycles: 512,
  },
  "project-33": {
    source:
      "LDI 1\nSTA 200\nLDI 0\nSTA 2\nLDA 1\nSTA 3\nloop:\nLDA 3\nJZ end\nLDA 2\nADD 0\nSTA 2\nLDA 3\nSUB 200\nSTA 3\nJMP loop\nend:\nLDA 2\nOUT\nHLT",
    cases: [
      [0, 9],
      [7, 3],
      [15, 15],
      [42, 5],
    ].map(([a, b]) => ({ memory: { 0: a, 1: b }, output: (a * b) & 255 })),
    cycles: 512,
  },
  "project-34": {
    source:
      "loop:\nLDA 0\nJZ second\nLDA 1\nJZ first\nLDA 0\nSUB 1\nJC subtractFirst\nLDA 1\nSUB 0\nSTA 1\nJMP loop\nsubtractFirst:\nSTA 0\nJMP loop\nfirst:\nLDA 0\nOUT\nHLT\nsecond:\nLDA 1\nOUT\nHLT",
    cases: [
      [0, 9, 9],
      [12, 8, 4],
      [35, 14, 7],
      [17, 13, 1],
    ].map(([a, b, g]) => ({ memory: { 0: a, 1: b }, output: g })),
    cycles: 1024,
  },
  "project-35": {
    source:
      "LDI 1\nSTA 200\nSTA 2\nLDI 0\nSTA 1\nloop:\nLDA 0\nJZ end\nLDA 1\nADD 2\nSTA 3\nLDA 2\nSTA 1\nLDA 3\nSTA 2\nLDA 0\nSUB 200\nSTA 0\nJMP loop\nend:\nLDA 1\nOUT\nHLT",
    cases: [
      [0, 0],
      [1, 1],
      [2, 1],
      [7, 13],
      [12, 144],
    ].map(([n, value]) => ({ memory: { 0: n }, output: value })),
    cycles: 1024,
  },
};
const sortSource = () => {
  let s = "";
  let n = 0;
  for (let pass = 0; pass < 3; pass++)
    for (let i = 0; i < 3 - pass; i++) {
      const label = `ordered${n++}`;
      s += `LDA ${i}\nSUB ${i + 1}\nJC swap${label}\nJMP ${label}\nswap${label}:\nLDA ${i}\nSTA 200\nLDA ${i + 1}\nSTA ${i}\nLDA 200\nSTA ${i + 1}\n${label}:\n`;
    }
  return s + "HLT";
};
programTasks["project-36"] = {
  source: sortSource(),
  cases: [
    [4, 1, 3, 2],
    [255, 0, 127, 128],
    [7, 7, 7, 7],
    [0, 1, 2, 3],
  ].map((values) => ({
    memory: Object.fromEntries(values.map((v, i) => [i, v])),
    expectedMemory: Object.fromEntries(
      [...values].sort((a, b) => a - b).map((v, i) => [i, v]),
    ),
  })),
  cycles: 256,
};
export function programReference(task: ProgramTask): Project {
  const p = courseReference("cpu"),
    a = assemble(task.source);
  if (a.errors.length) throw new Error(JSON.stringify(a.errors));
  p.source = task.source;
  p.assembledSource = task.source;
  p.sourceMap = a.sourceMap;
  p.circuits[p.root].components.find((n) => n.id === p.cpu!.rom)!.image =
    a.image;
  return p;
}
export function programStarter(task: ProgramTask): Project {
  const p = programReference(task);
  p.source = "";
  p.assembledSource = "";
  p.sourceMap = {};
  p.circuits[p.root].components.find((n) => n.id === p.cpu!.rom)!.image = [
    13 << 8,
  ];
  return p;
}
export function programChecks(task: ProgramTask): TestCase[] {
  return task.cases.map((c, i) => ({
    id: `program-${i + 1}`,
    name: `Program ${i + 1}`,
    seed: 1,
    maxCycles: task.cycles,
    steps: [
      {
        cycles: 0,
        memory: Object.entries(c.memory).map(([address, value]) => ({
          ref: ref("RAM", "out"),
          address: Number(address),
          value,
        })),
        assertions: [],
      },
      {
        cycles: task.cycles,
        assertions: [
          { type: "signal" as const, ref: ref("Halt", "q"), value: 1 },
          ...(c.output === undefined
            ? []
            : [
                {
                  type: "signal" as const,
                  ref: ref("Output", "q"),
                  value: c.output,
                },
              ]),
          ...Object.entries(c.expectedMemory ?? {}).map(([address, value]) => ({
            type: "memory" as const,
            ref: ref("RAM", "out"),
            address: Number(address),
            value,
          })),
        ],
      },
    ],
  }));
}
