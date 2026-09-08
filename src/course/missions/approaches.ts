import type { Copy } from "../types";
import type { MissionId } from "./types";

// Visible bridges at new construction techniques; hints are optional refinements.
export const missionApproaches: Partial<Record<MissionId, Copy>> = {
  "core-06": [
    "Start with NAND's 00 and 11 cases: they produce 1 and 0. If the same switch drives both inputs, those are the only cases possible. Connect a to both NAND inputs and test both switch values.",
    "先看与非门的 00 和 11：输出分别为 1 和 0。同一个开关驱动两个输入时，只会出现这两种情况。将 a 接到两个输入，并测试开关的两个值。",
  ],
  "core-08": [
    "Build the one case that must turn off: neither input is on. Invert each input so that this case becomes two ones; NAND then turns it off. Start with two of your NOT subcircuits feeding a NAND.",
    "先构建唯一需要关闭的情况：两个输入都没打开。分别取反后，这种情况变为两个 1，与非门会将它关闭。先放两个自定义非门，再接到与非门。",
  ],
  "core-09": [
    "Build XOR as two questions: is either input on (OR), and are both on (AND)? Invert the both-on answer with NOT, then AND it with the OR result. Start by placing your OR and AND subcircuits and feed a and b into both; a four-NAND design is optional.",
    "把异或拆成两个问题：是否至少一路打开（或），是否两路都打开（与）？用非门反转“两路都开”的答案，再与或门结果做与。先放自定义或门和与门，将 a、b 分别接入两者；四个与非门的设计是可选方案。",
  ],
  "core-11": [
    "Build one path at a time. AND a with NOT(sel), so only sel=0 lets a through; AND b with sel, so only sel=1 lets b through. OR the two paths together and test that changing the unselected input has no effect.",
    "一次构建一条路径。a 与 NOT(sel) 相与，让 sel=0 时才通过 a；b 与 sel 相与，让 sel=1 时才通过 b。将两条路径做或，并测试修改未选输入不会改变结果。",
  ],
  "core-17": [
    "Build one output condition first. To recognize selection 3 (011), require the top select bit to be off and the other two to be on: NOT(s2) AND s1 AND s0. Repeat this matching method for each output index, then join the eight results.",
    "先构建一个输出条件。识别选择 3（011）时，要求最高选择位关闭、另两位打开：NOT(s2) AND s1 AND s0。对每个输出编号重复这种匹配方法，再合并八个结果。",
  ],
  "core-18": [
    "Work on one segment, not the whole display. List the digits that light it; make an input-pattern match for each digit as in the previous decoder lesson, then OR those matches. Check that segment across all 16 inputs before copying the method to another segment.",
    "先做一段，不要一次构建整个显示器。列出点亮它的数字，像上一课的译码器一样为每个数字建立输入匹配，再将匹配结果做或。用全部 16 种输入检查这一段，再把方法用于其他段。",
  ],
  "core-19": [
    "Write the sum and carry columns separately for 00, 01, 10, 11. Sum is 1 for the mixed pairs—the XOR rule you built. Carry is 1 only for 11—the AND rule. Feed a and b to both subcircuits, then connect their separate outputs.",
    "为 00、01、10、11 分别写出和与进位两列。和只在输入不同时为 1，就是已构建的异或；进位只在 11 时为 1，就是与。将 a、b 同时接入这两个子电路，再分别连接输出。",
  ],
  "core-20": [
    "Reuse two half adders: the first adds a and b; the second adds that sum and cin. The second sum is the final sum. Either stage can produce a carry, so OR their carry outputs.",
    "复用两个半加器：第一个加 a、b，第二个加前一级的和与 cin。第二级的和就是最终的和。任一级都可能产生进位，因此将两个进位输出做或。",
  ],
  "core-21": [
    "Build the lowest two columns before expanding to eight. Set the first full adder's cin to 0 and connect its carry to the next one's cin. Split both input bytes, repeat for each position, and join only the sum bits; keep the last carry separate.",
    "先构建最低两列，再扩展到八列。第一个全加器的 cin 接 0，carry 接下一级的 cin。拆分两个输入字节并逐位重复，合并时只合并和位，最后的进位单独保留。",
  ],
  "core-25": [
    "Reuse your subtractor: its no-borrow carry is 0 when a is less than b, so invert it for less. For equal, XOR corresponding bits and OR the differences; invert that result so only no differences produces 1.",
    "复用减法器：a 小于 b 时，无借位进位为 0，取反可得到 less。判断 equal 时，逐位异或，再将差异做或；将结果取反，使没有差异时才为 1。",
  ],
  "core-27": [
    "Build and test each flag independently. For zero, OR all result bits and invert. For signed overflow, compare the two input sign bits and the result sign: equal input signs with a changed result sign indicate overflow. Take unsigned carry directly from the adder.",
    "分别构建并测试各标志。零标志：将结果各位做或后取反。有符号溢出：比较两个输入及结果的符号，同号输入产生异号结果时置位。无符号进位直接取自加法器。",
  ],
  "core-30": [
    "First connect and test one operation's output. Build the other candidate results alongside it, then use your selector to choose by op. The selector chooses a finished result; it does not perform the arithmetic.",
    "先连接并测试一种运算的输出，再并排构建其他候选结果，最后用已有选择器按 op 选择。选择器选择已计算的结果，本身不做算术。",
  ],
  "core-32": [
    "Start with two data bits and two flip-flops. Split the input, connect each bit to its own d, and share en and rst. After a clock step, join the q outputs in the original bit order; extend the same pattern to all eight bits.",
    "先用两个数据位和两个触发器。拆分输入，各位接到各自的 d，并共用 en、rst。推进时钟后，按原位序合并 q 输出，再将同样的结构扩展到八位。",
  ],
  "core-36": [
    "Keep the counter's storage and controls. Before its data input, add a selector between the incremented address and target, controlled by jump. Test normal counting, then jumping, then reset while jump is still on.",
    "保留计数器的存储和控制。在数据输入前加选择器，用 jump 选择递增后的地址或 target。先测试普通计数，再测试跳转，最后在 jump 仍打开时测试复位。",
  ],
  "core-38": [
    "Start with the read path: send the low address bits to both RAMs and use the top bit to select their outputs. For writes, combine write with that bank's selection condition so the other bank's write-enable stays off.",
    "先构建读取路径：低地址位接到两块 RAM，最高位选择其中一块的输出。写入时，将 write 与该区的选择条件相与，使另一区的写使能保持关闭。",
  ],
  "core-41": [
    "Use two stored bits for red=00, green=01, yellow=10. Write a next-state table: 00→01, 01→10, 10→00 when advance is on; otherwise keep the current code. Build that next-state logic before decoding the stored code into the three lights.",
    "用两位存储红=00、绿=01、黄=10。先写下一状态表：advance 打开时 00→01、01→10、10→00，否则保留当前值。先构建下一状态逻辑，再将已存状态译成三盏灯。",
  ],
  "core-42": [
    "Use three stored bits as a sliding window. On an enabled step, copy each old bit to the next position and put the new input in bit 0. Detect 101 with top AND NOT(middle) AND bottom; reset clears all three bits.",
    "用三个存储位组成滑动窗口。使能步到来时，各旧位移到下一位置，新输入放入第 0 位。用最高位 AND NOT(中间位) AND 最低位检测 101，复位时清空三位。",
  ],
  "core-45": [
    "Start with just the RAM-write bit in CPU reference → Clock and control bus. It needs an STA opcode match AND execute phase AND NOT(halt). Test that one condition before building the remaining control bits and joining them into the bus.",
    "从 CPU 参考的“时钟与控制总线”中单独取 RAM 写入位开始：它需要 STA 操作码匹配 AND 执行阶段 AND NOT(halt)。先测试这一条件，再构建其余控制位并合并为总线。",
  ],
  "core-46": [
    "Make a four-row command table with source, register-enable, and RAM-write columns. First wire the selector that chooses data or RAM for the register. Then wire permissions separately, checking that command 3 and reset cannot accidentally write RAM.",
    "为四种 command 列表，分成数据来源、寄存器使能、RAM 写入三列。先连接选择 data 或 RAM 作为寄存器输入的选择器，再单独连接许可，检查 command=3 和复位不会误写 RAM。",
  ],
  "core-48": [
    "Connect in stages: PC address → program ROM → instruction register → instruction fields. Then follow LDI through the operand selector into the accumulator, using CPU reference for control-bit positions. Add arithmetic, RAM, jumps, and output paths one at a time; Run tests checks the complete CPU.",
    "分阶段连接：PC 地址→程序 ROM→指令寄存器→指令字段。再追踪 LDI，从操作数选择器到累加器，并参照 CPU 参考中的控制位位置。逐一加入算术、RAM、跳转和输出路径；运行测试检查完整 CPU。",
  ],
  "core-52": [
    "Sketch two paths before writing instructions: zero outputs 0, nonzero outputs 1. Load RAM[0], branch to a zero label with JZ, and end each path with OUT and HLT so one path cannot fall through into the other.",
    "写指令前先画两条路径：为零输出 0，否则输出 1。载入 RAM[0]，用 JZ 跳到零分支标签，各分支均以 OUT、HLT 结束，避免一路继续执行另一路。",
  ],
  "core-53": [
    "Write a loop in plain words first: if remaining is zero, finish; otherwise decrement remaining, increment iterations, and repeat. Assign remaining to RAM[1] and iterations to RAM[2]. Check starting values 0 and 1 before trying a longer loop.",
    "先用文字写循环：剩余数为零则结束，否则剩余数减一、次数加一并重复。用 RAM[1] 保存剩余数、RAM[2] 保存次数。先检查初值 0、1，再尝试更长循环。",
  ],
  "core-55": [
    "Start with one device address from CPU reference. Separate address-match, read permission, and write permission; only then combine them. Add keyboard consumption last, using the same one-access timing as a memory read so polling status never removes data.",
    "先从 CPU 参考中的一个设备地址开始。分开构建地址匹配、读取许可和写入许可，再将它们组合。最后加入键盘消耗动作，采用与存储读取一致的单次访问时序，避免查询状态时取走数据。",
  ],
  "core-57": [
    "Reuse the keyboard polling loop, but keep a separate numeric total. The CPU has no multiply instruction: form total×10 as total×8 + total×2 using shifts and addition. Read one character at a time, stop at newline, and only convert digit characters.",
    "复用键盘轮询循环，但单独保存数值总和。CPU 没有乘法指令，可用移位和加法构成 总和×8 + 总和×2，得到乘十。逐个读取字符，换行时结束，只转换数字字符。",
  ],
  "core-58": [
    "The CPU has no divide instruction. Count how many times 100 can be subtracted, then do the same with 10 on the remainder; what remains is units. Track whether a digit has been printed so leading zeroes can be skipped while the units digit is always printed.",
    "CPU 没有除法指令。先统计可减去多少次 100，再对余数统计可减去多少次 10，剩下的就是个位。记录是否已输出数字，以跳过前导零，但始终输出个位。",
  ],
  "core-59": [
    "Keep the supplied input and formatting code. Test addition separately with a small sum, then 255+1 to exercise the carry byte. For subtraction, decide the sign before formatting the magnitude; do not pass a wrapped negative byte to the unsigned formatter.",
    "保留已提供的输入和格式化代码。先用小数值单独测试加法，再用 255+1 检查进位字节。减法先确定符号再格式化绝对值，不要把回绕后的负数字节传给无符号格式化器。",
  ],
  "project-05": [
    "Translate 'at least two' into the pairs ab, ac, and bc. Build an AND for each pair, then OR their results. Check 111 as well as the three two-on cases.",
    "将“至少两个”拆成 ab、ac、bc 三对，各对使用与门，再将结果做或。除三种两路打开情况外，也检查 111。",
  ],
  "project-06": [
    "List the three accepted patterns: 001, 010, 100. For each, invert the inputs that must be zero and AND all three conditions. OR the three matches; this is pattern matching, not three-input XOR.",
    "列出三种可接受模式：001、010、100。每种都将要求为零的输入取反，再将三个条件做与。对三个匹配做或，这是模式匹配，不是三输入异或。",
  ],
  "project-10": [
    "Begin with requests 0 and 1: select index 1 when request 1 is on. Add higher requests one at a time, letting each replace the previous result. OR all requests to make valid; no requests must still give index 0.",
    "先处理请求 0、1，请求 1 打开时选编号 1。逐个加入更高请求，让它覆盖之前结果。所有请求做或得到 valid，没有请求时编号仍须为 0。",
  ],
  "project-11": [
    "Reuse the highest-active-bit idea from the priority encoder. For an eight-bit input, a highest set bit at position k means 7−k leading zeroes. Handle the no-active-bit case separately with count 8.",
    "复用优先编码器寻找最高有效位的思路。八位输入的最高置位在第 k 位时，前导零为 7−k。没有有效位时单独输出计数 8。",
  ],
  "project-15": [
    "First multiply by just one multiplier bit: choose either zero or the other operand. Repeat for all eight multiplier bits, shift each contribution by its position, and add them with 16-bit paths so high bits are not lost.",
    "先乘一个乘数位：选择零或另一操作数。对八个乘数位重复，各份按位的位置移位，并用 16 位路径相加以免丢失高位。",
  ],
  "project-16": [
    "Use binary long division: bring down one dividend bit, compare the partial remainder with the divisor, and subtract if it fits; that comparison produces one quotient bit. Repeat from the highest bit downward. Keep enough width for the shifted remainder and select the specified special outputs when the divisor is zero.",
    "使用二进制长除法：移入一位被除数，将部分余数与除数比较，能减则减，这次比较产生一位商。从最高位向下重复，为移位后的余数保留足够位宽，除数为零时选择任务指定的特殊输出。",
  ],
  "project-19": [
    "Compare 8 (1000) with 7 (0111): their AND is zero. Subtracting one from a single-set-bit value changes that bit to zero and every lower bit to one. Build a AND (a−1), detect zero, and also require a itself to be nonzero.",
    "比较 8（1000）与 7（0111），它们相与为零。单个置位的数减一，会将该位变零、所有低位变一。构建 a AND (a−1) 并检测零，同时要求 a 本身非零。",
  ],
  "project-24": [
    "Separate three jobs: shift incoming bits, count accepted bits, and publish a completed byte. On the eighth enabled step, publish the value including that new bit, not the old shift register. Clear ready on the following step so it is a pulse.",
    "分成三个工作：移入输入位、统计接收位数、发布完整字节。第八个使能步发布的值须包含新位，不能取旧移位寄存器。下一步清除 ready，使它成为脉冲。",
  ],
  "project-25": [
    "Use four byte registers and a count from 0 to 4. A push writes the next free slot; a pop shifts later bytes toward slot 0. Decide pop priority before changing registers or count, and block operations at empty/full boundaries.",
    "使用四个字节寄存器及 0 到 4 的计数。压入写到下一个空槽，弹出时后续字节向槽 0 移动。改变寄存器或计数前先判断弹出优先级，并在空、满边界阻止非法操作。",
  ],
  "project-26": [
    "Reuse four byte registers and an occupancy count. Unlike the queue, popping does not shift the contents: the top is slot count−1. Use that index for the output, and apply pop priority and empty/full checks before updating the count.",
    "复用四个字节寄存器与占用计数。与队列不同，弹出不移动内容，栈顶就是 count−1 槽。用该编号选择输出，并在更新计数前处理弹出优先及空、满检查。",
  ],
  "project-27": [
    "Draw states for waiting for 1, waiting for 2, waiting for 3, and unlocked. Add an arrow for a correct entered digit and a restart arrow for a wrong one. Turn that table into next-state logic feeding a register; no enter means hold.",
    "画出等待 1、等待 2、等待 3、已解锁四种状态。为正确提交的数字画前进箭头，为错误数字画重启箭头。将表转为接入寄存器的下一状态逻辑，没有 enter 时保持。",
  ],
  "project-32": [
    "Treat each ROM address as one row of the control truth table. Use CPU reference to unpack its opcode, phase, flags, and halt bits, calculate the required control outputs, then pack those outputs into the data word. Check one fetch row and one execute row before filling the table.",
    "把每个 ROM 地址视为控制真值表的一行。参照 CPU 参考拆出操作码、阶段、标志和停机位，计算所需控制输出，再打包为数据字。填满表前，先检查一个取指行和一个执行行。",
  ],
  "project-34": [
    "Store both inputs in separate RAM locations. Handle a zero input first; otherwise compare the pair and subtract the smaller from the larger until they match. Trace 12 and 8 on paper before translating each decision into loads, branches, and stores.",
    "将两输入保存在不同 RAM 位置。先处理零输入，否则比较两数，用较大值减较小值直到相同。先在纸上推导 12 和 8，再把每次判断转成载入、分支和存储。",
  ],
  "project-36": [
    "For four items, compare pairs (0,1), (1,2), (2,3); this moves a largest value to the end. Repeat that pass three times. Write and test one swap using a temporary RAM location before building the passes.",
    "四个元素依次比较 (0,1)、(1,2)、(2,3)，可把一个最大值移到末尾。重复三轮。先用临时 RAM 位置编写并测试一次交换，再构建多轮比较。",
  ],
  "project-40": [
    "Reuse the decimal parser but assign separate RAM locations to the current number and the running total. At newline, add the number to the total and output it; reset only the current number before reading the next line.",
    "复用十进制解析器，但为当前数值与累计总和分配不同 RAM 位置。换行时将当前数加入总和并输出，只清空当前数后再读下一行。",
  ],
};
