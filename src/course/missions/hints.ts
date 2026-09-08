import type { Copy } from "../types";
const core: Copy[] = [
  [
    "Click a's output pin, then out's input pin. Right-click or Esc cancels an unfinished wire.",
    "点击 a 的输出引脚，再点击 out 的输入引脚。右键或 Esc 可取消未完成的连线。",
  ],
  [
    "Start both connections at the same output pin on a.",
    "两条连接都从 a 的同一个输出引脚开始。",
  ],
  [
    "Drag an AND gate onto the canvas, connect a and b to its two inputs, and connect its output to out.",
    "将与门拖到画布上，把 a、b 接到两个输入，再把输出接到 out。",
  ],
  [
    "Connect a to the NOT gate's input, and its output to out.",
    "把 a 接到非门输入，再把非门输出接到 out。",
  ],
  [
    "Connect a and b to AND, then feed AND's output into NOT.",
    "把 a、b 接入与门，再将与门输出接入非门。",
  ],
  [
    "Feed a into both NAND inputs; its output is the inverted bit.",
    "把 a 同时接到与非门的两个输入，输出就是取反后的位。",
  ],
  [
    "Invert the output of a NAND gate using a second NAND.",
    "用第二个与非门对第一个与非门的输出取反。",
  ],
  [
    "Invert a and b separately, then feed them into NAND.",
    "分别对 a、b 取反，再把两个结果接入与非门。",
  ],
  [
    "Build t=NAND(a,b), then NAND(NAND(a,t), NAND(b,t)).",
    "先构建 t=NAND(a,b)，再构建 NAND(NAND(a,t), NAND(b,t))。",
  ],
  [
    "Invert the XOR result to detect equality instead of difference.",
    "将异或结果取反，把检测不同改成检测相同。",
  ],
  [
    "Enable a when sel=0 and b when sel=1, then combine the paths.",
    "sel=0 时让 a 通过，sel=1 时让 b 通过，再合并两条路径。",
  ],
  [
    "Use select0 to choose within each pair, then select1 to choose the pair.",
    "用 select0 在每对输入中选择，再用 select1 选择哪一对。",
  ],
  [
    "Connect b0 to the joiner's b0 pin, continuing in the same order through b3.",
    "将 b0 接到合并器的 b0 引脚，按相同顺序连接到 b3。",
  ],
  [
    "Use a splitter, then join bits 0–3 and 4–7 separately. Cross the groups for swapped.",
    "先拆分，再分别合并 0–3 位和 4–7 位。交叉合并两组得到 swapped。",
  ],
  [
    "Apply each one-bit rule independently at all eight positions, then join the results.",
    "在八个位上分别应用单比特规则，再合并结果。",
  ],
  [
    "Split both bytes, use eight selectors sharing sel, and join their outputs.",
    "拆分两个字节，让八个选择器共用 sel，再合并输出。",
  ],
  [
    "Each output tests one exact combination of the three selection bits.",
    "每个输出检测三个选择位的一种确定组合。",
  ],
  [
    "Choose which input values light each segment, then combine those conditions for that segment.",
    "找出哪些输入值会点亮每一段，再合并该段的条件。",
  ],
  ["XOR produces sum; AND produces carry.", "异或产生 sum，与产生 carry。"],
  [
    "Add a and b with a half adder, then add cin. Combine the two carry outputs.",
    "先用半加器计算 a、b，再加 cin，并合并两次进位。",
  ],
  [
    "Chain eight full adders from bit 0 upward. Each carry feeds the next bit.",
    "从第 0 位向上串联八个全加器，每一位的进位接入下一位。",
  ],
  [
    "Reuse addition with the second operand fixed at 1.",
    "复用加法器，把第二个操作数固定为 1。",
  ],
  [
    "Invert all eight bits, then add 1; discard any ninth bit.",
    "把八个位全部取反后加一，并舍弃第九位。",
  ],
  [
    "Add a to inverted b with an initial carry of 1.",
    "将 a 与取反后的 b 相加，并把初始进位设为 1。",
  ],
  [
    "Subtraction's no-borrow carry tells you a≥b. XOR followed by zero detection tests equality.",
    "减法的无借位进位表示 a≥b。异或后检测零可判断相等。",
  ],
  [
    "If the sign bits differ, the negative value is smaller. Otherwise use unsigned comparison.",
    "符号位不同时，负数较小；否则使用无符号比较。",
  ],
  [
    "Zero means every result bit is 0. Signed overflow occurs when equal input signs produce the opposite result sign.",
    "所有结果位为 0 时置零标志。同号输入产生异号结果时发生有符号溢出。",
  ],
  [
    "Rewire split bits one position over and supply 0 to the newly empty pin.",
    "将拆分后的位错开一位连接，并向空出的引脚提供 0。",
  ],
  [
    "Wire the original top bit to both highest output positions.",
    "把原最高位接到输出的最高两位。",
  ],
  [
    "Build the four candidate results, then select one using the two op bits.",
    "先构建四种候选结果，再用两个 op 位选出一个。",
  ],
  [
    "Connect data to d and q to the output. Set en=1 and rst=0, then advance the clock.",
    "把 data 接到 d、q 接到输出。设置 en=1、rst=0，再推进时钟。",
  ],
  [
    "Split data into eight bits, store each bit, and join the eight q outputs.",
    "将 data 拆成八个位，分别保存，再合并八个 q 输出。",
  ],
  [
    "Share en and rst across the stored bits. Reset must work even when en=0.",
    "让各存储位共用 en 和 rst。即使 en=0，复位也必须有效。",
  ],
  [
    "Feed the stored value plus 1 back to the storage input.",
    "把已存值加一后反馈到存储输入。",
  ],
  [
    "Feed stored q and new data into an adder, then store the sum.",
    "把已存 q 和新 data 接入加法器，再保存它们的和。",
  ],
  [
    "Select between q+1 and target before the storage input.",
    "在存储输入前选择 q+1 或 target。",
  ],
  [
    "Wire address to addr, data to data, and write to we; observe the RAM output.",
    "将 address 接到 addr、data 接到 data、write 接到 we，并观察 RAM 输出。",
  ],
  [
    "Use low address bits inside both banks and the high bit to select write-enable and read output.",
    "低地址位同时接入两个存储区，用最高位选择写使能和读取输出。",
  ],
  [
    "Connect address to the ROM addr pin and the ROM output to out.",
    "把 address 接到 ROM 的 addr 引脚，再把 ROM 输出接到 out。",
  ],
  [
    "Put one tri-state buffer on each data path and connect both buffer outputs to the same bus.",
    "在每条数据路径上放置三态缓冲器，再把两个缓冲器输出接到同一总线。",
  ],
  [
    "Store states 0, 1, and 2. Decode them into red, green, and yellow; return from 2 to 0.",
    "保存 0、1、2 三种状态，分别译为红、绿、黄，并从 2 回到 0。",
  ],
  [
    "Shift each new bit into a three-bit register, then compare its contents with binary 101.",
    "把每个新位移入三位寄存器，再与二进制 101 比较。",
  ],
  [
    "Instruction bits 0–7 form operand; bits 8–15 form opcode.",
    "指令的 0–7 位组成 operand，8–15 位组成 opcode。",
  ],
  [
    "Connect ROM output to register d; load controls en and rst controls reset.",
    "把 ROM 输出接到寄存器 d，由 load 控制 en，由 rst 控制复位。",
  ],
  [
    "Decode the opcode, then qualify each action with execute phase and not-halted.",
    "先译码操作码，再用执行阶段和未停机条件限定每个动作。",
  ],
  [
    "Decode the command into register enable, register data selection, and RAM write-enable.",
    "把 command 译为寄存器使能、寄存器数据选择和 RAM 写使能。",
  ],
  [
    "Combine the unconditional-jump condition with the two flag-qualified jump conditions.",
    "合并无条件跳转以及两个由标志限定的跳转条件。",
  ],
  [
    "Connect PC→ROM→IR→Fields, then wire control and data paths. Keep fetch and execute actions separate.",
    "先连接 PC→ROM→IR→Fields，再连接控制与数据路径。区分取指和执行阶段的动作。",
  ],
  [
    "The high byte is the opcode and the low byte is its operand. Edit consecutive ROM addresses starting at 0.",
    "高字节为操作码，低字节为操作数。从地址 0 开始依次编辑 ROM。",
  ],
  [
    "LDI loads a number, OUT copies it to output, and HLT stops. Assemble & load writes your program to ROM.",
    "LDI 载入数值，OUT 把它送到输出，HLT 停机。“汇编并加载”把程序写入 ROM。",
  ],
  [
    "LDA reads RAM into the accumulator; STA stores it. Reload with LDA before OUT.",
    "LDA 将 RAM 读入累加器，STA 将累加器写入 RAM。OUT 前用 LDA 重新载入。",
  ],
  [
    "LDA updates the zero flag. JZ chooses the zero branch; use labels for destinations.",
    "LDA 更新零标志，JZ 选择为零的分支，用标签表示跳转目标。",
  ],
  [
    "Test the remaining count before subtracting 1; increment a separate iteration counter each loop.",
    "每轮先检查剩余计数，再减一，并单独递增循环次数。",
  ],
  [
    "Copy RAM[0] into a counter and start a separate total at 0. Check for zero before adding the counter to the total, then decrement it and repeat.",
    "把 RAM[0] 复制到计数器，另设一个初值为 0 的总和。先判断计数是否为零，再累加当前计数、减一并重复。",
  ],
  [
    "Decode the address before combining it with read or write. Reading keyboard data must consume exactly once.",
    "先译码地址，再与读写信号组合。读取键盘数据时只能消耗一次。",
  ],
  [
    "Poll F0 for available input, read a byte from F1, and write it to F2.",
    "轮询 F0 判断是否有输入，从 F1 读一个字节，再写到 F2。",
  ],
  [
    "Subtract ASCII '0' (48) from each digit; update number=number×10+digit until newline.",
    "从每个数字字符减去 ASCII 的 '0'（48），按 数值=数值×10+数字 更新，直到换行。",
  ],
  [
    "Repeatedly subtract 100 and 10 to count hundreds and tens. Add 48 to each digit before writing text.",
    "反复减去 100 和 10 来统计百位与十位，把每位加上 48 后输出为文本。",
  ],
  [
    "Preserve addition carry as a high byte. For a negative difference, print '-' and format its magnitude.",
    "把加法进位保留到高字节。差为负时先输出 '-'，再格式化绝对值。",
  ],
  [
    "After an error, consume input until newline before resetting the parser. Do not leave malformed bytes queued.",
    "出错后先读到换行，再复位解析状态，不能把错误字节留在队列中。",
  ],
];
const projects: Copy[] = [
  [
    "Follow a through the two inverter stages and locate the disconnected final output.",
    "沿 a 检查两级反相器，找到断开的最终输出。",
  ],
  [
    "Check each output's source, then reconnect it to the matching input.",
    "检查每个输出来自哪里，再接到对应输入。",
  ],
  [
    "Combine two inputs with AND, then combine that result with the third.",
    "先对两个输入做与，再将结果与第三个输入做与。",
  ],
  [
    "Apply master AND a and master AND b independently.",
    "分别计算 master 与 a、master 与 b。",
  ],
  ["OR together the three pairwise AND results.", "将三组两两相与的结果做或。"],
  [
    "Accept each single-active pattern and reject 111 as well as the pairs.",
    "接受每种单独有效的组合，并排除 111 和两路有效。",
  ],
  [
    "Combine door OR window, then gate that result with armed.",
    "先计算 door 或 window，再与 armed 相与。",
  ],
  [
    "Invert only b before combining all three conditions.",
    "只对 b 取反，再合并三个条件。",
  ],
  [
    "Chain XOR across the eight data bits; XOR the result with the received parity.",
    "把八个数据位串联异或，再与接收的校验位异或。",
  ],
  [
    "Let each higher request override the index chosen by lower requests.",
    "让较高编号的请求覆盖较低编号选出的编号。",
  ],
  [
    "Start with count=8; each active bit replaces it with the number of positions above that bit.",
    "先令 count=8，每个有效位把它替换为该位上方的位置数。",
  ],
  [
    "Connect split bit i to join bit 7−i.",
    "把拆分后的第 i 位接到合并器第 7−i 位。",
  ],
  [
    "Use the sign bit to choose between the original byte and its negation.",
    "用符号位选择原字节或其负值。",
  ],
  [
    "Use addition carry to select 255 instead of the wrapped sum.",
    "用加法进位选择 255，替代回绕后的和。",
  ],
  [
    "Create shifted partial products for each multiplier bit, then add them using sixteen-bit results.",
    "按乘数各位生成移位的部分积，再用十六位结果累加。",
  ],
  [
    "Shift dividend bits into a remainder; subtract the divisor when possible and record a quotient bit.",
    "把被除数的位依次移入余数，可减时减去除数，并记录商的一位。",
  ],
  [
    "One comparison can control both output selectors.",
    "一次比较可同时控制两个输出选择器。",
  ],
  ["Combine value≥low with value≤high.", "合并 value≥low 和 value≤high。"],
  [
    "For nonzero a, check whether a AND (a−1) is zero.",
    "a 非零时，检查 a 与 (a−1) 是否为零。",
  ],
  [
    "Build both rotations as wiring permutations, then select with right.",
    "分别通过重排连线构建两种循环移位，再由 right 选择。",
  ],
  [
    "Select loaded data or q−1, but hold q when it is already zero.",
    "选择载入数据或 q−1，但 q 已为零时保持。",
  ],
  [
    "Feed the highest bit back into bit 0 while shifting the rest left.",
    "其余位左移时，把最高位反馈到第 0 位。",
  ],
  [
    "Remember the previous pressed value. Count only pressed AND NOT previous.",
    "记住上一次 pressed，仅在 pressed 与 非 previous 时计数。",
  ],
  [
    "Use a shift register and a three-bit counter; publish the shifted byte on the eighth enabled step.",
    "使用移位寄存器和三位计数器，在第八个使能步发布字节。",
  ],
  [
    "Track occupancy and shift remaining bytes toward the head on pop.",
    "记录占用数量，弹出时将剩余字节移向队首。",
  ],
  [
    "Track occupancy; pushing writes the next slot and popping selects the previous one.",
    "记录占用数量，压入写入下一槽，弹出退回上一槽。",
  ],
  [
    "Store how many correct digits have arrived; advance only on enter.",
    "保存已收到几个正确数字，只在 enter 有效时前进。",
  ],
  [
    "Track the copy index, stop writes after index 3, and keep the completed flag set.",
    "记录复制位置，在位置 3 后停止写入，并保持完成标志。",
  ],
  [
    "Inspect the path from the decoded control bits to the module output.",
    "检查译码控制位到模块输出的路径。",
  ],
  [
    "Compare the accumulator's data and enable pins while executing LDI.",
    "执行 LDI 时，对照累加器的数据引脚与使能引脚。",
  ],
  [
    "Decode address 248 and use it to select the counter value instead of zero.",
    "译码地址 248，用它选择计数值而非零。",
  ],
  [
    "Use opcode, flags, phase, and halt as ROM address bits; pack control, active, and invalid into its data word.",
    "用操作码、标志、阶段和停机位组成 ROM 地址，将 control、active、invalid 放入数据字。",
  ],
  [
    "Keep a product and a remaining multiplier. Add one operand while decrementing the multiplier.",
    "保存乘积与剩余乘数，累加一个操作数并递减乘数。",
  ],
  [
    "Repeatedly subtract the smaller positive operand from the larger; handle zero before subtracting.",
    "反复用较大正数减去较小正数，减之前先处理零。",
  ],
  [
    "Keep the previous two values and update both without losing either old value.",
    "保存前两个数，更新时避免丢失任一旧值。",
  ],
  [
    "Compare adjacent pairs and swap when needed; repeat enough passes to move the largest values to the end.",
    "比较相邻数，必要时交换，重复多轮把较大的值移到末尾。",
  ],
  [
    "Only ASCII bytes 97–122 need conversion; subtract 32 from those bytes.",
    "仅 ASCII 97–122 需要转换，将这些字节减去 32。",
  ],
  [
    "Write x to F4, y to F5, then the pixel value to F6.",
    "把 x 写到 F4、y 写到 F5，再把像素值写到 F6。",
  ],
  [
    "Clear the old pixel before drawing the new one; reverse direction at either end.",
    "先清除旧像素，再绘制新像素，在两端改变方向。",
  ],
  [
    "Keep the total separate from the number being parsed; clear only the current number after each newline.",
    "将总数与正在解析的数分开保存，每次换行后只清空当前数。",
  ],
];
export const constructionHints: Record<string, Copy> = Object.fromEntries([
  ...core.map((v, i) => [`core-${String(i + 1).padStart(2, "0")}`, v]),
  ...projects.map((v, i) => [`project-${String(i + 1).padStart(2, "0")}`, v]),
]);
