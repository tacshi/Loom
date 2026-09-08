import { assemble } from "../../cpu/assembler";
import { calculatorSource } from "../../cpu/calculator";
import { echoSource } from "../../cpu/ioCircuit";
import { courseReference, exercise } from "../referenceExercises";
import { ref } from "../../model/nets";
import type { Project, TestCase } from "../../model/types";
export type ApplicationTask = {
  source: string;
  starterSource?: string;
  checks: () => TestCase[];
};
const textCase = (
  id: string,
  input: string,
  expected: string,
  cycles = 1024,
): TestCase => ({
  id,
  name: input || id,
  seed: 1,
  maxCycles: cycles,
  steps: [
    {
      cycles,
      keyboard: input
        ? [{ component: ref("Keyboard", "data", ["RAM"]), text: input }]
        : [],
      assertions: [
        {
          type: "terminal",
          ref: ref("Terminal", "data", ["RAM"]),
          text: expected,
        },
      ],
    },
  ],
});
const parseSource = (total: boolean) => `LDI 10
STA 200
LDI 48
STA 201
LDI 0
STA 0
STA 1
wait:
LDA 0xF0
JZ wait
LDA 0xF1
STA 4
SUB 200
JZ emit
LDA 4
SUB 201
STA 5
LDA 0
ADD 0
STA 6
ADD 6
STA 0
ADD 0
ADD 6
ADD 5
STA 0
JMP wait
emit:
LDA 0
${total ? "ADD 1\nSTA 1" : "NOP"}
OUT
LDI 0
STA 0
JMP wait`;
const formatter = `LDI 1
STA 200
LDI 10
STA 201
LDI 48
STA 202
LDI 100
STA 203
LDI 0
STA 1
STA 2
hundreds:
LDA 0
SUB 203
JC subtractHundred
JMP printHundreds
subtractHundred:
STA 0
LDA 1
ADD 200
STA 1
JMP hundreds
printHundreds:
LDA 1
JZ tens
ADD 202
STA 0xF2
tens:
LDA 0
SUB 201
JC subtractTen
JMP printTens
subtractTen:
STA 0
LDA 2
ADD 200
STA 2
JMP tens
printTens:
LDA 1
JZ checkTens
JMP emitTens
checkTens:
LDA 2
JZ ones
emitTens:
LDA 2
ADD 202
STA 0xF2
ones:
LDA 0
ADD 202
STA 0xF2
HLT`;
export const applicationTasks: Record<string, ApplicationTask> = {
  "core-56": {
    source: echoSource,
    checks: () => [
      textCase("echo", "Hello\n", "Hello\n"),
      textCase("digits", "012345\n", "012345\n"),
    ],
  },
  "core-57": {
    source: parseSource(false),
    checks: () =>
      [0, 7, 42, 255].map((n) => ({
        id: `parse-${n}`,
        name: `Parse ${n}`,
        seed: 1,
        maxCycles: 512,
        steps: [
          {
            cycles: 512,
            keyboard: [
              { component: ref("Keyboard", "data", ["RAM"]), text: `${n}\n` },
            ],
            assertions: [{ type: "signal", ref: ref("Output", "q"), value: n }],
          },
        ],
      })),
  },
  "core-58": {
    source: formatter,
    checks: () =>
      [0, 7, 42, 100, 255].map((n) => ({
        id: `format-${n}`,
        name: `Format ${n}`,
        seed: 1,
        maxCycles: 512,
        steps: [
          {
            cycles: 0,
            memory: [
              { ref: ref("Data RAM", "out", ["RAM"]), address: 0, value: n },
            ],
            assertions: [],
          },
          {
            cycles: 512,
            assertions: [
              {
                type: "terminal",
                ref: ref("Terminal", "data", ["RAM"]),
                text: String(n),
              },
            ],
          },
        ],
      })),
  },
  "core-59": {
    source: calculatorSource,
    starterSource: calculatorSource.replace(
      /evaluate:[\s\S]*?hundreds:/,
      "evaluate:\n; Implement addition and subtraction here.\nLDI 0\nSTA 7\nJMP hundreds\nhundreds:",
    ),
    checks: () => [
      textCase("addition", "12+34\n", "46\n"),
      textCase("carry", "255+255\n", "510\n"),
      textCase("negative", "0-255\n", "-255\n"),
    ],
  },
  "core-60": {
    source: calculatorSource,
    starterSource: calculatorSource.replace(
      /error:[\s\S]*$/,
      "error:\n; Report the error, discard the rest of the line, and accept another calculation.\nHLT",
    ),
    checks: () => exercise("calculator").checks(),
  },
  "project-37": {
    source: `LDI 97
STA 200
LDI 123
STA 201
LDI 32
STA 202
wait:
LDA 0xF0
JZ wait
LDA 0xF1
STA 0
SUB 200
JC lowerBound
JMP unchanged
lowerBound:
LDA 0
SUB 201
JC unchanged
LDA 0
SUB 202
STA 0xF2
JMP wait
unchanged:
LDA 0
STA 0xF2
JMP wait`,
    checks: () => [
      textCase("letters", "Hello world!\n", "HELLO WORLD!\n"),
      textCase("edges", "azAZ09[]\n", "AZAZ09[]\n"),
    ],
  },
  "project-38": {
    source:
      [0, 1, 2, 3]
        .map((n) => `LDI ${n}\nSTA 0xF4\nLDI ${n}\nSTA 0xF5\nLDI 1\nSTA 0xF6`)
        .join("\n") + "\nHLT",
    checks: () => [
      {
        id: "diagonal",
        name: "Four diagonal pixels",
        seed: 1,
        maxCycles: 64,
        steps: [
          {
            cycles: 64,
            assertions: [
              ...Array.from({ length: 4 }, (_, i) => ({
                type: "pixel" as const,
                ref: ref("Display", "out", ["RAM"]),
                x: i,
                y: i,
                value: 1,
              })),
              {
                type: "pixel",
                ref: ref("Display", "out", ["RAM"]),
                x: 0,
                y: 1,
                value: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  "project-39": {
    source:
      "start:\n" +
      [0, 1, 2, 3, 2, 1, 0]
        .map(
          (x, i, a) =>
            `LDI ${a[i - 1] ?? 0}\nSTA 0xF4\nLDI 0\nSTA 0xF5\nLDI 0\nSTA 0xF6\nLDI ${x}\nSTA 0xF4\nLDI 1\nSTA 0xF6`,
        )
        .join("\n") +
      "\nJMP start",
    checks: () => [
      {
        id: "bounce",
        name: "Move right, then return left",
        seed: 1,
        maxCycles: 140,
        steps: [0, 1, 2, 3, 2, 1, 0].map((x) => ({
          cycles: 20,
          assertions: Array.from({ length: 4 }, (_, i) => ({
            type: "pixel" as const,
            ref: ref("Display", "out", ["RAM"]),
            x: i,
            y: 0,
            value: Number(i === x),
          })),
        })),
      },
    ],
  },
  "project-40": {
    source: parseSource(true),
    checks: () => [
      {
        id: "total",
        name: "Add successive entries",
        seed: 1,
        maxCycles: 1536,
        steps: [
          { text: "5\n", value: 5 },
          { text: "7\n", value: 12 },
          { text: "2\n", value: 14 },
        ].map(({ text, value }) => ({
          cycles: 512,
          keyboard: [{ component: ref("Keyboard", "data", ["RAM"]), text }],
          assertions: [{ type: "signal", ref: ref("Output", "q"), value }],
        })),
      },
    ],
  },
};
export function applicationReference(task: ApplicationTask): Project {
  const p = courseReference("calculator"),
    a = assemble(task.source);
  if (a.errors.length) throw new Error(JSON.stringify(a.errors));
  p.source = task.source;
  p.assembledSource = task.source;
  p.sourceMap = a.sourceMap;
  p.circuits[p.root].components.find((n) => n.id === p.cpu!.rom)!.image =
    a.image;
  p.circuits[p.root].tests = [];
  return p;
}
export function applicationStarter(task: ApplicationTask): Project {
  return applicationReference({
    ...task,
    source: task.starterSource ?? "; Write your program here.\nHLT",
  });
}
