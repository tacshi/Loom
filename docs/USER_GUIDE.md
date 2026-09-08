# Using Loom

## Guided course

Use **Learn → Start course** for 60 core missions and 40 optional projects. Build or program each mission in one continuous workspace; use optional hints and examples when needed. The early lessons teach AND and NOT before building NAND. See [Learning and visual tests](LEARNING.md) for the complete flow.

## Editing

Choose a component from **Components**. Its position and pins share a 20-unit grid. Select a component on the canvas or through **Circuit**; edit its name, bit width, and available parameters in the inspector.

Click an output pin, then an input pin to connect them. Inspector port buttons perform the same operation without precise pointer placement. While wiring, click blank canvas to add waypoints, press **R** to change preview orientation, or **Escape** to cancel. To branch, start from an input pin and click the existing wire.

Wires approach component pins horizontally and keep clear of component edges. Unrelated crossings use bridge arcs; actual branches use junction dots. Drag a segment to move its lane. The orange preview shows the candidate route; overlapping another signal is rejected. **Route** separates automatic routes and leaves pinned routes alone. Select an individual wire and choose **Reroute wire** to remove its manual constraints.

Drag blank canvas to select a group. Shift-click adds components to the selection. **Align** supports left/top alignment and horizontal/vertical distribution. Dragging a group preserves its internal wire geometry. A move and its routing changes form one undo step.

Use **Pan canvas**, or hold **Space** while dragging. Scroll zooms around the pointer; Shift-scroll pans. **Fit circuit** shows the whole circuit. **Select** returns to selection and cancels a pending wire.

| Shortcut | Action |
|---|---|
| Cmd/Ctrl Z | Undo |
| Cmd/Ctrl Shift Z | Redo |
| Cmd/Ctrl A | Select all components |
| Cmd/Ctrl C / V | Copy / paste selected components and internal wires |
| Cmd/Ctrl D | Duplicate |
| Delete / Backspace | Delete selection |
| Escape | Cancel wiring, drag, or dialog |
| Cmd/Ctrl K | Search the component library |

Text fields retain their normal editing shortcuts. Component names and functional labels stay on one line; the inspector exposes the complete name.

## Hierarchy and replacement

Select connected logic and choose **Create subcircuit**. Boundary connections become stable interface ports. Existing interface components stay in the parent circuit. Enter a subcircuit by double-clicking it or choosing **Open subcircuit**; use the breadcrumb to return. Editing a definition updates every instance, while each instance has independent runtime storage.

**Replace component…** shows port mappings and checks direction/width compatibility. **Verify behavior** compares outputs before and after clock edges. Replacement stays disabled if the checks fail. Large interfaces use deterministic samples, not a formal equivalence proof. The dedicated **Replace with NAND adder** command inserts an actual gate-built adder whose supported widths are covered by regression tests.

## Simulation and debugging

**Advance clock** advances one rising clock edge; **Run clock/Pause** controls continuous execution. Early combinational lessons instead use **Run tests** to show input cases and expected/actual outputs. **Reset** restores declared register values, clears RAM and waveform history, and retains ROM contents and input switches.

Input switches can be toggled by double-clicking or edited numerically. Inspect signals as binary, decimal, or hexadecimal. `X` means unknown; binary format shows which individual bits are known.

Open **Debug** for named inputs and outputs. For unknown outputs or failed tests, use **Show connections** to inspect the connected components and wires. Choose **Signal history** to inspect history or **Breakpoints** to configure stops. Select a component and choose **Watch signal…** to add another trace. Traces retain at most 512 samples and show the latest 80. A value breakpoint pauses after a settled clock edge. The Memory tab shows the selected RAM/ROM instance.

Click a diagnostic to locate its source. Structural errors prevent execution. Undriven inputs remain unknown instead of silently becoming zero.

## Programs

Choose a ROM and use **Assemble & load**. The CPU assembler expects a 256-word, 16-bit ROM. Decimal values, `0x` hexadecimal values, labels, and semicolon comments are supported. Assembly errors link to their source lines. Editing source does not change ROM until assembly succeeds.

