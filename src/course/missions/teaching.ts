import type { Copy } from "../types";
import type { MissionId } from "./types";

export type Teaching = { concept: Copy; example: Copy };
const lesson = (concept: Copy, example: Copy): Teaching => ({
  concept,
  example,
});
const core: Teaching[] = [
  lesson(
    [
      "A bit is either 0 (off) or 1 (on). An input supplies a value; an output shows the result. A wire carries a value from a component's output pin to another component's input pin.",
      "一个位只能是 0（关）或 1（开）。输入提供数值，输出显示结果。导线把一个元件输出引脚的值传给另一个元件的输入引脚。",
    ],
    [
      "If an input changes from 0 to 1, a directly connected output changes to 1 too. Names such as a and out are labels, not operations.",
      "输入从 0 变为 1 时，直接连接的输出也变为 1。a、out 是名称，不是运算。",
    ],
  ),
  lesson(
    [
      "A signal can branch. Connecting one output pin to two input pins copies the same bit to both; it does not divide the value.",
      "信号可以分支。把一个输出引脚接到两个输入引脚，会把同一个位传给两处，不会把数值分成两半。",
    ],
    [
      "A switch can control two indicators: when it is 1, both receive 1. Start each branch at the source pin.",
      "一个开关可以控制两个指示器：开关为 1 时，两处都收到 1。每条分支都从信号源引脚开始连接。",
    ],
  ),
  lesson(
    [
      "A logic gate turns input bits into an output using a rule. AND outputs 1 only when both inputs are 1. With two inputs there are four combinations: 00, 01, 10, 11.",
      "逻辑门按照规则把输入位变成输出。AND（与门）只在两个输入都为 1 时输出 1。两个输入共有 00、01、10、11 四种组合。",
    ],
    [
      "Think of two permissions: a door opens only when both are granted. With a=1 and b=0, AND outputs 0. In 10, the first digit is a and the second is b.",
      "想象开门需要两项许可，缺一不可。a=1、b=0 时，与门输出 0。10 中第一个数字表示 a，第二个表示 b。",
    ],
  ),
  lesson(
    [
      "NOT is a one-input gate that flips a bit: 0 becomes 1 and 1 becomes 0. Flipping a bit is also called inversion.",
      "NOT（非门）只有一个输入，会翻转位：0 变 1，1 变 0。这也叫取反。",
    ],
    [
      "A 'door closed' indicator can use NOT on a 'door open' signal. When open is 1, closed is 0.",
      "“门已关闭”指示器可以对“门已打开”信号取反。打开为 1 时，关闭为 0。",
    ],
  ),
  lesson(
    [
      "Gates can be connected in sequence: one gate's result becomes the next gate's input. NAND means NOT AND: apply AND, then flip its result.",
      "逻辑门可以串接：前一个门的结果作为后一个门的输入。NAND（与非）就是先做 AND，再对结果取反。",
    ],
    [
      "For inputs 0 and 1, AND gives 0, then NOT turns that into 1. Trace one gate at a time instead of guessing the whole circuit.",
      "输入为 0 和 1 时，与门得到 0，非门再把它变为 1。逐个门推导，比直接猜整个电路更容易。",
    ],
  ),
  lesson(
    [
      "The same behavior can have different circuit designs. NAND alone can build every logic rule in this course. Here, use it to reproduce NOT, also called an inverter: its output is the opposite of its input.",
      "同一种行为可以用不同电路实现。只用与非门，就能构建课程中的各种逻辑规则。这里用它重现非门（也叫反相器）：输出与输入相反。",
    ],
    [
      "After passing a mission, its circuit is saved as a reusable part under Components → Your subcircuits. A part's pins keep the same meaning even when its inside circuit is hidden.",
      "任务通过后，电路会保存为可复用元件，位于“元件”中的“自定义子电路”。即使内部电路隐藏了，引脚的含义也不变。",
    ],
  ),
  lesson(
    [
      "NAND and AND differ only in their final answer. Flipping a bit twice restores the original bit. Use that relationship to reason about combining gates.",
      "与非和与只差最后一次取反。一个位翻转两次会恢复原值，可以用这个关系推导门的组合。",
    ],
    [
      "Start with 0: NOT gives 1, and a second NOT gives 0 again. Check the same reasoning starting with 1.",
      "从 0 开始：取反得到 1，再取反就回到 0。再从 1 开始验证同样的规律。",
    ],
  ),
  lesson(
    [
      "OR means at least one input is 1. Unlike AND, either input can turn it on; both on also counts. You can combine the gates you built instead of starting from individual NANDs.",
      "OR（或）表示至少一个输入为 1。与 AND 不同，任一输入都能打开输出，两个都打开也算。可以组合已构建的门，不必总从单个与非门开始。",
    ],
    [
      "Two alarm sensors use OR: a=0, b=1 must sound the alarm, and a=1, b=1 must sound it too.",
      "两个报警传感器使用或逻辑：a=0、b=1 时报警；a=1、b=1 时也报警。",
    ],
  ),
  lesson(
    [
      "XOR (exclusive OR) means the inputs differ. Exactly one input must be 1. OR and XOR agree except when both inputs are 1.",
      "XOR（异或）表示输入不同，必须恰好一个输入为 1。或与异或仅在两个输入都为 1 时结果不同。",
    ],
    [
      "Trace 11 through OR AND NOT(AND): OR=1, AND=1, NOT=0, so the final output is 0. For 01: OR=1, AND=0, NOT=1, so the output is 1. Now check 00 and 10 yourself.",
      "沿 OR AND NOT(AND) 推导 11：或=1，与=1，非=0，最终输出为 0。对于 01：或=1，与=0，非=1，输出为 1。再自己检查 00 和 10。",
    ],
  ),
  lesson(
    [
      "XNOR is the opposite of XOR: it detects matching inputs. Matching includes two zeroes as well as two ones.",
      "XNOR（同或）与异或相反，用来检测相同输入。两个 0 和两个 1 都算相同。",
    ],
    [
      "A one-bit equality check reports 1 for 00 and 11, and 0 for 01 and 10.",
      "单个位的相等判断在 00、11 时报告 1，在 01、10 时报告 0。",
    ],
  ),
  lesson(
    [
      "A multiplexer, or selector, chooses which data input reaches the output. sel is the choice bit, not data to be copied. AND can block a path when its other input is 0.",
      "多路选择器决定哪路数据传到输出。sel 是选择位，不是要复制的数据。与门的一个输入为 0 时，可以阻断另一路信号。",
    ],
    [
      "If a=1 and b=0, choosing a gives 1 and choosing b gives 0. Changing the input that is not selected must have no effect.",
      "a=1、b=0 时，选择 a 得到 1，选择 b 得到 0。修改未被选中的输入不应影响输出。",
    ],
  ),
  lesson(
    [
      "Two choice bits describe four choices. Read them in order: 00 is first, 01 second, 10 third, 11 fourth. A larger selector can be built from smaller selectors.",
      "两个选择位可以表示四种选择：00 第一、01 第二、10 第三、11 第四。较大的选择器可以由较小的选择器组合而成。",
    ],
    [
      "Choose one item from four by first choosing within each pair, then choosing between the two pair results.",
      "从四项中选一项，可以先在每对中各选一项，再从两个结果中选择。",
    ],
  ),
  lesson(
    [
      "Binary writes numbers using only 0 and 1. From right to left, bit positions are worth 1, 2, 4, 8… Add the values of positions containing 1. A bus carries several bits together; its width is its number of bits.",
      "二进制只用 0 和 1 表示数。从右到左，各位分别值 1、2、4、8……把为 1 的位所代表的值相加。总线把多个位一起传递，位宽就是位的数量。",
    ],
    [
      "Binary 0101 is 4+1=5. b0 is the rightmost bit, worth 1. Bus joiner combines separate bits into a bus; Bus splitter separates a bus into bits. Connected pins need equal widths.",
      "二进制 0101 是 4+1=5。b0 是最右位，值 1。合并器把分开的位组成总线，拆分器把总线拆成各个位。相连引脚的位宽必须相同。",
    ],
  ),
  lesson(
    [
      "A byte is eight bits, worth 0–255 as an unsigned number. Its low four bits are the right half; its high four bits are the left half. Splitting and joining changes grouping, not bit values.",
      "一个字节是八个位，按无符号数解释时范围为 0–255。低四位是右半部分，高四位是左半部分。拆分和合并改变分组，不改变各位的值。",
    ],
    [
      "For 1010 0011, the high half is 1010 and the low half is 0011. Swapping halves gives 0011 1010. Set Bus splitter and Bus joiner widths in the selected component's properties.",
      "1010 0011 的高半部为 1010，低半部为 0011。交换后得到 0011 1010。选中拆分器或合并器，在属性中设置位宽。",
    ],
  ),
  lesson(
    [
      "Bitwise logic applies a one-bit gate rule separately at each matching position. A result at one position does not carry into the next position.",
      "按位逻辑在每对相同位置上独立应用单比特门的规则，一个位置的结果不会进位到另一个位置。",
    ],
    [
      "For four bits, 1010 AND 1100 gives 1000. Compare one column at a time. The same rule works for eight bits.",
      "四个位的例子：1010 与 1100 得到 1000。逐列比较即可，八个位也是同样的规则。",
    ],
  ),
  lesson(
    [
      "Selecting a byte means choosing all eight bits from the same input. One choice bit can control several one-bit selectors together.",
      "选择一个字节，就是从同一输入选择全部八个位。一个选择位可以同时控制多个单比特选择器。",
    ],
    [
      "Choosing between bytes 12 and 200 must produce either 12 or 200, never a mixture of their bits.",
      "在字节 12 和 200 之间选择，结果必须是 12 或 200，不能混合两者的位。",
    ],
  ),
  lesson(
    [
      "A decoder turns a binary choice into one active output position. Three bits represent eight choices; one-hot means exactly one output bit is 1.",
      "译码器把二进制选择变成一个有效输出位置。三个位表示八种选择；独热表示恰好一个输出位为 1。",
    ],
    [
      "Choice 3 activates bit 3: 00001000, whose numeric value is 8. The selected bit's position and the bus's numeric value are different things.",
      "选择 3 会启用第 3 位：00001000，数值是 8。选中位的位置和总线的数值不是同一件事。",
    ],
  ),
  lesson(
    [
      "Hexadecimal uses digits 0–9 and A–F for values 0–15. Each digit fits four bits. A seven-segment display draws a digit by lighting selected bars; each bar needs its own yes/no rule.",
      "十六进制用 0–9、A–F 表示 0–15，每个数字占四个位。七段显示器通过点亮若干条横竖段显示数字，每段都需要自己的开关规则。",
    ],
    [
      "A represents 10 (binary 1010). To draw 1, light the two right-hand bars. Think about one segment across all digits before building the next segment.",
      "A 表示 10（二进制 1010）。显示 1 时点亮右侧两段。先考虑一段在各数字中是否点亮，再处理下一段。",
    ],
  ),
  lesson(
    [
      "Binary addition carries after 1+1, just as decimal carries after 9+1. The sum bit stays in the current column; carry goes to the next column. A half adder adds two bits.",
      "二进制在 1+1 时进位，就像十进制在 9+1 时进位。sum 留在当前位，carry 传到下一位。半加器用于相加两个位。",
    ],
    [
      "1+1 is binary 10: carry=1, sum=0. Read the two outputs together as carry×2 + sum, which is 2.",
      "1+1 的二进制是 10：carry=1、sum=0。两个输出合起来是 carry×2 + sum，也就是 2。",
    ],
  ),
  lesson(
    [
      "A full adder includes an incoming carry, cin, from the previous column. It adds three bits and produces a sum bit plus an outgoing carry.",
      "全加器还接收前一位传来的进位 cin。它相加三个位，产生一位和与一个向外进位。",
    ],
    [
      "1+0+1 equals 2, so the outputs are carry=1 and sum=0. The carry input has the same value as either other input in this column.",
      "1+0+1 等于 2，因此 carry=1、sum=0。在当前列中，进位输入与另两个输入同样都表示 1。",
    ],
  ),
  lesson(
    [
      "Multi-bit addition repeats the same column rule from the lowest bit upward. A carry becomes the next column's incoming carry. Reuse the full adder you already built.",
      "多位加法从最低位向上重复同一规则：每一位的进位成为下一位的输入进位。可以复用已经构建的全加器。",
    ],
    [
      "For four bits, 0111+0001=1000: the carry passes through three columns. An eight-bit result needs a separate ninth carry bit when it exceeds 255.",
      "四位例子中，0111+0001=1000，进位传过三列。八位结果超过 255 时，需要单独的第九位进位。",
    ],
  ),
  lesson(
    [
      "An incrementer adds exactly one. Fixed values come from Constant components; choose the value and width in their properties.",
      "递增器每次恰好加一。固定数值由常量元件提供，可以在属性中设置数值和位宽。",
    ],
    [
      "An eight-bit counter goes from 254 to 255, then from 255 to 0 with carry=1 because only eight result bits fit.",
      "八位计数从 254 到 255，再从 255 回到 0 并产生 carry=1，因为结果只容纳八个位。",
    ],
  ),
  lesson(
    [
      "Bits do not have a sign by themselves. In eight-bit two's complement, 0–127 are nonnegative and patterns 128–255 mean −128 to −1. Negation flips all bits and adds one.",
      "位本身没有正负。八位补码中，0–127 表示非负数，128–255 的位模式表示 −128 到 −1。取负的方法是所有位取反再加一。",
    ],
    [
      "5 is 00000101. Its negative is 11111011: the same bits show as unsigned 251 or signed −5. Zero negates to zero after discarding extra carry.",
      "5 是 00000101，负数是 11111011。同样的位按无符号显示为 251，按有符号解释为 −5。零取负并舍弃额外进位后仍是零。",
    ],
  ),
  lesson(
    [
      "Subtracting b is adding its two's-complement negative. Modulo 256 means keep the low eight bits, wrapping at 256. Unsigned carry reports whether a borrow was avoided.",
      "减去 b 等于加上 b 的补码负值。对 256 取模就是保留低八位，越过 256 时回绕。无符号进位表示是否无需借位。",
    ],
    [
      "3−5 becomes 254 in eight bits, the pattern for signed −2. Because unsigned 3 is smaller than 5, this subtraction needs a borrow, so carry=0.",
      "3−5 的八位结果是 254，也是有符号 −2 的位模式。无符号 3 小于 5，需要借位，因此 carry=0。",
    ],
  ),
  lesson(
    [
      "A comparison produces yes/no bits rather than a numeric difference. Unsigned means every bit contributes a positive place value, giving the range 0–255.",
      "比较产生的是是或否的位，而不是数值差。无符号表示每个位都按正的位权计值，范围为 0–255。",
    ],
    [
      "For a=7 and b=9, 'less' is 1 and 'equal' is 0. Equal numbers are not less than each other.",
      "a=7、b=9 时，“小于”为 1，“相等”为 0。相等的数不互相小于。",
    ],
  ),
  lesson(
    [
      "Signed comparison interprets the highest bit as part of a two's-complement sign. A pattern with top bit 1 is negative, even if its unsigned display looks large.",
      "有符号比较按补码解释最高位的符号。最高位为 1 的模式表示负数，即使无符号显示的数字很大。",
    ],
    [
      "11111111 means −1, so it is less than 00000001 (1). Comparing their unsigned values, 255 and 1, would give the wrong signed answer.",
      "11111111 表示 −1，小于 00000001（1）。若比较无符号值 255 和 1，就会得出错误的有符号结论。",
    ],
  ),
  lesson(
    [
      "Flags are extra yes/no results. Zero reports an all-zero result; carry reports unsigned overflow; signed overflow reports that a signed result is outside −128…127. Carry and signed overflow answer different questions.",
      "标志是额外的是或否结果。零标志表示结果全零；进位表示无符号溢出；有符号溢出表示结果超出 −128…127。进位与有符号溢出回答不同的问题。",
    ],
    [
      "127+1 produces bits for 128: no unsigned carry, but signed overflow because positive 128 does not fit. 255+1 produces 0 with unsigned carry.",
      "127+1 得到 128 的位模式：没有无符号进位，但正 128 无法表示，因此有符号溢出。255+1 得到 0 并产生无符号进位。",
    ],
  ),
  lesson(
    [
      "Shifting moves bit positions. A left shift doubles an unsigned value if no high bit is lost; a right shift divides by two and discards the remainder. Vacated positions need explicit values.",
      "移位改变位的位置。左移在不丢失高位时相当于无符号数乘二；右移相当于除二并舍弃余数。空出的位需要明确填值。",
    ],
    [
      "Four-bit 0011 shifted left is 0110 (3→6). Shifted right it is 0001 (3→1). These are rewired bit positions, not a change of bus width.",
      "四位 0011 左移得到 0110（3→6），右移得到 0001（3→1）。这是重新连接位的位置，不是改变总线位宽。",
    ],
  ),
  lesson(
    [
      "An arithmetic right shift preserves a signed number's sign by copying its highest bit into the vacant position. Filling with zero would make negative values positive.",
      "算术右移把原最高位复制到空位，保留有符号数的正负。若填入零，负数就会变成正数。",
    ],
    [
      "Eight-bit −4 is 11111100. Arithmetic right shift gives 11111110 (−2); filling with zero gives 01111110 (126).",
      "八位 −4 是 11111100。算术右移得到 11111110（−2）；填零则得到 01111110（126）。",
    ],
  ),
  lesson(
    [
      "An arithmetic logic unit (ALU) offers several calculations and selects one result. The operation code, op, is a choice number, like sel in a multiplexer.",
      "算术逻辑单元（ALU）提供多种运算并选出一个结果。操作码 op 是选择编号，类似多路选择器的 sel。",
    ],
    [
      "For inputs 6 and 2, addition gives 8 and subtraction gives 4. The op input decides which candidate appears at the output.",
      "输入为 6 和 2 时，加法得到 8，减法得到 4。op 决定输出哪一个候选结果。",
    ],
  ),
  lesson(
    [
      "Gates react to current inputs; memory also remembers the past. A flip-flop stores one bit. d is the next data, q the stored output, en enables capture, and rst requests reset. Capture happens on a clock step.",
      "逻辑门响应当前输入，存储还会记住过去。触发器存储一个位：d 是待存数据，q 是已存输出，en 允许载入，rst 请求复位。数据在时钟步到来时才载入。",
    ],
    [
      "Starting with q=0, en=1 and rst=0, change d to 1: q stays 0. Choose Advance clock and q becomes 1. Hold en at 0 to keep q unchanged; reset takes priority on a step.",
      "从 q=0、en=1、rst=0 开始，把 d 改为 1，q 仍为 0。点击“推进时钟”后 q 才变为 1。en=0 会保持 q；时钟步到来时复位优先。",
    ],
  ),
  lesson(
    [
      "A register stores several bits together. Eight one-bit flip-flops sharing a clock act as one byte of storage. Data changes now; stored outputs change at the next capture.",
      "寄存器一起存储多个位。八个共享时钟的单比特触发器可以存储一个字节。数据可以先改变，已存输出要到下一次载入时才改变。",
    ],
    [
      "To store 5 (00000101), the eight flip-flops capture the eight positions simultaneously. Keep the original bit order when joining q outputs.",
      "存储 5（00000101）时，八个触发器同时载入各自位置的位。合并 q 输出时要保持原位序。",
    ],
  ),
  lesson(
    [
      "Enable and reset decide whether storage loads, holds, or clears. Their priority matters: reset wins over enable. A clock step is required for these storage changes.",
      "使能和复位决定存储载入、保持还是清零。优先级很重要：复位优先于使能。这些存储变化都需要时钟步。",
    ],
    [
      "If q is 9 and en=0, changing data to 4 still leaves q=9 after a step. With rst=1, the next step clears q even when en=0.",
      "q 为 9、en=0 时，将 data 改为 4 后推进时钟，q 仍为 9。rst=1 时，即使 en=0，下一步也会清空 q。",
    ],
  ),
  lesson(
    [
      "A counter feeds a stored value through an incrementer and back into storage. This feedback is safe because storage separates the old value from the next value.",
      "计数器把已存值经过递增器反馈到存储输入。存储把旧值与下一次值分隔开，因此这样的反馈可以工作。",
    ],
    [
      "At q=2, the input calculation is 3. One enabled clock step stores 3; only then does the next calculation become 4.",
      "q=2 时，输入计算结果为 3。一个使能的时钟步保存 3，之后下一次计算结果才变为 4。",
    ],
  ),
  lesson(
    [
      "An accumulator keeps a running total: add new data to the stored total, then store that sum. The adder sees the old total during the clock step.",
      "累加器保存累计值：把新数据与已存总数相加，再保存和。时钟步采样时，加法器使用的是旧总数。",
    ],
    [
      "Starting at 0, capturing data 3 then 4 gives totals 3 then 7. Holding enable off pauses accumulation without losing the total.",
      "从 0 开始，先后载入数据 3 和 4，总数变为 3、7。关闭使能可以暂停累加，并保留总数。",
    ],
  ),
  lesson(
    [
      "A program counter stores an address. Usually it increments; a jump replaces it with a chosen target. This combines the counter, selector, and reset behavior you already built.",
      "程序计数器保存地址，通常递增；跳转时则改为指定目标。它组合了已学的计数、选择和复位行为。",
    ],
    [
      "From address 8, a normal step goes to 9. A jump to target 20 goes to 20 instead. Reset selects 0 regardless of the target.",
      "从地址 8 正常推进到 9；跳转目标为 20 时则转到 20。复位不管目标是多少都选择 0。",
    ],
  ),
  lesson(
    [
      "RAM is a collection of stored values selected by address. The address chooses a location; data is the value stored there. we (write enable) allows a clock step to replace that location.",
      "RAM 是按地址选择的一组存储值。地址决定位置，data 是该位置的数据。we（写使能）允许在时钟步到来时替换那个位置的值。",
    ],
    [
      "Writing 42 to address 3 does not mean storing the number 3. Reading address 3 later returns 42; other locations keep their values.",
      "把 42 写到地址 3，不是存储数字 3。以后读取地址 3 会得到 42，其他位置保留原值。",
    ],
  ),
  lesson(
    [
      "Memory banks divide a larger address space into smaller memories. High address bits choose the bank; low bits choose a location inside it. Only the chosen bank may write.",
      "存储区把较大的地址空间分为较小内存。高地址位选择存储区，低位选择区内位置。只有被选中的区可以写入。",
    ],
    [
      "Address binary 101 in two four-location banks selects bank 1 and location 01. The low two bits alone cannot tell the banks apart.",
      "两个各有四个位置的存储区中，地址二进制 101 选择区 1、位置 01。仅凭低两位无法区分两个区。",
    ],
  ),
  lesson(
    [
      "ROM is a lookup table: an address selects a value prepared in advance. Unlike RAM, the circuit does not write new values into it during execution.",
      "ROM 是查找表，地址选择预先设置的值。与 RAM 不同，电路运行时不会把新值写入 ROM。",
    ],
    [
      "A table can map address 0 to 10 and address 1 to 20. The output is the table entry, not the address. Select ROM to inspect its stored image.",
      "表可以让地址 0 对应 10、地址 1 对应 20。输出是表中数据，不是地址。选中 ROM 可以查看其存储内容。",
    ],
  ),
  lesson(
    [
      "A shared bus needs sources that can disconnect. A tri-state buffer drives data when enabled and otherwise releases the wire (Z). X means no definite value, including conflicting drivers.",
      "共享总线需要能够断开连接的信号源。三态缓冲器启用时驱动数据，否则释放导线（Z）。X 表示无法确定数值，包括多个源冲突的情况。",
    ],
    [
      "Two disabled buffers leave the bus at Z. If one drives 0 and the other drives 1, the bus is X. Z is disconnected, not the number zero.",
      "两个缓冲器都关闭时，总线为 Z。一个驱动 0、另一个驱动 1 时，总线为 X。Z 表示断开，不是数字零。",
    ],
  ),
  lesson(
    [
      "A state machine remembers which stage it is in and uses inputs to choose the next stage. Outputs describe the current state. Reset selects a known starting state.",
      "状态机记住当前处于哪一阶段，并根据输入选择下一阶段。输出描述当前状态，复位选择已知起点。",
    ],
    [
      "A three-stage sequence can encode stages as 00, 01, 10. A selector calculates the next code; a register remembers it on a clock step.",
      "三阶段序列可以编码为 00、01、10。选择器计算下一个编码，寄存器在时钟步到来时记住它。",
    ],
  ),
  lesson(
    [
      "Recognizing a sequence requires history. A shift register remembers recent bits by moving each stored bit one position when a new bit arrives. The oldest bit is discarded.",
      "识别序列需要历史。移位寄存器在新位到来时把已存位移动一个位置，记住最近的位，并丢弃最早的位。",
    ],
    [
      "Remembering three bits, input 1,1,0,1 leaves the latest history 101. Compare the stored history after each enabled clock step.",
      "记住三个位时，依次输入 1、1、0、1，最后历史为 101。在每个使能的时钟步后比较已存历史。",
    ],
  ),
  lesson(
    [
      "A CPU follows instructions stored as numbers. An instruction contains an opcode (which action) and an operand (which value or address). Decoding fields means separating these pieces, not executing them yet.",
      "CPU 按存储为数字的指令工作。指令包含 opcode（执行什么操作）和 operand（使用哪个值或地址）。拆解字段只是分开这两部分，还没有执行。",
    ],
    [
      "In instruction 0x0107, the high byte 01 means load a value and the low byte 07 is that value. The 0x prefix means hexadecimal. CPU reference lists the instruction meanings.",
      "指令 0x0107 中，高字节 01 表示载入数值，低字节 07 是该数值。0x 前缀表示十六进制。“CPU 参考”列出了各指令含义。",
    ],
  ),
  lesson(
    [
      "Fetching copies the instruction at a program address from ROM into a register. The instruction register keeps it stable while other CPU parts carry out the operation.",
      "取指把程序地址对应的 ROM 指令复制到寄存器。指令寄存器保持它不变，让其他 CPU 部分完成操作。",
    ],
    [
      "If ROM[2] contains 0x0107, fetching address 2 makes the instruction register hold 0x0107. The stored instruction is different from its address, 2.",
      "ROM[2] 为 0x0107 时，取地址 2 的指令会让指令寄存器保存 0x0107。已存指令不同于它的地址 2。",
    ],
  ),
  lesson(
    [
      "A controller translates the current instruction into yes/no permissions to load registers, write memory, or jump. Phase distinguishes fetching from executing. Flags remember facts such as a previous zero result.",
      "控制器把当前指令翻译为载入寄存器、写内存或跳转的开关许可。phase 区分取指与执行阶段，标志记住先前结果是否为零等信息。",
    ],
    [
      "STA permits a memory write during execute, but not during fetch or after halt. In CPU reference, Clock and control bus gives the exact condition for each output bit.",
      "STA 在执行阶段允许写内存，但在取指或停机后不允许。“CPU 参考”的“时钟与控制总线”给出了各输出位的确切条件。",
    ],
  ),
  lesson(
    [
      "A data path moves values between storage and calculation. Control signals choose the source and which destination may capture it. Keep 'where data comes from' separate from 'when it is written'.",
      "数据通路在存储与运算之间移动数值。控制信号选择来源，并决定哪个目标可以载入。要分清数据来自哪里和何时写入。",
    ],
    [
      "Copying a register to RAM requires the register value at RAM's data pin, the intended address, and write permission on the same clock step.",
      "将寄存器复制到 RAM，需要寄存器值到达 RAM 数据引脚，地址正确，并在同一个时钟步允许写入。",
    ],
  ),
  lesson(
    [
      "A conditional jump changes the next program address only if a flag meets a condition. The controller asks both which jump instruction this is and whether its condition is true.",
      "条件跳转只在标志满足条件时改变下一程序地址。控制器同时判断是哪种跳转指令，以及条件是否成立。",
    ],
    [
      "JZ jumps when zero=1. With zero=0 it continues normally, even though the operand still contains a target address.",
      "JZ 在 zero=1 时跳转；zero=0 时正常继续，即使操作数中仍有目标地址。",
    ],
  ),
  lesson(
    [
      "A CPU combines the blocks you built: PC chooses an instruction, IR holds it, control chooses actions, and the ALU and registers process data. Follow one instruction through fetch and execute before testing a whole program.",
      "CPU 组合已构建的模块：PC 选择指令，IR 保存指令，控制器选择动作，ALU 和寄存器处理数据。先跟随一条指令的取指和执行，再测试整个程序。",
    ],
    [
      "For LDI 7: fetch the instruction into IR, then enable the accumulator to store 7 during execute. RAM and output must not write during this instruction.",
      "对于 LDI 7：先取指到 IR，再在执行阶段允许累加器保存 7。这条指令期间 RAM 和输出不应写入。",
    ],
  ),
  lesson(
    [
      "Machine code is the CPU's numeric instruction format. Each ROM location holds one 16-bit instruction. Here you edit ROM words directly; assembly comes in the next mission.",
      "机器码是 CPU 的数字指令格式。ROM 每个位置保存一条 16 位指令。本任务直接编辑 ROM 字，下一任务才使用汇编。",
    ],
    [
      "0x0107 loads 7. 0x0C00 outputs the accumulator and 0x0D00 halts. In Circuit, select Program ROM to edit its words; do not use Assemble & load for this task.",
      "0x0107 载入 7，0x0C00 输出累加器，0x0D00 停机。在“电路”中选择程序 ROM 编辑各字；本任务不使用“汇编并加载”。",
    ],
  ),
  lesson(
    [
      "Assembly names instructions instead of writing their numeric codes. The accumulator A is its working register. LDI loads a number directly; LDA reads a RAM address. Write one instruction per line. Assemble & load translates the text into ROM words; Run tests checks the loaded program.",
      "汇编用名称代替指令数字编码，累加器 A 是工作寄存器。LDI 直接载入数字，LDA 读取 RAM 地址。每行写一条指令。“汇编并加载”将文本翻译为 ROM 字，“运行测试”检查已加载的程序。",
    ],
    [
      "LDI 7, OUT, HLT on three lines loads 7, outputs it, and stops. If you change the text, assemble again before testing.",
      "把 LDI 7、OUT、HLT 写在三行，程序会载入 7、输出并停止。修改文本后，要先重新汇编再测试。",
    ],
  ),
  lesson(
    [
      "The accumulator A is the CPU's working register. LDA reads a RAM location into A; STA writes A to RAM. LDI uses a number directly, so LDI 3 and LDA 3 have different meanings.",
      "累加器 A 是 CPU 的工作寄存器。LDA 把 RAM 位置的值读到 A；STA 把 A 写入 RAM。LDI 直接使用数字，因此 LDI 3 与 LDA 3 含义不同。",
    ],
    [
      "If RAM[3]=9, LDA 3 loads 9 but LDI 3 loads 3. STA 4 then stores the current A at address 4 without changing A.",
      "RAM[3]=9 时，LDA 3 载入 9，LDI 3 载入 3。STA 4 把当前 A 存到地址 4，不改变 A。",
    ],
  ),
  lesson(
    [
      "A program branch chooses which instructions run next. A label names an instruction address; write the name followed by a colon on its own line. JZ checks the zero flag set by a previous load or calculation.",
      "程序分支决定接下来运行哪些指令。标签给指令地址命名，写法是单独一行的名称加冒号。JZ 检查前一次载入或运算设置的零标志。",
    ],
    [
      "A label such as done: can be the target of JZ done. Put a load or calculation before JZ so the zero flag describes the value you intended to test.",
      "done: 这样的标签可以作为 JZ done 的目标。先载入或运算，再使用 JZ，让零标志对应要判断的值。",
    ],
  ),
  lesson(
    [
      "A loop jumps back to repeat instructions. It needs progress toward a stopping condition, such as a counter decreasing. Store values in RAM when the accumulator is needed for another calculation.",
      "循环通过向前面的指令跳转来重复执行。它必须逐步接近结束条件，例如计数递减。累加器要做其他计算时，把需要保留的值存入 RAM。",
    ],
    [
      "A counter starting at 3 can visit 3,2,1,0. Check zero before repeating; a zero starting value should not wrap to 255 and run an extra loop.",
      "从 3 开始的计数可以经过 3、2、1、0。重复前检查零；初值为零时不应回绕到 255 再多运行循环。",
    ],
  ),
  lesson(
    [
      "A summing loop keeps both a current item and a running total. They are different values and need separate storage. Decide whether the last item is included before choosing the stopping test.",
      "求和循环同时保留当前项和累计总数，两者不同，需要分别存储。先决定是否包含最后一项，再设计停止判断。",
    ],
    [
      "For 1 through 3, totals after each addition are 1,3,6. Advancing the item is a separate step from updating the total.",
      "累加 1 到 3 时，每次加法后的总数为 1、3、6。递增当前项和更新总数是两个步骤。",
    ],
  ),
  lesson(
    [
      "Memory-mapped I/O gives devices addresses like RAM. The address decoder routes each access to memory or a device. A read can have a side effect, such as consuming a keyboard byte, so it must happen only once.",
      "内存映射 I/O 让外设像 RAM 一样拥有地址。地址译码器把访问送到内存或外设。读取可能带来取走键盘字节等副作用，因此只能在正确时机发生一次。",
    ],
    [
      "Reading F0 asks whether a key is ready; reading F1 takes the byte. Repeatedly checking readiness must not consume the byte. The device-address table is in CPU reference.",
      "读取 F0 查询键盘是否就绪，读取 F1 取走字节。反复查询就绪不能消耗字节。“CPU 参考”中有外设地址表。",
    ],
  ),
  lesson(
    [
      "Text is a sequence of character codes, one byte at a time here. Polling means repeatedly checking whether input is ready. A newline is also a character and must be handled like other input.",
      "这里的文本是一串字符编码，每次处理一个字节。轮询就是反复检查输入是否就绪。换行也是字符，也必须处理。",
    ],
    [
      "The character A is byte 65; newline is byte 10. Reading a byte from F1 and writing it to F2 echoes the same character. Use Devices to send input.",
      "字符 A 的字节值是 65，换行是 10。从 F1 读取字节并写到 F2，就能显示相同字符。在“外设”中发送输入。",
    ],
  ),
  lesson(
    [
      "A digit character is not its numeric value: '0' has code 48, so subtract 48 to get the digit. To append a decimal digit, multiply the value so far by 10 and add the digit. Newline ends the number.",
      "数字字符不等于其数值：'0' 的编码是 48，减去 48 才得到数字。追加一位十进制数字时，把已有值乘 10 再加新数字。换行表示结束。",
    ],
    [
      "Reading '2' then '4': start at 0, compute 0×10+2=2, then 2×10+4=24. The byte codes 50 and 52 are never added directly.",
      "读取 '2'、'4'：从 0 开始，先算 0×10+2=2，再算 2×10+4=24。不能直接把字节编码 50 和 52 相加。",
    ],
  ),
  lesson(
    [
      "Printing a number reverses parsing: separate its decimal digits and turn each into a character code. Leading zeroes are omitted, but the number zero still needs one '0' character.",
      "输出数字是解析的逆过程：拆出十进制各位，再转换为字符编码。前导零不输出，但数字零仍需要一个 '0' 字符。",
    ],
    [
      "Value 24 becomes digit 2 then digit 4; adding 48 gives output bytes 50 and 52. Writing byte 24 directly would not print the text '24'.",
      "数值 24 变成数字 2、4，各加 48 后输出字节 50、52。直接写字节 24 不会显示文本 '24'。",
    ],
  ),
  lesson(
    [
      "A result can need more bits than either input. An eight-bit accumulator cannot hold 510; software can keep a low byte plus a carry or high byte. Negative output also needs a sign and a magnitude.",
      "结果可能比输入需要更多位。八位累加器放不下 510，程序可以保留低字节及进位或高字节。负数输出还需要符号与大小。",
    ],
    [
      "200+100=300 is high byte 1, low byte 44 because 300=256+44. For 3−8, print a minus sign and magnitude 5.",
      "200+100=300，需要高字节 1、低字节 44，因为 300=256+44。3−8 则应输出负号与数值 5。",
    ],
  ),
  lesson(
    [
      "Input validation checks both syntax and numeric range. Error recovery must discard the rest of a bad line and reset parser state so the next line starts fresh.",
      "输入验证要检查格式和数值范围。错误恢复必须丢弃错误行的剩余内容并清空解析状态，让下一行重新开始。",
    ],
    [
      "After '12x+3', reporting an error is not enough: the leftover '+3' must not become a new calculation. Resume only after the newline.",
      "遇到 '12x+3' 时，只报告错误还不够：剩余 '+3' 不能变成新算式。必须等到换行后再重新开始。",
    ],
  ),
];

