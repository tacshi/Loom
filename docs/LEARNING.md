# Learning in Loom

Open **Learn → Start course**. The course contains 60 core missions and 40 optional projects across ten chapters: signals, decisions, binary data, arithmetic, calculation selection, storage, memory and sequences, CPU construction, programming, and applications.

Each mission introduces its concept. Larger transitions also include a visible starting approach using earlier work; XOR can be built from the learner’s OR, AND, and NOT parts, without discovering the compact four-NAND design. **Worked example** explains a concrete case; at key transitions, **Example & prediction** offers a question with explanatory feedback. Predictions are optional and do not award mission completion.

Hints reveal one small decision or check at a time. Their number depends on the lesson; XOR has six and CPU assembly has seven. The last hint offers **View example** separately.

## One workspace, real work

Each mission has an unfinished circuit or program. Build, repair, or program the requested behavior, then use **Run tests**. There are no manually completed steps or separate practice/challenge copies. A valid solution can pass without opening a hint.

The lesson selector groups the curriculum by chapter and marks completed lessons with ✓. Select an available lesson to reopen its saved work. Locked lessons name their prerequisites and offer **Free practice**, which opens an unfinished circuit in a separate project without course credit. Core missions unlock in order. Each chapter's four optional projects unlock after its sixth core mission and do not block the core path. Completed work remains available to revisit. Core and optional progress are counted separately.

Hints and **View example** are optional. Examples are read-only and use a separate simulation; returning preserves the learner's circuit, input values, and undo history. Neither opening an example nor clicking navigation can award completion. **Next mission** appears after the current circuit passes authoritative checks.

**Pause course & experiment** opens a separate blank project with all components available. Use **Resume course** to return to your saved mission, including after reloading the app. Both projects remain available in **Projects**.

## Tests and debugging

**Run tests** displays inputs, expected outputs, actual outputs, and results. Selecting a case replays it in an isolated simulation. Playback pauses at the first mismatch; **Show connections** helps inspect a failed output. **Return to editing** restores the live circuit. Bit values use 0/1 and off/on labels. Bus values expand into bits; device tests display text or check pixels.

Clock controls appear for storage circuits. CPU programs can be stepped by instruction. Long verification runs independently of the 500 ms checkpoint playback, and replay retains bounded snapshots rather than all execution states.

**Debug** opens named inputs and outputs. **Signal history**, **Memory**, and **Breakpoints** provide detailed inspection when needed. Each signal has one graph: live while running, retained history while paused.

## Verification and saved work

Only current, passing checks award completion. Editing, cancellation, project changes, and mission switches prevent stale checks from awarding completion. Imported completion records require reverification. Verified components are immutable snapshots; optional-project components cannot bypass later core construction requirements.

Foundation AND/NOT primitives are restricted to their missions. Later missions may reuse the learner's verified NAND, including its approved internals; identity and content are checked before trusting this exception. Programming starters use the verified CPU, adding the verified I/O module for device programs.

Incompatible course files are rejected without changing the original file.

## 中文

打开 **学习 → 开始课程**。课程包括 60 个主线任务和 40 个选做项目，分为信号、判断、二进制数据、算术、运算选择、存储、内存与顺序、CPU、编程和应用十章。

每个任务先介绍概念。较大的学习跨度还会显示如何利用已有知识开始构建，例如异或可以组合已构建的或、与、非门，不要求自行发现四与非门设计。“例子”解释具体情况；关键转折处的“看例子，试着推想”提供问题和解释反馈。推想题可跳过，不会授予任务完成记录。

每个任务只有一个持续保存的工作区。构建、修复或编写要求的功能，再点击 **运行测试**。没有可以直接点击完成的步骤，也不需要在练习和挑战之间重复搭建。有效解法无需查看提示即可通过。

**任务目录**可浏览全部任务。主线按顺序解锁，每章完成第六个主线任务后开放四个互不依赖的选做项目。选做项目不会阻挡主线进度。

提示和 **查看示例** 均为可选。每条提示只推进一个小判断或检查，数量按任务决定：异或有六条，CPU 组装有七条。最后一条提示单独提供查看示例操作。示例只读，使用独立仿真；返回后保留自己的电路、输入值和撤销历史。查看示例或点击导航不会获得完成记录。通过正式检查后才显示 **下一个任务**。

测试显示输入、预期、实际和结果。失败时保留对应情况，可通过 **查看连接** 定位相关信号。**返回编辑** 恢复原电路。时钟和指令控件只用于相关电路。**调试** 默认显示输入与输出，其他检查通过 **信号历史**、**内存** 和 **断点** 打开。

只接受当前任务的正式验证结果。取消、修改电路或切换任务后，过期结果不能授予完成记录。导入的进度必须重新验证。不兼容的课程文件会被拒绝，不会覆盖原文件。
