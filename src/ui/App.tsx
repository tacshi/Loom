import { type PlacementDraft } from "./useCanvasPlacement";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import MomentaryButton from "./MomentaryButton";
import { builtinCircuits, shiftExample, encoderExample, buttonExample, busExample } from "../examples/components";
import { closure } from "../library/package";
import Help from "./Help";
import { sevenSegmentExample } from "../examples/sevenSegment";
import CourseLearn from "./CourseLearn";
import {
  allowedKinds,
  acceptedRoots,
  replaceCourseDependency,
} from "../course/session";
import { exercises } from "../course/registry";
import { updateParameters } from "../model/parameters";
import { ParameterDefinitions, InstanceParameters } from "./Parameters";
import { compile } from "../simulator/compiler";
import { calculatorProject } from "../cpu/calculator";
import SequentialTests from "./SequentialTests";
import Devices from "./Devices";
import MemoryEditor from "./MemoryEditor";
import {
  ioProject,
  echoSource,
  pixelSource,
  sevenSegmentSource,
} from "../cpu/ioCircuit";
import Libraries from "./Libraries";
import { forkDefinition } from "../library/package";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircuitBoard,
  Plus,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Scan,
  Trash2,
  Copy,
  Search,
  ChevronDown,
  MousePointer2,
  HelpCircle,
  Hand,
} from "lucide-react";
import {
  emptyProject,
  createComponent,
  uid,
  type Project,
  type Kind,
  type Point,
  type Endpoint,
} from "../model/types";
import AppearanceEditor from "./AppearanceEditor";
import NetInspector from "./NetInspector";
import { categories, ports, validateAppearance, geometry } from "../model/components";
import {
  route,
  moveComponents,
  moveSegment,
  routeClear,
  rerouteAutomatic,
  validDirection,
} from "../editor/routing";
import {
  editProject,
  copySelection,
  pasteSelection,
  addConnection,
  remapComponent,
  type Clipboard,
} from "../editor/session";
import { History } from "../editor/history";
import { translator, type Language } from "./i18n";
import Canvas from "./Canvas";
import { useSimulation } from "../simulator/useSimulation";
import { format } from "../simulator/signal";
import { usePersistence } from "../persistence/usePersistence";
import { extract, removeSelection } from "../model/hierarchy";
import Projects from "./Projects";
import Debugger from "./Debugger";
import { useWebMCP } from "./useWebMCP";
import UpdateNotice from "./UpdateNotice";
import Program from "./Program";