const coreTeaching = Object.fromEntries(
  core.map((entry, i) => [`core-${String(i + 1).padStart(2, "0")}`, entry]),
) as Record<MissionId, Teaching>;

const projects: Teaching[] = [
  lesson(
    [
      "Repair starts by tracing a value from its source to the required output. Z marks a connection with no driver; the components can be correct while a wire is missing.",
      "修复先从信号源追踪到输出。Z 表示没有信号源驱动，元件本身可能正确，只是缺少导线。",
    ],
    [
      "If a is 1 but out is Z, look for a break in the path before adding a new gate.",
      "a 为 1、out 为 Z 时，先寻找路径中的断点，不要先添加新门。",
    ],
  ),
  lesson(
    [
      "Correct signal values can arrive at the wrong destination. Trace each named input separately; two crossed paths need rerouting, not a new logic rule.",
      "正确数值也可能到达错误目标。分别追踪每个命名输入，接反的路径需要重新连线，不需要新逻辑规则。",
    ],
    [
      "Set one input to 1 and the other to 0 so swapped outputs become visible.",
      "把一个输入设为 1、另一个设为 0，就能看出输出是否接反。",
    ],
  ),
  lesson(
    [
      "An interlock requires every safety condition to be true. A two-input AND result can become an input to another gate to include a third condition.",
      "联锁要求每项安全条件都成立。两输入与门的结果可以作为另一个门的输入，把第三个条件纳入判断。",
    ],
    [
      "Three permissions have eight input combinations. Test a missing permission at each position, not only the all-on case.",
      "三个许可有八种输入组合。除了全部打开，还要分别测试每个位置缺少许可的情况。",
    ],
  ),
  lesson(
    [
      "A master enable is a permission shared by several outputs. When disabled, it blocks activity regardless of the individual requests.",
      "总使能是多个输出共享的许可，关闭时不管各自请求如何都阻止活动。",
    ],
    [
      "Test each request once with enable=0 and again with enable=1 to separate permission from data.",
      "每种请求都分别在 enable=0 和 1 时测试，以区分许可和数据。",
    ],
  ),
  lesson(
    [
      "Majority means more than half of the inputs are on. For three inputs, any two on are enough; all three on also qualifies.",
      "多数表示超过一半输入打开。三个输入中任意两个打开就足够，三个都打开也满足。",
    ],
    [
      "Inputs 101 have two ones, so they form a majority. Inputs 001 do not.",
      "输入 101 有两个 1，构成多数；001 不构成。",
    ],
  ),
  lesson(
    [
      "Exactly one is stricter than at least one. Extra active inputs must turn the result off again.",
      "恰好一个比至少一个更严格，多余的有效输入必须让结果重新关闭。",
    ],
    [
      "For three inputs, 001 qualifies but 011 and 111 do not. Three-input XOR alone would also accept 111.",
      "三个输入中，001 满足，但 011、111 不满足。只用三输入异或还会接受 111。",
    ],
  ),
  lesson(
    [
      "Separate a condition that requests an alarm from a control that permits it. A control may suppress every request without changing the sensors.",
      "把请求报警的条件与允许报警的控制分开。控制可以抑制所有请求，不改变传感器本身。",
    ],
    [
      "Try the same sensor pattern with the alarm armed and disarmed; only the permission changes.",
      "在布防与撤防时尝试同一传感器组合，只有许可发生变化。",
    ],
  ),
  lesson(
    [
      "A binary-code match checks both required ones and required zeroes. Ignoring zero positions would accept additional codes.",
      "匹配二进制码既要检查要求的 1，也要检查要求的 0。忽略零位会错误接受其他编码。",
    ],
    [
      "To recognize 101, input 111 must fail even though both required one positions are on.",
      "识别 101 时，111 必须失败，即使要求为 1 的两位都已打开。",
    ],
  ),
  lesson(
    [
      "Parity records whether the number of one bits is odd or even. XOR combines parity: toggling any one bit flips the result.",
      "奇偶校验记录 1 的数量是奇数还是偶数。异或可以合并奇偶性，翻转任一位都会改变结果。",
    ],
    [
      "1010 has two ones (even); 1011 has three (odd). Parity can detect a single changed bit but not every multi-bit change.",
      "1010 有两个 1（偶数），1011 有三个（奇数）。奇偶校验能发现单个位变化，但不能发现所有多位变化。",
    ],
  ),
  lesson(
    [
      "A priority encoder chooses the highest-priority active request and outputs its number. A separate valid bit distinguishes no request from request zero.",
      "优先编码器选择优先级最高的有效请求，输出其编号。单独的有效位用来区分没有请求与请求零。",
    ],
    [
      "If requests 1 and 3 are active and larger indices win, return 3. Check the mission's priority order before wiring.",
      "请求 1、3 有效且高编号优先时，应返回 3。连线前先检查任务规定的优先顺序。",
    ],
  ),
  lesson(
    [
      "Leading zeroes are consecutive zero bits from the highest position until the first one. Zero has no first one, so its count equals the full width.",
      "前导零是从最高位开始到第一个 1 之前连续的零。零数值没有第一个 1，因此计数等于整个位宽。",
    ],
    [
      "In an eight-bit value, 00010100 has three leading zeroes; 00000000 has eight.",
      "八位值 00010100 有三个前导零，00000000 有八个。",
    ],
  ),
  lesson(
    [
      "Reversing bits swaps positions, not bit values. The lowest position becomes the highest and vice versa.",
      "位反转交换位置，不翻转各位数值。最低位变为最高位，反之亦然。",
    ],
    [
      "Four-bit 1101 becomes 1011. NOT would instead produce 0010, which is a different operation.",
      "四位 1101 反序得到 1011，而取反会得到 0010，是不同操作。",
    ],
  ),
  lesson(
    [
      "Absolute value removes a signed number's negative sign. First determine whether the two's-complement input is negative; nonnegative values should pass through.",
      "绝对值去掉有符号数的负号。先判断补码输入是否为负，非负数应直接通过。",
    ],
    [
      "Both −5 and 5 have magnitude 5. The magnitude of −128 needs unsigned 128, outside the positive signed eight-bit range.",
      "−5 和 5 的大小都是 5。−128 的大小需要无符号 128，超出八位有符号正数范围。",
    ],
  ),
  lesson(
    [
      "Saturating arithmetic stops at the largest representable value instead of wrapping around. The adder's carry tells you when the unsigned sum did not fit.",
      "饱和运算达到最大可表示值后停止增加，不发生回绕。加法器进位可以判断无符号和是否放不下。",
    ],
    [
      "For eight bits, 250+10 saturates to 255 rather than wrapping to 4.",
      "八位运算中，250+10 饱和为 255，而不是回绕成 4。",
    ],
  ),
  lesson(
    [
      "Multiplication is repeated addition with place values. Each one bit of a multiplier contributes a shifted copy of the other input. The full product can need twice the input width.",
      "乘法是按位权进行重复加法。乘数的每个 1 位贡献另一输入的一个移位副本，完整乘积可能需要两倍输入位宽。",
    ],
    [
      "3×5 = 3×(4+1) = 12+3. Keep track of high result bits instead of discarding them too early.",
      "3×5 = 3×(4+1) = 12+3。注意高位结果，不要过早舍弃。",
    ],
  ),
  lesson(
    [
      "Integer division returns a quotient and a remainder. Dividend = divisor×quotient + remainder; a nonzero divisor requires remainder smaller than divisor.",
      "整数除法返回商和余数。被除数 = 除数×商 + 余数；除数非零时，余数必须小于除数。",
    ],
    [
      "17 divided by 5 gives quotient 3 and remainder 2. Division by zero needs the special result specified by the mission.",
      "17 除以 5 得到商 3、余数 2。除以零要使用任务规定的特殊结果。",
    ],
  ),
  lesson(
    [
      "Minimum and maximum combine comparison with selection. The comparison decides which entire input each output should copy.",
      "最小值和最大值组合比较与选择，比较结果决定各输出复制哪一个完整输入。",
    ],
    [
      "For 9 and 4, min is 4 and max is 9. Equal inputs should appear unchanged at both outputs.",
      "9 和 4 的最小值为 4，最大值为 9。相等输入应原样出现在两个输出。",
    ],
  ),
  lesson(
    [
      "A range check combines a lower-bound comparison and an upper-bound comparison. Inclusive bounds allow equality at both ends.",
      "范围检查组合下界和上界比较。包含端点的范围允许等于两端。",
    ],
    [
      "For the inclusive range 3–7, both 3 and 7 qualify; 2 and 8 do not.",
      "包含端点的 3–7 范围中，3、7 都满足，2、8 不满足。",
    ],
  ),
  lesson(
    [
      "A power of two has exactly one one bit in binary. Zero has no one bits and is not a power of two.",
      "二的幂在二进制中恰好有一个 1。零没有 1，因此不是二的幂。",
    ],
    [
      "8 is 00001000, so it qualifies. 10 is 00001010, so it does not.",
      "8 是 00001000，满足；10 是 00001010，不满足。",
    ],
  ),
  lesson(
    [
      "Rotation moves the bit that leaves one end back into the other end. Unlike a shift, it neither inserts zero nor discards a bit.",
      "循环移位把从一端移出的位放回另一端。与普通移位不同，它不填零，也不丢弃位。",
    ],
    [
      "Four-bit 1001 rotated left becomes 0011; shifted left it would become 0010.",
      "四位 1001 左循环移位得到 0011，普通左移则得到 0010。",
    ],
  ),
  lesson(
    [
      "A countdown timer stores a remaining count and decrements it on enabled clock steps. Loading a new duration and stopping at zero are separate control decisions.",
      "倒计时保存剩余数值，并在使能的时钟步递减。载入新时长与零时停止是两个控制决定。",
    ],
    [
      "A timer at 1 should reach 0, then stay there rather than underflowing to 255.",
      "倒计时为 1 时应变到 0，并保持，不应下溢到 255。",
    ],
  ),
  lesson(
    [
      "A moving light is a stored one-hot pattern updated each clock step. Moving the pattern changes which output is active without creating additional active bits.",
      "移动灯是每个时钟步更新的已存独热模式。移动模式会改变有效输出，不应产生额外有效位。",
    ],
    [
      "A four-light pattern may move 0001→0010→0100→1000. Decide how the sequence returns to its starting position.",
      "四灯模式可以按 0001→0010→0100→1000 移动，再决定如何回到起点。",
    ],
  ),
  lesson(
    [
      "Counting presses requires detecting a change from released to pressed. Remember the previous input; a held 1 is not a new press on every clock step.",
      "统计按下次数需要检测从松开到按下的变化。记住上次输入，持续的 1 不能在每个时钟步都算新按下。",
    ],
    [
      "Samples 0,1,1,0,1 contain two presses. Comparing current=1 with previous=0 identifies each new press.",
      "采样 0、1、1、0、1 含两次按下。当前为 1 且上次为 0，可以识别新按下。",
    ],
  ),
  lesson(
    [
      "Serial input delivers one bit at a time; parallel output presents a whole byte. A receiver must remember partial bits and count how many have arrived.",
      "串行输入每次送一个位，并行输出一次提供整个字节。接收器需要记住未完成的位序列，并统计已收到多少位。",
    ],
    [
      "After three bits, an eight-bit message is not complete yet. Check which bit arrives first before choosing the shift direction.",
      "收到三个位时，八位消息还未完成。先检查哪一位先到，再决定移位方向。",
    ],
  ),
  lesson(
    [
      "A FIFO queue removes values in the order they arrived. Read and write positions move independently, and empty/full states prevent invalid operations.",
      "FIFO 队列按到达顺序取出数值。读写位置独立移动，空与满状态防止无效操作。",
    ],
    [
      "Enqueue 4 then 9; the first dequeue returns 4. Removing from an empty queue must not create a value.",
      "先加入 4 再加入 9，第一次取出为 4。空队列不能凭空取出数值。",
    ],
  ),
  lesson(
    [
      "A stack removes the most recently stored value first (LIFO). A pointer records the top; push and pop change it in opposite directions.",
      "栈先取出最近存入的值（后进先出）。指针记录栈顶，压入和弹出让指针向相反方向移动。",
    ],
    [
      "Push 4 then 9; the first pop returns 9 and the next returns 4.",
      "先压入 4 再压入 9，第一次弹出为 9，第二次为 4。",
    ],
  ),
  lesson(
    [
      "A sequence lock remembers progress through a code. Correct input advances the state; incorrect input needs an explicit recovery rule.",
      "序列锁记住密码输入进度。正确输入推进状态，错误输入需要明确的恢复规则。",
    ],
    [
      "After the first two symbols match, the circuit must remember that progress while waiting for the third symbol.",
      "前两个符号匹配后，电路必须在等待第三个时记住已有进度。",
    ],
  ),
  lesson(
    [
      "A memory copy needs a source address, destination address, and remaining count. Each write must use the value read from the corresponding source location.",
      "内存复制需要源地址、目标地址和剩余数量。每次写入都必须使用对应源位置读取的值。",
    ],
    [
      "Copying three values requires three writes, then stopping. Incrementing an address is different from changing the stored data.",
      "复制三个值需要写三次后停止。递增地址与改变存储数据是不同操作。",
    ],
  ),
  lesson(
    [
      "A working decoder can still fail if its result is not connected to the output. Trace the control bus from the existing decoder to the module output; preserve the decoding logic.",
      "译码器即使运算正确，结果未连接到输出时仍会失败。沿已有译码器追踪控制总线至模块输出，保留译码逻辑。",
    ],
    [
      "If internal control bits change with the opcode but the output has no signal, inspect the missing connection between them.",
      "如果内部控制位随操作码改变，而输出没有信号，检查两者之间缺失的连接。",
    ],
  ),
  lesson(
    [
      "A calculated value is lost if its destination register never receives write permission. Trace data and enable separately through the execute phase.",
      "如果目标寄存器始终没有写许可，计算结果就无法保存。要在执行阶段分别追踪数据与使能。",
    ],
    [
      "If the ALU result is correct but A stays unchanged after execute, inspect A's load-enable path.",
      "ALU 结果正确但执行后 A 不变时，应检查 A 的载入使能路径。",
    ],
  ),
  lesson(
    [
      "A memory-mapped counter makes hardware state readable at a device address. Reading observes the count; the shared clock advances it independently.",
      "内存映射计数器让硬件状态可以从外设地址读取。读取只观察计数，共享时钟独立推进它。",
    ],
    [
      "Read the counter, advance the clock, and read again. In this standalone counter module, every other address must return zero.",
      "读取计数、推进时钟、再次读取。在这个独立计数器模块中，其他地址必须返回零。",
    ],
  ),
  lesson(
    [
      "Microcode stores control signals in a ROM table instead of calculating them with many gates. The ROM address encodes instruction and state; its data is the control word.",
      "微码把控制信号存入 ROM 表，而不是用大量门计算。ROM 地址编码指令与状态，数据则是控制字。",
    ],
    [
      "The same opcode can select different control words in fetch and execute because phase is part of the lookup address.",
      "同一操作码在取指与执行阶段可选择不同控制字，因为 phase 也是查表地址的一部分。",
    ],
  ),
  lesson(
    [
      "Software multiplication can add one input repeatedly. A loop counter records how many additions remain, while separate storage keeps the running product.",
      "软件乘法可以重复累加一个输入。循环计数记录还剩多少次加法，另一个存储位置保存累计乘积。",
    ],
    [
      "4×3 can add 4 three times: 4,8,12. A multiplier of zero should perform no additions.",
      "4×3 可以把 4 加三次：4、8、12。乘数为零时不应执行任何加法。",
    ],
  ),
  lesson(
    [
      "The greatest common divisor is the largest positive number dividing both inputs. Euclid's method repeatedly replaces a pair with a smaller equivalent pair until one value is zero.",
      "最大公约数是同时整除两个输入的最大正数。欧几里得方法反复把数对变成较小的等价数对，直到其中一个为零。",
    ],
    [
      "For 12 and 8, subtract 8 from 12 to get pair 4 and 8; repeat until the common divisor 4 remains.",
      "12、8 中，从 12 减 8 得到 4、8，再重复处理，最终得到公约数 4。",
    ],
  ),
  lesson(
    [
      "Fibonacci numbers add the previous two values. Both old values must remain available until their sum and the next pair are stored.",
      "斐波那契数由前两个值相加得到。在计算和与保存下一数对前，两个旧值都必须保留。",
    ],
    [
      "From pair 2,3, the next pair is 3,5. Overwriting 2 with 3 before adding would incorrectly produce 6.",
      "数对 2、3 的下一对为 3、5。相加前先把 2 覆盖成 3，会错误得到 6。",
    ],
  ),
  lesson(
    [
      "Sorting rearranges values into order while keeping every original value. Comparing and conditionally swapping adjacent items can move larger values toward one end.",
      "排序在保留所有原值的同时改变顺序。比较并按需交换相邻项，可以把较大值逐步移向一端。",
    ],
    [
      "Sorting 3,1,2 gives 1,2,3. When swapping, keep one value in temporary storage so neither is lost.",
      "3、1、2 排序后为 1、2、3。交换时用临时位置保留一个值，避免丢失。",
    ],
  ),
  lesson(
    [
      "ASCII stores character identities as numbers. Uppercase and lowercase letters occupy separate ranges; convert only bytes in the lowercase range.",
      "ASCII 用数字表示字符，大小写字母位于不同范围。只转换小写字母范围内的字节。",
    ],
    [
      "'a' is 97 and 'A' is 65, a difference of 32. Subtracting 32 from punctuation would corrupt it.",
      "'a' 是 97，'A' 是 65，相差 32。对标点也减 32 会破坏字符。",
    ],
  ),
  lesson(
    [
      "A pixel display uses coordinates to select a point and a data bit to light or clear it. Writing X or Y alone selects a location but does not draw it.",
      "像素显示屏用坐标选择点，再用数据位点亮或清除。只写 X、Y 是选择位置，还没有绘制。",
    ],
    [
      "Set X, set Y, then write pixel value 1. Repeat with new coordinates to draw a shape.",
      "先设置 X、Y，再写像素值 1。换坐标重复即可画出图形。",
    ],
  ),
  lesson(
    [
      "Animation changes a picture over time. A bouncing point needs remembered position and direction, plus a rule that reverses direction at each edge.",
      "动画随时间改变画面。往返点需要记住位置与方向，并在边界反向。",
    ],
    [
      "Clear the old pixel before drawing the new one; otherwise a moving point leaves a trail.",
      "绘制新像素前先清除旧像素，否则移动的点会留下轨迹。",
    ],
  ),
  lesson(
    [
      "An interactive total combines input parsing, remembered state, and formatted output. Completing one input must preserve the total while resetting only the temporary parser state.",
      "交互累加组合输入解析、记忆状态和格式化输出。完成一次输入后，要保留总数，只清空临时解析状态。",
    ],
    [
      "Inputs 3 then 4 should display totals 3 then 7. A fresh number's digits must not be appended to the previous number.",
      "先输入 3 再输入 4，应显示总数 3、7。新数字的各位不能接到上一个数字后面。",
    ],
  ),
];
export const missionTeaching = {
  ...coreTeaching,
  ...Object.fromEntries(
    projects.map((entry, i) => [
      `project-${String(i + 1).padStart(2, "0")}`,
      entry,
    ]),
  ),
} as Partial<Record<MissionId, Teaching>>;
