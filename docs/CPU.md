# Loom 8 CPU

The editable reference computer has an 8-bit accumulator and program counter, 16-bit instruction register, zero/carry flags, 256×16-bit program ROM, 256×8-bit RAM, and output/halt registers. All runtime behavior comes from ordinary Loom components and their connections.

## Instruction format

High byte: opcode. Low byte: immediate value or RAM/program address. Program addresses index 16-bit words. Instructions without operands require no operand text; their low byte is zero.

| Hex opcode | Assembly | Behavior |
|---|---|---|
| 00 | NOP | No operation |
| 01 | LDI n | A ← n |
| 02 | LDA n | A ← RAM[n] |
| 03 | STA n | RAM[n] ← A |
| 04 | ADD n | A ← A + RAM[n] |
| 05 | SUB n | A ← A − RAM[n] |
| 06 | AND n | A ← A AND RAM[n] |
| 07 | OR n | A ← A OR RAM[n] |
| 08 | XOR n | A ← A XOR RAM[n] |
| 09 | JMP n | PC ← n |
| 0A | JZ n | Jump when Z = 1 |
| 0B | JC n | Jump when C = 1 |
| 0C | OUT | Output ← A |
| 0D | HLT | Halt until reset |

Arithmetic wraps to eight bits. Loads and arithmetic/logical operations update Z. ADD sets C on unsigned overflow. SUB sets C when no borrow is needed. Other operations preserve C; instructions other than loads/arithmetic/logical operations preserve Z. Unassigned opcodes halt and report an invalid instruction.

## Clock sequence

1. **Fetch:** IR samples ROM[PC], PC increments modulo 256, and Phase changes to execute.
2. **Execute:** the control circuit enables the appropriate register/memory writes and optional branch; Phase returns to fetch.

All storage samples old values before any updates commit. The instruction fields, ALU, and controller are editable subcircuits. The controller's 8-bit bus carries fetch, execute, accumulator enable, carry enable, RAM write, halt enable, output enable, and branch-taken signals, from bit 0 to bit 7.

The supplied sum program executes 99 instructions / 198 clock edges, halts, and leaves 55 in the accumulator and output register. An independent test-only instruction model checks every completed instruction's registers, flags, PC, and RAM. A fault-injection test changes the ADD component to subtraction and confirms execution changes.
