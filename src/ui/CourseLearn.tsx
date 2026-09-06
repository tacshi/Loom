import { signalLabel } from "../model/nets";
import { useEffect, useRef, useState } from "react";
import type { Project } from "../model/types";
import { emptyProject } from "../model/types";
import type { CourseCheck, ExerciseId, CourseResponse } from "../course/types";
import { exercises, exercise, courseReference } from "../course/registry";
import {
  newCourse,
  available,
  activateExercise,
  acceptCheck,
  nextExercise,
  electricalHash,
} from "../course/session";
export default function CourseLearn({
  project,
  lang,
  open,
  edit,
  inspect,
  reference,
  t,
  isolated,
}: {
  isolated: boolean;
  t: (key: string) => string;
  project: Project;
  lang: "en" | "zh";
  open: (p: Project) => Promise<void>;
  edit: (f: (p: Project) => void) => boolean;
  inspect: (r: CourseCheck) => void;
  reference: (p: Project) => void;
}) {
  const zh = lang === "zh",
    label = (en: string, cn: string) => (zh ? cn : en),
    index = zh ? 1 : 0;
  const signalValue = (value: unknown, expected?: unknown) => {
    if (
      value &&
      typeof value === "object" &&
      "value" in value &&
      "known" in value
    ) {
      const v = value as { value: number; known: number };
      const target = expected as { known?: number } | undefined;
      return v.known === 0 || (target && v.known !== target.known)
        ? "X"
        : String(v.value);
    }
    return typeof value === "string" ? JSON.stringify(value) : String(value);
  };
  const message = (text: string) => {
    const messages: Record<string, string> = {
      "Complete prerequisite checks first": "请先通过前置练习的检查。",
      "Check your own course draft": "请检查自己的课程草稿。",
      "Match the exercise interface: port IDs, directions and widths":
        "请保留练习接口的引脚 ID、方向和位宽。",
      "Circuit changed; check again": "电路已改变，请重新检查。",
      "This exercise has a fixed interface; use width variants on gate, mux or arithmetic components.":
        "本练习使用固定接口；请在逻辑门、选择器或算术元件中使用位宽参数。",
    };
    if (zh && messages[text]) return messages[text];
    if (text.startsWith("undriven: "))
      return t("undriven") + " " + text.slice(10);
    if (text.startsWith("Component not allowed: "))
      return (
        label("Component not allowed: ", "不允许使用元件：") + text.slice(23)
      );
    if (text.startsWith("Width variant did not pass: "))
      return (
        label("Width variant did not pass: ", "位宽变体未通过：") +
        text.slice(28)
      );
    return text
      .split(", ")
      .map((k) => t(k))
      .join(", ");
  };
  const [checking, setChecking] = useState<ExerciseId>();
  const [selected, setSelected] = useState<ExerciseId>(
      project.course?.active ?? "nand",
    ),
    [result, setResult] = useState<CourseCheck>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [hash, setHash] = useState("");
  const stop = useRef<() => void>(() => {});
  const worker = useRef<Worker | null>(null),
    request = useRef(0),
    current = useRef(project);
  current.current = project;
  const callbacks = useRef({ edit });
  callbacks.current = { edit };
  useEffect(() => {
    setSelected(project.course?.active ?? "nand");
    setResult(undefined);
    setError("");
    stop.current();
    setBusy(false);
    request.current++;
  }, [project.id, project.course?.active]);
  useEffect(() => () => stop.current(), []);
  useEffect(() => {
    let live = true;
    const root = project.course?.drafts[selected];
    if (root)
      void electricalHash(project, root).then((h) => {
        if (live) setHash(h);
      });
    else setHash("");
    return () => {
      live = false;
    };
  }, [project.circuits, project.root, project.course?.drafts, selected]);
  const spec = exercise(selected),
    active = project.course?.active === selected,
    record = project.course?.accepted[selected],
    passed =
      !!record &&
      record.hash === hash &&
      record.exerciseRevision === spec.revision &&
      !project.course?.needsVerification;
  function check(reverify = false) {
    stop.current();
    const w = new Worker(new URL("../course/worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    const id = ++request.current;
    setBusy(true);
    setError("");
    setResult(undefined);
    const timedOut = () => {
      w.terminate();
      if (request.current === id) {
        setBusy(false);
        setError(
          label(
            "Check limit reached. Simplify the circuit and retry.",
            "检查超时，请简化电路后重试。",
          ),
        );
      }
    };
    let timer = setTimeout(timedOut, 60000);
    stop.current = () => {
      clearTimeout(timer);
      w.terminate();
    };
    w.onmessage = async ({
      data,
    }: {
      data: CourseResponse & { project?: Project };
    }) => {
      if (data.requestId !== request.current) return;
      if (data.progress) {
        clearTimeout(timer);
        timer = setTimeout(timedOut, 60000);
        setChecking(data.progress.exercise);
        return;
      }
      clearTimeout(timer);
      w.terminate();
      try {
        if (data.error) throw new Error(data.error);
        if (data.project) {
          if (current.current !== project) throw new Error("Project changed");
          callbacks.current.edit((p) => {
            p.course = data.project!.course;
          });
        } else if (data.result) {
          const r = data.result;
          setResult(r);
          if (r.status === "passed") {
            const checkedProject = current.current;
            const next = structuredClone(checkedProject);
            await acceptCheck(next, r);
            if (id !== request.current) return;
            if (current.current !== checkedProject)
              throw new Error("Circuit changed; check again");
            callbacks.current.edit((p) => {
              p.course = next.course;
              p.circuits = next.circuits;
            });
          }
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    w.onerror = () => {
      clearTimeout(timer);
      w.terminate();
      setBusy(false);
      setError(label("Check failed. Retry.", "检查失败，请重试。"));
    };
    w.postMessage({ requestId: id, project, exercise: selected, reverify });
  }
  if (!project.course)
    return (
      <section className="course-learn">
        <h2>{label("Build your own computer", "构建自己的计算机")}</h2>
        <p>
          {label(
            "Build logic, reuse your verified components, and run a calculator on your own CPU.",
            "构建逻辑、复用验证后的元件，并在自己的 CPU 上运行计算器。",
          )}
        </p>
        <button
          className="primary"
          onClick={() => {
            const p = newCourse();
            if (zh) {
              p.name = "构建自己的计算机";
              p.circuits[p.root].name = exercise("nand").title[1];
            }
            void open(p);
          }}
        >
          {label("Start course", "开始课程")}
        </button>
      </section>
    );
  return (
    <section className="course-learn">
      <div className="course-heading">
        <h2>{label("Build your own computer", "构建自己的计算机")}</h2>
        <button onClick={() => void open(emptyProject())}>
          {label("Open sandbox", "打开自由工程")}
        </button>
      </div>
      <nav aria-label={label("Course exercises", "课程练习")}>
        {exercises.map((e, i) => (
          <button
            key={e.id}
            className={selected === e.id ? "active" : ""}
            onClick={() => {
              setSelected(e.id);
              setResult(undefined);
            }}
          >
            {i + 1}. {e.title[index]}
            {project.course!.accepted[e.id] &&
            !project.course!.needsVerification
              ? " ✓"
              : ""}
          </button>
        ))}
      </nav>
      {project.course.needsVerification && (
        <div role="status">
          <p>
            {label(
              "Recheck imported course work to unlock dependent exercises.",
              "重新检查导入的课程成果以解锁后续练习。",
            )}
          </p>
          <button disabled={busy || isolated} onClick={() => check(true)}>
            {label("Reverify course", "重新验证课程")}
          </button>
        </div>
      )}
      <h3>{spec.title[index]}</h3>
      <p>{spec.objective[index]}</p>
      {!available(project, selected) && (
        <p>
          {label("Complete first: ", "请先完成：")}
          {spec.prerequisites.map((id) => exercise(id).title[index]).join(", ")}
        </p>
      )}
      {!active ? (
        <button
          disabled={!available(project, selected) || busy || isolated}
          onClick={() => {
            const p = structuredClone(project);
            activateExercise(p, selected);
            void open(p);
          }}
        >
          {project.course.drafts[selected]
            ? label("Resume exercise", "继续练习")
            : label("Start exercise", "开始练习")}
        </button>
      ) : (
        <>
          <details>
            <summary>{label("Interface", "接口")}</summary>
            {project.circuits[project.root].ports.map((p) => (
              <p key={p.id}>
                {p.id} · {p.direction} · {p.width}b
              </p>
            ))}
            {["cpu", "calculator"].includes(selected) && (
              <p>
                {label(
                  "Keep the supplied storage IDs. Instructions are opcode in bits 8–15 and operand in bits 0–7; fetch then execute.",
                  "保留提供的存储元件 ID。指令高 8 位是操作码、低 8 位是操作数；先取指再执行。",
                )}
              </p>
            )}
            {selected === "control" && (
              <p>
                {label(
                  "Control bits 0–7: fetch, execute, accumulator enable, carry enable, memory write, halt enable, output enable, take jump. active = NOT halt. Opcodes 14–255 are invalid.",
                  "控制位 0–7：取指、执行、累加器使能、进位使能、内存写入、停机使能、输出使能、跳转。active = NOT halt。操作码 14–255 非法。",
                )}
              </p>
            )}
            {["alu", "cpu", "control", "calculator"].includes(selected) && (
              <p>
                {label(
                  "Opcodes: 0 NOP, 1 LDI, 2 LDA, 3 STA, 4 ADD, 5 SUB, 6 AND, 7 OR, 8 XOR, 9 JMP, 10 JZ, 11 JC, 12 OUT, 13 HLT. SUB carry means no borrow.",
                  "操作码：0 NOP、1 LDI、2 LDA、3 STA、4 ADD、5 SUB、6 AND、7 OR、8 XOR、9 JMP、10 JZ、11 JC、12 OUT、13 HLT。SUB 的 carry 表示无借位。",
                )}
              </p>
            )}
            {["io", "calculator"].includes(selected) && (
              <p>
                {label(
                  "Addresses: 00–EF RAM; F0 keyboard ready, F1 keyboard data, F2 terminal write, F3 clear bits (terminal bit 0/display bit 1), F4 X, F5 Y, F6 pixel. F1 consumes only on a qualified rising-edge read.",
                  "地址：00–EF RAM；F0 键盘就绪，F1 键盘数据，F2 终端写入，F3 清除位（终端第 0 位/显示第 1 位），F4 X，F5 Y，F6 像素。F1 仅在有效上升沿读取时消耗字节。",
                )}
              </p>
            )}
          </details>
          <button
            className="primary"
            disabled={busy || isolated || project.course.needsVerification}
            onClick={() => check()}
          >
            {busy
              ? label("Checking…", "检查中…")
              : label("Check circuit", "检查电路")}
          </button>
          {passed && (
            <p role="status">
              {label("Verified component saved.", "已保存验证后的元件。")}
            </p>
          )}
          {result && result.status !== "passed" && (
            <div role="status">
              <p>
                {label("Check result: ", "检查结果：")}
                {label(
                  result.status,
                  {
                    blocked: "前置检查未完成",
                    invalid: "电路无效",
                    failed: "行为不符",
                    passed: "通过",
                    limit: "达到执行上限",
                  }[result.status],
                )}
              </p>
              {result.message && <p>{message(result.message)}</p>}
              {result.results.find((r) => r.failure) &&
                (() => {
                  const failure = result.results.find(
                    (r) => r.failure,
                  )!.failure!;
                  const caseIndex = result.results.findIndex((r) => r.failure);
                  const inputs =
                    result.cases[caseIndex]?.steps[failure.step]?.inputs ?? [];
                  return (
                    <>
                      <p>
                        {inputs
                          .map((i) => signalLabel(i.ref) + " = " + i.value)
                          .join(", ")}
                      </p>
                      <p>
                        {label("Signal: ", "信号：")}
                        {signalLabel(failure.assertion.ref)}
                      </p>
                      <p>
                        {label("Cycle", "周期")} {failure.cycle} ·{" "}
                        {label("Expected", "预期")}{" "}
                        {signalValue(failure.expected)} ·{" "}
                        {label("Actual", "实际")}{" "}
                        {signalValue(failure.actual, failure.expected)}
                      </p>
                      <button
                        disabled={result.hash !== hash}
                        onClick={() => inspect(result)}
                      >
                        {label("Inspect failure", "检查失败")}
                      </button>
                    </>
                  );
                })()}
            </div>
          )}
          {passed && nextExercise(selected) && (
            <button
              className="primary"
              onClick={() => {
                const p = structuredClone(project);
                activateExercise(p, nextExercise(selected)!.id);
                void open(p);
              }}
            >
              {label("Continue", "继续")}
            </button>
          )}
          {passed && !nextExercise(selected) && (
            <p>
              {label(
                "Your computer passed the calculator checks.",
                "你的计算机已通过计算器检查。",
              )}
            </p>
          )}
        </>
      )}
      {busy && (
        <div role="status">
          <p>
            {label("Checking ", "正在检查 ")}
            {checking ? exercise(checking).title[index] : spec.title[index]}…
          </p>
          <button
            onClick={() => {
              request.current++;
              stop.current();
              setBusy(false);
              setChecking(undefined);
            }}
          >
            {label("Cancel check", "取消检查")}
          </button>
        </div>
      )}
      {error && <p role="alert">{message(error)}</p>}
      <details>
        <summary>{label("Hints", "提示")}</summary>
        {spec.hints.map((hint, i) => (
          <details key={i}>
            <summary>
              {label("Hint", "提示")} {i + 1}
            </summary>
            <p>{hint[index]}</p>
          </details>
        ))}
      </details>
      <button
        disabled={isolated}
        onClick={() => {
          const p = courseReference(selected);
          p.courseReference = true;
          p.name = spec.title[index] + label(" · Reference", " · 参考");
          p.circuits[p.root].tests = spec.checks();
          reference(p);
        }}
      >
        {label("Inspect reference", "查看参考电路")}
      </button>
    </section>
  );
}
