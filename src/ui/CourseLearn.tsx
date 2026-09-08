import { missionApproaches } from "../course/missions/approaches";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Project } from "../model/types";
import type { CourseCheck, CourseResponse, ExerciseId } from "../course/types";
import { exercises, exercise } from "../course/registry";
import {
  newCourse,
  available,
  acceptCheck,
  nextExercise,
  electricalHash,
} from "../course/session";
import CpuReference from "./CpuReference";
import MissionConcept from "./MissionConcept";
import { missionChapters } from "../course/missions/catalog";
export default function CourseLearn({
  headerTarget,
  project,
  lang,
  open,
  edit,
  t,
  runToken,
  cancelCheckRef,
  onResults,
  onPassed,
  onPause,
  onResume,
  onPractice,
  onCheckStopped,
  onExample,
  example,
  onHint,
}: {
  headerTarget: HTMLDivElement | null;
  project: Project;
  lang: "en" | "zh";
  open: (p: Project) => Promise<void>;
  edit: (f: (p: Project) => void) => boolean;
  t: (key: string) => string;
  runToken: number;
  cancelCheckRef: RefObject<() => void>;
  onResults: (r: CourseCheck) => void;
  onPassed: () => void;
  onPause: () => void;
  onResume?: () => void;
  onPractice: (p: Project) => void;
  onCheckStopped: () => void;
  onExample: (p: Project | undefined) => void;
  example: boolean;
  onHint: (componentId: string) => void;
}) {
  const index = lang === "zh" ? 1 : 0,
    label = (en: string, zh: string) => (index ? zh : en),
    message = (s: string) => {
      const translations: Record<string, string> = {
        "Complete prerequisite checks first": "请先完成前置任务。",
        "Check your own course draft": "请检查自己的任务电路。",
        "Match the exercise interface: port IDs, directions and widths":
          "请保留任务要求的输入输出引脚、方向和位宽。",
        "Circuit changed; check again": "电路或程序已更改，请重新检查。",
        "Project changed": "工程已更改，请重试。",
        "Unknown mission": "无法找到任务，请重新打开课程。",
        "This exercise has a fixed interface; use width variants on gate, mux or arithmetic components.":
          "本任务的接口位宽固定，请在支持位宽参数的元件任务中设置参数。",
      };
      if (index && translations[s]) return translations[s];
      if (s.startsWith("Component not allowed: "))
        return (
          label("Component not allowed: ", "本任务不能使用：") +
          s.slice(23).replace(/^\w+/, (kind) => t(kind))
        );
      if (s.startsWith("undriven: ")) return t("undriven") + " " + s.slice(10);
      if (s.startsWith("Width variant did not pass: "))
        return label("Width check failed: ", "位宽检查未通过：") + s.slice(28);
      return t(s);
    };
  const selected = project.course?.active ?? "core-01",
    spec = exercise(selected),
    mission = spec.mission!;
  const [lessonsOpen, setLessonsOpen] = useState(false),
    [result, setResult] = useState<CourseCheck>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [hash, setHash] = useState(""),
    [checking, setChecking] = useState<ExerciseId>(),
    [operation, setOperation] = useState<"check" | "prepare" | "example">(
      "check",
    );
  const request = useRef(0),
    worker = useRef<Worker | null>(null),
    missionNav = useRef<HTMLElement>(null),
    stop = useRef<() => void>(() => {}),
    current = useRef(project),
    callbacks = useRef({ edit });
  current.current = project;
  callbacks.current = { edit };
  cancelCheckRef.current = () => {
    request.current++;
    stop.current();
    setBusy(false);
    setResult(undefined);
    setError("");
    onCheckStopped();
  };
  useEffect(() => {
    stop.current();
    request.current++;
    setBusy(false);
    setResult(undefined);
    setError("");
  }, [project.id, selected]);
  useEffect(() => () => stop.current(), []);
  useEffect(() => {
    if (!lessonsOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!missionNav.current?.parentElement?.contains(event.target as Node)) setLessonsOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [lessonsOpen]);
  useEffect(() => {
    if (lessonsOpen)
      missionNav.current
        ?.querySelector('[aria-current="step"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [lessonsOpen, selected]);
  useEffect(() => {
    let live = true;
    const root = project.course?.drafts[selected];
    setHash("");
    if (root)
      void electricalHash(project, root).then((h) => {
        if (live) setHash(h);
      });
    return () => {
      live = false;
    };
  }, [project, selected]);
  const lastRun = useRef(runToken);
  useEffect(() => {
    if (lastRun.current === runToken) return;
    lastRun.current = runToken;
    if (project.course && !example) check();
  }, [runToken]);
  const record = project.course?.accepted[selected],
    passed =
      !!record &&
      record.hash === hash &&
      record.exerciseRevision === spec.revision &&
      !project.course?.needsVerification &&
      !(
        mission.work === "program" &&
        selected !== "core-49" &&
        project.source !== project.assembledSource
      );
  function check(reverify = false) {
    if (example) return;
    stop.current();
    const w = new Worker(new URL("../course/worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    const id = ++request.current;
    setBusy(true);
    setOperation("check");
    setChecking(undefined);
    setError("");
    setResult(undefined);
    const timedOut = () => {
      w.terminate();
      if (request.current === id) {
        setBusy(false);
        onCheckStopped();
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
            current.current.source !== project.source ||
            current.current.assembledSource !== project.assembledSource ||
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
            if (callbacks.current.edit((p) => {
              p.course = next.course;
              p.circuits = next.circuits;
            })) onPassed();
          }
        }
      } catch (e) {
        onCheckStopped();
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    w.onerror = () => {
      if (id !== request.current) return;
      clearTimeout(timer);
      w.terminate();
      setBusy(false);
      onCheckStopped();
      setError(label("Check failed. Retry.", "检查失败，请重试。"));
    };
    w.postMessage({ requestId: id, project, exercise: selected, reverify });
  }
  function prepare(id: ExerciseId, showExample = false, practice = false) {
    stop.current();
    const token = ++request.current,
      w = new Worker(new URL("../course/worker.ts", import.meta.url), {
        type: "module",
      });
    setBusy(true);
    setOperation(showExample ? "example" : "prepare");
    setChecking(id);
    setError("");
    const original = project,
      timer = setTimeout(() => {
        w.terminate();
        if (request.current === token) {
          setBusy(false);
          setError(
            label(
              "Preparing the mission took too long. Try again.",
              "任务准备超时，请重试。",
            ),
          );
        }
      }, 60000);
    stop.current = () => {
      clearTimeout(timer);
      w.terminate();
    };
    w.onmessage = ({ data }) => {
      if (request.current !== token) return;
      stop.current();
      setBusy(false);
      if (current.current !== original) return;
      if (data.error) {
        setError(message(data.error));
        return;
      }
      if (data.scene && practice) {
        data.scene.name = label("Free practice: ", "自由练习：") + exercise(id).title[index];
        onPractice(data.scene);
        setLessonsOpen(false);
      } else if (data.scene) onExample(data.scene);
      else if (data.project) {
        onExample(undefined);
        edit((p) => Object.assign(p, data.project));
        setLessonsOpen(false);
      }
    };
    w.onerror = () => {
      if (token !== request.current) return;
      stop.current();
      setBusy(false);
      setError(
        label(
          "Could not prepare the mission. Try again.",
          "无法准备任务，请重试。",
        ),
      );
    };
    w.postMessage({
      requestId: token,
      project,
      exercise: id,
      practice,
      prepare: !showExample && !practice,
      example: showExample,
    });
  }
  if (!project.course)
    return (
      <section className="course-learn">
        <h2>{label("Build your own computer", "构建自己的计算机")}</h2>
        <p>
          {label(
            "Build circuits and programs in 60 core missions. Explore 40 optional projects along the way.",
            "通过 60 个主线任务构建电路和程序，沿途还可探索 40 个选做项目。",
          )}
        </p>
        <button
          className="primary"
          onClick={() => {
            if (onResume) {
              onResume();
              return;
            }
            const p = newCourse();
            p.name = label("Build your own computer", "构建自己的计算机");
            void open(p);
          }}
        >
          {onResume ? t("resumeCourse") : label("Start course", "开始课程")}
        </button>
      </section>
    );
  const connected = project.circuits[project.root].ports
    .filter((p) => p.direction === "out")
    .every((port) =>
      project.circuits[project.root].nets.some(
        (net) =>
          net.ports.some((p) => p.component === port.componentId) &&
          net.ports.some((p) => p.component !== port.componentId),
      ),
    );
  const count = (track: "core" | "project") =>
    project.course!.needsVerification
      ? 0
      : exercises.filter(
          (e) =>
            e.mission!.track === track &&
            project.course!.accepted[e.id]?.exerciseRevision === e.revision,
        ).length;
  const coreCount = count("core"),
    projectCount = count("project"),
    continueCore = exercises.find(
      (e) =>
        e.mission!.track === "core" &&
        available(project, e.id) &&
        project.course!.accepted[e.id]?.exerciseRevision !== e.revision,
    );
  return (
    <section className="course-learn">
      {/* Share lesson context across tabs while keeping course operations mounted. */}
      {headerTarget && createPortal(
        <div className="course-learn course-context">
          <div className="mission-picker">
            <div className="course-heading">
              <h2><button className="mission-selector" aria-expanded={lessonsOpen} aria-controls="mission-options" aria-description={spec.title[index]} data-number={(mission.track === "project" ? label("Project ", "选做 ") : "") + selected.split("-")[1]} aria-label={label("Select lesson", "选择任务")} onClick={() => setLessonsOpen(!lessonsOpen)}>{spec.title[index]}<ChevronDown size={16} aria-hidden="true" /></button></h2>
            </div>
            {lessonsOpen && (
              <nav id="mission-options" ref={missionNav} aria-label={label("Course missions", "课程任务")} onKeyDown={e => { if (e.key === "Escape") { setLessonsOpen(false); e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(".mission-selector")?.focus(); } }}>
                {missionChapters.map((title, i) => (
                  <section key={i}>
                    <h3>{i + 1} · {title[index]}</h3>
                    {exercises.filter(e => e.mission!.chapter === i + 1).map(e => {
                      const unlocked = available(project, e.id),
                        completed = !project.course!.needsVerification && project.course!.accepted[e.id]?.exerciseRevision === e.revision,
                        name = `${e.mission!.track === "project" ? label("Project ", "选做 ") : ""}${e.id.split("-")[1]} · ${e.title[index]}${completed ? " ✓" : ""}`;
                      return unlocked || e.id === selected ? (
                        <button key={e.id} aria-current={e.id === selected ? "step" : undefined} disabled={busy || example} onClick={() => { if(e.id !== selected) prepare(e.id); else setLessonsOpen(false); }}>{name}</button>
                      ) : (
                        <details key={e.id}>
                          <summary>{name} · {label("Locked", "未解锁")}</summary>
                          <p>{project.course!.needsVerification ? label("Verify saved progress first.", "请先验证已保存的进度。") : label("Complete first: ", "请先完成：") + e.prerequisites.filter(id => project.course!.accepted[id]?.exerciseRevision !== exercise(id).revision).map(id => exercise(id).title[index]).join(label(", ", "、"))}</p>
                          <button disabled={busy || example} onClick={() => prepare(e.id, false, true)}>{label("Free practice", "自由练习")}</button>
                          <p>{label("Opens a separate project without course credit.", "在独立工程中练习，不计入课程进度。")}</p>
                        </details>
                      );
                    })}
                  </section>
                ))}
              </nav>
            )}
          </div>
          <p className="mission-position">{label("Completed", "已完成")} {coreCount}/60{mission.track === "project" ? label(` · Optional ${projectCount}/40`, ` · 选做 ${projectCount}/40`) : ""}</p>
          <p className="lesson-objective">{mission.goal[index]}</p>
        </div>,
        headerTarget,
      )}
      {example ? (
        <>
          <p>{label("Example · read-only", "示例 · 只读")}</p>
          <button className="primary" onClick={() => onExample(undefined)}>
            {label("Return to your mission", "返回自己的任务")}
          </button>
        </>
      ) : (
        <>
          <MissionConcept key={selected} id={selected} lang={lang} />
          {selected === "core-01" && (
            <p>
              {label(
                "Click the small pin on the right of a, then the pin on the left of out. Then choose Run tests. Z means no signal is connected yet.",
                "点击 a 右侧的小引脚，再点击 out 左侧的引脚，然后点击「运行测试」。Z 表示还没有连接信号。",
              )}
            </p>
          )}
          {selected === "core-03" && (
            <p>
              {label(
                "Open Components and drag AND onto the canvas. X means an output cannot be determined yet; connect both gate inputs before checking it.",
                "打开「元件」，将与门拖到画布上。X 表示输出还无法确定，先接好门的两个输入，再检查结果。",
              )}
            </p>
          )}
          {selected === "core-13" && (
            <p>
              {label(
                "Drag Bus joiner from Components, select it, and set Bit width to 4 in its properties. Each b pin carries one bit; out carries all four.",
                "从「元件」拖入「总线合并」，选中后在属性中把位宽设为 4。每个 b 引脚传递一个位，out 传递全部四个位。",
              )}
            </p>
          )}
          {mission.work !== "program" && !missionApproaches[selected] && !["core-01", "core-02", "core-03", "core-13"].includes(selected) && (
            <p>{label("Drag the parts you need from Components onto the canvas, then connect their pins.", "从「元件」拖入所需元件，再连接引脚。")}</p>
          )}
          <div
            className="mission-milestones"
            aria-label={label("Mission checks", "任务检查")}
          >
            {mission.work !== "program" &&
              project.circuits[project.root].ports.some(
                (p) => p.direction === "out",
              ) && (
                <p>
                  {connected ? "✓ " : ""}
                  {label("Connect the required outputs", "连接要求的输出")}
                </p>
              )}
            <p>
              {passed ? "✓ " : ""}
              {label("Pass all required tests", "通过全部要求的测试")}
            </p>
          </div>
          {project.course.needsVerification && (
            <button disabled={busy} onClick={() => check(true)}>
              {label("Verify imported progress", "验证导入的进度")}
            </button>
          )}
          {busy && (
            <p role="status">
              {operation === "check"
                ? label("Checking", "正在检查")
                : operation === "example"
                  ? label("Opening example:", "正在打开示例：")
                  : label("Opening mission:", "正在打开任务：")}{" "}
              {checking && exercise(checking).title[index]}{" "}
              <button onClick={() => cancelCheckRef.current()}>
                {t("cancel")}
              </button>
            </p>
          )}
          {passed && (
            <>
              <p role="status">
                {label("Mission complete: ", "任务完成：")}
                {spec.title[index]}
              </p>
              {nextExercise(selected) && (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => prepare(nextExercise(selected)!.id)}
                >
                  {label("Next mission", "下一个任务")}
                </button>
              )}
            </>
          )}
          {mission.track === "project" && continueCore && (
            <button disabled={busy} onClick={() => prepare(continueCore.id)}>
              {label("Continue core course", "继续主线课程")}
            </button>
          )}
          {coreCount === 60 &&
            (selected === "core-60" || mission.track === "project") && (
              <p role="status">
                {label("Core course complete. ", "主线课程已完成。")}
                {projectCount === 40
                  ? label(
                      "All 40 optional projects are complete too.",
                      "40 个选做项目也已全部完成。",
                    )
                  : label(
                      "Open Missions to explore optional projects.",
                      "打开任务目录，探索选做项目。",
                    )}
              </p>
            )}
          {result && result.status !== "passed" && !passed && (
            <p role="status">
              {result.message
                ? message(result.message)
                : label(
                    "Inspect the failing test below and revise your solution.",
                    "查看下方失败的测试并修改解法。",
                  )}
            </p>
          )}
          {mission.chapter >= 8 && (
            <CpuReference lang={lang} io={mission.chapter >= 10} />
          )}
          <details className="mission-hints" key={`${project.id}:${selected}`}>
            <summary>{label("Hints", "提示")}</summary>
            {mission.hints.map((hint, i) => (
              <details key={i}>
                <summary>
                  {label("Hint", "提示")} {i + 1}
                </summary>
                <p>{hint[index]}</p>
                {i === mission.hints.length - 1 &&
                  project.circuits[project.root].ports.some(
                    (p) => p.direction === "out",
                  ) && (
                    <button
                      onClick={() =>
                        onHint(
                          project.circuits[project.root].ports.find(
                            (p) => p.direction === "out",
                          )!.componentId,
                        )
                      }
                    >
                      {label("Locate output", "定位输出")}
                    </button>
                  )}
                {i === mission.hints.length - 1 && (
                  <button
                    disabled={busy}
                    onClick={() => prepare(selected, true)}
                  >
                    {label("View example", "查看示例")}
                  </button>
                )}
              </details>
            ))}
          </details>
        </>
      )}
      {error && <p role="alert">{message(error)}</p>}
      <button disabled={busy || example} onClick={onPause}>
        {label("Pause course & experiment", "暂停学习，自由实验")}
      </button>
      <p className="mission-position">{label("Your course progress will be kept so you can resume later.", "课程进度会保留，可随时继续学习。")}</p>
    </section>
  );
}