Click a compiled line number for a source breakpoint. It stops before that instruction is fetched. **Step instruction** completes the current instruction, or performs fetch and execute when starting at an instruction boundary.

## Saving

**Saved locally** means the storage transaction completed. A second tab can inspect a project but must duplicate it before editing. Imports are validated and opened under a new project identity; they never overwrite the current project. Recovery snapshots also open as copies.

Browser storage can be cleared or evicted. Keep independent `.loom.json` exports for important work. Runtime register/RAM state and waveforms are intentionally reset on reopening; circuit definitions, ROM images, source, tests, routes, and checkpoint progress persist.

# 中文使用说明

在“元件”中添加元件，在“电路”中按名称定位。点击输出引脚，再点击输入引脚即可连线；属性面板中的引脚按钮支持相同操作。连线时点击空白处设置拐点，按 R 切换预览方向，按 Escape 取消。

导线以水平线进入引脚，不沿元件边缘走线。不同信号的交叉显示跨线弧，实际分支显示连接点。拖动线段可调整通道；橙色预览表示候选路径。“布线”仅整理自动路径，手动路径需要选中后单独重新布线。

使用“平移画布”或按住空格拖动。滚动围绕指针缩放，Shift＋滚动平移，“显示完整电路”显示完整电路。框选或 Shift＋点击进行多选，可对齐、分布、复制和整体移动。撤销会同时恢复位置和走线。

“学习 → 开始课程”提供 20 个连续练习，每个都有草稿、只读参考电路、分层提示和行为检查；验证后的元件可在后续练习中复用。“封装子电路”把选中的内部逻辑变为可复用元件。进入子电路可检查实际逻辑门；多个实例共享定义，但各自保存独立的仿真状态。

“运行／暂停”控制连续执行，“单步”推进一个上升沿。“复位”恢复寄存器初值、清空 RAM 和信号历史，保留 ROM 程序。选择元件并添加观察信号，可以查看信号历史并设置数值断点。内存视图显示所选 RAM 或 ROM 实例。`X` 表示未知值，二进制格式可显示逐位状态。

打开 Loom 8 CPU 示例，汇编并加载求和程序后运行，输出应为 55。源代码修改后必须重新汇编才会改变 ROM。点击已汇编的行号设置断点；“指令单步”完成一条指令。进入 ALU，把 ADD 替换为 NAND 加法器后，可重新运行验证结果。

工程自动保存在当前浏览器。重要工程请导出 `.loom.json` 文件备份。第二个标签页需要复制工程后才能编辑。导入文件和恢复快照都创建副本。重新打开工程会重置运行状态，但保留电路、布局、走线、ROM、源代码、测试和学习进度。

## V2: larger circuits and interactive programs

**Nets and layout.** Circuit → Named connections lists electrical connections independently of their drawing. Select a net to rename it, highlight all its routes, or attach a compatible port explicitly. A name never connects two nets. Named markers can replace a drawn connection without removing electrical membership. Use Appearance & pins to rotate a component or change its grid bounds and pin slots. Failed routing changes are rejected; Undo changes the document, while Back one cycle changes simulation history.

**Libraries.** Libraries exports a circuit and its nested dependencies as a `.loom-component.json` package. Each installed version has an immutable SHA-256 content hash. Add to project embeds copies, so the catalog is not required when reopening offline. A pinned instance offers Make editable local copy. Export the edited copy with a newer version number and use Review update in the old project. Review interface mappings and tests before applying behavior changes. This is distinct from equivalent-component replacement.

**History.** Debug → Signal history offers retained runs, cycle/event seeking, backward cycle/instruction steps, and two measurement cursors. Instruction steps appear only for CPUs. Each signal has one graph: live while running, retained history while paused. Seek pauses execution. Continuing from history branches into a new run; select an older run to compare it. Up to four runs share a 10,000-cycle and 64 MiB accounted-storage budget. Complete checkpoint segments are evicted. History is never saved in project files. Topology, parameter and ROM edits reset the simulation session; positions and names preserve it. Inspect transaction rows for clock-qualified device reads and writes.

