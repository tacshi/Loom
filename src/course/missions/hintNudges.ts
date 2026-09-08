import type { Copy } from "../types";
import type { MissionId } from "./types";

// These follow the first conceptual nudge, one small decision at a time.
export const extraNudges: Partial<Record<MissionId, Copy[]>> = {
  "core-06": [
    [
      "Try writing NAND's outputs for 00 and 11 only.",
      "先只写出与非门对 00、11 的输出。",
    ],
    [
      "Those two results are opposites of the shared input value.",
      "这两个结果都与共同的输入值相反。",
    ],
    [
      "Can one output pin supply both of the NAND input pins?",
      "一个输出引脚能否同时给与非门的两个输入提供信号？",
    ],
    [
      "After wiring, toggle a once. Check that the output changes in the opposite direction.",
      "接好后切换一次 a，检查输出是否朝相反方向变化。",
    ],
  ],
  "core-08": [
    [
      "Write the one input pair for which OR should output 0.",
      "写出或门应输出 0 的唯一输入组合。",
    ],
    [
      "Now write the one pair for which NAND outputs 0. What changed between the pairs?",
      "再写出与非门输出 0 的唯一组合，两种组合有什么变化？",
    ],
    [
      "Try changing each incoming bit to its opposite before it reaches NAND.",
      "试着让各输入位在到达与非门前变为反值。",
    ],
    [
      "Test 00 first, then 01. Follow the two transformed inputs before inspecting the final output.",
      "先测 00，再测 01。查看最终输出前，先追踪两个变换后的输入。",
    ],
  ],
  "core-09": [
    [
      "You already built OR. Which one of its four answers is wrong for XOR?",
      "你已经构建了或门，它的四个答案中哪一个不符合异或？",
    ],
    [
      "AND can identify that unwanted both-on case. Try observing OR and AND side by side.",
      "与门可以识别不需要的两路全开情况。试着并排观察或门与与门。",
    ],
    [
      "The both-on signal should block the output when it is 1. What gate reverses that permission?",
      "两路全开信号为 1 时应阻止输出，哪个门能反转这个许可？",
    ],
    [
      "The final output needs both an OR request and permission to pass. Which familiar gate requires both?",
      "最终输出既需要或门提出请求，也需要允许通过。哪个熟悉的门要求两者同时满足？",
    ],
    [
      "Trace 11 through each stage, then 01. If both pass or both fail, inspect the permission signal before changing the OR path.",
      "逐级追踪 11，再追踪 01。如果都通过或都失败，先检查许可信号，再考虑修改或门路径。",
    ],
  ],
  "core-11": [
    [
      "Start only with the a path. It should be blocked when sel=1.",
      "先只做 a 路径，sel=1 时它应被阻断。",
    ],
    [
      "An AND gate can block a signal. What should its permission input be when sel=0?",
      "与门可以阻断信号。sel=0 时，它的许可输入应是什么？",
    ],
    [
      "Now build b's path with the opposite permission.",
      "再用相反许可构建 b 路径。",
    ],
    [
      "Only one path can be active. Choose a gate that accepts a 1 from either path.",
      "最多只有一路有效，选择能接受任一路为 1 的门。",
    ],
    [
      "Hold sel fixed and toggle the unselected data input. The output should not change.",
      "固定 sel，切换未被选中的数据输入，输出不应改变。",
    ],
  ],
  "core-18": [
    [
      "Choose one segment and mark which of the 16 digits need it on.",
      "选一段，标出 16 个数字中哪些需要点亮它。",
    ],
    [
      "Build a match for just one of those digit patterns, as in the decoder lesson.",
      "像译码器课程一样，先只构建其中一个数字模式的匹配。",
    ],
    [
      "Combine another accepted pattern with OR; leave the other segments alone for now.",
      "用或门加入另一个可接受模式，暂时不要处理其他段。",
    ],
    [
      "Before repeating the method, check one digit that lights this segment and one that leaves it off.",
      "重复此方法前，检查一个应点亮该段的数字和一个不应点亮的数字。",
    ],
  ],
  "core-20": [
    [
      "First add a and b using the half adder you already built.",
      "先用已构建的半加器相加 a、b。",
    ],
    [
      "There is still cin to add. Which output from the first stage belongs in another addition?",
      "还需加上 cin，第一级哪个输出应参与另一次相加？",
    ],
    [
      "Observe the two carry outputs separately. Can either stage make the total reach two?",
      "分别观察两个进位输出，任一级能否让总数达到二？",
    ],
    [
      "Check 111 last: the sum bit and the final carry should both be 1.",
      "最后检查 111，和位与最终进位都应为 1。",
    ],
  ],
  "core-21": [
    [
      "Start with bit 0. There is no earlier column to supply its incoming carry.",
      "从第 0 位开始，没有更低一列提供输入进位。",
    ],
    [
      "The carry from bit 0 is worth one unit in bit 1's column.",
      "第 0 位的进位在第 1 列中值一个单位。",
    ],
    [
      "Try 1+1 with just the first two columns before copying more stages.",
      "复制更多级之前，先用前两列尝试 1+1。",
    ],
    [
      "Join the sum pins in bit order. The last carry is a separate output, not another sum pin.",
      "按位序合并 sum 引脚，最后的进位是独立输出，不是又一个 sum 引脚。",
    ],
  ],
  "core-41": [
    [
      "Give each light phase a different two-bit code.",
      "为每个灯光阶段分配不同的两位编码。",
    ],
    [
      "Write only the red row first: what code follows red when advance is on?",
      "先只写红灯那一行，advance 打开时红灯后应是什么编码？",
    ],
    [
      "With advance off, the next code should equal the stored code.",
      "advance 关闭时，下一编码应等于已存编码。",
    ],
    [
      "Drive the lights from the stored state, not the value waiting at the storage input.",
      "用已存状态驱动灯光，不要用等待存入的数据输入值。",
    ],
    [
      "Step through a complete cycle, then reset while a different light is active.",
      "逐步走完一个循环，再在其他灯亮起时复位。",
    ],
  ],
  "core-45": [
    [
      "Choose just one control-bus output to implement first.",
      "先只选择控制总线的一个输出来实现。",
    ],
    [
      "For RAM write, find the opcode that stores the accumulator.",
      "对于 RAM 写入，先找出存储累加器的操作码。",
    ],
    [
      "Keep that opcode selected and change phase. Writing must wait for execute.",
      "保持该操作码，改变阶段。写入必须等到执行阶段。",
    ],
    [
      "Now assert halt. It must suppress the write even when the other conditions match.",
      "再打开 halt，即使其他条件匹配，它也必须阻止写入。",
    ],
    [
      "Check that the completed bit enters the bus position listed in CPU reference.",
      "检查已完成的位是否接入 CPU 参考指定的总线位置。",
    ],
  ],
  "core-48": [
    [
      "Begin with the address leaving PC. Which memory uses it to select an instruction?",
      "从 PC 输出的地址开始，哪个存储器用它选择指令？",
    ],
    [
      "Check that the instruction reaches IR before following any execute-stage data.",
      "追踪执行阶段数据前，先检查指令是否到达 IR。",
    ],
    [
      "For LDI, follow the operand field. It must be available at the accumulator's data input.",
      "对于 LDI，追踪操作数字段，它必须到达累加器数据输入。",
    ],
    [
      "Correct data alone does not load a register. Inspect the accumulator's execute-stage enable.",
      "数据正确本身不会载入寄存器，检查累加器在执行阶段的使能。",
    ],
    [
      "For an arithmetic instruction, check the selected ALU operation before the register write.",
      "对于算术指令，先检查所选 ALU 运算，再检查寄存器写入。",
    ],
    [
      "Use the first failing test to choose the next path: RAM, jump, or output. Trace its data and permission separately.",
      "根据首个失败测试选择下一条路径：RAM、跳转或输出。分开追踪数据和许可。",
    ],
  ],
  "core-53": [
    [
      "Reserve different RAM locations for remaining work and completed iterations.",
      "为剩余工作量与已完成次数分配不同 RAM 位置。",
    ],
    [
      "Try a starting count of zero on paper. Where must the zero test go to skip the body?",
      "在纸上尝试初始计数为零，零判断应放在哪里才能跳过循环体？",
    ],
    [
      "After one iteration, remaining should decrease and iterations should increase.",
      "一轮后，剩余数应减少，已完成次数应增加。",
    ],
    [
      "Make sure the flag tested by the loop branch belongs to remaining, not to the iteration counter.",
      "确认循环分支检查的标志来自剩余数，而不是已完成次数。",
    ],
  ],
  "core-57": [
    [
      "First confirm that your polling loop reads one byte only when input is ready.",
      "先确认轮询循环仅在输入就绪时读取一个字节。",
    ],
    [
      "Check for newline before trying to turn the byte into a digit.",
      "尝试把字节转为数字前，先检查是否为换行。",
    ],
    [
      "The character '3' is byte 51. How far is it from the code for '0'?",
      "字符 '3' 是字节 51，它与 '0' 的编码相差多少？",
    ],
    [
      "Before appending a digit, the old number moves one decimal place left. Keep a copy while calculating its multiples.",
      "追加一位数字前，旧数值左移一个十进制位。计算倍数时保留旧值副本。",
    ],
    [
      "Try input 12 followed by newline. Observe the stored total after each digit rather than only the final output.",
      "尝试输入 12 后换行，逐个观察每位后的已存总和，不要只看最终输出。",
    ],
  ],
  "core-58": [
    [
      "Start with a value below 10. Which character code represents that units digit?",
      "从小于 10 的数开始，哪个字符编码表示该个位数字？",
    ],
    [
      "For a larger value, count successful subtractions before formatting the remainder.",
      "对于较大的数，先统计成功相减次数，再格式化余数。",
    ],
    [
      "Avoid subtracting when the remainder is smaller than the place value; unsigned arithmetic would wrap.",
      "余数小于该位权时不要相减，否则无符号运算会回绕。",
    ],
    [
      "A zero tens digit can be skipped for 7, but not for 107. Remember whether a higher digit was printed.",
      "7 可以跳过零十位，107 却不能。记住是否已输出更高位数字。",
    ],
    [
      "Always print the units digit, including when the original number is zero.",
      "始终输出个位，包括原数值为零时。",
    ],
  ],
  "project-16": [
    [
      "Try one long-division stage on paper: bring down a dividend bit into the remainder.",
      "在纸上尝试一级长除法：将一位被除数移入余数。",
    ],
    [
      "Compare this partial remainder with the divisor before subtracting.",
      "相减前，将部分余数与除数比较。",
    ],
    [
      "The subtraction decision also gives the next quotient bit.",
      "是否相减的判断也会给出下一位商。",
    ],
    [
      "Preserve the extra bit while shifting the remainder; dropping it can change the comparison.",
      "余数移位时保留额外位，丢弃它会改变比较结果。",
    ],
    [
      "Check b=0 separately. Select its specified outputs without using the ordinary division result.",
      "单独检查 b=0，选择指定输出，不使用普通除法结果。",
    ],
  ],
  "project-25": [
    [
      "Try push 4, push 9, then pop. Which slot must still hold 9?",
      "尝试压入 4、压入 9，再弹出。哪个槽还必须保存 9？",
    ],
    [
      "Keep occupancy separate from the byte values; zero can be valid stored data.",
      "将占用数与字节值分开，零也可能是有效数据。",
    ],
    [
      "On pop, move later occupied slots toward the read end together.",
      "弹出时，将后续已占用槽一起移向读取端。",
    ],
    [
      "Decide whether pop was requested before considering push, then apply the empty/full rules.",
      "考虑压入前，先判断是否请求弹出，再应用空、满规则。",
    ],
    [
      "Test both controls on at the same time, including when empty and when full.",
      "测试两控制同时打开的情况，包括空队列和满队列。",
    ],
  ],
  "project-26": [
    [
      "Try push 4 then push 9. With two stored values, the top is in slot 1.",
      "尝试压入 4 再压入 9，保存两个值时栈顶在槽 1。",
    ],
    [
      "For any nonempty stack, the top index is one below occupancy.",
      "对于任何非空栈，栈顶编号都比占用数小一。",
    ],
    [
      "Popping changes which slot is top; it need not move all the stored bytes.",
      "弹出改变哪个槽是栈顶，不必移动全部已存字节。",
    ],
    [
      "Handle pop priority before push, and do not decrement an empty stack's count.",
      "在压入前处理弹出优先级，不要递减空栈计数。",
    ],
    [
      "After filling all four slots, attempt another push and check that the existing top survives.",
      "填满四槽后再尝试压入，检查原栈顶仍保留。",
    ],
  ],
  "project-32": [
    [
      "Decode one ROM address into opcode, phase, flags, and halt fields.",
      "把一个 ROM 地址拆成操作码、阶段、标志和停机字段。",
    ],
    [
      "Find that condition in the control rules before choosing any output bits.",
      "选择输出位前，先在控制规则中找到该条件。",
    ],
    [
      "Pack one output bit into its documented position, leaving other bits zero for this check.",
      "将一个输出位放入说明指定的位置，此次检查先让其余位为零。",
    ],
    [
      "Compare a fetch row with an execute row for the same opcode.",
      "比较同一操作码的取指行与执行行。",
    ],
    [
      "Check halted and invalid-opcode rows too; a normal instruction row does not cover them.",
      "也检查停机行与无效操作码行，普通指令行不能覆盖这些情况。",
    ],
  ],
};
