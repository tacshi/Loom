import { assemble } from "../cpu/assembler";
import {
  GateBuilder,
  gateDefinition,
  lowerToNand,
  layoutGateProject,
} from "./logic";
import { cpuProject } from "../cpu/referenceCircuit";
import { ioProject, ioDefinition } from "../cpu/ioCircuit";
import { calculatorProject } from "../cpu/calculator";
import {
  emptyProject,
  type Project,
  type Kind,
  type TestCase,
  type Circuit,
} from "../model/types";
import { closure } from "../library/package";
import { Engine } from "../simulator/engine";
import { ref } from "../model/nets";
import type { Exercise, ExerciseId, Copy } from "./types";
const base: Kind[] = [
  "input",
  "constant",
  "probe",
  "portIn",
  "portOut",
  "nand",
  "split",
  "join",
];
function projectFor(c: Circuit, p = emptyProject()): Project {
  p.root = c.id;
  p.circuits = { ...closure({ circuits: { ...p.circuits, [c.id]: c } }, c.id) };
  return p;
}
function gates(id: ExerciseId): Project {
  const b = new GateBuilder(id),
    a = b.input("a"),
    c = id === "not" ? undefined : b.input("b");
  if (id === "nand") b.output("out", b.nand(a, c!));
  if (id === "not") b.output("out", b.not(a));
  if (id === "and-or") {
    b.output("and", b.and(a, c!));
    b.output("or", b.or(a, c!));
  }
  if (id === "xor") b.output("out", b.xor(a, c!));
  if (id === "mux") {
    const sel = b.input("sel");
    b.output("out", b.mux(a, c!, sel));
  }
  if (id === "half-adder") {
    b.output("sum", b.xor(a, c!));
    b.output("carry", b.and(a, c!));
  }
  if (id === "full-adder") {
    const cin = b.input("cin"),
      x = b.xor(a, c!);
    b.output("sum", b.xor(x, cin));
    b.output("carry", b.or(b.and(a, c!), b.and(x, cin)));
  }
  return b.p;
}
function stateReference(accumulator = false): Project {
  const b = new GateBuilder(accumulator ? "Accumulator" : "Register");
  const data = b.input("data", 8),
    en = b.input("en"),
    rst = b.input("rst");
  const n = b.node("register", 8, "storage");
  const value = accumulator ? b.sumBus(data, [n[0], "q"], 8).out : data;
  b.connect(...value, n[0], "d");
  b.connect(...en, n[0], "en");
  b.connect(...rst, n[0], "rst");
  b.output("q", [n[0], "q"], 8);
  return b.p;
}
function busMuxReference(): Project {
  const b = new GateBuilder("8-bit multiplexer"),
    a = b.input("a", 8),
    v = b.input("b", 8),
    s = b.input("sel"),
    aa = b.bits(a, 8),
    bb = b.bits(v, 8),
    cell = gateDefinition("mux");
  Object.assign(b.p.circuits, cell.circuits);
  const result: [string, string][] = [];
  for (let i = 0; i < 8; i++) {
    const n = b.node("instance", 1, "bit" + i);
    b.c.components.find((c) => c.id === n[0])!.definitionId = cell.root;
    b.connect(...aa[i], n[0], "a");
    b.connect(...bb[i], n[0], "b");
    b.connect(...s, n[0], "sel");
    result.push(n);
  }
  b.output("out", b.join(result), 8);
  return layoutGateProject(b.p);
}
function pcReference(): Project {
  const b = new GateBuilder("Program counter"),
    target = b.input("target", 8),
    jump = b.input("jump"),
    en = b.input("en"),
    rst = b.input("rst"),
    pc = b.node("register", 8, "PC");
  const increment = b.sumBus([pc[0], "q"], b.constant(1, 8), 8).out,
    next = b.mux(increment, target, jump, 8);
  b.connect(...next, pc[0], "d");
  b.connect(...en, pc[0], "en");
  b.connect(...rst, pc[0], "rst");
  b.output("q", [pc[0], "q"], 8);
  return b.p;
}
const diagnosticSource = `LDI 255
STA 200
LDI 1
ADD 200
JC carry
LDI 99
carry:
NOP
JZ zero
LDI 99
zero:
LDI 3
SUB 200
JC bad
JZ bad
STA 201
LDI 6
AND 201
OR 200
XOR 201
OUT
LDA 201
SUB 201
JMP done
bad:
LDI 99
OUT
HLT
done:
LDI 55
OUT
HLT`;
const cache = new Map<ExerciseId, Project>();
export function courseReference(id: ExerciseId): Project {
  let p = cache.get(id);
  if (p) return structuredClone(p);
  if (
    [
      "nand",
      "not",
      "and-or",
      "xor",
      "mux",
      "half-adder",
      "full-adder",
    ].includes(id)
  )
    p = gates(id);
  else if (id === "mux8") p = busMuxReference();
  else if (id === "adder8" || id === "subtract")
    p = gateDefinition(id === "adder8" ? "adder" : "subtractor", 8);
  else if (id === "register" || id === "accumulator")
    p = stateReference(id === "accumulator");
  else if (id === "pc") p = pcReference();
  else if (["alu", "control", "pc-fields"].includes(id)) {
    const cpu = cpuProject(),
      name =
        id === "alu"
          ? "Arithmetic unit"
          : id === "control"
            ? "Instruction control"
            : "Instruction fields";
    p = projectFor(
      Object.values(cpu.circuits).find((c) => c.name === name)!,
      cpu,
    );
    delete p.cpu;
    delete p.sourceMap;
    p.source = "";
    p = lowerToNand(p);
  } else if (id === "io") p = lowerToNand(projectFor(ioDefinition()));
  else
    p = lowerToNand(id === "calculator" ? calculatorProject() : cpuProject());
  if (id === "cpu") {
    const a = assemble(diagnosticSource);
    p.circuits[p.root].components.find((n) => n.id === "Program")!.image =
      a.image;
    p.source = diagnosticSource;
    p.assembledSource = diagnosticSource;
    p.sourceMap = a.sourceMap;
  }
  if (
    [
      "nand",
      "not",
      "and-or",
      "xor",
      "mux",
      "half-adder",
      "full-adder",
      "register",
      "accumulator",
      "pc",
    ].includes(id)
  )
    layoutGateProject(p);
  p.name = "Reference · " + id;
  cache.set(id, structuredClone(p));
  return p;
}
function checks(id: ExerciseId): TestCase[] {
  const p = courseReference(id),
    c = p.circuits[p.root];
  if (id === "calculator")
    return [
      ...structuredClone(c.tests).map((test) => ({
        ...test,
        maxCycles: 2048,
        steps: test.steps.map((step) => ({ ...step, cycles: 2048 })),
      })),
      {
        id: "calculator-recovery",
        name: "Invalid input and recovery",
        maxCycles: 1280,
        seed: 1,
        steps: [
          {
            cycles: 1280,
            keyboard: [
              {
                component: ref("Keyboard", "data", ["RAM"]),
                text: "256+0\n12x3\n1++2\n3+4\n",
              },
            ],
            assertions: [
              {
                type: "terminal",
                ref: ref("Terminal", "data", ["RAM"]),
                text: "?\n?\n?\n7\n",
              },
            ],
          },
        ],
      },
    ];
  if (id === "cpu") {
    const oracle = cpuProject();
    oracle.circuits[oracle.root].components.find(
      (n) => n.id === "Program",
    )!.image = assemble(diagnosticSource).image;
    const e = new Engine(oracle),
      steps: TestCase["steps"] = [];
    for (let i = 0; i < 64 && !e.get("Halt", "q").value; i++) {
      e.step();
      e.step();
      steps.push({
        cycles: 2,
        assertions: ["PC", "ACC", "Z", "C", "Output", "Halt"].map((id) => ({
          type: "signal",
          ref: ref(id, "q"),
          value: e.get(id, "q").value,
        })),
      });
    }
    return [
      {
        id: "instructions",
        name: "Loom 8 instruction execution",
        maxCycles: 128,
        seed: 1,
        steps,
      },
    ];
  }
  if (id === "io")
    return [
      {
        id: "io",
        name: "Clock-qualified keyboard and terminal",
        maxCycles: 12,
        seed: 1,
        steps: [
          {
            cycles: 0,
            inputs: [
              { ref: ref("addr", "out"), value: 240 },
              { ref: ref("data", "out"), value: 65 },
              { ref: ref("we", "out"), value: 0 },
              { ref: ref("read", "out"), value: 0 },
            ],
            keyboard: [{ component: ref("Keyboard", "data"), text: "A" }],
            assertions: [{ type: "signal", ref: ref("out", "in"), value: 1 }],
          },
          {
            cycles: 1,
            inputs: [
              { ref: ref("addr", "out"), value: 241 },
              { ref: ref("read", "out"), value: 0 },
            ],
            assertions: [{ type: "signal", ref: ref("out", "in"), value: 65 }],
          },
          {
            cycles: 1,
            inputs: [{ ref: ref("read", "out"), value: 1 }],
            assertions: [
              { type: "signal", ref: ref("Keyboard", "ready"), value: 0 },
            ],
          },
          {
            cycles: 1,
            inputs: [
              { ref: ref("addr", "out"), value: 242 },
              { ref: ref("we", "out"), value: 1 },
              { ref: ref("read", "out"), value: 0 },
            ],
            assertions: [
              { type: "terminal", ref: ref("Terminal", "data"), text: "A" },
            ],
          },
          {
            cycles: 1,
            inputs: [
              { ref: ref("addr", "out"), value: 244 },
              { ref: ref("data", "out"), value: 255 },
            ],
            assertions: [{ type: "signal", ref: ref("X", "q"), value: 63 }],
          },
          {
            cycles: 1,
            inputs: [{ ref: ref("addr", "out"), value: 245 }],
            assertions: [{ type: "signal", ref: ref("Y", "q"), value: 31 }],
          },
          {
            cycles: 1,
            inputs: [
              { ref: ref("addr", "out"), value: 246 },
              { ref: ref("data", "out"), value: 1 },
            ],
            assertions: [
              {
                type: "pixel",
                ref: ref("Display", "out"),
                x: 63,
                y: 31,
                value: 1,
              },
            ],
          },
          {
            cycles: 1,
            inputs: [
              { ref: ref("addr", "out"), value: 248 },
              { ref: ref("data", "out"), value: 255 },
            ],
            assertions: [
              {
                type: "memory",
                ref: ref("Data RAM", "out"),
                address: 248,
                value: 0,
              },
            ],
          },
          {
            cycles: 1,
            inputs: [
              { ref: ref("we", "out"), value: 0 },
              { ref: ref("read", "out"), value: 1 },
            ],
            assertions: [{ type: "signal", ref: ref("out", "in"), value: 0 }],
          },
          {
            cycles: 1,
            inputs: [
              { ref: ref("addr", "out"), value: 243 },
              { ref: ref("data", "out"), value: 3 },
              { ref: ref("we", "out"), value: 1 },
              { ref: ref("read", "out"), value: 0 },
            ],
            assertions: [
              { type: "terminal", ref: ref("Terminal", "data"), text: "" },
              {
                type: "pixel",
                ref: ref("Display", "out"),
                x: 63,
                y: 31,
                value: 0,
              },
            ],
          },
        ],
      },
    ];
  const ins = c.ports.filter((p) => p.direction === "in"),
    outs = c.ports.filter((p) => p.direction === "out");
  const total = ins.reduce((n, p) => n + p.width, 0),
    count =
      total <= 5
        ? 2 ** total
        : id === "control"
          ? 304
          : id === "alu"
            ? 112
            : 64,
    e = new Engine(p);
  let seed = 0x12345678;
  const steps: TestCase["steps"] = [];
  for (let n = 0; n < count; n++) {
    let bits = n;
    const values = ins.map((port) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      let value =
        total <= 5
          ? bits % 2 ** port.width
          : n < 4
            ? [0, 2 ** port.width - 1, 1, 2 ** (port.width - 1)][n]
            : (seed >>> 8) % 2 ** port.width;
      bits = Math.floor(bits / 2 ** port.width);
      if (id === "alu") {
        const sample = [
          [0, 0, 0],
          [255, 1, 42],
          [1, 255, 128],
          [127, 1, 0],
          [128, 128, 255],
          [85, 170, 7],
          [42, 42, 99],
          [200, 73, 255],
        ][Math.floor(n / 14)];
        value =
          port.id === "opcode"
            ? n % 14
            : sample[["a", "data", "immediate"].indexOf(port.id)];
      }
      if (id === "control")
        value =
          port.id === "opcode"
            ? [...Array.from({ length: 16 }, (_, i) => i), 16, 128, 255][
                Math.floor(n / 16)
              ]
            : (n >> ["zero", "carry", "phase", "halt"].indexOf(port.id)) & 1;
      if (["adder8", "subtract"].includes(id) && n < 36) {
        const edge = [0, 1, 127, 128, 254, 255];
        value = port.id === "a" ? edge[Math.floor(n / 6)] : edge[n % 6];
      }
      return { ref: ref(port.componentId, "out"), value };
    });
    values.forEach((v) => e.setInput(v.ref.componentId, v.value));
    const cycles =
      id === "register" || id === "accumulator" || id === "pc" ? 1 : 0;
    if (cycles) e.step();
    else e.settle();
    steps.push({
      inputs: values,
      cycles,
      assertions: outs.map((port) => ({
        type: "signal",
        ref: ref(port.componentId, "in"),
        value: e.get(port.componentId, "in").value,
      })),
    });
  }
  return [
    {
      id: id + "-behavior",
      name: "Interface behavior",
      maxCycles: 1000,
      seed: 0x12345678,
      steps,
    },
  ];
}
const rows: [ExerciseId, Copy, Copy, [Copy, Copy, Copy]][] = [
  [
    "nand",
    ["Binary switches & NAND", "二进制开关与 NAND"],
    [
      "Connect two signals to NAND and predict all four results.",
      "连接两个信号到 NAND，预测四种结果。",
    ],
    [
      [
        "A bit is either 0 or 1. NAND is low only when both inputs are high.",
        "位的值为 0 或 1；两个输入都是 1 时 NAND 才输出 0。",
      ],
      [
        "Watch a, b and out while changing one input.",
        "改变一个输入，观察 a、b 和 out。",
      ],
      [
        "Connect a.out → NAND.a, b.out → NAND.b, then NAND.out → out.in.",
        "连接 a.out → NAND.a、b.out → NAND.b，再连接 NAND.out → out.in。",
      ],
    ],
  ],
  [
    "not",
    ["NOT", "非门"],
    ["Build inversion using NAND.", "用 NAND 构建取反逻辑。"],
    [
      ["Invert 0 to 1 and 1 to 0.", "将 0 变成 1，将 1 变成 0。"],
      [
        "What happens when NAND sees the same signal twice?",
        "NAND 的两个输入相同时会怎样？",
      ],
      ["Connect a to both NAND inputs.", "将 a 连接到 NAND 的两个输入。"],
    ],
  ],
  [
    "and-or",
    ["AND and OR", "与门和或门"],
    ["Build two outputs: AND and OR.", "构建与、或两个输出。"],
    [
      ["NAND already contains an inverted AND.", "NAND 是取反后的 AND。"],
      ["Try inverting the inputs before NAND.", "尝试在 NAND 之前对输入取反。"],
      [
        "Invert NAND for AND; NAND the inverted inputs for OR.",
        "对 NAND 输出取反得到 AND；对取反的输入执行 NAND 得到 OR。",
      ],
    ],
  ],
  [
    "xor",
    ["XOR", "异或门"],
    ["Output 1 only when the inputs differ.", "仅在输入不同时输出 1。"],
    [
      ["Compare the four input combinations.", "比较四种输入组合。"],
      [
        "Use the first NAND result with each original input.",
        "将第一个 NAND 的结果分别与原输入组合。",
      ],
      ["A four-NAND network can implement XOR.", "四个 NAND 可以实现 XOR。"],
    ],
  ],
  [
    "mux",
    ["Multiplexer", "多路选择器"],
    [
      "Choose a when sel is 0 and b when sel is 1.",
      "sel 为 0 时选择 a，为 1 时选择 b。",
    ],
    [
      ["Only one input should reach the output.", "每次只让一个输入到达输出。"],
      [
        "Enable a with NOT sel and b with sel.",
        "用 NOT sel 使能 a，用 sel 使能 b。",
      ],
      ["OR the two enabled branches.", "将两个使能分支进行 OR 运算。"],
    ],
  ],
  [
    "mux8",
    ["8-bit bus selection", "8 位总线选择"],
    [
      "Build and verify an 8-bit selector from your one-bit multiplexer.",
      "用自己的单比特选择器构建并验证 8 位选择器。",
    ],
    [
      ["A bus is a group of independent bits.", "总线是一组独立的位。"],
      [
        "All eight selectors share the same sel signal.",
        "八个选择器共用同一个 sel 信号。",
      ],
      [
        "Split a and b, connect eight verified multiplexers, then join their outputs.",
        "拆分 a 和 b，连接八个已验证的选择器，再合并输出。",
      ],
    ],
  ],
  [
    "half-adder",
    ["Half adder", "半加器"],
    ["Add two bits and expose sum and carry.", "相加两位，输出 sum 和 carry。"],
    [
      ["1 + 1 is binary 10.", "1 + 1 的二进制结果是 10。"],
      [
        "The low bit differs only when the inputs differ.",
        "低位仅在两个输入不同时为 1。",
      ],
      [
        "Use XOR for sum and AND for carry.",
        "用 XOR 计算 sum，用 AND 计算 carry。",
      ],
    ],
  ],
  [
    "full-adder",
    ["Full adder", "全加器"],
    ["Include a carry input in bit addition.", "在位加法中加入进位输入。"],
    [
      ["Add a and b, then add cin.", "先相加 a 和 b，再加入 cin。"],
      ["Watch both intermediate carries.", "观察两个中间进位。"],
      [
        "Combine two half adders and OR their carries.",
        "组合两个半加器，并对进位进行 OR。",
      ],
    ],
  ],
  [
    "adder8",
    ["8-bit addition", "8 位加法"],
    [
      "Build an 8-bit ripple-carry adder, including overflow carry.",
      "构建 8 位串行进位加法器，并输出溢出进位。",
    ],
    [
      ["Split buses into bits.", "将总线拆分为位。"],
      [
        "Carry flows from the least significant bit upward.",
        "进位从最低位向高位传递。",
      ],
      [
        "Chain eight full adders and join the sum bits.",
        "连接八个全加器，再合并结果位。",
      ],
    ],
  ],
  [
    "subtract",
    ["Subtraction & flags", "减法与标志"],
    [
      "Compute a − b; carry means no unsigned borrow.",
      "计算 a − b；carry 表示无无符号借位。",
    ],
    [
      [
        "Two’s complement subtraction adds NOT b and 1.",
        "补码减法相当于加上 NOT b 和 1。",
      ],
      ["Test 0−1, 1−0 and equal inputs.", "测试 0−1、1−0 和相同输入。"],
      [
        "Invert b, start carry at 1, and expose the final carry.",
        "对 b 取反，初始进位置 1，输出最终进位。",
      ],
    ],
  ],
  [
    "register",
    ["Register enable & reset", "寄存器使能与复位"],
    [
      "Wire a supplied register: reset overrides enable.",
      "连接提供的寄存器：复位优先于使能。",
    ],
    [
      ["State changes on a clock edge.", "状态在时钟边沿改变。"],
      [
        "Try disabled writes and simultaneous reset/enable.",
        "测试禁止写入及复位、使能同时有效的情况。",
      ],
      [
        "Connect data to d, en to en and rst to rst; observe q.",
        "将 data、en、rst 连接到对应输入，并观察 q。",
      ],
    ],
  ],
  [
    "accumulator",
    ["Accumulator", "累加器"],
    [
      "Add data to the retained total on enabled edges.",
      "在使能边沿将 data 加到已有总数。",
    ],
    [
      [
        "Feed the stored result back into addition.",
        "将保存的结果反馈到加法器。",
      ],
      ["Check hold, reset and overflow.", "检查保持、复位和溢出。"],
      [
        "Connect adder output to register d and register q to the adder.",
        "将加法器输出连接寄存器 d，将 q 反馈到加法器。",
      ],
    ],
  ],
  [
    "pc",
    ["Program counter", "程序计数器"],
    [
      "Increment, branch, hold and reset the program counter.",
      "实现程序计数器的递增、跳转、保持和复位。",
    ],
    [
      [
        "A register stores the next instruction address.",
        "寄存器保存下一条指令地址。",
      ],
      [
        "Test jump versus increment, then enable and reset.",
        "先测试跳转与递增，再测试使能与复位。",
      ],
      [
        "Select between PC+1 and target before the register data input.",
        "在寄存器数据输入前选择 PC+1 或 target。",
      ],
    ],
  ],
  [
    "pc-fields",
    ["Instruction fields", "指令字段"],
    [
      "Split a 16-bit instruction into opcode and operand.",
      "将 16 位指令拆分为操作码和操作数。",
    ],
    [
      ["The high byte selects the instruction.", "高字节选择指令。"],
      [
        "Check bits 7 and 8 at the byte boundary.",
        "检查字节边界的第 7、8 位。",
      ],
      [
        "Join bits 8–15 as opcode and 0–7 as operand.",
        "将 8–15 位合并为 opcode，0–7 位合并为 operand。",
      ],
    ],
  ],
  [
    "alu",
    ["Arithmetic logic unit", "算术逻辑单元"],
    [
      "Select Loom 8 arithmetic and logic results from opcode.",
      "依据操作码选择 Loom 8 的算术逻辑结果。",
    ],
    [
      [
        "Decode only the operation that should drive the result.",
        "仅选择当前操作对应的结果。",
      ],
      [
        "Watch intermediate ADD/SUB results and carry/zero.",
        "观察 ADD、SUB 中间结果及 carry、zero。",
      ],
      [
        "Use mux branches for opcodes 1,2,4–8; compare the result to zero.",
        "用选择分支处理操作码 1、2、4–8，并检查结果是否为零。",
      ],
    ],
  ],
  [
    "control",
    ["Fetch/execute controller", "取指与执行控制器"],
    [
      "Generate the Loom 8 control byte and halt invalid opcodes.",
      "生成 Loom 8 控制字节，并在非法操作码时停机。",
    ],
    [
      [
        "Fetch and execute alternate; halt suppresses activity.",
        "取指与执行交替进行；halt 抑制活动。",
      ],
      [
        "Inspect each control bit for load, write, jump and stop.",
        "逐位检查加载、写入、跳转和停机控制。",
      ],
      [
        "Decode opcode, combine flags, then qualify enables by phase and halt.",
        "译码操作码、组合标志，再用 phase 和 halt 限定使能。",
      ],
    ],
  ],
  [
    "cpu",
    ["Your CPU", "你的 CPU"],
    [
      "Wire your blocks into the two-phase Loom 8 computer.",
      "将自己的模块连接成两阶段 Loom 8 计算机。",
    ],
    [
      [
        "Follow one instruction from ROM through fetch and execute.",
        "跟踪一条指令从 ROM 到取指、执行的过程。",
      ],
      [
        "Watch PC, IR, ACC, Phase and the control byte.",
        "观察 PC、IR、ACC、Phase 和控制字节。",
      ],
      [
        "Connect datapath first, then enables, branch selection and flag storage.",
        "先连接数据通路，再连接使能、分支选择和标志存储。",
      ],
    ],
  ],
  [
    "io",
    ["Memory & I/O decoding", "内存与外设译码"],
    [
      "Decode the memory map and consume keyboard bytes only on reads.",
      "译码内存映射，仅在读取时消耗键盘字节。",
    ],
    [
      [
        "RAM uses addresses below F0; peripherals use F0–F6.",
        "RAM 使用 F0 以下地址，外设使用 F0–F6。",
      ],
      [
        "Watch address match, read enable and keyboard ready.",
        "观察地址匹配、读取使能和键盘就绪。",
      ],
      [
        "Qualify reads/writes with address matches before connecting devices.",
        "先将读写使能与地址匹配组合，再连接外设。",
      ],
    ],
  ],
  [
    "calculator",
    ["Your computer runs a calculator", "你的计算机运行计算器"],
    [
      "Connect your CPU and I/O, then run the supplied calculator software.",
      "连接自己的 CPU 与外设，再运行提供的计算器软件。",
    ],
    [
      [
        "The assembly program performs all calculation.",
        "所有计算均由汇编程序完成。",
      ],
      [
        "Check keyboard readiness, reads and terminal writes.",
        "检查键盘就绪、读取和终端写入。",
      ],
      [
        "Replace RAM with your verified I/O block and qualify reads for load/math instructions.",
        "用验证后的外设模块替换 RAM，并为加载与算术指令提供读取使能。",
      ],
    ],
  ],
];
export const exercises: Exercise[] = rows.map(
  ([id, title, objective, hints], i) => ({
    id,
    revision: 1,
    title,
    objective,
    hints,
    prerequisites: i ? [rows[i - 1][0]] : [],
    allowed: [
      ...base,
      ...(i >= rows.findIndex((r) => r[0] === "register")
        ? ["register" as const]
        : []),
      ...(i >= rows.findIndex((r) => r[0] === "cpu")
        ? ["ram" as const, "rom" as const]
        : []),
      ...(i >= rows.findIndex((r) => r[0] === "io")
        ? ["keyboard" as const, "terminal" as const, "display" as const]
        : []),
    ],
    reference: () => courseReference(id),
    checks: () => checks(id),
  }),
);
export const exercise = (id: ExerciseId) => {
  const e = exercises.find((e) => e.id === id);
  if (!e) throw new Error("Unknown exercise");
  return e;
};