**Memory and devices.** Select a RAM or ROM component to inspect its paged editor. Pause before changing words or importing a `.bin` or hexadecimal `.hex`/`.txt` image. Imports start at the selected address; binary words default to little endian. RAM changes are runtime events and can be rewound. ROM changes update the project and reset history. Devices shows only the selected simulation's peripherals. Send input queues exact UTF-8 bytes; Send line appends a newline. The keyboard queue holds 256 bytes. The terminal retains its most recent 65,536 bytes and the display has 64 × 32 monochrome pixels.

**Calculator.** Choose Loom 8 I/O · Calculator, type `12+34`, and Send line. Run at 1000 Hz or higher. The terminal prints `46`. Operands range from 0 to 255; addition and subtraction produce results from −255 to 510. Invalid expressions print `?` and discard the rest of that line. The CPU assembly program performs parsing, validation, arithmetic and decimal formatting. Browser code only queues bytes and displays peripheral state.

**Saved tests.** Open Saved tests to run stored cases or expand Add test case. Each step can set inputs or queue device bytes, advance clocks, and assert a signal, memory word, terminal text or pixel. Known-bit masks allow exact X expectations. Append steps, then save the case. Inspect failed test uses an isolated execution; Return to live circuit restores the previous simulation. Create test from this run records retained stimuli with the configured assertion. Capture requires the run's original reset point to remain retained.

## V2 中文操作

- **命名网络与布局：** 在“电路 → 命名网络”中检查电气连接。名称不会自动合并网络；必须明确连接兼容引脚。外观与引脚支持旋转、网格尺寸和引脚位置。无法完成的布线编辑会被拒绝。
- **元件库：** 导出包含完整依赖的元件包，导入后添加到工程。工程内嵌副本可离线使用。固定版本不可直接修改；先创建可编辑本地副本，再导出新版本。更新前检查接口映射和测试结果。
- **历史：** 调试面板支持周期与事件定位、回退、运行分支及两个测量游标。历史仅在当前会话有效，不写入工程文件。修改接线、参数或ROM会重置历史；移动与重命名不会。
- **内存与外设：** 暂停后可编辑RAM/ROM或导入内存镜像，注意起始地址、字宽和字节序。“发送输入”提交原始UTF-8字节，“发送一行”追加换行。RAM编辑可回退；ROM编辑会重置会话。
- **计算器：** 打开“Loom 8 I/O · 计算器”，输入`12+34`并发送一行，运行后得到`46`。`255+255`得到`510`，`0-255`得到`-255`。非法输入显示`?`，下一行可以重新输入。计算逻辑全部在可编辑CPU电路上的汇编程序中执行。
- **顺序测试：** 定义激励、时钟周期与断言，追加步骤后保存。失败可在独立调试运行中检查；返回原运行不会丢失原状态。录制测试要求仍保留完整运行起点。

## Seven-segment projects

Open example offers **Hexadecimal decoder**, **Hexadecimal counter**, **ROM hexadecimal display**, and **Loom 8 I/O · seven-segment display**. The decoder accepts four-bit `value` and produces eight-bit `segments`: bits 0–6 drive a–g, and bit 7 drives the decimal point. Hexadecimal glyphs are 0–9, A, b, C, d, E and F. Lit segments are green; unknown signals are amber.

After the course's bus-selection lesson, build and check the decoder. **Try in counter** copies your accepted decoder and its dependencies into a separate counter project. Enable advances the counter; Reset returns it to zero. Your course remains in Projects.

In the ROM example, select **Lookup** in Circuit. Download the [plain-hex lookup table](../public/rom/seven-segment.hex), set **Start address** to 0, then choose **Import memory**. Import replaces only the words starting at the selected address. **Export hex** and **Export binary** save the entire ROM. Hex files contain whitespace-separated hexadecimal words, not Intel HEX records. This eight-bit table has one byte per word; byte order does not change it.

