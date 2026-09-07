import { chapters, type LearningStage } from "../course/lessons";
import { useEffect, useRef, useState, useMemo } from "react";
import type { Project } from "../model/types";
import { emptyProject } from "../model/types";
import type { CourseCheck, ExerciseId, CourseResponse } from "../course/types";
import { exercises, exercise, courseReference } from "../course/registry";
import {
  counterWithAcceptedDecoder,
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
  t,
  isolated,
  stage,
  onScene,
  onResults,
  runToken,
  cancelCheckRef,
}: {
  stage: LearningStage;
  onScene: (p: Project | undefined, stage: LearningStage) => void;
  onResults: (result: CourseCheck) => void;
  runToken: number;
  cancelCheckRef: React.RefObject<() => void>;
  isolated: boolean;
  t: (key: string) => string;
  project: Project;
  lang: "en" | "zh";
  open: (p: Project) => Promise<void>;
  edit: (f: (p: Project) => void) => boolean;
}) {
  const zh = lang === "zh",
    label = (en: string, cn: string) => (zh ? cn : en),
    index = zh ? 1 : 0;
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
  const [predictions, setPredictions] = useState<(number | undefined)[]>([
      undefined,
      undefined,
      undefined,
      undefined,
    ]),
    [revealPrediction, setRevealPrediction] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false),
    [step, setStep] = useState(0);
  const [checking, setChecking] = useState<ExerciseId>();
  const [selected, setSelected] = useState<ExerciseId>(
      project.course?.active ?? "signals",
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
  cancelCheckRef.current = () => {
    request.current++;
    stop.current();
    setBusy(false);
  };
  const callbacks = useRef({ edit });
  callbacks.current = { edit };
  useEffect(() => {
    setSelected(project.course?.active ?? "signals");
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
    record = project.course?.accepted[selected],
    passed =
      !!record &&
      record.hash === hash &&
      record.exerciseRevision === spec.revision &&
      !project.course?.needsVerification;
  useEffect(() => {
    setStep(0);
    setPredictions([undefined, undefined, undefined, undefined]);
    setRevealPrediction(false);
    const id = project.course?.active;
    if (id) {
      const saved =
        project.course?.stages?.[id] ??
        (project.course?.accepted[id] ? "challenge" : "demonstration");
      onScene(
        saved === "challenge" ? undefined : exercise(id).demonstration(),
        saved,
      );
    }
  }, [project.id, project.course?.active]);
  const lastRun = useRef(runToken);
  useEffect(() => {
    if (lastRun.current === runToken) return;
    lastRun.current = runToken;
    if (project.course && stage === "challenge") check();
  }, [runToken]);
  const interfacePorts = useMemo(() => {
    const p = spec.reference();
    return p.circuits[p.root].ports;
  }, [spec]);
  function check(reverify = false) {
    if (!reverify && stage !== "challenge") return;
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
          const root = current.current.course?.drafts[selected];
          if (
            !root ||
            current.current.id !== project.id ||
            current.current.course?.active !== selected ||
            (await electricalHash(current.current, root)) !==
              (await electricalHash(project, project.course!.drafts[selected]!))
          )
            throw new Error("Circuit changed; check again");
          if (id !== request.current) return;
          setResult(r);
          onResults({
            ...r,
            message: r.message ? message(r.message) : undefined,
          });
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
            "Start with on/off signals. Build gates, memory, and a computer that runs your calculator.",
            "从开关信号开始，构建逻辑门、存储器，直到运行计算器的计算机。",
          )}
        </p>
        <button className="primary" onClick={() => {const p=newCourse();p.name=label("Build your own computer","构建自己的计算机");void open(p);}}>
          {label("Start course", "开始课程")}
        </button>
      </section>
    );
  const chooseStage = (next: LearningStage) => {
    setStep(0);
    setResult(undefined);
    setError("");
    stop.current();
    request.current++;
    setBusy(false);
    const scene = next === "challenge" ? undefined : spec.demonstration();
    if (scene && next === "practice") {
      scene.circuits[scene.root].wires = [];
      scene.circuits[scene.root].nets = [];
    }
    onScene(scene, next);
  };
  return (
    <section className="course-learn">
      <div className="course-heading">
        <h2>{spec.title[index]}</h2>
        <button
          aria-expanded={lessonsOpen}
          onClick={() => setLessonsOpen(!lessonsOpen)}
        >
          {label("Lessons", "课程目录")}
        </button>
      </div>
      {lessonsOpen && (
        <nav aria-label={label("Course exercises", "课程练习")}>
          {Object.entries(chapters).map(([chapter, title]) => (
            <section key={chapter}>
              <h3>{title[index]}</h3>
              {exercises
                .filter((e) => e.lesson.chapter === chapter)
                .map((e) => (
                  <button
                    key={e.id}
                    disabled={!available(project, e.id)}
                    aria-current={e.id === selected ? "step" : undefined}
                    onClick={() => {
                      edit((p) => activateExercise(p, e.id));
                      setLessonsOpen(false);
                    }}
                  >
                    {e.title[index]}
                    {project.course?.accepted[e.id] ? " ✓" : ""}
                  </button>
                ))}
            </section>
          ))}
        </nav>
      )}
      {project.course.needsVerification && (
        <>
          <p>
            {label(
              "Check imported progress before continuing.",
              "继续学习前，请验证导入的进度。",
            )}
          </p>
          <button onClick={() => check(true)} disabled={busy}>
            {label("Verify progress", "验证进度")}
          </button>
        </>
      )}
      <div
        className="learning-stages"
        aria-label={label("Learning stages", "学习阶段")}
      >
        {(["demonstration", "practice", "challenge"] as const).map((s, i) => (
          <button
            key={s}
            aria-current={stage === s ? "step" : undefined}
            onClick={() => chooseStage(s)}
          >
            {
              [
                label("Explore", "观察"),
                label("Practice", "练习"),
                label("Challenge", "挑战"),
              ][i]
            }
          </button>
        ))}
      </div>
      <p>{spec.lesson.concept[index]}</p>
      {stage === "demonstration" ? (
        <>
          <p>{spec.lesson.tryIt[index]}</p>
          {selected === "nand" && (
            <div className="nand-prediction">
              <h3>{label("Predict NAND", "预测与非结果")}</h3>
              <table>
                <thead>
                  <tr>
                    <th>a b</th>
                    <th>{label("Your output", "你的输出")}</th>
                    <th>{label("Result", "结果")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3].map((n) => (
                    <tr key={n}>
                      <td>{n.toString(2).padStart(2, "0")}</td>
                      <td>
                        <button
                          aria-label={`${label("Predict", "预测")} ${n.toString(2).padStart(2, "0")}`}
                          onClick={() => {
                            setPredictions((v) =>
                              v.map((x, i) =>
                                i === n ? (x === undefined ? 0 : 1 - x) : x,
                              ),
                            );
                            setRevealPrediction(false);
                          }}
                        >
                          {predictions[n] ?? "?"}
                        </button>
                      </td>
                      <td>
                        {revealPrediction
                          ? predictions[n] === (n === 3 ? 0 : 1)
                            ? "✓"
                            : label("Try again", "再试一次")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                disabled={predictions.some((n) => n === undefined)}
                onClick={() => setRevealPrediction(true)}
              >
                {label("Check prediction", "检查预测")}
              </button>
            </div>
          )}
          <button className="primary" onClick={() => chooseStage("practice")}>
            {label("Try building it", "动手构建")}
          </button>
        </>
      ) : (
        <>
          <p className="lesson-objective">{spec.objective[index]}</p>
          {stage === "practice" ? (
            <div className="guided-step">
              <strong>
                {label("Step", "步骤")} {step + 1}/{spec.lesson.steps.length}
              </strong>
              <p>{spec.lesson.steps[step][index]}</p>
              <button disabled={step === 0} onClick={() => setStep(step - 1)}>
                {label("Previous", "上一步")}
              </button>
              <button
                onClick={() =>
                  step + 1 < spec.lesson.steps.length
                    ? setStep(step + 1)
                    : chooseStage("challenge")
                }
              >
                {step + 1 < spec.lesson.steps.length
                  ? label("Next step", "下一步")
                  : label("Start independent challenge", "开始独立挑战")}
              </button>
            </div>
          ) : (
            <>
              <p>
                {label(
                  "Build your own solution, then use Run tests above the canvas.",
                  "独立构建解法，再使用画布上方的“运行测试”。",
                )}
              </p>
              {busy && project.course.needsVerification && (
                <p role="status">
                  {label("Checking", "正在检查")}{" "}
                  {checking && exercise(checking).title[index]}{" "}
                  <button
                    onClick={() => {
                      request.current++;
                      stop.current();
                      setBusy(false);
                    }}
                  >
                    {label("Cancel", "取消")}
                  </button>
                </p>
              )}
              {passed && (
                <>
                  {selected === "seven-segment" && (
                    <button
                      onClick={() =>
                        void open(counterWithAcceptedDecoder(project))
                      }
                    >
                      {label("Try in counter", "用于计数器")}
                    </button>
                  )}
                  {selected === "calculator" && (
                    <p>
                      {label(
                        "Your computer passed the calculator checks.",
                        "你的计算机已通过计算器检查。",
                      )}
                    </p>
                  )}
                  <p role="status">
                    {label("Verified component saved.", "已保存验证后的元件。")}
                  </p>
                  {nextExercise(selected) && (
                    <button
                      className="primary"
                      onClick={() =>
                        edit((p) =>
                          activateExercise(p, nextExercise(selected)!.id),
                        )
                      }
                    >
                      {label("Continue", "继续")}
                    </button>
                  )}
                </>
              )}
              {result && result.status !== "passed" && (
                <p role="status">
                  {result.message
                    ? message(result.message)
                    : label(
                        "Inspect the highlighted test below, then revise your circuit.",
                        "查看下方突出显示的测试，然后修改电路。",
                      )}
                </p>
              )}
            </>
          )}
        </>
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
      <details>
        <summary>{label("Interface", "接口")}</summary>
        {interfacePorts.map((port) => (
          <p key={port.id}>
            {port.name} ·{" "}
            {label(
              port.direction === "in" ? "input" : "output",
              port.direction === "in" ? "输入" : "输出",
            )}{" "}
            · {port.width} b
          </p>
        ))}
      </details>
      <button onClick={() => void open(emptyProject())}>
        {label("Open sandbox", "打开沙盒")}
      </button>
    </section>
  );
}
