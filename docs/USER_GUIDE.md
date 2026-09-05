# Using Loom

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

**Step** advances one rising clock edge; **Run/Pause** controls continuous execution. **Reset** restores declared register values, clears RAM and waveform history, and retains ROM contents and input switches.

Input switches can be toggled by double-clicking or edited numerically. Inspect signals as binary, decimal, or hexadecimal. `X` means unknown; binary format shows which individual bits are known.

Select a component, choose **Watch signal…**, and open **Debug**. Traces retain at most 512 samples and show the latest 80. A value breakpoint pauses after a settled clock edge. The Memory tab shows the selected RAM/ROM instance.

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

使用“平移画布”或按住空格拖动。滚动围绕指针缩放，Shift＋滚动平移，“适应电路”显示完整电路。框选或 Shift＋点击进行多选，可对齐、分布、复制和整体移动。撤销会同时恢复位置和走线。

“学习”提供七个检查点，每个都有起始电路、参考电路和行为测试。“封装子电路”把选中的内部逻辑变为可复用元件。进入子电路可检查实际逻辑门；多个实例共享定义，但各自保存独立的仿真状态。

“运行／暂停”控制连续执行，“单步”推进一个上升沿。“复位”恢复寄存器初值、清空 RAM 和波形，保留 ROM 程序。选择元件并添加观察信号，可以查看波形并设置数值断点。内存视图显示所选 RAM 或 ROM 实例。`X` 表示未知值，二进制格式可显示逐位状态。

打开 Loom 8 CPU 示例，汇编并加载求和程序后运行，输出应为 55。源代码修改后必须重新汇编才会改变 ROM。点击已汇编的行号设置断点；“指令单步”完成一条指令。进入 ALU，把 ADD 替换为 NAND 加法器后，可重新运行验证结果。

工程自动保存在当前浏览器。重要工程请导出 `.loom.json` 文件备份。第二个标签页需要复制工程后才能编辑。导入文件和恢复快照都创建副本。重新打开工程会重置运行状态，但保留电路、布局、走线、ROM、源代码、测试和学习进度。
