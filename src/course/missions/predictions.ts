import type { Copy } from "../types";
import type { MissionId } from "./types";
export type Prediction = {
  question: Copy;
  choices: Copy[];
  answer: number;
  explanation: Copy;
};
export const predictions: Partial<Record<MissionId, Prediction>> = {
  "core-03": {
    question: [
      "AND receives a=1 and b=1. What does it output?",
      "与门收到 a=1、b=1，输出是什么？",
    ],
    choices: [
      ["0 (off)", "0（关）"],
      ["1 (on)", "1（开）"],
    ],
    answer: 1,
    explanation: [
      "AND needs both inputs on. Both are 1 here, so the output is 1.",
      "与门需要两个输入都打开。这里两者都是 1，因此输出为 1。",
    ],
  },
  "core-05": {
    question: [
      "NAND receives a=0 and b=0. What comes out?",
      "与非门收到 a=0、b=0，输出是什么？",
    ],
    choices: [
      ["0", "0"],
      ["1", "1"],
    ],
    answer: 1,
    explanation: [
      "AND first produces 0. NOT flips that to 1, so NAND outputs 1.",
      "与门先得到 0，非门将其翻转为 1，因此与非门输出 1。",
    ],
  },
  "core-09": {
    question: [
      "Both inputs are 1. What does XOR output?",
      "两个输入都为 1，异或输出什么？",
    ],
    choices: [
      ["0", "0"],
      ["1", "1"],
    ],
    answer: 0,
    explanation: [
      "XOR checks whether inputs differ. Two ones match, so the result is 0.",
      "异或判断输入是否不同。两个 1 相同，因此结果为 0。",
    ],
  },
  "core-11": {
    question: [
      "a=1, b=0, sel=1. Which value is selected?",
      "a=1、b=0、sel=1，选出的值是什么？",
    ],
    choices: [
      ["1 from a", "a 的 1"],
      ["0 from b", "b 的 0"],
    ],
    answer: 1,
    explanation: [
      "sel=1 chooses b. sel is a choice, so its own value is not copied to the output.",
      "sel=1 选择 b。sel 是选择信号，不会把它自身的值复制到输出。",
    ],
  },
  "core-13": {
    question: [
      "What is binary 0110 in decimal?",
      "二进制 0110 是十进制的多少？",
    ],
    choices: [
      ["3", "3"],
      ["6", "6"],
      ["110", "110"],
    ],
    answer: 1,
    explanation: [
      "The active positions are worth 4 and 2. Add them: 4+2=6; the rightmost position is worth 1.",
      "为 1 的两位分别值 4 和 2，相加得到 6；最右位值 1。",
    ],
  },
  "core-19": {
    question: [
      "Adding 1+1: which pair of outputs represents 2?",
      "计算 1+1，哪对输出表示 2？",
    ],
    choices: [
      ["carry=0, sum=1", "carry=0、sum=1"],
      ["carry=1, sum=0", "carry=1、sum=0"],
    ],
    answer: 1,
    explanation: [
      "The carry position is worth 2, so binary 10 means 2. The sum bit alone cannot represent 2.",
      "进位位置值 2，因此二进制 10 表示 2。仅和位无法表示 2。",
    ],
  },
  "core-23": {
    question: [
      "11111111 shows unsigned 255. What does it mean as signed eight-bit two's complement?",
      "11111111 无符号显示为 255，按八位补码有符号数解释是多少？",
    ],
    choices: [
      ["−1", "−1"],
      ["−255", "−255"],
      ["127", "127"],
    ],
    answer: 0,
    explanation: [
      "Negating 1 flips 00000001 to 11111110 and adds one: 11111111. Signed interpretation makes this −1.",
      "1 的 00000001 取反为 11111110，加一得到 11111111，因此有符号解释为 −1。",
    ],
  },
  "core-31": {
    question: [
      "q=0, en=1, rst=0. You change d to 1 without advancing the clock. What is q?",
      "q=0、en=1、rst=0。把 d 改为 1，但没有推进时钟，q 是多少？",
    ],
    choices: [
      ["0", "0"],
      ["1", "1"],
    ],
    answer: 0,
    explanation: [
      "q still holds 0. Changing d only prepares the next value; Advance clock captures it and changes q to 1.",
      "q 仍保存 0。改变 d 只是准备下一个值；推进时钟才会载入它，让 q 变为 1。",
    ],
  },
  "core-37": {
    question: [
      "You stored 42 at RAM address 3. What does reading address 3 return?",
      "把 42 存入 RAM 地址 3，读取地址 3 得到什么？",
    ],
    choices: [
      ["3", "3"],
      ["42", "42"],
    ],
    answer: 1,
    explanation: [
      "3 identifies the location. 42 is the value stored at that location.",
      "3 是位置编号，42 才是那个位置存储的值。",
    ],
  },
  "core-43": {
    question: [
      "In 0x0107, which part tells the CPU what action to take?",
      "0x0107 中，哪部分告诉 CPU 执行什么操作？",
    ],
    choices: [
      ["01: opcode", "01：操作码"],
      ["07: operand", "07：操作数"],
    ],
    answer: 0,
    explanation: [
      "The high byte 01 chooses LDI. The low byte 07 supplies its value, 7.",
      "高字节 01 选择 LDI，低字节 07 提供数值 7。",
    ],
  },
  "core-50": {
    question: [
      "RAM[3]=9. What does LDI 3 load into the accumulator?",
      "RAM[3]=9，LDI 3 向累加器载入什么？",
    ],
    choices: [
      ["3", "3"],
      ["9", "9"],
    ],
    answer: 0,
    explanation: [
      "LDI uses the number directly, so it loads 3. LDA 3 would instead read RAM address 3 and load 9.",
      "LDI 直接使用数字，所以载入 3。LDA 3 才会读取 RAM 地址 3 并载入 9。",
    ],
  },
  "core-57": {
    question: [
      "The keyboard sends character '7', byte 55. Which numeric digit should the parser use?",
      "键盘发来字符 '7'，字节值 55，解析器应使用哪个数值？",
    ],
    choices: [
      ["55", "55"],
      ["7", "7"],
    ],
    answer: 1,
    explanation: [
      "Subtract the code for '0': 55−48=7. The character code and the digit's numeric value are different.",
      "减去 '0' 的编码：55−48=7。字符编码与数字本身的值不同。",
    ],
  },
};
