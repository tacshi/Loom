import type { Copy, ExerciseId } from "./types";
export type LearningStage = "demonstration" | "practice" | "challenge";
export type Lesson = {
  chapter: "foundations" | "logic" | "arithmetic" | "memory" | "computers";
  mode: "logic" | "clock" | "cpu";
  concept: Copy;
  tryIt: Copy;
  steps: Copy[];
};
const lesson = (
  chapter: Lesson["chapter"],
  mode: Lesson["mode"],
  concept: Copy,
  tryIt: Copy,
  ...steps: Copy[]
): Lesson => ({ chapter, mode, concept, tryIt, steps });
export const lessons: Record<ExerciseId, Lesson> = {
  signals: lesson(
    "foundations",
    "logic",
    [
      "A bit is a signal with two values: 0 means off, 1 means on. A wire carries that value from an output pin to an input pin.",
      "位是一种只有两个值的信号：0 表示关，1 表示开。导线把输出引脚的值传给输入引脚。",
    ],
    [
      "Toggle a between 0 and 1. The output should always match.",
      "把 a 在 0 和 1 之间切换，输出应始终与它相同。",
    ],
    [
      "Click the output pin on a, then the input pin on out.",
      "点击 a 的输出引脚，再点击 out 的输入引脚。",
    ],
    [
      "Try both values. Read the input and output together.",
      "尝试两个值，同时查看输入和输出。",
    ],
    [
      "Build your own wire and run both test cases.",
      "独立连接导线，运行两个测试。",
    ],
  ),
  "and-basics": lesson(
    "foundations",
    "logic",
    [
      "AND asks whether both inputs are on. Its output is 1 only for 1 AND 1.",
      "AND（与）判断两个输入是否都为开。只有 1 与 1 时才输出 1。",
    ],
    [
      "Try 00, 01, 10 and 11. Which pair switches the output on?",
      "尝试 00、01、10、11。哪一组会打开输出？",
    ],
    [
      "Drag an AND gate between the two inputs and the output.",
      "把与门拖到两个输入和输出之间。",
    ],
    [
      "Connect each input to a different AND pin, then connect its output.",
      "将两个输入分别接到与门的两个引脚，再连接输出。",
    ],
    [
      "Check all four input combinations, not just 11.",
      "检查全部四种输入组合，而不只是 11。",
    ],
  ),
  "invert-basics": lesson(
    "foundations",
    "logic",
    [
      "NOT flips one bit: off becomes on, and on becomes off. This is called inversion.",
      "NOT（非）翻转一个位：关变为开，开变为关。这叫取反。",
    ],
    [
      "Toggle a. Notice that out always shows the opposite value.",
      "切换 a，观察 out 始终显示相反的值。",
    ],
    ["Place a NOT gate after the input.", "在输入后放置非门。"],
    ["Connect a to NOT, then NOT to out.", "连接 a 到非门，再连接非门到 out。"],
    ["Check 0 → 1 and 1 → 0.", "检查 0 → 1 和 1 → 0。"],
  ),
  nand: lesson(
    "foundations",
    "logic",
    [
      "NAND means NOT AND. First ask whether both inputs are on, then flip that answer. It is off only when both inputs are on.",
      "NAND 表示 NOT AND（与非）：先判断两个输入是否都为开，再翻转答案。只有两个输入都为开时，它才为关。",
    ],
    [
      "Predict each output before running the cases. Which input pair turns NAND off?",
      "运行测试前先预测每组输出。哪组输入会让与非门关闭？",
    ],
    [
      "Place AND and NOT gates. A ready-made NAND is not used in this challenge.",
      "放置与门和非门。本挑战不使用现成的与非门。",
    ],
    [
      "Feed a and b into AND; connect AND to NOT; connect NOT to out.",
      "将 a、b 接入与门，与门接入非门，非门接入 out。",
    ],
    [
      "Run all four cases to save your NAND as a reusable component.",
      "运行全部四个测试，把自己的与非门保存为可复用元件。",
    ],
  ),
  not: lesson(
    "logic",
    "logic",
    [
      "You have built NAND. Feeding the same bit into both of its inputs makes NOT. Rebuilding familiar gates shows why NAND can be a foundation.",
      "你已经构建了与非门。将同一个位接到它的两个输入，就得到非门。重建熟悉的逻辑门，能说明与非门为什么可以作为基础。",
    ],
    [
      "Compare both rows with the NOT lesson: the behavior must match.",
      "与非门入门课程的两个测试比较，行为应相同。",
    ],
    [
      "Use your verified NAND or a NAND gate.",
      "使用已验证的与非元件或与非门。",
    ],
    ["Connect a to both NAND inputs.", "将 a 接到与非门的两个输入。"],
    [
      "Connect the result to out and verify both values.",
      "把结果接到 out，验证两个值。",
    ],
  ),
  "and-or": lesson(
    "logic",
    "logic",
    [
      "AND needs both inputs; OR needs at least one. Build these familiar rules using NAND and your verified components.",
      "与逻辑需要两个输入都为开；或逻辑只需要至少一个为开。用与非门和已验证元件构建这些规则。",
    ],
    [
      "Compare the AND and OR outputs for 01 and 11.",
      "比较 01 和 11 时的与、或输出。",
    ],
    [
      "Invert a NAND output to produce AND.",
      "对与非门的输出取反，得到与逻辑。",
    ],
    [
      "Invert each input before a NAND to produce OR.",
      "将两个输入分别取反后接入与非门，得到或逻辑。",
    ],
    [
      "Connect both named outputs and check four combinations.",
      "连接两个命名输出，检查四种组合。",
    ],
  ),
  xor: lesson(
    "logic",
    "logic",
    [
      "XOR means different: its output is on when exactly one input is on. It will become the sum bit in an adder.",
      "XOR（异或）表示不同：恰好一个输入为开时，输出为开。它将成为加法器的和位。",
    ],
    ["Compare 01 and 10 with 00 and 11.", "比较 01、10 与 00、11 的结果。"],
    ["Build a NAND of a and b.", "先构建 a 与 b 的与非结果。"],
    [
      "Combine that result with each original input using two NANDs.",
      "用两个与非门把这个结果分别与原输入组合。",
    ],
    [
      "NAND those two branches and check all four rows.",
      "对两条分支做与非，检查四个测试。",
    ],
  ),
  mux: lesson(
    "logic",
    "logic",
    [
      "A selector chooses one of two signals. sel = 0 chooses a; sel = 1 chooses b. This is a multiplexer.",
      "选择器从两个信号中选择一个。sel = 0 选 a，sel = 1 选 b。这也叫多路选择器。",
    ],
    [
      "Hold a and b different, then change sel.",
      "让 a 与 b 不同，再切换 sel。",
    ],
    ["Enable a only when sel is 0.", "只在 sel 为 0 时允许 a 通过。"],
    ["Enable b only when sel is 1.", "只在 sel 为 1 时允许 b 通过。"],
    [
      "Combine the paths and test both choices for every input pair.",
      "合并两条路径，测试每组输入的两种选择。",
    ],
  ),
  mux8: lesson(
    "logic",
    "logic",
    [
      "A bus carries several bits together. An 8-bit selector uses the same choice for eight independent one-bit selectors.",
      "总线把多个位放在一起传递。8 位选择器用同一个选择信号控制八个独立的单比特选择器。",
    ],
    [
      "Use two different byte values and switch sel; expand the bits to see all eight paths.",
      "输入两个不同的字节并切换 sel，展开位视图查看八条路径。",
    ],
    ["Split a and b into eight bits.", "将 a 与 b 拆成八个位。"],
    [
      "Connect each pair to one verified selector and share sel.",
      "把每对位接入一个已验证选择器，共享 sel。",
    ],
    [
      "Join the selected bits in order and test the full byte.",
      "按顺序合并选出的位，测试完整字节。",
    ],
  ),
  "seven-segment": lesson(
    "logic",
    "logic",
    [
      "A hexadecimal digit represents four bits. Seven segments can draw 0–9 and A–F; each segment is a separate on/off output.",
      "一个十六进制数字表示四个位。七段显示器可以画出 0–9 和 A–F，每一段都是独立的开关输出。",
    ],
    [
      "Select 0, 1 and A in the test table and compare the lit segments.",
      "在测试表中选择 0、1、A，比较亮起的段。",
    ],
    ["Read which segments each digit needs.", "查看每个数字需要点亮哪些段。"],
    [
      "Build the segment rules from the four input bits.",
      "根据四个输入位构建各段的规则。",
    ],
    [
      "Test all sixteen digits, then try your decoder in a counter.",
      "测试全部十六个数字，再把解码器用于计数器。",
    ],
  ),
  "half-adder": lesson(
    "arithmetic",
    "logic",
    [
      "Adding two bits can produce two bits: sum and carry. 1 + 1 is binary 10, so sum is 0 and carry is 1.",
      "两个位相加可能产生两位：和与进位。1 + 1 的二进制是 10，所以和为 0，进位为 1。",
    ],
    [
      "Watch sum and carry together for 1 + 1.",
      "计算 1 + 1 时，同时观察和与进位。",
    ],
    ["Use XOR for the sum.", "用异或产生和。"],
    ["Use AND for the carry.", "用与逻辑产生进位。"],
    [
      "Connect both outputs and check every input pair.",
      "连接两个输出，检查每组输入。",
    ],
  ),
  "full-adder": lesson(
    "arithmetic",
    "logic",
    [
      "A full adder also accepts a carry from the previous column. It adds a, b and carry-in, producing sum and carry-out.",
      "全加器还接收上一列的进位。它把 a、b 和输入进位相加，产生和与输出进位。",
    ],
    [
      "Try three ones: the result is binary 11.",
      "尝试三个 1，结果应为二进制 11。",
    ],
    ["Add a and b with a half adder.", "用半加器计算 a 与 b。"],
    ["Add carry-in to that sum.", "再把输入进位加到这个和上。"],
    [
      "Combine the carry paths and check all eight cases.",
      "合并进位路径，检查八种情况。",
    ],
  ),
  adder8: lesson(
    "arithmetic",
    "logic",
    [
      "An 8-bit adder links columns from the least significant bit upward. Each carry becomes the next column’s carry-in.",
      "8 位加法器从最低位向上连接各列。每列的进位成为下一列的输入进位。",
    ],
    [
      "Compare 1 + 1, 127 + 1 and 255 + 1, including carry-out.",
      "比较 1 + 1、127 + 1、255 + 1，并观察输出进位。",
    ],
    ["Split the input bytes into ordered bits.", "把输入字节按顺序拆成位。"],
    [
      "Chain full adders from bit 0 to bit 7.",
      "从第 0 位到第 7 位串联全加器。",
    ],
    [
      "Join sum bits and expose the final carry.",
      "合并和位，并连接最后的进位。",
    ],
  ),
  subtract: lesson(
    "arithmetic",
    "logic",
    [
      "Subtract b by adding its inverted bits plus one. Flags describe results such as zero and carry; inspect them alongside the number.",
      "通过加上 b 取反后的位再加一来减去 b。标志描述零、进位等结果，应与数字一起查看。",
    ],
    [
      "Try equal operands, then subtract a larger value from a smaller one.",
      "尝试相等的操作数，再用较小的数减较大的数。",
    ],
    [
      "Invert b and supply the initial carry of 1.",
      "对 b 取反，并提供初始进位 1。",
    ],
    [
      "Reuse your adder and connect the required flags.",
      "复用加法器，连接所需标志。",
    ],
    [
      "Test wraparound and zero, not only positive differences.",
      "测试回绕与零，而不只测试正数差。",
    ],
  ),
  register: lesson(
    "memory",
    "clock",
    [
      "A register remembers a value. Changing the input does not change stored data until a clock step loads it. Enable chooses load or hold; reset clears it.",
      "寄存器保存一个值。改变输入不会改变存储值，直到一个时钟步把它载入。使能选择载入或保持，复位将其清零。",
    ],
    [
      "Change data, advance the clock, then disable loading and change data again.",
      "改变数据并推进时钟，再关闭载入并再次改变数据。",
    ],
    [
      "Connect data, enable and reset to the supplied register.",
      "把数据、使能和复位接到提供的寄存器。",
    ],
    [
      "Predict the stored value before each clock step.",
      "在每次时钟步之前预测存储值。",
    ],
    [
      "Verify load, hold and reset as a sequence.",
      "按顺序验证载入、保持与复位。",
    ],
  ),
  accumulator: lesson(
    "memory",
    "clock",
    [
      "An accumulator adds new data to the value it remembers. Feedback makes the next result depend on the previous clock step.",
      "累加器把新数据加到已保存的值上。反馈让下一个结果依赖上一个时钟步。",
    ],
    [
      "Load 1 repeatedly and watch the stored total grow.",
      "反复载入 1，观察保存的总数增长。",
    ],
    ["Feed stored output back into an adder.", "把存储输出反馈到加法器。"],
    [
      "Connect the sum to register data, with enable and reset.",
      "把和连接到寄存器数据，并连接使能与复位。",
    ],
    ["Check accumulation, hold and clearing.", "检查累加、保持与清零。"],
  ),
  pc: lesson(
    "memory",
    "clock",
    [
      "The program counter remembers the address of the next instruction. It can advance, hold, reset or jump to a chosen address.",
      "程序计数器保存下一条指令的地址。它可以递增、保持、复位或跳到指定地址。",
    ],
    [
      "Advance twice, jump to a target, then reset.",
      "推进两次，跳到目标地址，然后复位。",
    ],
    ["Add one to the stored address.", "给保存的地址加一。"],
    [
      "Select between increment and jump target.",
      "在递增结果与跳转目标之间选择。",
    ],
    [
      "Check jump, enable and reset priorities.",
      "检查跳转、使能与复位的优先关系。",
    ],
  ),
  "pc-fields": lesson(
    "computers",
    "logic",
    [
      "An instruction contains fields: one part selects the operation, another supplies an operand. Splitting a byte gives those fields names.",
      "一条指令包含字段：一部分选择操作，另一部分提供操作数。拆分字节能为这些字段赋予名称。",
    ],
    [
      "Choose two instruction bytes and compare their operation and operand fields.",
      "选择两个指令字节，比较操作与操作数字段。",
    ],
    ["Locate the field boundaries in the interface.", "在接口中确认字段边界。"],
    [
      "Split the instruction bits and join each field in order.",
      "拆分指令位，按顺序合并各字段。",
    ],
    [
      "Check the extracted values against the input byte.",
      "根据输入字节检查提取的值。",
    ],
  ),
  alu: lesson(
    "computers",
    "logic",
    [
      "The arithmetic logic unit chooses a calculation. Its operation input selects the function; flags describe the result.",
      "算术逻辑单元选择一种计算。操作输入决定功能，标志描述结果。",
    ],
    [
      "Keep operands fixed and change the operation; compare result and flags.",
      "固定操作数并改变操作，比较结果与标志。",
    ],
    [
      "Connect your arithmetic and logic building blocks.",
      "连接已有的算术与逻辑模块。",
    ],
    [
      "Select the requested result with operation bits.",
      "用操作位选择所需结果。",
    ],
    ["Verify each operation and its flags.", "验证每种操作及其标志。"],
  ),
  control: lesson(
    "computers",
    "logic",
    [
      "Control signals tell the computer what to load, read or write. They depend on the instruction and the current fetch or execute phase.",
      "控制信号告诉计算机何时载入、读取或写入。它们依赖指令以及当前的取指或执行阶段。",
    ],
    [
      "Compare the same instruction during fetch and execute.",
      "比较同一条指令在取指与执行阶段的表现。",
    ],
    ["Decode the operation and phase inputs.", "解码操作与阶段输入。"],
    [
      "Connect each required control output to its rule.",
      "按规则连接每个控制输出。",
    ],
    ["Check that unrelated writes remain off.", "检查不相关的写入保持关闭。"],
  ),
  cpu: lesson(
    "computers",
    "cpu",
    [
      "A CPU fetches an instruction, decodes it, then changes registers or memory. Instruction stepping groups those clock steps into one meaningful action.",
      "CPU 取出指令、解码，然后改变寄存器或内存。指令单步把这些时钟步组合成一次有意义的操作。",
    ],
    [
      "Step an instruction and compare the current instruction, address and accumulator.",
      "执行一条指令，比较当前指令、地址与累加器。",
    ],
    [
      "Connect the program counter, instruction memory and control.",
      "连接程序计数器、指令存储器与控制模块。",
    ],
    [
      "Connect the ALU, registers and data memory.",
      "连接算术逻辑单元、寄存器与数据内存。",
    ],
    [
      "Run the diagnostic program and inspect the first incorrect instruction.",
      "运行诊断程序，检查第一条结果错误的指令。",
    ],
  ),
  io: lesson(
    "computers",
    "clock",
    [
      "Memory-mapped I/O gives devices addresses. Reads can consume keyboard data; writes can change the terminal or display.",
      "内存映射外设为设备分配地址。读取可能消耗键盘数据，写入可以改变终端或显示器。",
    ],
    [
      "Follow a keyboard read and a terminal write in the test checkpoints.",
      "在测试检查点中跟踪一次键盘读取与终端写入。",
    ],
    ["Decode RAM and device address ranges.", "解码 RAM 与外设地址范围。"],
    [
      "Qualify reads and writes so only the selected device changes.",
      "限定读写条件，使只有被选中的设备改变。",
    ],
    [
      "Verify data, side effects and display outputs together.",
      "同时验证数据、副作用与显示输出。",
    ],
  ),
  calculator: lesson(
    "computers",
    "cpu",
    [
      "Your calculator is software running on your CPU and I/O circuit. The visible answer depends on instruction execution, keyboard reads and terminal writes.",
      "计算器是运行在你的 CPU 与外设电路上的软件。可见答案依赖指令执行、键盘读取和终端写入。",
    ],
    [
      "Enter a calculation, then inspect the expected and actual terminal text.",
      "输入一道算式，比较预期与实际终端文本。",
    ],
    [
      "Connect your verified CPU to your I/O block.",
      "将已验证的 CPU 接到外设模块。",
    ],
    ["Load the supplied calculator program.", "载入提供的计算器程序。"],
    [
      "Check arithmetic and recovery after malformed input.",
      "检查算术结果及错误输入后的恢复。",
    ],
  ),
};
export const chapters: Record<Lesson["chapter"], Copy> = {
  foundations: ["First signals", "初识信号"],
  logic: ["Logic and selection", "逻辑与选择"],
  arithmetic: ["Working with numbers", "数值运算"],
  memory: ["Remembering values", "保存数值"],
  computers: ["Building a computer", "构建计算机"],
};
