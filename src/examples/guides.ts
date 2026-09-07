export const exampleGuides = {
  bus: {
    group: ["Logic and signals", "逻辑与信号"],
    purpose: [
      "See several devices share one wire without driving it at the same time.",
      "观察多个设备如何分时驱动同一条导线。",
    ],
    action: [
      "Toggle Enable A and Enable B. Compare a floating bus, one driver, and conflicting drivers.",
      "切换 Enable A 与 Enable B，比较悬空、单驱动与驱动冲突。",
    ],
  },
  button: {
    group: ["Memory and time", "存储与时钟"],
    purpose: [
      "A momentary button resets a running counter only while held.",
      "瞬时按钮只在按住时复位正在运行的计数器。",
    ],
    action: [
      "Run the clock, hold Reset, then release it. The count should resume.",
      "运行时钟，按住 Reset 再松开，计数应继续。",
    ],
  },
  encoder: {
    group: ["Logic and signals", "逻辑与信号"],
    purpose: [
      "A priority encoder reports the highest active request.",
      "优先编码器报告最高的有效请求。",
    ],
    action: [
      "Turn on two request inputs. The selected index should match the higher request.",
      "打开两个请求输入，选中的编号应对应较高请求。",
    ],
  },
  shift: {
    group: ["Memory and time", "存储与时钟"],
    purpose: [
      "Load a byte, then move its bits through a shift register.",
      "载入一个字节，再让它的位通过移位寄存器。",
    ],
    action: [
      "Set Parallel and Load, advance the clock, then disable Load and enable Shift.",
      "设置 Parallel 与 Load，推进时钟，再关闭 Load 并打开 Shift。",
    ],
  },
  segments: {
    group: ["Displays", "显示"],
    purpose: [
      "Four input bits choose a hexadecimal digit on seven segments.",
      "四个输入位选择七段显示器上的十六进制数字。",
    ],
    action: [
      "Change Value from 0 to 15 and watch the digit. Run tests to compare segment patterns.",
      "把 Value 从 0 改到 15 并观察数字。运行测试比较段码。",
    ],
  },
  segmentCounter: {
    group: ["Displays", "显示"],
    purpose: [
      "A clocked counter drives a hexadecimal display.",
      "时钟计数器驱动十六进制显示器。",
    ],
    action: [
      "Advance the clock to count; toggle Enable to hold the current digit.",
      "推进时钟进行计数，切换 Enable 可保持当前数字。",
    ],
  },
  segmentRom: {
    group: ["Displays", "显示"],
    purpose: [
      "A ROM lookup maps each input value to a segment pattern.",
      "ROM 查表把输入值映射到段码。",
    ],
    action: [
      "Change Value and compare the displayed digit with the ROM entry.",
      "改变 Value，将显示数字与 ROM 条目比较。",
    ],
  },
  segmentCpu: {
    group: ["Computers", "计算机"],
    purpose: [
      "Software writes digit patterns to a memory-mapped display.",
      "软件向内存映射显示器写入段码。",
    ],
    action: [
      "Step an instruction or run the clock and watch the display updates.",
      "执行指令单步或运行时钟，观察显示更新。",
    ],
  },
  cpu: {
    group: ["Computers", "计算机"],
    purpose: [
      "Follow a program as the CPU fetches and executes instructions.",
      "跟随 CPU 取出并执行程序中的指令。",
    ],
    action: [
      "Step an instruction and compare PC and accumulator before and after it.",
      "执行一条指令，比较前后的 PC 与累加器。",
    ],
  },
  counter: {
    group: ["Memory and time", "存储与时钟"],
    purpose: [
      "A register remembers the count between clock steps.",
      "寄存器在时钟步之间保存计数值。",
    ],
    action: [
      "Advance the clock, hold Enable off, and try Reset. Compare the stored value.",
      "推进时钟、关闭 Enable、尝试 Reset，并比较存储值。",
    ],
  },
  swap: {
    group: ["Memory and time", "存储与时钟"],
    purpose: [
      "Registers sample their old inputs together at a clock boundary.",
      "寄存器在时钟边界同时采样原先的输入。",
    ],
    action: [
      "Advance one clock step and watch the two stored values exchange places.",
      "推进一个时钟步，观察两个存储值交换位置。",
    ],
  },
  adder: {
    group: ["Logic and signals", "逻辑与信号"],
    purpose: [
      "A full adder combines two bits and a carry-in.",
      "全加器组合两个位和一个输入进位。",
    ],
    action: [
      "Try all three inputs on. Sum and Carry should both be 1.",
      "打开全部三个输入，Sum 和 Carry 都应为 1。",
    ],
  },
  calculator: {
    group: ["Computers", "计算机"],
    purpose: [
      "The calculator program uses your CPU, keyboard and terminal.",
      "计算器程序使用 CPU、键盘与终端。",
    ],
    action: [
      "Run the clock, open Devices, and send a calculation such as 3+4.",
      "运行时钟，打开外设，发送 3+4 等算式。",
    ],
  },
  echo: {
    group: ["Computers", "计算机"],
    purpose: [
      "Software reads keyboard bytes and copies them to the terminal.",
      "软件读取键盘字节并复制到终端。",
    ],
    action: [
      "Run the clock and send a line in Devices. The terminal should echo it.",
      "运行时钟，在外设中发送一行文字，终端应显示相同文字。",
    ],
  },
  pixels: {
    group: ["Computers", "计算机"],
    purpose: [
      "A program writes individual pixels through device addresses.",
      "程序通过外设地址逐个写入像素。",
    ],
    action: [
      "Run the clock and inspect the pixel display in Devices.",
      "运行时钟，在外设中查看像素显示器。",
    ],
  },
} as const;
export type ExampleId = keyof typeof exampleGuides;
