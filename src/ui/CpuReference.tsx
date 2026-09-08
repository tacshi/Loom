import type { Copy } from "../course/types";

const instructions: [string, string, Copy][] = [
  ["00", "NOP", ["No operation", "不执行操作"]],
  ["01", "LDI n", ["A ← n", "A ← n"]],
  ["02", "LDA n", ["A ← RAM[n]", "A ← RAM[n]"]],
  ["03", "STA n", ["RAM[n] ← A", "RAM[n] ← A"]],
  ["04", "ADD n", ["A ← A + RAM[n]", "A ← A + RAM[n]"]],
  ["05", "SUB n", ["A ← A − RAM[n]", "A ← A − RAM[n]"]],
  ["06", "AND n", ["A ← A AND RAM[n]", "A ← A 与 RAM[n]"]],
  ["07", "OR n", ["A ← A OR RAM[n]", "A ← A 或 RAM[n]"]],
  ["08", "XOR n", ["A ← A XOR RAM[n]", "A ← A 异或 RAM[n]"]],
  ["09", "JMP n", ["PC ← n", "PC ← n"]],
  ["0A", "JZ n", ["Jump if Z = 1", "Z = 1 时跳转"]],
  ["0B", "JC n", ["Jump if C = 1", "C = 1 时跳转"]],
  ["0C", "OUT", ["Output ← A", "输出 ← A"]],
  ["0D", "HLT", ["Halt until reset", "停止，直到复位"]],
];
const control: Copy[] = [
  ["Fetch: phase = 0 and halt = 0", "取指：phase = 0 且 halt = 0"],
  ["Execute: phase = 1 and halt = 0", "执行：phase = 1 且 halt = 0"],
  [
    "Load A: LDI, LDA, ADD, SUB, AND, OR, XOR",
    "载入 A：LDI、LDA、ADD、SUB、AND、OR、XOR",
  ],
  ["Update carry: ADD, SUB", "更新进位：ADD、SUB"],
  ["Write RAM: STA", "写 RAM：STA"],
  ["Halt: HLT or invalid opcode", "停止：HLT 或无效操作码"],
  ["Write output: OUT", "写输出：OUT"],
  [
    "Jump: JMP, JZ with zero = 1, or JC with carry = 1",
    "跳转：JMP，或 zero = 1 的 JZ，或 carry = 1 的 JC",
  ],
];
const devices: [string, Copy][] = [
  ["00–EF", ["RAM", "RAM"]],
  ["F0", ["Keyboard ready, bit 0", "键盘就绪，第 0 位"]],
  [
    "F1",
    ["Read and consume the front keyboard byte", "读取并取走队首键盘字节"],
  ],
  ["F2", ["Write a terminal byte", "写入终端字节"]],
  [
    "F3",
    [
      "Clear terminal (bit 0) or display (bit 1)",
      "清空终端（第 0 位）或显示屏（第 1 位）",
    ],
  ],
  ["F4/F5", ["Pixel X/Y: low 6/5 bits", "像素 X/Y：低 6/5 位"]],
  ["F6", ["Selected pixel, bit 0", "选中像素，第 0 位"]],
  [
    "F7",
    [
      "Segments a–g: bits 0–6; decimal point: bit 7",
      "a–g 段：第 0–6 位；小数点：第 7 位",
    ],
  ],
  ["F8–FF", ["Reads return 0; writes ignored", "读取为 0，写入忽略"]],
];

export default function CpuReference({
  lang,
  io,
}: {
  lang: "en" | "zh";
  io: boolean;
}) {
  const i = lang === "zh" ? 1 : 0;
  const label = (en: string, zh: string) => (i ? zh : en);
  return (
    <details className="cpu-reference">
      <summary>{label("CPU reference", "CPU 参考")}</summary>
      <p>
        {label(
          "A is the 8-bit accumulator; PC is the program address. A 16-bit instruction stores its opcode in the high byte and its operand in the low byte. For example, LDI 7 is 0x0107.",
          "A 是 8 位累加器，PC 是程序地址。16 位指令的高字节是操作码，低字节是操作数。例如 LDI 7 编码为 0x0107。",
        )}
      </p>
      <table>
        <thead>
          <tr>
            <th>{label("Hex", "十六进制")}</th>
            <th>{label("Instruction", "指令")}</th>
            <th>{label("Effect", "作用")}</th>
          </tr>
        </thead>
        <tbody>
          {instructions.map(([op, name, effect]) => (
            <tr key={op}>
              <td>{op}</td>
              <td>{name}</td>
              <td>{effect[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {label(
          "Results wrap to 8 bits. Loads and logic/arithmetic set Z to 1 when A is zero, otherwise 0. ADD sets C on overflow; SUB sets C when no borrow is needed. Other instructions preserve these flags. Unknown opcodes halt.",
          "结果保留低 8 位。载入、逻辑和算术运算根据 A 是否为零更新 Z。ADD 溢出时 C = 1；SUB 无需借位时 C = 1。其他指令保留对应标志。未知操作码会停止 CPU。",
        )}
      </p>
      <details>
        <summary>{label("Clock and control bus", "时钟与控制总线")}</summary>
        <p>
          {label(
            "Fetch (phase 0) loads ROM[PC] into IR and increments PC. Execute (phase 1) performs the instruction. Each clock step samples old values before committing updates.",
            "取指（phase = 0）把 ROM[PC] 载入 IR 并递增 PC；执行（phase = 1）完成指令。每个时钟步先采样旧值，再提交更新。",
          )}
        </p>
        <p>
          {label(
            "Control bits 2–7 are 1 only during execute and when their condition holds. active = NOT halt. invalid = 1 for opcodes above 0x0D, independent of phase and halt.",
            "控制位 2–7 仅在执行阶段且条件满足时为 1。active = NOT halt。操作码大于 0x0D 时 invalid = 1，与 phase、halt 无关。",
          )}
        </p>
        <table>
          <thead>
            <tr>
              <th>{label("Bit", "位")}</th>
              <th>{label("Set to 1 when", "置 1 条件")}</th>
            </tr>
          </thead>
          <tbody>
            {control.map((text, bit) => (
              <tr key={bit}>
                <td>{bit}</td>
                <td>{text[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {io && (
        <details>
          <summary>
            {label("Device addresses (hex)", "外设地址（十六进制）")}
          </summary>
          <table>
            <thead>
              <tr>
                <th>{label("Address", "地址")}</th>
                <th>{label("Behavior", "行为")}</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(([address, text]) => (
                <tr key={address}>
                  <td>{address}</td>
                  <td>{text[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </details>
  );
}
