import type { Checkpoint } from "./checkpoints";
import { fullAdder } from "../examples/adder";
import { counterExample } from "../examples/sequential";
import { ioProject, echoSource } from "../cpu/ioCircuit";
import { calculatorProject } from "../cpu/calculator";
import { removeRouteConnection } from "../model/nets";
function named() {
  const p = fullAdder();
  for (const n of p.circuits[p.root].nets) n.name = n.ports[0].component;
  return p;
}
function echo() {
  const p = ioProject(echoSource);
  p.circuits[p.root].tests = [
    {
      id: "echo",
      name: "UTF-8 echo",
      maxCycles: 200,
      seed: 12345,
      steps: [
        {
          keyboard: [
            {
              component: {
                instancePath: ["RAM"],
                componentId: "Keyboard",
                portId: "data",
              },
              text: "Hello, 世界\n",
            },
          ],
          cycles: 200,
          assertions: [
            {
              type: "terminal",
              ref: {
                instancePath: ["RAM"],
                componentId: "Terminal",
                portId: "data",
              },
              text: "Hello, 世界\n",
            },
          ],
        },
      ],
    },
  ];
  return p;
}
export const v2Checkpoints: Checkpoint[] = [
  {
    id: "named-nets",
    title: ["Named nets & pin layout", "命名网络与引脚布局"],
    objective: [
      "Reorganize an adder while keeping its electrical connections.",
      "重新布局加法器并保持电气连接。",
    ],
    steps: [
      [
        "Open Circuit → Named nets. Select a net and name it. Renaming does not connect another net.",
        "打开电路 → 命名网络，选择网络并命名。重命名不会连接其他网络。",
      ],
      [
        "Select a connected port and create a named marker. Attach another compatible port explicitly.",
        "选择已连接引脚并创建命名标记，再明确连接兼容引脚。",
      ],
      [
        "Rotate a gate in Appearance & pins. Inspect each approach, undo, and run the eight truth-table cases.",
        "在外观与引脚中旋转逻辑门，检查引线，撤销并运行八组真值表测试。",
      ],
    ],
    reference: named,
    starter: named,
  },
  {
    id: "libraries",
    title: ["Versioned component libraries", "元件库版本"],
    objective: [
      "Reuse a packaged component without changing an older project.",
      "复用打包的元件，同时保持旧工程不变。",
    ],
    steps: [
      [
        "Select the adder gates and create a subcircuit with its input and output interface.",
        "选择加法器逻辑门，创建包含输入输出接口的子电路。",
      ],
      [
        "In Libraries, export that definition as version 1. Import the package in another project and Add to project.",
        "在元件库中导出定义的版本1，再于另一工程导入并添加到工程。",
      ],
      [
        "Select a pinned instance and make an editable local copy. Publish a newer version and review changes before applying it.",
        "选择固定版本实例并创建可编辑副本，发布新版本后先检查更改再应用。",
      ],
    ],
    reference: named,
    starter: named,
  },
  {
    id: "history",
    title: ["Rewind & branch execution", "回退与分支执行"],
    objective: [
      "Compare a counter before and after an input change.",
      "比较改变输入前后的计数器状态。",
    ],
    steps: [
      [
        "Watch Count:q, run the clock and pause. Open Debug and select an earlier cycle.",
        "监视Count:q，运行时钟后暂停，打开调试并选择更早周期。",
      ],
      [
        "Set two measurement cursors and inspect waveform values. Change Enable in the past and step to create a new run.",
        "设置两个测量游标，检查波形值。在历史位置改变Enable并单步，创建新运行。",
      ],
      [
        "Select the previous run to compare it. Layout edits preserve history; wiring edits start a new session.",
        "选择先前运行进行比较。布局编辑保留历史，接线编辑开启新会话。",
      ],
    ],
    reference: counterExample,
    starter: counterExample,
  },
  {
    id: "io",
    title: ["Clocked device transactions", "时钟驱动的外设事务"],
    objective: [
      "Send UTF-8 bytes through the editable memory-mapped I/O circuit.",
      "通过可编辑的内存映射I/O电路发送UTF-8字节。",
    ],
    steps: [
      [
        "Open Memory & I/O. Follow the F1 read decoder into Keyboard.read and F2 writes into Terminal.write.",
        "打开Memory & I/O，跟踪F1读取解码到Keyboard.read，以及F2写入到Terminal.write。",
      ],
      [
        "In Devices, enter text and Send line. Run at 1000 Hz, then pause and inspect the terminal and transaction list.",
        "在外设中输入文本并发送一行。以1000Hz运行，暂停后检查终端与事务列表。",
      ],
      [
        "Rewind before a keyboard read. The byte returns to the queue; resuming consumes it once.",
        "回退到键盘读取前，字节会回到队列；继续执行时只消费一次。",
      ],
    ],
    reference: echo,
    starter: () => {
      const p = echo(),
        id = p.circuits[p.root].components.find(
          (c) => c.id === "RAM",
        )!.definitionId!,
        c = p.circuits[id],
        w = c.wires.find(
          (w) => w.to.component === "Terminal" && w.to.port === "write",
        )!;
      removeRouteConnection(c, w.id);
      return p;
    },
  },
  {
    id: "calculator",
    title: ["Calculator & regression tests", "计算器与回归测试"],
    objective: [
      "Verify arithmetic, rewind a run, and capture a reproducible failure.",
      "验证算术、回退运行并记录可复现的失败。",
    ],
    steps: [
      [
        "Open Devices. Send lines 12+34, 255+255 and 0-255. Run to see 46, 510 and -255.",
        "打开外设，发送12+34、255+255、0-255三行，运行并观察46、510、-255。",
      ],
      [
        "Open Sequential tests and run the acceptance case. Introduce a fault in ALU.ADD, rerun, and open the failure in Debug.",
        "打开顺序测试运行验收用例，在ALU.ADD中引入故障，再次运行并在调试器查看失败。",
      ],
      [
        "Repair the circuit, rerun tests, export the project and run loom test on the same file.",
        "修复电路、重跑测试、导出工程，并对同一文件运行loom test。",
      ],
    ],
    reference: calculatorProject,
    starter: calculatorProject,
  },
];