import Replacement from "./Replacement";
import CircuitTests from "./CircuitTests";
import { overlapping } from "../editor/crossings";
import { cpuProject } from "../cpu/referenceCircuit";
import { nandAdder } from "../cpu/nandAdder";
import { counterExample, swapExample } from "../examples/sequential";
import type { Breakpoint } from "../simulator/protocol";
import { fullAdder } from "../examples/adder";
export default function App() {
  const [panMode, setPanMode] = useState(false);
  const [libraryTab, setLibraryTab] = useState<
    "components" | "circuit" | "learn"
  >("components");
  const clipboard = useRef<Clipboard | undefined>(undefined);
  const [openingId, setOpeningId] = useState<string>();
  const [showReplacement, setShowReplacement] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [probes, setProbes] = useState<string[]>([]);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [sourceBreakpoints, setSourceBreakpoints] = useState<number[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [showLibraries, setShowLibraries] = useState(false);
  const [nav, setNav] = useState<{ circuit: string; instance: string }[]>([]);
  const [extractName, setExtractName] = useState("");
  const [showExtract, setShowExtract] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [showSequences, setShowSequences] = useState(false);
  const [focus, setFocus] = useState<string>();
  const [base, setBase] = useState<2 | 10 | 16>(10);
  const [hz, setHz] = useState(10);
  const [project, setProject] = useState<Project>(() => emptyProject());
  const [selected, setSelected] = useState<string[]>([]);
  const [lang, setLang] = useState<Language>(() =>
    localStorage.getItem("loom-language") === "zh" ? "zh" : "en",
  );
  const [dark, setDark] = useState(
    () => localStorage.getItem("loom-theme") === "dark",
  );
  const [pending, setPending] = useState<Endpoint>();
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [fit, setFit] = useState(0);
  const [help, setHelp] = useState(false);
  const history = useRef(new History<Project>());
  const t = useMemo(() => translator(lang), [lang]);
  const persistence = usePersistence(project, setProject);
  const sim = useSimulation(project);
  const activeId = nav.at(-1)?.circuit ?? project.root;
  const circuit = project.circuits[activeId] ?? project.circuits[project.root];
  const signalSignature = JSON.stringify(sim.snapshot.values);
  const displayValues = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(sim.snapshot.values).map(([id, v]) => [
          id,
          format(v, base),
        ]),
      ),
    [signalSignature, base],
  );
  const instancePath = nav.map((n) => n.instance + "/").join("");
  useWebMCP(async () => {
    setShowTests(true);
    return sim.vectors(circuit.id, circuit.vectors);
  });
  const selectedNet = circuit.nets.find(
    (n) =>
      selected.includes(n.id) ||
      circuit.wires.some((w) => selected.includes(w.id) && w.netId === n.id),
  );
  const component = circuit.components.find((c) => c.id === selected[0]);
  useEffect(() => {
    sim.subscribe({
      memoryIds:
        component && ["ram", "rom"].includes(component.kind)
          ? [instancePath + component.id]
          : [],
      probes,
      breakpoints,
      sourceBreakpoints,
    });
  }, [
    component?.id,
    instancePath,
    probes,
    breakpoints,
    sourceBreakpoints,
    project.id,
  ]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("loom-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    localStorage.setItem("loom-language", lang);
  }, [lang]);
  useEffect(() => {
    if (openingId === project.id && persistence.writable)
      setOpeningId(undefined);
  }, [openingId, project.id, persistence.writable]);
  const [courseReturn, setCourseReturn] = useState<Project>();
  function edit(action: (p: Project) => void): boolean {
    if (project.courseReference) {
      setNotice(
        lang === "zh"
          ? "参考电路不可编辑。"
          : "Reference circuits are read-only.",
      );
      return false;
    }
    if (sim.isolated) {
      setNotice(t("returnBeforeEdit"));
      return false;
    }
    if (openingId) return false;
    if (!persistence.writable) {
      setNotice(t("readOnly"));
      return false;
    }
    try {
      const next = editProject(project, action);
      history.current.push(project);
      next.updatedAt = Date.now();
      setProject(next);
      return true;
    } catch (error) {
      setNotice(t(error instanceof Error ? error.message : "routeBlocked"));
      return false;
    }
  }
  async function openProject(p: Project, initialFocus?: string) {
    sim.releaseButtons();
    setOpeningId(p.id);
    if (persistence.writable && !(await persistence.flush())) {
      setNotice(t("saveFailed"));
      setOpeningId(undefined);
      return;
    }
    setProject(p);
    if (libraryTab === "learn" && !p.course && !p.courseReference)
      setLibraryTab("circuit");
    history.current.clear();
    setSelected([]);
    setNav([]);
    setShowTests(false);
    setProbes([]);
    setBreakpoints([]);
    setSourceBreakpoints([]);
    setPending(undefined);
    setFocus(initialFocus);
    setShowProjects(false);
    setFit(fit + 1);
  }
  const [placement, setPlacement] = useState<PlacementDraft>();
  const placementBlocked =
    !persistence.writable ||
    !!circuit.library ||
    !!project.courseReference ||
    sim.isolated ||
    !!openingId;
  useEffect(() => {
    setPlacement(undefined);
  }, [project.id, activeId, instancePath, placementBlocked]);
  function placementAllowed(draft: PlacementDraft) {
    if (
      placementBlocked ||
      draft.projectId !== project.id ||
      draft.circuitId !== activeId
    )
      return false;
    if (draft.component.kind === "instance")
      return (
        !project.course ||
        (!draft.definitions &&
          acceptedRoots(project).includes(draft.component.definitionId!))
      );
    return (
      !allowedKinds(project) ||
      allowedKinds(project)!.includes(draft.component.kind)
    );
  }
  function placementSource(
    source: { kind: Kind } | { builtin: string } | { definition: string },
  ) {
    const prepare = (): PlacementDraft | undefined => {
      if (placementBlocked) return;
      let component;
      let definitions: Project["circuits"] | undefined;
      if ("kind" in source) {
        component = createComponent(source.kind, 0, 0);
        component.name = t(source.kind);
      } else if ("builtin" in source) {
        if (project.course) return;
        const definition = builtinCircuits
          .find((b) => b.id === source.builtin)!
          .create();
        component = createComponent("instance", 0, 0);
        component.definitionId = definition.root;
        component.name = t(source.builtin);
        definitions = closure(definition, definition.root);
      } else {
        const definition = project.circuits[source.definition];
        if (!definition) return;
        component = createComponent("instance", 0, 0);
        component.definitionId = definition.id;
        component.name = definition.name;
      }
      const draft = {
        component,
        definitions,
        projectId: project.id,
        circuitId: activeId,
      };
      return placementAllowed(draft) ? draft : undefined;
    };
    return {
      disabled: placementBlocked,
      "aria-description": t("placementInstructions"),
      onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0 || !e.isPrimary) return;
        const draft = prepare();
        if (!draft) return;
        const sourceElement = e.currentTarget,
          pointerId = e.pointerId;
        sourceElement.setPointerCapture(pointerId);
        setPending(undefined);
        setPlacement({
          ...draft,
          start: { x: e.clientX, y: e.clientY },
          pointerId,
          releaseCapture: () => {
            if (sourceElement.hasPointerCapture(pointerId))
              sourceElement.releasePointerCapture(pointerId);
          },
        });
      },
      onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (e.repeat || !["Enter", " "].includes(e.key)) return;
        e.preventDefault();
        const draft = prepare();
        if (draft) {
          setPending(undefined);
          setPlacement(draft);
        }
      },
    };
  }
  function commitPlacement(draft: PlacementDraft, at: Point) {
    if (!placementAllowed(draft)) return false;
    const c = { ...draft.component, ...at };
    if (
      !edit((p) => {
        if (draft.definitions) Object.assign(p.circuits, draft.definitions);
        p.circuits[activeId].components.push(c);
      })
    )
      return false;
    setSelected([c.id]);
    return true;
  }
  function remove() {
    sim.releaseButtons();
    if (!selected.length) return;
    edit((p) => removeSelection(p, activeId, selected));
    setSelected([]);
  }
  function undo() {
    if (!persistence.writable) return;
    const p = history.current.undo(project);
    if (p) {
      setProject(p);
      setSelected([]);
    }
  }
  function redo() {
    if (!persistence.writable) return;
    const p = history.current.redo(project);
    if (p) {
      setProject(p);
      setSelected([]);
    }
  }
  function copy() {
    clipboard.current = copySelection(project, activeId, selected);
  }
  function paste() {
    if (clipboard.current)
      edit((p) => setSelected(pasteSelection(p, activeId, clipboard.current!)));
  }
  function duplicate() {
    const copied = copySelection(project, activeId, selected);
    edit((p) => setSelected(pasteSelection(p, activeId, copied)));
  }
  function toggle(id: string) {
    const c = circuit.components.find((c) => c.id === id);
    if (c?.kind === "input" || (c?.kind === "portIn" && !nav.length))
      edit((p) => {
        const n = p.circuits[activeId].components.find((c) => c.id === id)!;
        n.params.value = n.params.value ? 0 : 1;
      });
  }
  function move(id: string, delta: Point) {
    const ids = selected.includes(id) ? selected : [id];
    return edit((p) => moveComponents(p.circuits[activeId], p, ids, delta));
  }
  function pin(e: Endpoint, waypoints: Point[] = []) {
    if (!persistence.writable) {
      setNotice(t("readOnly"));
      return;
    }
    if (!pending) {
      setPending(e);
      setNotice("");
      return;
    }
    if (e.component === pending.component && e.port === pending.port) {
      setPending(undefined);
      return;
    }
    const dir = validDirection(project, circuit, pending);
    if (dir === validDirection(project, circuit, e)) {
      setNotice(t("directionError"));
      return;
    }
    const from = dir === "out" ? pending : e,
      to = dir === "out" ? e : pending;
    try {
      const points = route(
        circuit,
        project,
        from,
        to,
        dir === "out" ? waypoints : waypoints.toReversed(),
      );
      edit((p) =>
        addConnection(p, activeId, {
          id: uid(),
          from,
          to,
          points,
          pinned: !!waypoints.length,
        }),
      );
      setPending(undefined);
      setNotice("");
    } catch (error) {
      setNotice(t(error instanceof Error ? error.message : "routeBlocked"));
    }
  }
  function branch(id: string, at: Point) {
    const w = circuit.wires.find((w) => w.id === id);
    if (!pending || !w) return;
    if (validDirection(project, circuit, pending) !== "in") {
      setNotice(t("branchHint"));
      return;
    }
    const to = pending;
    try {
      const points = route(circuit, project, w.from, to, [
        { x: Math.round(at.x / 20) * 20, y: Math.round(at.y / 20) * 20 },
      ]);
      edit((p) =>
        addConnection(p, activeId, {
          id: uid(),
          from: structuredClone(w.from),
          to,
          points,
          junction: {
            x: Math.round(at.x / 20) * 20,
            y: Math.round(at.y / 20) * 20,
          },
          pinned: true,
        }),
      );
      setPending(undefined);
    } catch (error) {
      setNotice(t(error instanceof Error ? error.message : "routeBlocked"));
    }
  }
  function segment(id: string, index: number, at: Point) {
    const old = circuit.wires.find((w) => w.id === id)!;
    const points = moveSegment(old, index, at);
    const overlap = circuit.wires.some(
      (w) =>
        w.id !== id &&
        !(
          w.from.component === old.from.component &&
          w.from.port === old.from.port
        ) &&
        points
          .slice(1)
          .some((b, i) =>
            w.points
              .slice(1)
              .some((d, j) => overlapping(points[i], b, w.points[j], d)),
          ),
    );
    if (overlap || !routeClear(circuit, project, old, points)) {
      setNotice(t("wireOverlap"));
      return;
    }
    edit((p) => {
      const w = p.circuits[activeId].wires.find((w) => w.id === id)!;
      w.points = points;
      w.pinned = true;
    });
  }
  function align(mode: string) {
    const cs = circuit.components.filter((c) => selected.includes(c.id));
    if (cs.length < 2) return;
    edit((p) => {
      const axis = mode.includes("horizontal") ? "x" : "y";
      if (mode === "left" || mode === "top") {
        const a = mode === "left" ? "x" : "y",
          target = Math.min(...cs.map((c) => c[a]));
        for (const c of cs)
          moveComponents(p.circuits[activeId], p, [c.id], {
            x: a === "x" ? target - c.x : 0,
            y: a === "y" ? target - c.y : 0,
          });
      } else {
        const sorted = cs.toSorted((a, b) => a[axis] - b[axis]);
        const min = sorted[0][axis],
          span = sorted.at(-1)![axis] - min;
        sorted.forEach((c, i) =>
          moveComponents(p.circuits[activeId], p, [c.id], {
            x:
              axis === "x"
                ? Math.round((min + (span * i) / (sorted.length - 1)) / 20) *
                    20 -
                  c.x
                : 0,
            y:
              axis === "y"
                ? Math.round((min + (span * i) / (sorted.length - 1)) / 20) *
                    20 -
                  c.y
                : 0,
          }),
        );
      }
    });
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (dialog) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowProjects(false);
          setShowLibraries(false);
          setShowSequences(false);
          setShowReplacement(false);
          setShowExtract(false);
          setShowTests(false);
          setHelp(false);
        } else if (e.key === "Tab") {
          const nodes = [
            ...dialog.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
            ),
          ].filter((n) => n.offsetParent !== null);
          const first = nodes[0],
            last = nodes.at(-1);
          if (!dialog.contains(document.activeElement)) {
            e.preventDefault();
            (e.shiftKey ? last : first)?.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
        return;
      }

      if (
        (e.target as HTMLElement).closest("input,textarea,select") ||
        e.isComposing
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      }
      if (e.key === "Escape") {
        setSelected([]);
        setPending(undefined);
        setHelp(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(circuit.components.map((c) => c.id));
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copy();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        paste();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLibraryTab("components");
        document.querySelector<HTMLInputElement>(".search input")?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const modalOpen =
    showProjects ||
    showLibraries ||
    showSequences ||
    showTests ||
    showExtract ||
    showReplacement ||
    help;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[role="dialog"] button')?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      previous?.isConnected && previous.focus();
    };
  }, [modalOpen]);
  return (
    <div className="app">
      <UpdateNotice flush={persistence.flush} t={t} />
      <header>
        <div className="brand">
          <CircuitBoard size={25} />
          <span>Loom</span>
        </div>
        <span className="header-divider" />
        <input
          className="project-name"
          maxLength={200}
          aria-label={t("project")}
          value={project.name}
          disabled={!!project.courseReference || !!openingId || !persistence.writable || sim.isolated}
          onChange={(e) => {
            history.current.push(project);
            setProject({...project,name:e.target.value,updatedAt:Date.now()});
          }}
        />
        <span className="local-indicator">
          {t(openingId ? "loading" : persistence.status)}
        </span>
        <div className="header-actions">
          {(!project.course || project.cpu) && (
            <button
              onClick={() => {
                setShowProgram(!showProgram);
                setShowDebug(false);
              }}
            >
              {t("program")}
            </button>
          )}
          <button
            onClick={() => {
              setShowDebug(!showDebug);
              setShowProgram(false);
            }}
          >
            {t("debug")}
          </button>
          {(!project.course || allowedKinds(project)?.includes("keyboard")) && (
            <button onClick={() => setShowDevices(!showDevices)}>
              {t("devices")}
            </button>
          )}
          {!project.course && (
            <button onClick={() => setShowLibraries(true)}>
              {t("componentLibraries")}
            </button>
          )}
          <button onClick={() => setShowProjects(true)}>{t("projects")}</button>
          <button onClick={() => setHelp(true)} aria-label={t("help")}>
            <HelpCircle size={18} />
          </button>
          <button
            aria-label={dark ? t("light") : t("dark")}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            aria-label={t("language")}
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
        </div>
      </header>
      {project.courseReference && courseReturn && (
        <div className="course-reference" role="status">
          <span>{lang === "zh" ? "只读参考电路" : "Read-only reference"}</span>
          <button
            onClick={() => {
              void openProject(courseReturn);
              setCourseReturn(undefined);
            }}
          >
            {lang === "zh" ? "返回课程" : "Return to course"}
          </button>
        </div>
      )}
      <main inert={!!openingId || modalOpen}>
        <aside className="library" data-course={!!project.course}>
          <div className="library-tabs">
            {(["components", "circuit", "learn"] as const).map((k) => (
              <button
                className={libraryTab === k ? "active" : ""}
                key={k}
                onClick={() => setLibraryTab(k)}
              >
                {t(k === "components" ? "library" : k)}
              </button>
            ))}
          </div>
          {libraryTab === "learn" ? (
            <CourseLearn
              isolated={sim.isolated}
              t={t}
              lang={lang}
              open={openProject}
              project={project}
              edit={edit}
              inspect={(r) => {
                const failed = r.results.findIndex(
                  (x) => x.status === "failed",
                );
                if (failed >= 0) {
                  const failure = r.results[failed].failure!;
                  const ref = failure.assertion.ref;
                  let c = project.circuits[project.root];
                  const route: typeof nav = [];
                  for (const id of ref.instancePath) {
                    const n = c.components.find((n) => n.id === id);
                    if (!n?.definitionId) break;
                    route.push({ circuit: n.definitionId, instance: id });
                    c = project.circuits[n.definitionId];
                  }
                  setNav(route);
                  setSelected([ref.componentId]);
                  setFocus(ref.componentId);
                  setFit(fit + 1);
                  setProbes([
                    [...ref.instancePath, ref.componentId].join("/") +
                      ":" +
                      ref.portId,
                  ]);
                  sim.openTest(r.cases[failed], project.root);
                  setShowDebug(true);
                }
              }}
              reference={(p) => {
                setCourseReturn(project);
                void openProject(p);
              }}
            />
          ) : libraryTab === "circuit" ? (
            <div className="circuit-list">
              <h3>{circuit.name}</h3>
              <ParameterDefinitions
                circuit={circuit}
                t={t}
                apply={(values) =>
                  edit((p) => {
                    updateParameters(p, activeId, values);
                  })
                }
              />
              {circuit.components.map((c) => (
                <button
                  key={c.id}
                  className={selected.includes(c.id) ? "active" : ""}
                  onClick={(e) => {
                    setSelected(
                      e.shiftKey ? [...new Set([...selected, c.id])] : [c.id],
                    );
                    setFocus(c.id);
                    setFit(fit + 1);
                  }}
                >
                  <span>{c.name}</span>
                  <small>{t(c.kind)}</small>
                </button>
              ))}
              <details>
                <summary>{t("nets")}</summary>
                {circuit.nets.map((n) => (
                  <button key={n.id} onClick={() => setSelected([n.id])}>
                    {n.name || n.id}{" "}
                    <small>
                      {n.width}-bit · {n.ports.length}
                    </small>
                  </button>
                ))}
              </details>
              <details>
                <summary>{t("wires")}</summary>
                {circuit.wires.map((w) => (
                  <button key={w.id} onClick={() => setSelected([w.id])}>
                    {
                      circuit.components.find((c) => c.id === w.from.component)
                        ?.name
                    }
                    .{w.from.port} →{" "}
                    {
                      circuit.components.find((c) => c.id === w.to.component)
                        ?.name
                    }
                    .{w.to.port}
                  </button>
                ))}
              </details>
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <h2>{t("library")}</h2>
                <span>⌘ K</span>
              </div>
              <label className="search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("search")}
                />
              </label>
              {categories
                .filter(
                  (category) =>
                    !allowedKinds(project) ||
                    category.kinds.some((k) =>
                      allowedKinds(project)!.includes(k),
                    ),
                )
                .map((category) => (
                  <section key={category.id}>
                    <h3>
                      {t(category.id)}
                      <ChevronDown size={12} />
                    </h3>
                    <div className="component-grid">
                      {category.kinds
                        .filter(
                          (k) =>
                            !allowedKinds(project) ||
                            allowedKinds(project)!.includes(k),
                        )
                        .filter((k) =>
                          t(k).toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((k) => (
                          <button
                            key={k}
                            className="component-item"
                            {...placementSource({ kind: k })}
                            title={t(k)}
                            aria-label={t(k)}
                          >
                            <span className="symbol">
                              {k === "input"
                                ? "◉"
                                : k === "probe"
                                  ? "○"
                                  : k === "and"
                                    ? "&"
                                    : k === "or"
                                      ? "≥1"
                                      : k === "xor"
                                        ? "=1"
                                        : k === "nand"
                                          ? "&̅"
                                          : k === "not"
                                            ? "¬"
                                            : k === "adder"
                                              ? "+"
                                              : k === "register"
                                                ? "D"
                                                : k === "ram"
                                                  ? "▤"
                                                  : k === "rom"
                                                    ? "▥"
                                                    : k === "counter"
                                                      ? "#"
                                                      : k === "constant"
                                                        ? "1"
                                                        : k === "mux"
                                                          ? "▷"
                                                          : k
                                                              .slice(0, 3)
                                                              .toUpperCase()}
                            </span>
                            <span>{t(k)}</span>
                          </button>
                        ))}
                      {!project.course && builtinCircuits.filter(b => b.category === category.id && t(b.id).toLowerCase().includes(search.toLowerCase())).map(b => (
                        <button key={b.id} className="component-item" {...placementSource({ builtin: b.id })} aria-label={t(b.id)} title={t(b.id)}>
                          <span className="symbol">{b.symbol}</span><span>{t(b.id)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              {Object.values(project.circuits).filter(
                (c) =>
                  c.id !== project.root &&
                  c.id !== activeId &&
                  (!project.course || acceptedRoots(project).includes(c.id)),
              ).length > 0 && (
                <section>
                  <h3>{t("subcircuits")}</h3>
                  {Object.values(project.circuits)
                    .filter(
                      (c) =>
                        c.id !== project.root &&
                        c.id !== activeId &&
                        (!project.course ||
                          acceptedRoots(project).includes(c.id)),
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        className="component-item"
                        {...placementSource({ definition: c.id })}
                      >
                        {c.name}
                        {c.library ? ` · v${c.library.version}` : ""}
                      </button>
                    ))}
                </section>
              )}
            </>
          )}
          <div className="library-bottom">
            <button onClick={() => setShowSequences(true)}>
              {t("sequentialTests")}
            </button>
            <select
              aria-label={t("examples")}
              value=""
              onChange={(e) => {
                const factories = {
                  shift: shiftExample,
                  encoder: encoderExample,
                  button: buttonExample,
                  bus: busExample,
                  segments: () => sevenSegmentExample(),
                  segmentCounter: () => sevenSegmentExample("counter"),
                  segmentRom: () => sevenSegmentExample("rom"),
                  segmentCpu: () => ioProject(sevenSegmentSource),
                  cpu: cpuProject,
                  counter: counterExample,
                  calculator: calculatorProject,
                  echo: () => ioProject(echoSource),
                  pixels: () => ioProject(pixelSource),
                  swap: swapExample,
                  adder: fullAdder,
                };
                if (e.target.value) {
                  void openProject(
                    factories[e.target.value as keyof typeof factories](),
                    e.target.value === "segmentCpu" ? "Digit" : undefined,
                  );
                  setShowProgram(["cpu", "segmentCpu"].includes(e.target.value));
                  if (e.target.value === "segmentCpu") setHz(2);
                  setShowDevices(
                    ["calculator", "echo", "pixels"].includes(e.target.value),
                  );
                  setShowDebug(false);
                }
              }}
            >
              <option value="">{t("examples")}</option>
              <option value="bus">{t("busExample")}</option>
              <option value="button">{t("buttonExample")}</option>
              <option value="encoder">{t("encoderExample")}</option>
              <option value="shift">{t("shiftExample")}</option>
              <option value="segments">{t("segmentsExample")}</option>
              <option value="segmentCounter">{t("segmentCounterExample")}</option>
              <option value="segmentRom">{t("segmentRomExample")}</option>
              <option value="segmentCpu">{t("segmentCpuExample")}</option>
              <option value="cpu">{t("cpuExample")}</option>
              <option value="counter">{t("counterExample")}</option>
              <option value="swap">{t("swapExample")}</option>
              <option value="adder">{t("fullAdder")}</option>
              <option value="calculator">{t("calculatorExample")}</option>
              <option value="echo">{t("echoExample")}</option>
              <option value="pixels">{t("pixelExample")}</option>
            </select>
            <button
              onClick={() => {
                sim.vectors(circuit.id, circuit.vectors);
                setShowTests(true);
              }}
            >
              {t("runTests")}
            </button>
            <button
              onClick={() => {
                void openProject(emptyProject(t("new")));
              }}
            >
              <Plus size={16} />
              {t("new")}
            </button>
          </div>
        </aside>
        <section className="workspace">
          <div className="toolbar">
            <div className="tool-group">
              <button
                className={!panMode ? "active" : ""}
                aria-label={t("select")}
                onClick={() => {
                  setPanMode(false);
                  setPending(undefined);
                }}
              >
                <MousePointer2 size={17} />
              </button>
              <button
                className={panMode ? "active" : ""}
                aria-label={t("pan")}
                onClick={() => {
                  setPanMode(true);
                  setPending(undefined);
                }}
              >
                <Hand size={17} />
              </button>
              <button
                onClick={undo}
                disabled={!history.current.canUndo}
                aria-label={t("undo")}
              >
                <Undo2 size={17} />
              </button>
              <button
                onClick={redo}
                disabled={!history.current.canRedo}
                aria-label={t("redo")}
              >
                <Redo2 size={17} />
              </button>
            </div>
            <button
              className="breadcrumb"
              onClick={() => {
                setNav(nav.slice(0, -1));
                setSelected([]);
                setPending(undefined);
                setFocus(undefined);
              }}
              disabled={!nav.length}
            >
              {nav.length ? "← " : ""}
              {circuit.name}
            </button>
            <div className="sim-controls">
              <button
                className={sim.running ? "active" : ""}
                disabled={sim.diagnostics.some((d) => d.severity === "error")}
                onClick={() => sim.command(sim.running ? "pause" : "run", hz)}
              >
                {t(sim.running ? "pause" : "run")}
              </button>
              <button onClick={() => sim.command("step")}>{t("step")}</button>
              <button onClick={() => sim.command("reset")}>{t("reset")}</button>
              <select
                aria-label={t("speed")}
                value={hz}
                onChange={(e) => setHz(Math.trunc(Number(e.target.value)))}
              >
                {[1, 2, 10, 100, 1000, 100000].map((n) => (
                  <option value={n} key={n}>
                    {n} Hz
                  </option>
                ))}
              </select>
            </div>
            <div className="toolbar-right">
              {selected.length > 1 && (
                <select
                  aria-label={t("align")}
                  value=""
                  onChange={(e) => align(e.target.value)}
                >
                  <option value="">{t("align")}</option>
                  {["left", "top", "horizontal", "vertical"].map((k) => (
                    <option key={k} value={k}>
                      {t(k)}
                    </option>
                  ))}
                </select>
              )}
              <button
                aria-label={t("rerouteAll")}
                onClick={() => {
                  try {
                    edit((p) => {
                      const c = p.circuits[activeId];
                      rerouteAutomatic(c, p);
                    });
                  } catch {
                    setNotice(t("routeBlocked"));
                  }
                }}
              >
                {t("route")}
              </button>
              <button
                onClick={() => {
                  setFocus(undefined);
                  setFit(fit + 1);
                }}
                aria-label={t("fit")}
              >
                <Scan size={17} />
              </button>
            </div>
          </div>
          {project.cpu && (
            <div className="cpu-registers">
              {(["pc", "accumulator", "zero", "carry", "output"] as const).map(
                (k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setNav([]);
                      setSelected([project.cpu![k]]);
                      setFocus(project.cpu![k]);
                      setFit(fit + 1);
                    }}
                  >
                    <span>{t("cpu_" + k)}</span>
                    <strong className="mono">
                      {format(
                        sim.snapshot.values[project.cpu![k] + ":q"],
                        k === "pc" ? 16 : 10,
                      )}
                    </strong>
                  </button>
                ),
              )}
              <span className="cpu-phase">
                {t(
                  sim.snapshot.values[project.cpu.halt + ":q"]?.value
                    ? "halted"
                    : sim.snapshot.values[project.cpu.phase + ":q"]?.value
                      ? "executePhase"
                      : "fetchPhase",
                )}
              </span>
            </div>
          )}
          <Canvas
            placement={placement}
            commitPlacement={commitPlacement}
            cancelPlacement={() => setPlacement(undefined)}
            notice={notice}
            dismissNotice={() => setNotice("")}
            running={sim.running && !sim.isolated}
            markerMove={(id, at) =>
              edit((p) => {
                const m = p.circuits[activeId].markers.find(
                  (m) => m.id === id,
                )!;
                m.x = at.x;
                m.y = at.y;
              })
            }
            panMode={panMode}
            readOnly={
              !persistence.writable ||
              !!circuit.library ||
              !!project.courseReference
            }
            path={instancePath}
            enter={(id) => {
              const c = circuit.components.find((c) => c.id === id);
              if (c?.definitionId) {
                setNav([...nav, { circuit: c.definitionId, instance: c.id }]);
                setSelected([]);
                setPending(undefined);
                setFocus(undefined);
              }
            }}
            values={displayValues}
            button={(id, down) => sim.button(instancePath + id, down)}
            toggle={toggle}
            focus={focus}
            pending={pending}
            pin={pin}
            cancel={() => setPending(undefined)}
            branch={branch}
            segment={segment}
            project={project}
            circuit={circuit}
            selected={selected}
            setSelected={setSelected}
            move={move}
            t={t}
            dark={dark}
            fitToken={fit}
          />
          {sim.reason &&
            sim.reason !== "isolatedTest" &&
            !(project.cpu && sim.reason === "halted") && (
              <div className="notice">
                {t(sim.reason)}
                {sim.reason === "workerFailure" && (
                  <button onClick={sim.recover}>{t("recover")}</button>
                )}
              </div>
            )}
          {sim.diagnostics.length > 0 && (
            <details className="diagnostics">
              <summary>
                {sim.diagnostics.length} {t("diagnostics")}
              </summary>
              {sim.diagnostics.map((d, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const id = d.component?.split("/")[0];
                    setSelected(id ? [id] : []);
                    setFocus(id);
                    setFit(fit + 1);
                  }}
                >
                  <span className={d.severity === "error" ? "danger" : ""}>
                    {t(d.code)}
                    {d.code === "busContention" && ` · ${d.args?.net} · ${t("conflictBits")} ${d.args?.bits} · ${d.args?.drivers}`}
                  </span>
                  <span className="mono">
                    {d.component?.split("/").at(-1)}
                    {d.port ? "." + d.port : ""}
                  </span>
                </button>
              ))}
            </details>
          )}
          {showProgram && (
            <Program
              key={project.id}
              project={project}
              edit={edit}
              snapshot={sim.snapshot}
              t={t}
              close={() => setShowProgram(false)}
              breakpoints={sourceBreakpoints}
              setBreakpoints={setSourceBreakpoints}
              step={() => sim.command("instruction")}
              reset={() => sim.command("reset")}
            />
          )}{" "}
          <div className="workbench-dock">
            {sim.isolated && (
              <div className="notice">
                <span>{t("isolatedTest")}</span>
                <button onClick={sim.exitTest}>
                  {project.course
                    ? lang === "zh"
                      ? "返回电路"
                      : "Return to circuit"
                    : t("returnLive")}
                </button>
              </div>
            )}
            {showDevices && (
              <Devices snapshot={sim.snapshot} submit={sim.keyboard} t={t} />
            )}
            {showDebug && (
              <Debugger
                simulation={sim}
                snapshot={sim.snapshot}
                trace={sim.trace}
                probes={probes}
                removeProbe={(id) => setProbes(probes.filter((p) => p !== id))}
                breakpoints={breakpoints}
                setBreakpoints={setBreakpoints}
                t={t}
                close={() => setShowDebug(false)}
                memoryId={component ? instancePath + component.id : undefined}
              />
            )}
          </div>
          <footer>
            <span>
              {t("cycle")} {sim.snapshot.cycle}
              <i />
              {circuit.components.length} {t("components")}
              <i /> {circuit.wires.length} {t("wires")}
            </span>
            <span>{t("panHint")}</span>
          </footer>
        </section>
        <aside className="inspector">
          <div className="panel-heading">
            <h2>{t("inspector")}</h2>
            <span>{selected.length || "—"}</span>
          </div>
          {component ? (
            <>
              {component.kind === "button" && <MomentaryButton
                held={sim.snapshot.values[instancePath + component.id + ":out"]?.value === 1}
                disabled={!persistence.writable || sim.isolated || !!sim.history?.historical}
                change={(down, source) => sim.button(instancePath + component.id, down, source)}
                label={t("holdButton")}
              />}
              <div className="selection-title">
                <span className="type-dot" />
                {t(component.kind)}
                <span className="mono">{component.width}b</span>
              </div>
              <label>
                {t("name")}
                <input
                  aria-label={t("name")}
                  maxLength={200}
                  value={component.name}
                  onChange={(e) =>
                    edit((p) => {
                      p.circuits[activeId].components.find(
                        (c) => c.id === component.id,
                      )!.name = e.target.value;
                    })
                  }
                />
              </label>
              {!["sevenSegment", "button"].includes(component.kind) && (
                <label>
                  {t("width")}
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={component.width}
                    onChange={(e) =>
                      edit((p) => {
                        p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!.width = Math.min(
                          32,
                          Math.max(1, Math.trunc(Number(e.target.value))),
                        );
                      })
                    }
                  />
                </label>
              )}
              {(["input", "constant"].includes(component.kind) ||
                (component.kind === "portIn" && !nav.length)) && (
                <label>
                  {t("value")}
                  <input
                    aria-label={t("value")}
                    type="number"
                    min={0}
                    max={2 ** component.width - 1}
                    value={component.params.value ?? 0}
                    onChange={(e) =>
                      edit((p) => {
                        p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!.params.value = Math.max(
                          0,
                          Math.min(
                            2 ** component.width - 1,
                            Math.trunc(Number(e.target.value)),
                          ),
                        );
                      })
                    }
                  />
                </label>
              )}
              {(component.kind === "portIn" || component.kind === "portOut") &&
                circuit.ports.some((p) => p.componentId === component.id) && (
                  <label>
                    {t("portName")}
                    <input
                      value={
                        circuit.ports.find(
                          (p) => p.componentId === component.id,
                        )!.name
                      }
                      onChange={(e) =>
                        edit((p) => {
                          p.circuits[activeId].ports.find(
                            (p) => p.componentId === component.id,
                          )!.name = e.target.value;
                        })
                      }
                    />
                  </label>
                )}
              <h3>
                {t("ports")}
                <select
                  aria-label={t("numberBase")}
                  value={base}
                  onChange={(e) =>
                    setBase(Math.trunc(Number(e.target.value)) as 2 | 10 | 16)
                  }
                >
                  <option value={2}>BIN</option>
                  <option value={10}>DEC</option>
                  <option value={16}>HEX</option>
                </select>
              </h3>
              {ports(component, project).map((p) => (
                <button
                  className="port-row"
                  key={p.id}
                  aria-label={t("connect") + " " + p.name}
                  onClick={() => pin({ component: component.id, port: p.id })}
                >
                  <span className="mono">{p.name}</span>
                  <span>
                    {p.width}b ·{" "}
                    <strong>
                      {format(
                        sim.snapshot.values[
                          instancePath + component.id + ":" + p.id
                        ],
                        base,
                      )}
                    </strong>
                  </span>
                </button>
              ))}
              {(component.kind === "ram" || component.kind === "rom") && (
                <MemoryEditor
                  component={component}
                  id={instancePath + component.id}
                  values={
                    sim.snapshot.memory[instancePath + component.id] ?? []
                  }
                  running={sim.running}
                  t={t}
                  write={(address, value) => {
                    if (component.kind === "rom")
                      edit((p) => {
                        const c = p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!;
                        c.image ??= [];
                        c.image[address] = value;
                      });
                    else
                      sim.memoryEdit(
                        instancePath + component.id,
                        address,
                        value,
                      );
                  }}
                  importWords={(start, words) => {
                    if (component.kind === "rom")
                      edit((p) => {
                        const c = p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!;
                        c.image = Array.from(
                          { length: 2 ** (c.params.addressBits ?? 8) },
                          (_, i) =>
                            i >= start && i < start + words.length
                              ? words[i - start]
                              : (c.image?.[i] ?? 0),
                        );
                      });
                    else
                      words.forEach((v, i) =>
                        sim.memoryEdit(
                          instancePath + component.id,
                          start + i,
                          v,
                        ),
                      );
                  }}
                />
              )}
              {component.kind === "instance" && (
                <InstanceParameters
                  component={component}
                  project={project}
                  t={t}
                  apply={(args) =>
                    edit((p) => {
                      p.circuits[activeId].components.find(
                        (c) => c.id === component.id,
                      )!.arguments = args;
                      const errors = compile(p).diagnostics.filter(
                        (d) => d.severity === "error",
                      );
                      if (errors.length) throw new Error(errors[0].code);
                    })
                  }
                />
              )}
              {!!circuit.parameters?.length && (
                <label className="appearance-editor">
                  {t("widthParameter")}
                  <select
                    value={component.widthParameter ?? ""}
                    onChange={(e) =>
                      edit((p) => {
                        p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!.widthParameter = e.target.value || undefined;
                        const port = p.circuits[activeId].ports.find(
                          (port) => port.componentId === component.id,
                        );
                        if (port)
                          port.widthParameter = e.target.value || undefined;
                      })
                    }
                  >
                    <option value="">{t("literalWidth")}</option>
                    {circuit.parameters.map((p) => (
                      <option key={p.name}>{p.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {!!circuit.parameters?.length &&
                ["ram", "rom"].includes(component.kind) && (
                  <label className="appearance-editor">
                    {t("addressParameter")}
                    <select
                      value={component.addressParameter ?? ""}
                      onChange={(e) =>
                        edit((p) => {
                          p.circuits[activeId].components.find(
                            (c) => c.id === component.id,
                          )!.addressParameter = e.target.value || undefined;
                        })
                      }
                    >
                      <option value="">{t("literalWidth")}</option>
                      {circuit.parameters.map((p) => (
                        <option key={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              <AppearanceEditor
                component={component}
                project={project}
                t={t}
                apply={(appearance) =>
                  edit((p) => {
                    const c = p.circuits[activeId],
                      n = c.components.find((n) => n.id === component.id)!;
                    n.appearance = appearance;
                    validateAppearance(n, p);
                    moveComponents(c, p, [n.id], { x: 0, y: 0 });
                  })
                }
              />
              <div className="probe-actions">
                <select
                  aria-label={t("watchSignal")}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setProbes([
                        ...new Set([
                          ...probes,
                          instancePath + component.id + ":" + e.target.value,
                        ]),
                      ]);
                      setShowDebug(true);
                    }
                  }}
                >
                  <option value="">{t("watchSignal")}</option>
                  {ports(component, project).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {["register", "counter", "dff"].includes(component.kind) && (
                <label>
                  {t("initialValue")}
                  <input
                    type="number"
                    min={0}
                    max={2 ** component.width - 1}
                    value={component.params.initial ?? 0}
                    onChange={(e) =>
                      edit((p) => {
                        p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!.params.initial = Math.trunc(Number(e.target.value));
                      })
                    }
                  />
                </label>
              )}
              {["ram", "rom"].includes(component.kind) && (
                <label>
                  {t("addressBits")}
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={component.params.addressBits ?? 8}
                    onChange={(e) =>
                      edit((p) => {
                        p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!.params.addressBits = Math.max(
                          1,
                          Math.min(16, Math.trunc(Number(e.target.value))),
                        );
                      })
                    }
                  />
                </label>
              )}
              <div className="selection-actions">
                <button onClick={() => setShowReplacement(true)}>
                  {t("replaceComponent")}
                </button>
              </div>
              {component.kind === "adder" && (
                <div className="selection-actions">
                  <button
                    onClick={() => {
                      edit((p) => {
                        const def = nandAdder(component.width);
                        p.circuits[def.id] = def;
                        const c = p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!;
                        c.kind = "instance";
                        c.definitionId = def.id;
                      });
                    }}
                  >
                    {t("replaceNand")}
                  </button>
                </div>
              )}
              {component.kind === "instance" &&
                project.circuits[component.definitionId!]?.library && (
                  <button
                    onClick={() =>
                      edit((p) => {
                        p.circuits[activeId].components.find(
                          (c) => c.id === component.id,
                        )!.definitionId = forkDefinition(
                          p,
                          component.definitionId!,
                        );
                      })
                    }
                  >
                    {t("editableCopy")}
                  </button>
                )}
              {component.kind === "instance" &&
                project.course &&
                !project.courseReference && (
                  <label>
                    {lang === "zh"
                      ? "替换为已验证的元件"
                      : "Replace with verified component"}
                    <select
                      value=""
                      onChange={(e) => {
                        const id = e.target.value;
                        if (id)
                          edit((p) =>
                            replaceCourseDependency(
                              p,
                              component.id,
                              id as import("../course/types").ExerciseId,
                            ),
                          );
                      }}
                    >
                      <option value="">
                        {lang === "zh" ? "选择元件…" : "Choose component…"}
                      </option>
                      {exercises
                        .filter((e) => project.course!.accepted[e.id])
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title[lang === "zh" ? 1 : 0]}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              {component.kind === "instance" && (
                <div className="selection-actions">
                  <button
                    onClick={() => {
                      setNav([
                        ...nav,
                        {
                          circuit: component.definitionId!,
                          instance: component.id,
                        },
                      ]);
                      setSelected([]);
                      setPending(undefined);
                      setFocus(undefined);
                    }}
                  >
                    {t("openSubcircuit")}
                  </button>
                </div>
              )}
              <div className="selection-actions">
                <button
                  onClick={() => {
                    setExtractName(t("subcircuit"));
                    setShowExtract(true);
                  }}
                >
                  {t("package")}
                </button>
                <button onClick={duplicate}>
                  <Copy size={15} />
                  {t("duplicate")}
                </button>
                <button onClick={remove} className="danger">
                  <Trash2 size={15} />
                  {t("delete")}
                </button>
              </div>
            </>
          ) : selectedNet ? (
            <NetInspector
              net={selectedNet}
              circuit={circuit}
              project={project}
              edit={edit}
              t={t}
            />
          ) : (
            <>
              <div className="inspector-empty">
                <MousePointer2 size={24} />
                <p>{t("selectHint")}</p>
              </div>
              {selected.some((id) =>
                circuit.wires.some((w) => w.id === id),
              ) && (
                <div className="selection-actions">
                  <button
                    onClick={() => {
                      try {
                        edit((p) => {
                          const c = p.circuits[activeId];
                          const w = c.wires.find((w) =>
                            selected.includes(w.id),
                          )!;
                          w.points = route(c, p, w.from, w.to);
                          w.pinned = false;
                        });
                      } catch {
                        setNotice(t("routeBlocked"));
                      }
                    }}
                  >
                    {t("reroute")}
                  </button>
                  <button onClick={remove}>{t("delete")}</button>
                </div>
              )}
            </>
          )}
        </aside>
      </main>
      {showReplacement && component && (
        <Replacement
          project={project}
          component={component}
          t={t}
          close={() => setShowReplacement(false)}
          apply={(next, mapping) => {
            edit((p) => {
              const c = p.circuits[activeId];
              c.components = c.components.map((n) =>
                n.id === component.id ? next : n,
              );
              remapComponent(c, component.id, mapping);
              moveComponents(c, p, [component.id], { x: 0, y: 0 });
            });
            setShowReplacement(false);
          }}
        />
      )}
      {showSequences && (
        <SequentialTests
          project={project}
          circuit={circuit}
          simulation={sim}
          edit={edit}
          t={t}
          close={() => setShowSequences(false)}
          debug={(refs) => {
            setProbes(refs);
            setShowDebug(true);
          }}
        />
      )}
      {showLibraries && (
        <Libraries
          project={project}
          circuitId={circuit.id}
          edit={edit}
          t={t}
          close={() => setShowLibraries(false)}
        />
      )}
      {showProjects && (
        <Projects
          project={project}
          open={openProject}
          close={() => setShowProjects(false)}
          flush={persistence.flush}
          t={t}
        />
      )}{" "}
      {showExtract && (
        <div className="modal-backdrop" onClick={() => setShowExtract(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t("package")}
            className="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t("package")}</h2>
            <label>
              {t("name")}
              <input
                autoFocus
                value={extractName}
                onChange={(e) => setExtractName(e.target.value)}
              />
            </label>
            <div className="project-actions">
              <button
                disabled={!extractName.trim()}
                onClick={() => {
                  edit((p) => {
                    const id = extract(
                      p,
                      activeId,
                      selected,
                      extractName.trim(),
                    );
                    setSelected([id]);
                  });
                  setShowExtract(false);
                }}
              >
                {t("package")}
              </button>
              <button onClick={() => setShowExtract(false)}>
                {t("close")}
              </button>
            </div>
          </section>
        </div>
      )}
      {showTests && (
        <CircuitTests
          project={project}
          circuit={circuit}
          results={sim.results}
          run={() => sim.vectors(circuit.id, circuit.vectors)}
          edit={edit}
          t={t}
          close={() => setShowTests(false)}
        />
      )}
      {help && <Help close={() => setHelp(false)} t={t} />}
    </div>
  );
}
