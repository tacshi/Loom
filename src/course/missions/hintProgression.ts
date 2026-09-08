import { extraNudges } from "./hintNudges";
import type { MissionId } from "./types";
import type { Copy } from "../types";
import { constructionHints } from "./hints";

// Each row supplies a nudge and an approach. The existing construction hint
// provides the final, most explicit step; examples remain an optional action.
type Steps = [Copy, Copy];
const core: Steps[] = [
  [
    [
      "The output needs a signal source, not another part.",
      "输出需要信号来源，不需要新元件。",
    ],
    [
      "Find a's output pin and out's input pin. A wire carries the value between them.",
      "找到 a 的输出引脚和 out 的输入引脚，连线可在两者之间传递数值。",
    ],
  ],
  [
    [
      "Both destinations need the same value; you do not need to copy the switch.",
      "两个终点需要相同的值，不必复制开关。",
    ],
    [
      "A single output pin can supply two separate wires.",
      "一个输出引脚可以同时提供两条连线的信号。",
    ],
  ],
  [
    [
      "Check the case where just one switch is on: the output must stay off.",
      "检查只有一个开关打开的情况：输出必须保持关闭。",
    ],
    [
      "Use the gate that requires both inputs to be on. Its output then drives the indicator.",
      "使用要求两个输入同时打开的门，再用它的输出驱动指示器。",
    ],
  ],
  [
    [
      "There are only two input cases, and the output must change each one to its opposite.",
      "输入只有两种情况，输出都必须变为相反值。",
    ],
    [
      "Put an inverter between the switch and the output.",
      "在开关和输出之间放置反相器。",
    ],
  ],
  [
    [
      "Compare the required result with AND: which output values need to change?",
      "把要求的结果与与门比较：哪些输出值需要改变？",
    ],
    [
      "Start with the both-on decision, then reverse that decision in a second stage.",
      "先判断是否同时打开，再用第二级反转判断结果。",
    ],
  ],
  [
    [
      "What does NAND output when its two inputs always have the same value?",
      "与非门的两个输入始终相同时，会输出什么？",
    ],
    [
      "Try only the 00 and 11 input cases. One signal can drive both input pins.",
      "只考虑 00 和 11 两种输入情况，一个信号可以驱动两个输入引脚。",
    ],
  ],
  [
    [
      "Compare AND and NAND for all four input pairs. How do their outputs differ?",
      "比较与门和与非门的四种输入组合，它们的输出有何不同？",
    ],
    [
      "Use NAND for the first decision, then reuse the inverter you just learned to build.",
      "先用与非门作出判断，再复用刚学会构建的反相器。",
    ],
  ],
  [
    [
      "OR is off in exactly one case. Which input pair is it?",
      "或门只有一种情况会关闭，是哪种输入组合？",
    ],
    [
      "NAND is also off in exactly one case: both inputs on. Transform the two signals so that original 00 becomes that case.",
      "与非门也只在两个输入都打开时关闭。先变换两个信号，让原来的 00 变为这种情况。",
    ],
  ],
  [
    [
      "The two mixed input pairs must pass, but 00 and 11 must not.",
      "两种不同的输入组合必须通过，00 和 11 则不能通过。",
    ],
    [
      "Share a NAND of the inputs between two branches, one for a and one for b, then combine the branches.",
      "让 a、b 两条分支共用输入的与非结果，再合并两条分支。",
    ],
  ],
  [
    [
      "You already have a component that detects different inputs. What should change to detect matching ones?",
      "你已有检测输入不同的元件。要检测相同，需要改变什么？",
    ],
    [
      "Keep the XOR circuit and add one stage after its output.",
      "保留异或电路，在输出之后增加一级。",
    ],
  ],
  [
    [
      "Only the selected input should affect out; the other input must be blocked.",
      "只有被选中的输入应影响 out，另一个输入必须被阻断。",
    ],
    [
      "Build two gated paths controlled by opposite values of sel, then merge their outputs.",
      "用 sel 的相反取值控制两条路径，再合并输出。",
    ],
  ],
  [
    [
      "Four inputs can be divided into two pairs before making the final choice.",
      "可以先将四个输入分成两对，再作最终选择。",
    ],
    [
      "Build two first-stage selectors and feed their results into a third selector.",
      "构建两个第一级选择器，再将其结果接入第三个选择器。",
    ],
  ],
  [
    [
      "Each switch represents a bit position, not a separate number to add.",
      "每个开关代表一个位的位置，不是需要相加的独立数值。",
    ],
    [
      "Use a bus joiner and match each input's bit number to the joiner pin number.",
      "使用总线合并器，让各输入的位编号与合并器引脚编号对应。",
    ],
  ],
  [
    [
      "Changing the order of bits does not require changing their values.",
      "改变位的顺序不需要改变位的值。",
    ],
    [
      "Separate the byte into individual wires, then group the low and high halves in the required order.",
      "把字节拆成独立连线，再按要求的顺序组合低半字节和高半字节。",
    ],
  ],
  [
    [
      "A logic operation on a byte applies the same rule at each bit position.",
      "字节逻辑运算在每个位上应用相同规则。",
    ],
    [
      "Build one bit's logic first, then repeat it for the other positions without mixing neighboring bits.",
      "先构建一位的逻辑，再复制到其他位，不要混入相邻位。",
    ],
  ],
  [
    [
      "All eight output bits should come from the same selected byte.",
      "八个输出位都应来自同一个被选中字节。",
    ],
    [
      "Reuse the one-bit selector at every bit position, with one shared selection signal.",
      "在每个位上复用单比特选择器，并共用一个选择信号。",
    ],
  ],
  [
    [
      "Three selection bits name eight distinct destinations.",
      "三个选择位可以指定八个不同终点。",
    ],
    [
      "For each destination, match its binary index by using either each select bit or its inverse.",
      "对每个终点，使用各选择位或其反值来匹配该终点的二进制编号。",
    ],
  ],
  [
    [
      "Treat each display segment as its own on/off decision.",
      "把显示器的每一段看成独立的开关判断。",
    ],
    [
      "For one segment, list the hexadecimal digits that need it lit. Detect those input patterns and combine them.",
      "先列出需要点亮某一段的十六进制数字，再检测并合并这些输入模式。",
    ],
  ],
  [
    [
      "When both inputs are 1, the result is binary 10: sum and carry are different decisions.",
      "两个输入都为 1 时，结果是二进制 10：和与进位是不同的判断。",
    ],
    [
      "Compare the sum column with XOR and the carry column with AND.",
      "将和的输出列与异或比较，将进位列与与门比较。",
    ],
  ],
  [
    [
      "A carry-in is one more bit to add after a and b.",
      "输入进位是在 a、b 之外还需相加的一位。",
    ],
    [
      "Use two half-addition stages. Either stage can generate the final carry.",
      "使用两级半加器，任一级都可能产生最终进位。",
    ],
  ],
  [
    [
      "A carry belongs to the next higher bit, not the current sum bit.",
      "进位属于更高一位，不属于当前的和位。",
    ],
    [
      "Start at the least significant bit and pass each stage's carry toward the most significant bit.",
      "从最低位开始，将每级进位向最高位传递。",
    ],
  ],
  [
    [
      "Incrementing is a special case of an arithmetic operation you already built.",
      "递增是你已构建的某种算术运算的特例。",
    ],
    [
      "Use the adder with a fixed second input rather than adding a separate rule for every bit.",
      "给加法器固定的第二输入，无须为每个位另建规则。",
    ],
  ],
  [
    [
      "A number and its negative should add to zero in eight-bit arithmetic.",
      "在八位运算中，一个数与它的负数相加应为零。",
    ],
    [
      "Bitwise inversion gets you one below the required two's-complement value.",
      "逐位取反后，离所需的补码值还差一。",
    ],
  ],
  [
    [
      "Subtraction can reuse addition if the second operand changes form.",
      "如果改变第二操作数的形式，减法就能复用加法。",
    ],
    [
      "Use the two's-complement construction for b before adding it to a.",
      "先用补码构造处理 b，再将它与 a 相加。",
    ],
  ],
  [
    [
      "Equality and ordering need different evidence from the two operands.",
      "相等与大小关系需要从两个操作数中获取不同信息。",
    ],
    [
      "Detect differing bits for equality, and inspect the subtraction carry for unsigned ordering.",
      "检测不同的位以判断相等，检查减法进位以判断无符号大小关系。",
    ],
  ],
  [
    [
      "Unsigned ordering is misleading when just one operand has its sign bit set.",
      "只有一个操作数符号位为 1 时，无符号比较会误判。",
    ],
    [
      "Separate the different-sign case from the same-sign case before selecting the comparison result.",
      "先区分异号与同号情况，再选择比较结果。",
    ],
  ],
  [
    [
      "Carry and signed overflow describe different things; one cannot replace the other.",
      "进位与有符号溢出描述不同情况，不能互相替代。",
    ],
    [
      "Build separate paths for all-zero detection, the adder carry, and the relationship between operand and result signs.",
      "分别构建全零检测、加法器进位以及操作数与结果符号关系的路径。",
    ],
  ],
  [
    [
      "A logical shift moves positions and leaves one new position empty.",
      "逻辑移位会改变位置，并空出一个新位置。",
    ],
    [
      "Use wiring to move each bit; decide what constant must fill the vacated position.",
      "用连线移动各位，再确定空出的位置应填入什么常量。",
    ],
  ],
  [
    [
      "A negative signed value should remain negative after an arithmetic right shift.",
      "负数在算术右移后应仍为负数。",
    ],
    [
      "The new top bit must preserve the sign instead of using the zero fill from a logical shift.",
      "新的最高位必须保留符号，不能像逻辑移位那样补零。",
    ],
  ],
  [
    [
      "Choosing an operation is separate from computing its result.",
      "选择运算与计算结果是两件事。",
    ],
    [
      "Keep the operation circuits side by side and use a selector after their outputs.",
      "并排保留各运算电路，在它们的输出之后使用选择器。",
    ],
  ],
  [
    [
      "Storage changes at a clock step; changing data alone is not enough.",
      "存储值在时钟步更新，仅改变 data 不够。",
    ],
    [
      "Identify the data input, stored output, enable, and reset pins before stepping the clock.",
      "推进时钟前，先识别数据输入、存储输出、使能和复位引脚。",
    ],
  ],
  [
    [
      "A byte can be remembered as eight independent bits updated together.",
      "一个字节可作为同时更新的八个独立位来保存。",
    ],
    [
      "Replicate the one-bit storage path and keep every bit aligned between input and output.",
      "复制单比特存储路径，并保持输入和输出的位位置一致。",
    ],
  ],
  [
    [
      "Check load, hold, and reset separately, especially when their controls overlap.",
      "分别检查载入、保持和复位，尤其注意控制信号重叠的情况。",
    ],
    [
      "Use common controls for all stored bits and give reset priority over hold.",
      "让所有存储位共用控制，并让复位优先于保持。",
    ],
  ],
  [
    [
      "A counter needs both a remembered value and a rule for its next value.",
      "计数器既需要记住当前值，也需要生成下一值的规则。",
    ],
    [
      "Form a feedback loop through arithmetic, with storage separating one clock step from the next.",
      "通过算术电路形成反馈，并用存储分隔相邻时钟步。",
    ],
  ],
  [
    [
      "The next total depends on the old total as well as the new input.",
      "下一个总和既取决于旧总和，也取决于新输入。",
    ],
    [
      "Use storage for the running total and combine its output with incoming data before the next update.",
      "用存储保存累计总和，在下一次更新前将其输出与新数据组合。",
    ],
  ],
  [
    [
      "A jump changes the next address, not the arithmetic used for ordinary counting.",
      "跳转改变下一地址，不改变普通计数使用的算术。",
    ],
    [
      "Create the sequential address and jump target as two candidates for the next stored value.",
      "把顺序地址和跳转目标作为下一个存储值的两个候选。",
    ],
  ],
  [
    [
      "Address chooses a location; write permission decides whether that location changes.",
      "地址选择位置，写入许可决定该位置是否改变。",
    ],
    [
      "Keep address, write data, and write-enable on their matching memory interfaces.",
      "让地址、写入数据和写使能分别接到对应存储接口。",
    ],
  ],
  [
    [
      "Part of the address chooses a bank; the remaining bits choose a location inside it.",
      "地址的一部分选择存储区，其余位选择区内位置。",
    ],
    [
      "Both banks can share the local address, but only the selected bank should accept a write or supply the read result.",
      "两个存储区可以共用区内地址，但只有选中的区应接受写入或提供读取结果。",
    ],
  ],
  [
    [
      "A ROM lookup selects a stored value; it does not need a write operation.",
      "ROM 查找是选择已存值，不需要写入操作。",
    ],
    [
      "Trace the address into the ROM and the selected data back to the output.",
      "沿地址追踪到 ROM，再将选出的数据引向输出。",
    ],
  ],
  [
    [
      "Two sources driving the same bus can conflict even when their individual values are valid.",
      "即使各自数值有效，两个来源同时驱动总线仍可能冲突。",
    ],
    [
      "Give each source a controllable high-impedance path before joining the outputs.",
      "在合并输出前，为每个来源提供可控的高阻态路径。",
    ],
  ],
  [
    [
      "The lights depend on a remembered phase, not directly on the clock level.",
      "灯光取决于记住的阶段，不直接取决于时钟电平。",
    ],
    [
      "Separate the state sequence from the logic that turns each state into a light.",
      "将状态序列与把状态转换成灯光的逻辑分开。",
    ],
  ],
  [
    [
      "Recognizing 101 requires remembering recent input bits, not just the current bit.",
      "识别 101 需要记住最近的输入位，不能只看当前位。",
    ],
    [
      "Keep a sliding window of three bits and test that window after each update.",
      "保存三位滑动窗口，每次更新后检测窗口内容。",
    ],
  ],
  [
    [
      "The instruction contains two fields already placed in different bit positions.",
      "指令包含两个已位于不同位置的字段。",
    ],
    [
      "Split the instruction word into its low byte and high byte without changing their bits.",
      "把指令字拆成低字节和高字节，不改变各位的值。",
    ],
  ],
  [
    [
      "Fetching chooses an instruction; remembering it requires a separate storage step.",
      "取指选出指令，记住它还需要独立的存储步骤。",
    ],
    [
      "Put an enabled register between the instruction memory and the decoded instruction path.",
      "在指令存储器与译码路径之间放置带使能的寄存器。",
    ],
  ],
  [
    [
      "An opcode alone is not permission to act during every CPU phase.",
      "操作码本身不能允许 CPU 在每个阶段都执行动作。",
    ],
    [
      "Decode the requested action, then gate it with execution-phase and halt conditions.",
      "译码请求的动作，再用执行阶段和停机条件限制它。",
    ],
  ],
  [
    [
      "Moving data requires choosing its source and enabling its destination.",
      "移动数据既要选择来源，也要使能终点。",
    ],
    [
      "For each command, decide which value reaches the register and whether the register or RAM may write.",
      "对每个命令，确定寄存器接收哪个值，以及寄存器或 RAM 是否可以写入。",
    ],
  ],
  [
    [
      "Some jumps always apply; others depend on a flag from a previous result.",
      "有些跳转总是生效，另一些取决于之前结果的标志。",
    ],
    [
      "Build one condition per jump type, then combine only the conditions that should redirect the PC.",
      "为每种跳转构建条件，再合并应改变程序计数器的条件。",
    ],
  ],
  [
    [
      "Follow one instruction from its address to its effects before wiring every CPU connection.",
      "连接所有 CPU 连线前，先追踪一条指令从地址到执行效果的路径。",
    ],
    [
      "Establish the instruction path first, then connect decoded control signals to the data-moving parts.",
      "先建立指令路径，再将译码控制信号连接到移动数据的部件。",
    ],
  ],
  [
    [
      "Each instruction word has an operation and an operand; their positions matter.",
      "每个指令字都有操作和操作数，它们的位置很重要。",
    ],
    [
      "Use the instruction reference to encode each word, then place the words in execution order.",
      "参照指令说明编码各指令字，再按执行顺序放置。",
    ],
  ],
  [
    [
      "Loading a value into the accumulator does not automatically send it to the output.",
      "把数值载入累加器不会自动将它送到输出。",
    ],
    [
      "Separate loading, output, and stopping into successive instructions.",
      "将载入、输出和停止分成连续的指令。",
    ],
  ],
  [
    [
      "After storing a value, check that you can retrieve it even if the accumulator changes.",
      "保存数值后，要检查累加器改变时仍能取回该值。",
    ],
    [
      "Use RAM as the intermediate store, then load from that location before producing output.",
      "用 RAM 作中间存储，再从该位置载入后输出。",
    ],
  ],
  [
    [
      "A branch must inspect a flag that reflects the value you intend to test.",
      "分支必须检查能够反映目标数值的标志。",
    ],
    [
      "Load the tested value first, then send the zero and nonzero paths to separate labels.",
      "先载入待判断值，再将零和非零路径引向不同标签。",
    ],
  ],
  [
    [
      "Consider an initial count of zero before deciding where the loop test belongs.",
      "决定循环判断放在哪里前，先考虑初始计数为零的情况。",
    ],
    [
      "Keep remaining work separate from completed iterations, and test before entering the loop body.",
      "将剩余次数与已完成次数分开，并在进入循环体前判断。",
    ],
  ],
  [
    [
      "A running sum needs a total and a separate value that changes on each iteration.",
      "累加求和需要总和，以及每轮改变的独立数值。",
    ],
    [
      "Count downward from the input, add each nonzero count to the total, and stop before wrapping below zero.",
      "从输入值向下计数，把每个非零计数加入总和，并在低于零回绕之前停止。",
    ],
  ],
  [
    [
      "Device registers share addresses with the memory interface, so access must be selective.",
      "设备寄存器与存储接口共用地址，因此必须选择性访问。",
    ],
    [
      "Decode the device address first, then distinguish reads from writes and their side effects.",
      "先译码设备地址，再区分读取、写入及其副作用。",
    ],
  ],
  [
    [
      "No available key is different from a key whose byte value is zero.",
      "没有可用按键与按键字节值为零是不同情况。",
    ],
    [
      "Check keyboard status before consuming data, then forward each consumed byte once.",
      "消耗数据前检查键盘状态，再将每个读出的字节转发一次。",
    ],
  ],
  [
    [
      "A character's byte code is not its numeric digit value.",
      "字符的字节编码不等于它表示的数字值。",
    ],
    [
      "Convert each character to a digit, and shift the accumulated number one decimal place before adding it.",
      "将每个字符转换为数字，累积值先向左移动一个十进制位再加上它。",
    ],
  ],
  [
    [
      "Printing a number means producing its digits as characters, not sending the binary value once.",
      "打印数值需要逐个输出数字字符，不是一次发送二进制数值。",
    ],
    [
      "Separate hundreds, tens, and units, then encode each digit as text.",
      "分离百位、十位和个位，再把每位编码为文本。",
    ],
  ],
  [
    [
      "An eight-bit input can produce a sum wider than eight bits or a negative difference.",
      "八位输入可能产生超过八位的和或负的差。",
    ],
    [
      "Keep arithmetic sign and extra carry information until the result has been formatted for output.",
      "保留符号及额外进位信息，直到结果被格式化输出。",
    ],
  ],
  [
    [
      "Reporting an error is not enough if unread bytes from that line remain in the input.",
      "如果该行仍有未读字节，只报告错误还不够。",
    ],
    [
      "Use a discard-until-line-end state before accepting a fresh calculation.",
      "接受新计算前，先进入丢弃输入直到行尾的状态。",
    ],
  ],
];
const projects: Steps[] = [
  [
    [
      "A correct internal signal cannot reach an output through a missing wire.",
      "正确的内部信号无法通过缺失连线到达输出。",
    ],
    [
      "Trace forward from the input through both inversions, checking where the signal stops.",
      "从输入向前追踪两次取反，检查信号停在哪里。",
    ],
  ],
  [
    [
      "A connected output can still be connected to the wrong source.",
      "输出即使已连接，也可能接错来源。",
    ],
    [
      "Trace each output backward and compare the source with its intended matching input.",
      "从各输出向后追踪，将来源与预期对应输入比较。",
    ],
  ],
  [
    [
      "The interlock must reject every case with even one switch off.",
      "联锁必须拒绝任何一个开关关闭的情况。",
    ],
    [
      "Reduce the three-way decision to two consecutive both-on decisions.",
      "将三路判断化为两次连续的同时打开判断。",
    ],
  ],
  [
    [
      "Turning master off must block both paths regardless of their individual switches.",
      "关闭 master 必须阻断两条路径，不受各自开关影响。",
    ],
    [
      "Treat each output as its own two-condition decision with a shared master condition.",
      "把每个输出视为独立的双条件判断，并共用 master 条件。",
    ],
  ],
  [
    [
      "A majority of three means at least one pair is on together.",
      "三路中的多数意味着至少有一对同时打开。",
    ],
    [
      "Detect each possible pair, then accept any successful pair.",
      "检测每个可能的配对，再接受任一成功配对。",
    ],
  ],
  [
    [
      "Odd parity is not enough: it also accepts all three inputs on.",
      "奇校验不够，因为它也接受三个输入全开。",
    ],
    [
      "List the three one-hot cases and make each require the other two inputs to be off.",
      "列出三种只有一路有效的情况，每种都要求另外两路关闭。",
    ],
  ],
  [
    [
      "An open sensor should not trigger an alarm when the system is disarmed.",
      "系统未布防时，传感器打开不应触发报警。",
    ],
    [
      "First detect any open sensor, then qualify that result with the armed signal.",
      "先检测任一传感器打开，再用 armed 信号限制结果。",
    ],
  ],
  [
    [
      "A code match tests both required ones and required zeroes.",
      "匹配密码既要检查要求为 1 的位，也要检查要求为 0 的位。",
    ],
    [
      "Turn each matching input bit into a true condition, then require all those conditions together.",
      "把各位的匹配转为真条件，再要求所有条件同时满足。",
    ],
  ],
  [
    [
      "Parity depends on whether the count of set bits is odd or even, not on their positions.",
      "奇偶校验取决于置位数量的奇偶性，不取决于位置。",
    ],
    [
      "Accumulate parity across the data bits, then compare with the received parity bit.",
      "逐位累积数据的奇偶性，再与收到的校验位比较。",
    ],
  ],
  [
    [
      "When several requests are active, priority must resolve them to one index.",
      "多路请求同时有效时，优先级必须将它们化为一个编号。",
    ],
    [
      "Build an override chain in which a higher-priority request can replace a lower-priority result.",
      "构建覆盖链，让高优先级请求替换低优先级结果。",
    ],
  ],
  [
    [
      "Leading zeroes are counted from the top bit; zero itself is a special full-width case.",
      "前导零从最高位开始计数，全零是占满整个位宽的特殊情况。",
    ],
    [
      "Find the highest set bit and convert its position into the number of bits above it.",
      "找到最高置位，再把位置转换为它上方的位数。",
    ],
  ],
  [
    [
      "Reversal changes positions without changing bit values.",
      "反转只改变位置，不改变位值。",
    ],
    [
      "Pair the lowest input position with the highest output position and work inward.",
      "把最低输入位与最高输出位配对，再向内依次配对。",
    ],
  ],
  [
    [
      "Nonnegative inputs should pass through unchanged.",
      "非负输入应原样通过。",
    ],
    [
      "Prepare the original value and its two's-complement negative, then choose using the sign.",
      "准备原值及其补码负值，再根据符号选择。",
    ],
  ],
  [
    [
      "The wrapped eight-bit sum loses evidence that the true result exceeded the maximum.",
      "回绕后的八位和会丢失真实结果超过最大值的信息。",
    ],
    [
      "Keep the carry alongside the sum and use it to choose between normal and saturated output.",
      "同时保留进位和结果，用进位选择普通输出或饱和输出。",
    ],
  ],
  [
    [
      "Each set multiplier bit contributes a shifted copy of the other operand.",
      "乘数每个置位都贡献另一操作数的一份移位副本。",
    ],
    [
      "Build partial products with enough width to preserve their high bits before summing them.",
      "先用足够位宽构建部分积以保留高位，再相加。",
    ],
  ],
  [
    [
      "A quotient records how often the divisor fits while the remainder keeps what is left.",
      "商记录除数能容纳多少次，余数保留剩下的部分。",
    ],
    [
      "Process dividend bits from high to low, comparing the partial remainder with the divisor at each stage.",
      "从高到低处理被除数各位，每级将部分余数与除数比较。",
    ],
  ],
  [
    [
      "Minimum and maximum are opposite selections based on the same ordering decision.",
      "最小值和最大值是同一大小判断下的相反选择。",
    ],
    [
      "Feed one comparison result to two selectors with reversed input ordering.",
      "将一次比较的结果接到两个输入顺序相反的选择器。",
    ],
  ],
  [
    [
      "Passing one boundary does not prove that a value is inside the whole interval.",
      "通过一个边界不代表数值位于整个区间内。",
    ],
    [
      "Check the lower and upper bounds separately, including equality, then require both.",
      "分别检查下界和上界，包含相等情况，再要求两者同时满足。",
    ],
  ],
  [
    [
      "A positive power of two has exactly one set bit; zero must be excluded.",
      "正的二次幂恰有一个置位，必须排除零。",
    ],
    [
      "Compare a value's set bits with those of the value one below it.",
      "比较一个数与比它小一的数的置位情况。",
    ],
  ],
  [
    [
      "Rotation keeps the bit that an ordinary shift would discard.",
      "循环移位保留普通移位会丢弃的位。",
    ],
    [
      "Wrap the departing end bit to the other end, then choose the requested direction.",
      "将移出的一端位接回另一端，再选择所需方向。",
    ],
  ],
  [
    [
      "Decrementing zero would wrap around instead of keeping the timer finished.",
      "对零递减会回绕，不能让计时器保持完成。",
    ],
    [
      "Distinguish loading, counting, and already-zero states when choosing the next value.",
      "选择下一值时，区分载入、倒计数和已经为零三种情况。",
    ],
  ],
  [
    [
      "The lit position must survive when it moves past the end of the byte.",
      "亮起的位置越过字节末端后必须继续保留。",
    ],
    [
      "Use a circular shift of the remembered light pattern rather than shifting in zeroes.",
      "对已存灯光模式使用循环移位，而不是补零移位。",
    ],
  ],
  [
    [
      "A held button spans several clock steps but should count as one press.",
      "按住按钮会跨多个时钟步，但只能计为一次按下。",
    ],
    [
      "Remember the previous button state and count only the transition from released to pressed.",
      "记住前一个按钮状态，只统计从松开到按下的变化。",
    ],
  ],
  [
    [
      "Receiving a bit and publishing a complete byte are separate events.",
      "接收一位与发布完整字节是不同事件。",
    ],
    [
      "Track both the partial byte and how many enabled input steps it contains.",
      "同时记录部分字节以及其中已有多少个使能输入步。",
    ],
  ],
  [
    [
      "The oldest stored byte must leave first, even after several pushes.",
      "即使多次压入后，也必须最先取出最早保存的字节。",
    ],
    [
      "Track how many slots are occupied and keep the oldest item at the read end after a pop.",
      "记录已占用槽数，弹出后让最早的数据继续位于读取端。",
    ],
  ],
  [
    [
      "A stack removes the most recently pushed value, not the oldest one.",
      "栈取出的是最近压入值，不是最早的值。",
    ],
    [
      "Use the occupancy count to locate the next free slot and the current top.",
      "用占用数量定位下一个空槽及当前栈顶。",
    ],
  ],
  [
    [
      "The same digit can mean something different depending on how much of the code already matched.",
      "同一数字的意义取决于密码已经匹配了多少位。",
    ],
    [
      "Store a progress state and update it only when a digit is submitted.",
      "保存匹配进度状态，仅在提交数字时更新。",
    ],
  ],
  [
    [
      "Completion must stop further writes, even if the clock keeps advancing.",
      "即使时钟继续推进，完成后也必须停止继续写入。",
    ],
    [
      "Track the copied position and retain a done state once the bounded block is complete.",
      "记录复制位置，并在固定长度的数据块完成后保留完成状态。",
    ],
  ],
  [
    [
      "The decoder can compute the right control bits while failing to expose them at its output.",
      "译码器可能算出正确控制位，却未将它们传到输出。",
    ],
    [
      "Compare the internal decoded result with the output connection before replacing the decoding logic.",
      "替换译码逻辑前，先对照内部译码结果与输出连接。",
    ],
  ],
  [
    [
      "Correct data at a register input is not enough if the register never loads it.",
      "寄存器输入数据正确还不够，如果从未载入就不会保存。",
    ],
    [
      "Follow an LDI execution and check its write-enable path separately from its data path.",
      "追踪一次 LDI 执行，将写使能路径与数据路径分开检查。",
    ],
  ],
  [
    [
      "The counter should appear only at its assigned address.",
      "计数器只能在分配给它的地址出现。",
    ],
    [
      "Add an address match that controls whether the read path returns the counter or the default value.",
      "添加地址匹配，用它控制读取路径返回计数值还是默认值。",
    ],
  ],
  [
    [
      "A ROM can replace decision logic if its address represents every condition the logic reads.",
      "如果 ROM 地址表示逻辑读取的全部条件，ROM 就能替代判断逻辑。",
    ],
    [
      "List control inputs as address fields and pack the required outputs into each lookup word.",
      "将控制输入列为地址字段，把所需输出打包到各查找字中。",
    ],
  ],
  [
    [
      "Multiplication can be accumulated one equal-sized contribution at a time.",
      "乘法可以通过每次加入相同数值来累积。",
    ],
    [
      "Separate the growing product from the remaining repetition count, including the zero-count case.",
      "将增长的乘积与剩余重复次数分开，并处理次数为零的情况。",
    ],
  ],
  [
    [
      "Subtracting the smaller positive value from the larger preserves their common divisors.",
      "用较大正数减去较小正数会保留它们的公约数。",
    ],
    [
      "Repeat comparison and subtraction until the values match, with a separate path for zero inputs.",
      "重复比较与相减直到两值相同，并为零输入设置独立路径。",
    ],
  ],
  [
    [
      "Each next Fibonacci value needs both preceding values, not just the latest one.",
      "每个新的斐波那契数需要前两个数，不能只用最近一个。",
    ],
    [
      "Compute the new sum before shifting the remembered pair forward.",
      "先计算新和，再向前更新保存的数对。",
    ],
  ],
  [
    [
      "One pass of adjacent comparisons may move the largest value but leave smaller values unsorted.",
      "一轮相邻比较可能只移动最大值，较小值仍未排序。",
    ],
    [
      "Repeat compare-and-swap passes over the four entries until enough passes have ordered them.",
      "对四个元素重复比较交换，直到足够轮次将它们排好。",
    ],
  ],
  [
    [
      "Punctuation and digits must survive unchanged; only lowercase letters should convert.",
      "标点和数字必须原样保留，只转换小写字母。",
    ],
    [
      "Check the lowercase ASCII interval before applying the uppercase offset.",
      "应用大写偏移量之前，先检查是否位于小写 ASCII 区间。",
    ],
  ],
  [
    [
      "A pixel write needs a location as well as a value.",
      "写像素既需要位置，也需要像素值。",
    ],
    [
      "Set both coordinates before triggering the pixel-data write.",
      "触发像素数据写入前，先设置两个坐标。",
    ],
  ],
  [
    [
      "Drawing the new position alone leaves a trail at every old position.",
      "只绘制新位置会在所有旧位置留下轨迹。",
    ],
    [
      "Keep position and direction, erase before moving, and reverse at the bounds.",
      "保存位置与方向，移动前擦除，并在边界反向。",
    ],
  ],
  [
    [
      "Finishing one input number should not erase the total from earlier numbers.",
      "完成一个输入数值不应清除之前数值的累计总和。",
    ],
    [
      "Maintain separate parser and accumulator state; a newline transfers the parsed number into the total.",
      "分开保存解析状态和累加状态，换行时将解析出的数加入总和。",
    ],
  ],
];

export const progressiveHints: Record<string, Copy[]> = Object.fromEntries(
  (
    [
      ["core", core],
      ["project", projects],
    ] as const
  ).flatMap(([track, rows]) =>
    rows.map(([nudge, approach], i) => {
      const id = `${track}-${String(i + 1).padStart(2, "0")}`;
      const construction = constructionHints[id];
      if (!construction) throw new Error(`Missing construction hint: ${id}`);
      return [
        id,
        extraNudges[id as MissionId]
          ? [nudge, ...extraNudges[id as MissionId]!]
          : [nudge, approach, construction],
      ];
    }),
  ),
);
