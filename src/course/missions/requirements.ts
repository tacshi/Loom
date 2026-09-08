import type { Copy } from "../types";
const core: Copy[] = [
  [
    "Make out match a for both 0 and 1.",
    "让 out 在 a 为 0 和 1 时都与 a 相同。",
  ],
  [
    "Make left and right both follow a. One output pin can feed several inputs.",
    "让 left 和 right 都跟随 a。一个输出引脚可以连接多个输入。",
  ],
  [
    "Make out 1 only when a and b are both 1. Use an AND gate.",
    "仅在 a、b 都为 1 时让 out 为 1。使用与门。",
  ],
  [
    "Make out the opposite of a: 0 becomes 1 and 1 becomes 0. Use NOT.",
    "让 out 与 a 相反：0 变为 1，1 变为 0。使用非门。",
  ],
  [
    "Combine AND and NOT. Only a=1 and b=1 should produce 0; the other three combinations produce 1.",
    "组合与门和非门。仅 a=1、b=1 时输出 0，其他三种组合输出 1。",
  ],
  [
    "Invert a using NAND or your verified NAND component. Direct AND and NOT placement is unavailable here.",
    "用与非门或已验证的与非元件对 a 取反。本任务不能直接放置与门和非门。",
  ],
  [
    "Using NAND, make out 1 only for a=1 and b=1.",
    "用与非门实现仅在 a=1、b=1 时 out=1。",
  ],
  [
    "Using NAND, make out 1 when either input is 1, including when both are 1.",
    "用与非门实现任一输入为 1 时 out=1，包括两个输入都为 1 的情况。",
  ],
  [
    "Make out 1 when a and b differ, and 0 when they match.",
    "a、b 不同时 out=1，相同时 out=0。",
  ],
  [
    "Make out 1 when a and b match, and 0 when they differ.",
    "a、b 相同时 out=1，不同时 out=0。",
  ],
  [
    "sel=0 chooses a; sel=1 chooses b. The unselected input must not affect out.",
    "sel=0 选择 a，sel=1 选择 b。未选中的输入不能影响 out。",
  ],
  [
    "select1/select0 values 00, 01, 10, and 11 choose a, b, c, and d respectively.",
    "select1/select0 为 00、01、10、11 时，分别选择 a、b、c、d。",
  ],
  [
    "Combine b0–b3 into value. Their place values are 1, 2, 4, and 8.",
    "把 b0–b3 合并成 value，各位分别表示 1、2、4、8。",
  ],
  [
    "Expose the low and high four bits of value, and swap those halves in swapped.",
    "分别输出 value 的低四位和高四位，并在 swapped 中交换两部分。",
  ],
  [
    "Produce bitwise AND, OR, and XOR for a and b. Each of the eight bit positions operates independently.",
    "输出 a、b 按位与、或和异或的结果。八个位分别独立运算。",
  ],
  [
    "sel chooses the entire eight-bit a or b value; no bits may come from the unselected input.",
    "sel 选择完整的八位 a 或 b，不能混入另一个输入的位。",
  ],
  [
    "For select=0–7, set only that bit of out to 1.",
    "select 为 0–7 时，仅让 out 中对应的一位为 1。",
  ],
  [
    "Display values 0–15 as 0–9 and A–F. Match every segment and keep the decimal point off.",
    "把 0–15 显示为 0–9、A–F。每一段都需正确，小数点保持关闭。",
  ],
  [
    "Add a and b. sum is the low bit; carry is the extra bit, so 1+1 produces carry=1, sum=0.",
    "把 a、b 相加。sum 为低位，carry 为额外进位，因此 1+1 得到 carry=1、sum=0。",
  ],
  [
    "Add a, b, and cin. Report the low bit as sum and the remaining bit as carry.",
    "把 a、b、cin 相加，低位输出到 sum，另一位输出到 carry。",
  ],
  [
    "Add a and b. Keep the low eight bits in out and expose the ninth bit as carry.",
    "把 a、b 相加，out 保留低八位，carry 输出第九位。",
  ],
  [
    "Output a+1. At 255, wrap out to 0 and set carry to 1.",
    "输出 a+1。a=255 时 out 回到 0，carry=1。",
  ],
  [
    "Produce the eight-bit two's-complement negation of a: invert its bits and add one.",
    "输出 a 的八位补码负值：按位取反后加一。",
  ],
  [
    "Output a−b modulo 256. carry=1 means the unsigned subtraction needed no borrow.",
    "输出 a−b 对 256 取模的结果。carry=1 表示无符号减法无需借位。",
  ],
  [
    "Report whether unsigned a is less than b, and whether they are equal.",
    "报告无符号数 a 是否小于 b，以及二者是否相等。",
  ],
  [
    "Interpret the highest bit as the sign. Compare values from −128 through 127.",
    "把最高位作为符号，比较 −128 到 127 范围的数值。",
  ],
  [
    "Add a and b and report zero, unsigned carry, and signed overflow alongside out.",
    "将 a、b 相加，并随 out 报告零、无符号进位和有符号溢出。",
  ],
  [
    "Shift a one position left and right. Fill the newly exposed bit with 0 and discard the bit shifted out.",
    "将 a 左右各移一位，新空出的位填 0，移出的位舍弃。",
  ],
  [
    "Shift a right by one while copying the original sign bit into the highest position.",
    "将 a 右移一位，并用原符号位填充最高位。",
  ],
  [
    "op=0 adds, 1 subtracts, 2 performs AND, and 3 performs XOR. Return the low eight result bits.",
    "op=0 加法、1 减法、2 按位与、3 按位异或。输出结果的低八位。",
  ],
  [
    "Wire the supplied flip-flop to remember data on each clock step. Changing data alone must not change q.",
    "连接提供的触发器，在每个时钟步保存 data。仅改变 data 不能改变 q。",
  ],
  [
    "Build an eight-bit register from one-bit flip-flops. All bits must capture data on the same clock step.",
    "用单比特触发器构建八位寄存器，所有位必须在同一时钟步保存 data。",
  ],
  [
    "At a clock step, rst clears q; otherwise en loads data. With en=0, preserve q.",
    "时钟步到来时，rst 清空 q；否则 en 允许载入 data。en=0 时保持 q。",
  ],
  [
    "Increment q when en=1; hold when en=0. rst clears the count, and 255 wraps to 0.",
    "en=1 时递增 q，en=0 时保持。rst 清零，255 之后回到 0。",
  ],
  [
    "When enabled, add data to the previous total. Hold when disabled and clear on reset.",
    "使能时将 data 加到已有总数上，未使能时保持，复位时清零。",
  ],
  [
    "When enabled, jump loads target; otherwise increment the address. Reset overrides jump and enable.",
    "使能时，jump 载入 target，否则地址递增。复位优先于跳转和使能。",
  ],
  [
    "write=1 stores data at address on a clock step. Reading another address must preserve all stored values.",
    "write=1 时在时钟步把 data 保存到 address。读取其他地址不能改变已存值。",
  ],
  [
    "Use the highest address bit to select one of two four-word RAM banks. Writes must affect only the selected bank.",
    "用地址最高位选择两个四字 RAM 区之一，写入只能影响被选中的存储区。",
  ],
  [
    "Wire the supplied ROM table so addresses 0–7 return 0, 1, 1, 2, 3, 5, 8, 13.",
    "连接提供的 ROM 表，让地址 0–7 返回 0、1、1、2、3、5、8、13。",
  ],
  [
    "Each enable connects its data source to the bus. Both disabled means Z; conflicting enabled outputs mean X.",
    "每个 enable 将对应数据源接入总线。都关闭时为 Z，启用的输出发生冲突时为 X。",
  ],
  [
    "Cycle red → green → yellow → red when advance=1. Hold otherwise; reset selects red.",
    "advance=1 时按红→绿→黄→红循环，否则保持。复位选择红灯。",
  ],
  [
    "Capture one bit per enabled clock step. match=1 exactly when the latest three bits are 101; reset clears the history.",
    "每个使能的时钟步接收一个位。最近三位为 101 时 match=1，复位清空历史。",
  ],
  [
    "Split the 16-bit instruction into its high-byte opcode and low-byte operand.",
    "将十六位指令拆成高字节 opcode 和低字节 operand。",
  ],
  [
    "Load the selected ROM instruction into the instruction register only when load=1. Reset clears it.",
    "仅 load=1 时把选中 ROM 指令载入指令寄存器，复位将其清零。",
  ],
  [
    "Decode the instruction, phase, and flags into the CPU control bus. Halted execution must not write state.",
    "将指令、阶段和标志译成 CPU 控制总线。停机后不能继续写入状态。",
  ],
  [
    "command=0 loads data into q; 1 stores q to RAM; 2 loads RAM into q; 3 holds. Reset clears q and prevents a write.",
    "command=0 把 data 载入 q，1 把 q 写入 RAM，2 把 RAM 载入 q，3 保持。复位清空 q 并阻止写入。",
  ],
  [
    "Opcode 9 always jumps, 10 jumps when zero=1, and 11 jumps when carry=1. Other opcodes do not jump.",
    "操作码 9 总是跳转，10 在 zero=1 时跳转，11 在 carry=1 时跳转。其他操作码不跳转。",
  ],
  [
    "Connect your CPU blocks so the diagnostic program executes every supported instruction correctly.",
    "连接 CPU 模块，让诊断程序正确执行全部支持的指令。",
  ],
  [
    "In Circuit, select the program ROM and enter 0x012A, 0x0C00, 0x0D00: load 42, output it, then halt.",
    "在“电路”中选择程序 ROM，输入 0x012A、0x0C00、0x0D00：载入 42、输出、停机。",
  ],
  [
    "Open Program and write assembly that outputs 73 and halts.",
    "打开“程序”，编写输出 73 并停机的汇编程序。",
  ],
  [
    "Copy RAM[0] to RAM[1], reload the stored value, output it, and halt.",
    "把 RAM[0] 复制到 RAM[1]，重新载入保存的值、输出并停机。",
  ],
  [
    "Output 0 when RAM[0] is zero, otherwise output 1. Then halt.",
    "RAM[0] 为零时输出 0，否则输出 1，然后停机。",
  ],
  [
    "Count down from RAM[0] to zero in RAM[1]. Count the iterations in RAM[2], output zero, and halt.",
    "从 RAM[0] 开始在 RAM[1] 中倒数到零，用 RAM[2] 统计循环次数，输出零并停机。",
  ],
  [
    "Use a loop to add 1 through RAM[0], for inputs from 0 through 22. Output the sum and halt; input 0 must output 0.",
    "用循环累加 1 到 RAM[0]，输入范围为 0–22。输出总和并停机；输入为 0 时输出 0。",
  ],
  [
    "Route RAM and device addresses. Keyboard reads consume one byte; writes must reach only the addressed device.",
    "分配 RAM 和外设地址。键盘读取消耗一个字节，写入只能到达被寻址的外设。",
  ],
  [
    "Read keyboard bytes and write the same bytes to the terminal, including newline characters.",
    "读取键盘字节，并向终端写出相同字节，包括换行符。",
  ],
  [
    "Read a newline-terminated decimal number from 0 through 255 and show its numeric value on the CPU output.",
    "读取以换行结尾的 0–255 十进制数，在 CPU 输出中显示其数值。",
  ],
  [
    "Print RAM[0] as decimal text, without leading zeroes. Zero must print as 0.",
    "把 RAM[0] 输出为十进制文本，不保留前导零，零必须显示为 0。",
  ],
  [
    "Complete the arithmetic section of the supplied calculator. Support 0–255 operands, sums through 510, and negative differences.",
    "完成提供的计算器中的算术部分，支持 0–255 操作数、最大 510 的和以及负数差。",
  ],
  [
    "Reject malformed expressions and out-of-range operands with ? and a newline. The next valid line must still calculate correctly.",
    "对格式错误或越界操作数输出 ? 和换行，下一行有效算式仍需正确计算。",
  ],
];
const projects: Copy[] = [
  [
    "Restore the missing connection so out follows a.",
    "恢复缺失的连接，让 out 跟随 a。",
  ],
  [
    "left must follow a and right must follow b. Repair the crossed connections.",
    "left 应跟随 a，right 应跟随 b。修复接反的连接。",
  ],
  [
    "Output 1 only when all three safety inputs are 1.",
    "仅三个安全输入全为 1 时输出 1。",
  ],
  [
    "master=0 disables both outputs; master=1 lets left follow a and right follow b.",
    "master=0 关闭两个输出，master=1 时 left 跟随 a、right 跟随 b。",
  ],
  [
    "Output 1 when at least two of three inputs are 1.",
    "三个输入中至少两个为 1 时输出 1。",
  ],
  [
    "Output 1 for exactly one active input; two or three active inputs must produce 0.",
    "恰好一个输入有效时输出 1，两个或三个有效时输出 0。",
  ],
  [
    "Sound alarm only when armed and either door or window is active.",
    "仅布防且门或窗任一有效时报警。",
  ],
  ["Unlock only for a=1, b=0, c=1.", "仅 a=1、b=0、c=1 时解锁。"],
  [
    "parityOut is the XOR of all data bits. error reports disagreement with the supplied parity bit.",
    "parityOut 为所有数据位的异或，error 表示它与输入校验位不一致。",
  ],
  [
    "Return the highest active request index. With no requests, valid=0 and index=0.",
    "返回最高有效请求的编号，没有请求时 valid=0、index=0。",
  ],
  [
    "Count zero bits before the highest 1. An all-zero byte has count=8.",
    "统计最高位的 1 之前有几个零，全零字节的 count=8。",
  ],
  [
    "Map bit 0 to bit 7, bit 1 to bit 6, and so on.",
    "把第 0 位映射到第 7 位、第 1 位映射到第 6 位，依此类推。",
  ],
  [
    "Return the unsigned magnitude of the signed input, including 128 for −128.",
    "输出有符号输入的无符号绝对值，包括 −128 对应 128。",
  ],
  [
    "Add a and b, but return 255 instead of wrapping when the sum is too large.",
    "将 a、b 相加，和过大时输出 255 而不是回绕。",
  ],
  [
    "Return the full 16-bit unsigned product of a and b.",
    "输出 a、b 无符号乘积的完整十六位。",
  ],
  [
    "Divide a by b. If b=0, return quotient=255 and remainder=a.",
    "计算 a 除以 b；b=0 时 quotient=255、remainder=a。",
  ],
  [
    "Return both the smaller and larger unsigned input.",
    "分别输出两个无符号输入中的较小值和较大值。",
  ],
  [
    "inside=1 when low ≤ value ≤ high. Reversed bounds contain no values.",
    "low ≤ value ≤ high 时 inside=1，上下界颠倒时没有值在范围内。",
  ],
  [
    "Output 1 when exactly one bit is set; zero is not a power of two.",
    "恰好一位为 1 时输出 1，零不是二的幂。",
  ],
  [
    "Rotate by one bit: right=1 rotates right, otherwise left. Preserve the bit that wraps around.",
    "循环移动一位：right=1 向右，否则向左，移出的位从另一端补回。",
  ],
  [
    "Enabled load stores data; otherwise count down without going below zero. Reset clears the count.",
    "使能时 load 载入 data，否则倒数且不能低于零，复位清零。",
  ],
  [
    "Rotate a single lit bit left each enabled clock step. Reset returns to bit 0.",
    "每个使能时钟步把唯一亮起的位向左循环移动，复位回到第 0 位。",
  ],
  [
    "Increment only on a 0→1 change of pressed. Holding it at 1 must not keep counting.",
    "仅 pressed 从 0 变为 1 时计数，持续为 1 不能重复计数。",
  ],
  [
    "Receive eight bits most-significant first, then publish byte and pulse ready for one clock step.",
    "先接收最高位，收满八位后输出 byte，并让 ready 有效一个时钟步。",
  ],
  [
    "Store four bytes and return the oldest first. Reject pushes when full and pops when empty; pop takes priority.",
    "保存四个字节，最先存入的先取出。满时不压入、空时不弹出，弹出优先。",
  ],
  [
    "Store four bytes and return the newest first. Reject pushes when full and pops when empty; pop takes priority.",
    "保存四个字节，最后存入的先取出。满时不压入、空时不弹出，弹出优先。",
  ],
  [
    "Enter digits 1, 2, 3 in order to unlock. A wrong digit restarts the sequence; reset locks again.",
    "依次输入 1、2、3 解锁，错误数字使顺序重新开始，复位后重新锁定。",
  ],
  [
    "Copy the four supplied ROM words to RAM, one per enabled clock step, then assert done and stop writing.",
    "每个使能时钟步把一个 ROM 字复制到 RAM，四个字完成后置 done 并停止写入。",
  ],
  [
    "Repair the disconnected control output without replacing the working decoder.",
    "修复断开的控制输出，不替换正常工作的译码器。",
  ],
  [
    "Find why instructions fail to update the accumulator and restore the missing write-enable connection.",
    "找出指令为何不能更新累加器，并恢复缺失的写使能连接。",
  ],
  [
    "Expose the running clock count at address 248; other addresses return zero. Reset clears the count.",
    "在地址 248 输出时钟计数，其他地址返回零，复位清零。",
  ],
  [
    "Fill the ROM control table to match the instruction controller for every opcode, phase, flag, and halt state.",
    "填写 ROM 控制表，使全部操作码、阶段、标志和停机状态下的行为与指令控制器一致。",
  ],
  [
    "Multiply RAM[0] and RAM[1] with repeated addition. Output the low eight bits and halt.",
    "用重复加法计算 RAM[0] 与 RAM[1] 的乘积，输出低八位并停机。",
  ],
  [
    "Output the greatest common divisor of RAM[0] and RAM[1], including zero-input cases.",
    "输出 RAM[0] 与 RAM[1] 的最大公约数，包括输入为零的情况。",
  ],
  [
    "For RAM[0]=n, output Fibonacci F(n), with F(0)=0 and F(1)=1. The required range is 0–12.",
    "RAM[0]=n 时输出斐波那契数 F(n)，F(0)=0、F(1)=1，要求范围为 0–12。",
  ],
  [
    "Sort RAM[0]–RAM[3] into ascending unsigned order and halt; preserve repeated values.",
    "把 RAM[0]–RAM[3] 按无符号数升序排列并停机，保留重复值。",
  ],
  [
    "Convert ASCII a–z to A–Z and leave other bytes unchanged.",
    "把 ASCII a–z 转为 A–Z，其他字节保持不变。",
  ],
  [
    "Light pixels (0,0), (1,1), (2,2), and (3,3), leaving their neighbors off.",
    "点亮 (0,0)、(1,1)、(2,2)、(3,3)，相邻像素保持关闭。",
  ],
  [
    "Move one pixel across x=0,1,2,3,2,1,0 at y=0, clearing its previous position each frame.",
    "在 y=0 上按 x=0、1、2、3、2、1、0 移动一个像素，每帧清除原位置。",
  ],
  [
    "Read successive decimal lines and show their running sum on the CPU output, wrapping at 256.",
    "连续读取十进制文本行，在 CPU 输出中显示累加结果，达到 256 时回绕。",
  ],
];
export const requirements: Record<string, Copy> = Object.fromEntries([
  ...core.map((v, i) => [`core-${String(i + 1).padStart(2, "0")}`, v]),
  ...projects.map((v, i) => [`project-${String(i + 1).padStart(2, "0")}`, v]),
]);
