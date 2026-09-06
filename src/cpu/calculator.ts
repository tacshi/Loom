import { ioProject } from "./ioCircuit";
// Every parsing, arithmetic and formatting operation below executes on the circuit CPU.
export const calculatorSource = `; Decimal calculator: operands 0..255, + and -, newline to evaluate.
; RAM 0=N, 1=left, 2=operator, 3=digits, 4=char, 5=digit,
; 6=temp, 7=result low, 8=result high, 9=hundreds, 10=tens.
; Constants: 200=1, 201=10, 202='0', 203='+', 204='-', 205=100.
LDI 1
STA 200
LDI 10
STA 201
LDI 48
STA 202
LDI 43
STA 203
LDI 45
STA 204
LDI 100
STA 205
reset:
LDI 0
STA 0
STA 1
STA 2
STA 3
STA 8
STA 9
STA 10
wait:
LDA 0xF0
JZ wait
LDA 0xF1
STA 4
SUB 201
JZ evaluate
LDA 4
SUB 203
JZ operator
LDA 4
SUB 204
JZ operator
LDA 4
SUB 202
JC digit
JMP error
digit:
STA 5
SUB 201
JC error
LDA 0
ADD 0
JC error
STA 6
ADD 6
JC error
STA 0
ADD 0
JC error
ADD 6
JC error
ADD 5
JC error
STA 0
LDI 1
STA 3
JMP wait
operator:
LDA 2
JZ firstOperator
JMP error
firstOperator:
LDA 3
JZ error
LDA 0
STA 1
LDA 4
STA 2
LDI 0
STA 0
STA 3
JMP wait
evaluate:
LDA 3
JZ empty
LDA 2
JZ error
SUB 203
JZ addition
LDA 1
SUB 0
JC positive
LDA 0
SUB 1
STA 7
LDI 45
STA 0xF2
JMP hundreds
positive:
STA 7
JMP hundreds
addition:
LDA 1
ADD 0
STA 7
JC high
JMP hundreds
high:
LDI 1
STA 8
hundreds:
LDA 8
JZ checkLow
JMP subtractHundred
checkLow:
LDA 7
SUB 205
JC subtractHundred
JMP printHundreds
subtractHundred:
LDA 7
SUB 205
STA 6
JC keepHigh
LDA 8
SUB 200
STA 8
keepHigh:
LDA 6
STA 7
LDA 9
ADD 200
STA 9
JMP hundreds
printHundreds:
LDA 9
JZ tens
ADD 202
STA 0xF2
tens:
LDA 7
SUB 201
JC subtractTen
JMP printTens
subtractTen:
STA 7
LDA 10
ADD 200
STA 10
JMP tens
printTens:
LDA 9
JZ checkTens
JMP emitTens
checkTens:
LDA 10
JZ ones
emitTens:
LDA 10
ADD 202
STA 0xF2
ones:
LDA 7
ADD 202
STA 0xF2
LDI 10
STA 0xF2
JMP reset
empty:
LDA 2
JZ reset
JMP error
error:
LDI 63
STA 0xF2
LDI 10
STA 0xF2
LDA 4
SUB 201
JZ reset
drain:
LDA 0xF0
JZ drain
LDA 0xF1
SUB 201
JZ reset
JMP drain`;
export function calculatorProject() {
  const p = ioProject(calculatorSource);
  p.name = "Loom 8 I/O · Calculator";
  p.checkpoint = "calculator";
  const c = p.circuits[p.root];
  c.tests = [
    {
      id: "calculator-acceptance",
      name: "12+34, 255+255, 0-255",
      maxCycles: 6000,
      seed: 12345,
      steps: [
        {
          keyboard: [
            {
              component: {
                instancePath: ["RAM"],
                componentId: "Keyboard",
                portId: "data",
              },
              text: "12+34\n255+255\n0-255\n",
            },
          ],
          cycles: 6000,
          assertions: [
            {
              type: "terminal",
              ref: {
                instancePath: ["RAM"],
                componentId: "Terminal",
                portId: "data",
              },
              text: "46\n510\n-255\n",
            },
          ],
        },
      ],
    },
  ];
  return p;
}
