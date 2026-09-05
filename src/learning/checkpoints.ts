import { Builder, fullAdder } from "../examples/adder";
import { counterExample } from "../examples/sequential";
import { nandAdder } from "../cpu/nandAdder";
import { cpuProject } from "../cpu/referenceCircuit";
import { emptyProject, type Project } from "../model/types";
type Copy = [string, string];
export type Checkpoint = {
  id: string;
  title: Copy;
  objective: Copy;
  steps: Copy[];
  reference: () => Project;
  starter: () => Project;
};
function gates() {
  const b = new Builder("NAND truth table");
  b.add("A", "input", 0, 0);
  b.add("B", "input", 0, 140);
  b.add("NAND", "nand", 240, 0);
  b.add("Output", "probe", 480, 0);
  b.connect("A", "out", "NAND", "a");
  b.connect("B", "out", "NAND", "b");
  b.connect("NAND", "out", "Output", "in");
  for (let a = 0; a < 2; a++)
    for (let c = 0; c < 2; c++)
      b.c.vectors.push({
        name: "" + a + c,
        inputs: { A: a, B: c },
        outputs: { "Output:in": 1 - (a & c) },
      });
  return b.p;
}
function arithmetic() {
  const def = nandAdder(8),
    p = emptyProject("8-bit NAND adder");
  p.root = def.id;
  p.circuits = { [def.id]: def };
  return p;
}
function accumulator() {
  const b = new Builder("Accumulator datapath");
  b.add("Value", "input", 0, 0, 8, 5);
  b.add("Enable", "input", 0, 160, 1, 1);
  b.add("Reset", "input", 0, 300);
  b.add("Add", "adder", 240, 0, 8);
  b.add("Total", "register", 480, 0, 8);
  b.add("Output", "probe", 720, 0, 8);
  b.connect("Value", "out", "Add", "a");
  b.connect("Total", "q", "Add", "b");
  b.connect("Add", "out", "Total", "d");
  b.connect("Enable", "out", "Total", "en");
  b.connect("Reset", "out", "Total", "rst");
  b.connect("Total", "q", "Output", "in");
  b.c.vectors = [
    {
      name: "5 + 5",
      inputs: { Value: 5, Enable: 1, Reset: 0 },
      cycles: 2,
      outputs: { "Output:in": 10 },
    },
    {
      name: "Wrap 255 + 255",
      inputs: { Value: 255, Enable: 1, Reset: 0 },
      cycles: 2,
      outputs: { "Output:in": 254 },
    },
    {
      name: "Reset takes priority",
      inputs: { Value: 5, Enable: 1, Reset: 1 },
      cycles: 2,
      outputs: { "Output:in": 0 },
    },
  ];
  return b.p;
}
function missing(
  factory: () => Project,
  predicate: (w: Project["circuits"][string]["wires"][number]) => boolean,
) {
  const p = factory();
  p.circuits[p.root].wires = p.circuits[p.root].wires.filter(
    (w) => !predicate(w),
  );
  return p;
}
export const checkpoints: Checkpoint[] = [
  {
    id: "gates",
    title: ["Gates & truth tables", "逻辑门与真值表"],
    objective: [
      "Connect a NAND gate and verify all four input combinations.",
      "连接一个 NAND 门，验证四种输入组合。",
    ],
    steps: [
      [
        "Connect A.out to NAND.a and B.out to NAND.b.",
        "连接 A.out 到 NAND.a，B.out 到 NAND.b。",
      ],
      [
        "Connect NAND.out to Output.in. Double-click an input to toggle it.",
        "连接 NAND.out 到 Output.in。双击输入元件切换数值。",
      ],
      [
        "Run circuit tests. NAND is 0 only when both inputs are 1.",
        "运行电路测试。只有两个输入都为 1 时，NAND 输出才为 0。",
      ],
    ],
    reference: gates,
    starter: () => missing(gates, () => true),
  },
  {
    id: "full-adder",
    title: ["A full adder from NAND", "用 NAND 搭建全加器"],
    objective: [
      "Build sum and carry using nine NAND gates.",
      "用九个 NAND 门构造和位与进位。",
    ],
    steps: [
      [
        "n1 = NAND(A,B); n2 = NAND(A,n1); n3 = NAND(B,n1); xorAB = NAND(n2,n3).",
        "n1 = NAND(A,B)；n2 = NAND(A,n1)；n3 = NAND(B,n1)；xorAB = NAND(n2,n3)。",
      ],
      [
        "n4 = NAND(xorAB,Cin); n5 = NAND(xorAB,n4); n6 = NAND(Cin,n4).",
        "n4 = NAND(xorAB,Cin)；n5 = NAND(xorAB,n4)；n6 = NAND(Cin,n4)。",
      ],
      [
        "sum = NAND(n5,n6); carry = NAND(n1,n4). Connect both probes and run the eight cases.",
        "sum = NAND(n5,n6)；carry = NAND(n1,n4)。连接两个探针并运行八组测试。",
      ],
      [
        "Select the nine gates and create a subcircuit. The tests should still pass.",
        "选中九个门并封装为子电路。测试结果应保持一致。",
      ],
    ],
    reference: fullAdder,
    starter: () => missing(fullAdder, () => true),
  },
  {
    id: "arithmetic",
    title: ["Multi-bit arithmetic", "多位算术"],
    objective: [
      "Chain eight full adders with a carry between neighboring bits.",
      "串联八个全加器，逐位传递进位。",
    ],
    steps: [
      [
        "Bus bit b0 is the least significant bit. Inspect the aBits and bBits splitters.",
        "总线 b0 为最低位。查看 aBits 和 bBits 拆分器。",
      ],
      [
        "Connect each bit’s carry output to the next bit’s n4.b and n6.a. Bit 0 starts with zero carry.",
        "将每一位的 carry 输出连接到下一位的 n4.b 和 n6.a。第 0 位进位输入为零。",
      ],
      [
        "Run boundary tests, including 255 + 1. The 8-bit result wraps to 0 and carry becomes 1.",
        "运行边界测试，包括 255 + 1。8 位结果回绕为 0，进位为 1。",
      ],
    ],
    reference: arithmetic,
    starter: () =>
      missing(
        arithmetic,
        (w) =>
          w.from.component.includes("_carry") && w.to.component !== "carry",
      ),
  },
  {
    id: "memory",
    title: ["Registers & the clock", "寄存器与时钟"],
    objective: [
      "Observe state changing only on a clock edge.",
      "观察仅在时钟边沿改变的状态。",
    ],
    steps: [
      [
        "Connect Enable to Count.en and Reset to Count.rst.",
        "连接 Enable 到 Count.en，Reset 到 Count.rst。",
      ],
      [
        "Watch Count.q in Debug, then step three times. Disable Enable to hold the value.",
        "在调试面板观察 Count.q，然后单步三次。关闭 Enable 以保持数值。",
      ],
      [
        "Set Reset to 1 and step. Reset wins even when Enable is 1. Run circuit tests.",
        "设置 Reset 为 1 后单步。即使 Enable 为 1，复位也优先。运行电路测试。",
      ],
    ],
    reference: counterExample,
    starter: () =>
      missing(counterExample, (w) => w.to.port === "en" || w.to.port === "rst"),
  },
  {
    id: "datapath",
    title: ["An accumulator datapath", "累加器数据通路"],
    objective: [
      "Feed a register through an adder to accumulate values over time.",
      "通过加法器反馈寄存器，实现逐周期累加。",
    ],
    steps: [
      [
        "Connect Add.out to Total.d. The register breaks the feedback loop.",
        "连接 Add.out 到 Total.d。寄存器隔开组合反馈环。",
      ],
      [
        "Enable is 1 and Value is 5. Two steps should produce 10.",
        "Enable 为 1，Value 为 5。单步两次应得到 10。",
      ],
      [
        "Watch the input and output, then test wrapping and reset priority.",
        "观察输入与输出，并测试回绕和复位优先级。",
      ],
    ],
    reference: accumulator,
    starter: () =>
      missing(
        accumulator,
        (w) => w.to.component === "Total" && w.to.port === "d",
      ),
  },
  {
    id: "cpu",
    title: ["Assemble the CPU", "组装 CPU"],
    objective: [
      "Complete the instruction path and arithmetic feedback in Loom 8.",
      "补全 Loom 8 的指令路径与运算反馈。",
    ],
    steps: [
      [
        "Connect Program.out to IR.d, ACC.q to ALU.a, and ALU.result to ACC.d.",
        "连接 Program.out 到 IR.d，ACC.q 到 ALU.a，ALU.result 到 ACC.d。",
      ],
      [
        "Open Control, Fields, and ALU to inspect their real gates and buses.",
        "进入 Control、Fields 和 ALU 查看实际逻辑门与总线。",
      ],
      [
        "Reset and run the circuit tests. Two clock cycles complete one instruction.",
        "复位并运行电路测试。每条指令需要两个时钟周期。",
      ],
    ],
    reference: cpuProject,
    starter: () =>
      missing(
        cpuProject,
        (w) =>
          (w.to.component === "IR" && w.to.port === "d") ||
          (w.to.component === "ALU" && w.to.port === "a") ||
          (w.to.component === "ACC" && w.to.port === "d"),
      ),
  },
  {
    id: "programs",
    title: ["Run & debug a program", "运行与调试程序"],
    objective: [
      "Load the sum program, observe 55, and trace how it was computed.",
      "加载求和程序，观察结果 55，并跟踪计算过程。",
    ],
    steps: [
      [
        "Choose Sum 1–10 in Program, then Assemble & load.",
        "在程序面板选择 1–10 求和，然后汇编并加载。",
      ],
      [
        "Set a source breakpoint at the loop. Run, inspect memory, and step instructions.",
        "在循环处设置源代码断点。运行、查看内存并按指令单步。",
      ],
      [
        "Remove the breakpoint and run to HLT. Output should be 55.",
        "移除断点并运行到 HLT。输出应为 55。",
      ],
      [
        "Open ALU, select ADD, replace it with a NAND adder, reset, and rerun.",
        "进入 ALU，选择 ADD，替换为 NAND 加法器，复位后重新运行。",
      ],
    ],
    reference: cpuProject,
    starter: () => {
      const p = cpuProject();
      p.source = "";
      p.assembledSource = "";
      p.sourceMap = {};
      p.circuits[p.root].components.find((c) => c.id === "Program")!.image = [];
      return p;
    },
  },
];
