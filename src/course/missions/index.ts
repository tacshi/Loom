import { progressiveHints } from "./hintProgression";
import { forkDefinition, closure } from "../../library/package";
import { requirements } from "./requirements";
import "./special";
import {
  logicTasks,
  logicReference,
  logicStarter,
  logicChecks,
} from "./combinational";
import {
  stateTasks,
  stateReference,
  stateStarter,
  stateChecks,
} from "./sequential";
import {
  programTasks,
  programReference,
  programStarter,
  programChecks,
} from "./programs";
import {
  applicationTasks,
  applicationReference,
  applicationStarter,
} from "./applications";
import { specialTasks } from "./special";
import { coreTitles, projectTitles, chapterConcepts } from "./catalog";
import type { Mission, MissionId } from "./types";
import type { Kind, Project } from "../../model/types";
const cache = new Map<string, Project>();
export const missions: Mission[] = [
  ...coreTitles.map((title, i) => ({
    title,
    track: "core" as const,
    n: i + 1,
  })),
  ...projectTitles.map((title, i) => ({
    title,
    track: "project" as const,
    n: i + 1,
  })),
].map(({ title, track, n }) => {
  const id = `${track}-${String(n).padStart(2, "0")}` as MissionId,
    chapter = Math.ceil(n / (track === "core" ? 6 : 4));
  const logic = logicTasks[id],
    state = stateTasks[id],
    program = programTasks[id],
    app = applicationTasks[id],
    special = specialTasks[id];
  if ([logic, state, program, app, special].filter(Boolean).length !== 1)
    throw new Error(`Mission factory missing or duplicated: ${id}`);
  const reference = () => {
    let p = cache.get(id);
    if (!p) {
      p = logic
        ? logicReference(logic, id)
        : state
          ? stateReference(state, id)
          : program
            ? programReference(program)
            : app
              ? applicationReference(app)
              : special.reference();
      p.root = forkDefinition(p, p.root);
      p.circuits = closure(p, p.root);
      if (p.cpu)
        p.debugProfile = {
          pc: { instancePath: [], componentId: "PC", portId: "q" },
          instructionBoundary: {
            ref: { instancePath: [], componentId: "Phase", portId: "q" },
            value: 0,
          },
          halt: { instancePath: [], componentId: "Halt", portId: "q" },
          invalid: {
            instancePath: ["Control"],
            componentId: "invalid",
            portId: "in",
          },
          program: { instancePath: [], componentId: "Program", portId: "out" },
          registers: [
            {
              label: "Accumulator",
              ref: { instancePath: [], componentId: "ACC", portId: "q" },
            },
          ],
        };
      cache.set(id, p);
    }
    return structuredClone(p);
  };
  const boundary = track === "core" ? n : chapter * 6;
  const allowed: Kind[] = ["input", "probe", "constant", "portIn", "portOut"];
  if (boundary >= 5 && id !== "core-05") allowed.push("nand");
  if (boundary >= 13) allowed.push("split", "join");
  if (id === "core-03" || id === "core-05") allowed.push("and");
  if (id === "core-04" || id === "core-05") allowed.push("not");
  if (boundary >= 31) allowed.push("dff");
  if (boundary >= 33) allowed.push("register");
  if (boundary >= 37) allowed.push("ram");
  if (boundary >= 39) allowed.push("rom");
  if (boundary >= 40) allowed.push("triState");
  if (id === "core-18" || boundary >= 55) allowed.push("sevenSegment");
  if (boundary >= 55) allowed.push("keyboard", "terminal", "display");
  const sourceTask = !!(program || app);
  if (!requirements[id] || !progressiveHints[id])
    throw new Error(`Mission requirements missing: ${id}`);
  const hints = progressiveHints[id];
  return {
    id,
    chapter,
    track,
    work: sourceTask
      ? "program"
      : ["project-01", "project-02", "project-29", "project-30"].includes(id)
        ? "repair"
        : "construction",
    title,
    goal: requirements[id],
    concept: chapterConcepts[chapter - 1],
    supplied:
      id === "core-48"
        ? [
            "Registers and memories are supplied, along with your verified fields, control, adder, and an arithmetic wrapper. Keep these parts and wire them together.",
            "已提供寄存器、内存，以及你验证过的指令字段、控制、加法器和算术组合模块。保留这些部分并完成连接。",
          ]
        : id === "project-01"
          ? [
              "An indicator circuit is supplied with one disconnected connection.",
              "已提供指示电路，其中一处连接断开。",
            ]
          : id === "project-02"
            ? [
                "Two signal paths are supplied with crossed outputs.",
                "已提供两条信号路径，但输出接反了。",
              ]
            : sourceTask
              ? [
                  "A working CPU and memory are supplied. Complete the program.",
                  "已提供可运行的 CPU 和内存。请完成程序。",
                ]
              : state
                ? [
                    `Supplied storage: ${state.supplied.join(", ") || "none"}. Inputs and outputs are already placed.`,
                    `已提供的存储元件：${state.supplied.join("、") || "无"}。输入和输出已放置。`,
                  ]
                : [
                    "Inputs and outputs are already placed. Add the parts and connections needed between them.",
                    "输入和输出已放置。请在它们之间添加所需元件和连接。",
                  ],
    hints,
    prerequisites:
      track === "core"
        ? n > 1
          ? [`core-${String(n - 1).padStart(2, "0")}` as MissionId]
          : []
        : [`core-${String(chapter * 6).padStart(2, "0")}` as MissionId],
    mode:
      sourceTask || id === "core-48" || id === "project-30"
        ? "cpu"
        : state || id === "core-55"
          ? "clock"
          : "logic",
    allowed,
    reference,
    starter: () =>
      logic
        ? logicStarter(logic, id)
        : state
          ? stateStarter(state, id)
          : program
            ? programStarter(program)
            : app
              ? applicationStarter(app)
              : special.starter(),
    checks: () =>
      logic
        ? logicChecks(logic)
        : state
          ? stateChecks(state)
          : program
            ? programChecks(program)
            : app
              ? app.checks()
              : special.checks(),
  };
});