The CPU example starts at 2 Hz and writes each glyph to F7, then halts. Use Run clock or Advance clock to follow the sequence. Edit its commented assembly in Program and choose Assemble & load to run your version. Project export/import preserves circuits and ROM images; runtime history is session-only.

七段数码管示例包括逻辑译码器、计数器、ROM 查表和 CPU 驱动显示。位 0–6 对应 a–g，位 7 对应小数点。课程译码器通过检查后，选择“用于计数器”可在独立工程中运行自己的元件。ROM 文件从所选地址开始导入；导出包含全部 ROM。F7 为段码寄存器，写入 0 可熄灭显示。


## Help and problem reports

Open **Help** for course, example, wiring and export directions plus keyboard shortcuts. **Copy bug report** copies the app version, build commit and browser information, followed by blank reproduction/expected/actual fields. Add your steps before sharing it. If clipboard access fails, select and copy the displayed text. Project contents and names are not included, and nothing is uploaded automatically.

Canvas notices do not move the circuit. Selecting an already visible component preserves the viewport; Fit circuit restores the full overview. New components are placed clear of existing bodies. Paused edits paint immediately, including after native Safari file dialogs.

打开“帮助”可查看入门操作和快捷键。“复制问题报告”只包含版本、构建提交、浏览器信息及待填写的复现步骤；不包含工程名称或内容，也不会自动上传。剪贴板不可用时，可选中显示的报告手动复制。


## Reusable components

**8-bit shift register** is an editable subcircuit under Memory & state. On each clock edge it resets, loads `parallelIn`, shifts toward bit 7 with `serialIn` entering bit 0, or holds, in that priority order. `serialOut` exposes bit 7. Open the serial/parallel example to try it; Open subcircuit shows its registers and gates.

“8 位移位寄存器”位于自由工程的存储分类。每个时钟边沿按复位、并行载入、移位、保持的优先级处理；串行输入进入位 0，串行输出为位 7。可进入子电路检查内部逻辑。

**8-input priority encoder** is under Arithmetic & buses. It reports the highest asserted request (7 wins over 0). With no request, valid and index are zero. The example exposes eight switches and output probes.

“8 路优先编码器”输出编号最大的有效请求；无请求时 valid 和 index 均为 0。

**Push button** drives 1 while held and 0 when released. Press its center on the canvas or use **Hold** in the Inspector with the pointer, Space or Enter. Drag its outer body to move it. It releases on cancellation, focus loss and reset; it does not clock the circuit automatically. The counter-reset example demonstrates it. Held state is recorded in runtime history, not saved as a project default.

“按钮（按住有效）”按住时输出 1，松开时输出 0；属性中的“按住”支持空格和回车。失去焦点、取消或复位会释放按钮。按钮本身不会推进时钟。


## Shared buses

**Tri-state buffer** has data, enable and output ports, with widths 1–32. Disabled outputs are high impedance (`Z`); enabled outputs drive data. Unknown enables produce `X`. Connect multiple outputs to the same input or attach them through Named connections. Any ordinary output remains an active driver.

A floating bus reads `Z`. Agreeing drivers resolve to their shared value; opposing drivers produce `X` and a Bus contention diagnostic listing the net, conflicting bits and drivers. Simulation remains inspectable. Logic and storage treat floating inputs as unknown; wiring and subcircuit boundaries preserve `Z`. Binary formatting shows mixed bits individually; mixed indeterminate decimal/hex values show `X`.

Open **Shared tri-state bus** to try disabled, driven and conflicting states. Sequential signal assertions accept a high-impedance mask; known and high-impedance masks must not overlap. Input history, rewind and traces retain four-state values. There are no pull resistors, drive strengths or bidirectional ports.

“三态缓冲器”禁用时输出高阻 Z，启用时驱动数据。共享总线允许多个输出；相反的确定值产生 X 并报告驱动冲突。逻辑和存储将浮空输入视为未知，布线与子电路边界保留 Z。示例“共享三态总线”演示断开、驱动和冲突状态。
