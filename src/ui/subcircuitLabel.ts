import type { Circuit } from "../model/types";

// Course packages retain their lesson provenance; palette and instance labels name the part.
const coreParts = [
  ["Connection", "连接"],
  ["Fan-out", "扇出"],
  ["AND", "与门"],
  ["NOT", "非门"],
  ["NAND", "与非门"],
  ["NOT", "非门"],
  ["AND", "与门"],
  ["OR", "或门"],
  ["XOR", "异或门"],
  ["XNOR", "同或门"],
  ["2-way mux", "二选一选择器"],
  ["4-way mux", "四选一选择器"],
  ["Bus joiner", "总线合并器"],
  ["Byte rearranger", "字节重排器"],
  ["8-bit logic", "8 位逻辑电路"],
  ["8-bit mux", "8 位选择器"],
  ["8-way demux", "八路分配器"],
  ["Hex decoder", "十六进制译码器"],
  ["Half adder", "半加器"],
  ["Full adder", "全加器"],
  ["8-bit adder", "8 位加法器"],
  ["Incrementer", "递增器"],
  ["Negator", "取负器"],
  ["Subtractor", "减法器"],
  ["Unsigned comparator", "无符号比较器"],
  ["Signed comparator", "有符号比较器"],
  ["ALU flags", "ALU 标志电路"],
  ["Logical shifter", "逻辑移位器"],
  ["Arithmetic shifter", "算术移位器"],
  ["ALU", "算术逻辑单元"],
  ["1-bit memory", "1 位存储器"],
  ["8-bit register", "8 位寄存器"],
  ["Load/reset register", "载入复位寄存器"],
  ["Counter", "计数器"],
  ["Accumulator", "累加器"],
  ["Program counter", "程序计数器"],
  ["RAM", "随机存储器"],
  ["Banked memory", "分区存储器"],
  ["ROM lookup", "ROM 查找电路"],
  ["Shared bus", "共享总线"],
  ["Traffic light controller", "交通灯控制器"],
  ["101 detector", "101 序列检测器"],
  ["Instruction decoder", "指令译码器"],
  ["Instruction fetch", "指令取指电路"],
  ["Control unit", "控制单元"],
  ["Datapath", "数据通路"],
  ["Branch control", "跳转控制器"],
  ["CPU", "CPU"],
  ["Machine-code program", "机器码程序"],
  ["Output program", "输出程序"],
  ["Memory program", "存储程序"],
  ["Branch program", "分支程序"],
  ["Counted loop", "计数循环"],
  ["Sequence sum", "序列求和程序"],
  ["Memory-mapped I/O", "内存映射输入输出"],
  ["Keyboard echo", "键盘回显"],
  ["Decimal parser", "十进制解析器"],
  ["Decimal formatter", "十进制格式化器"],
  ["Calculator", "计算器"],
  ["Input recovery", "输入恢复程序"],
];

export function subcircuitLabel(circuit: Circuit, lang: "en" | "zh") {
  const match = /^course-core-(\d{2})$/.exec(circuit.library?.id ?? "");
  return (
    (match && coreParts[Number(match[1]) - 1]?.[lang === "zh" ? 1 : 0]) ||
    circuit.name
  );
}

export function subcircuitSymbol(circuit: Circuit) {
  const symbols: Record<string, string> = {
    NAND: "&̅",
    NOT: "¬",
    AND: "&",
    OR: "≥1",
    XOR: "=1",
    XNOR: "≡",
  };
  return symbols[subcircuitLabel(circuit, "en")] ?? "▱";
}
