# Learning through visible behavior

Open **Learn → Start course**. The course begins with signals and wires, AND, and NOT before asking you to build NAND from AND followed by NOT. NAND is off only when both inputs are on. The following lessons rebuild gates using NAND, then develop arithmetic, memory, a CPU, and a calculator: 23 lessons in total.

Each lesson has three stages:

- **Explore** opens a separate demonstration. Use the debugger's named input controls to try the suggested values. The NAND demonstration includes four predictions you can check.
- **Practice** supplies the parts without wires and shows one construction step at a time. This working circuit is saved separately from the challenge.
- **Challenge** opens your independent circuit. Only a passing authoritative check of this circuit can save a verified component and unlock the next lesson.

Use **Lessons** to open the grouped curriculum. The sidebar otherwise shows the current task. Demonstrations, practice, and hints do not grant completion. Foundation AND/NOT gates are available only in their lessons; later lessons can reuse the verified NAND that contains them. Imported completion records must be verified before dependent lessons become available. The current curriculum format is required; older course formats are rejected without rewriting the file.

## Tests

**Run tests** shows inputs, expected outputs, actual outputs, and a result for each checkpoint. Playback advances every 500 ms and pauses at a mismatch. **Next case** steps through checkpoints; **Show result** goes directly to the first mismatch or final checkpoint. Select any recorded row to replay it on the canvas.

Playback runs separately from your editable circuit and live simulation. **Return to editing** restores the original live view and input state. Editing invalidates earlier results. Long CPU and device checks run in a worker; playback shows their meaningful checkpoints rather than slowing down every cycle. Replay reconstructs only the requested checkpoint, so full per-cycle snapshots are not retained.

Bit values include both text and a lamp. Expand a bus value to inspect its bits. Terminal assertions show expected and actual text. Display assertions and canvas displays use the replayed signal values. `Z` means no driver; `X` means the value is not determined. Neither is silently shown as zero.

## Debugging

**Debug** starts with named inputs, outputs, and stored values. Change inputs to observe behavior. An output's **Trace this output** action shows its upstream signals and highlights their components and connections on the canvas. It reports observed values rather than guessing which component is faulty.

Choose **Waveforms**, **Memory**, or **Breakpoints** when you need those tools. Memory is offered when the current circuit contains memory; low-level live tools are disabled while viewing an isolated test checkpoint. Test results remain in the visual test panel.

Combinational lessons do not display clock controls or cycle counters. Memory lessons introduce **Advance clock** and **Run clock**, with previous and current stored values. CPU projects also support instruction stepping and the current program counter/instruction display. Clock execution does not automatically vary input signals.

Standalone examples are grouped by concept and include a purpose and a suggested experiment. Projects without expected test results show observed behavior only; they are never labelled as passing an invented test.

## 中文

打开 **学习 → 开始课程**。课程先讲信号与导线、与门、非门，再用与门接入非门构建与非门。随后用与非门重建逻辑门，逐步构建算术、存储、CPU 和计算器，共 23 课。

**观察** 使用独立的演示电路，可切换命名输入；**练习** 提供未连线的元件和逐步指导；**挑战** 是单独保存的独立电路。只有挑战通过完整检查才能记录完成并解锁后续课程。通过 **课程目录** 查看分组进度。演示、练习与提示都不授予完成记录。

**运行测试** 显示输入、预期、实际和结果，每 500 毫秒播放一个检查点，遇到不符即暂停。可以选择行、进入下个测试或直接查看结果。**返回编辑** 恢复原来的实时状态与输入。修改电路会使旧结果失效。长程序在工作线程中验证，仅按需重建要查看的检查点。

**调试** 默认显示命名输入、输出与存储值。**追踪此输出** 显示上游信号并在画布上突出相关元件和连接。波形、内存与断点分别打开。组合逻辑课程不显示时钟控制；存储课程才引入推进时钟、运行时钟及状态前后对比，CPU 还可按指令单步。

导入的完成记录需要重新验证。只接受当前课程格式，不转换旧格式，也不覆盖原文件。
