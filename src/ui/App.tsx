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
import { categories, ports } from "../model/components";
import {
  route,
  moveComponents,
  moveSegment,
  validDirection,
} from "../editor/routing";
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
import Learn from "./Learn";
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
  const clipboard = useRef<
    | {
        components: typeof circuit.components;
        wires: typeof circuit.wires;
        definitions: Project["circuits"];
      }
    | undefined
  >(undefined);
  const [openingId, setOpeningId] = useState<string>();
  const [showReplacement, setShowReplacement] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [probes, setProbes] = useState<string[]>([]);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [sourceBreakpoints, setSourceBreakpoints] = useState<number[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [nav, setNav] = useState<{ circuit: string; instance: string }[]>([]);
  const [extractName, setExtractName] = useState("");
  const [showExtract, setShowExtract] = useState(false);
  const [showTests, setShowTests] = useState(false);
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
  function edit(action: (p: Project) => void) {
    if (openingId) return;
    if (!persistence.writable) {
      setNotice(t("readOnly"));
      return;
    }
    const next = structuredClone(project);
    action(next);
    history.current.push(project);
    next.updatedAt = Date.now();
    setProject(next);
  }
  async function openProject(p: Project) {
    setOpeningId(p.id);
    if (persistence.writable && !(await persistence.flush())) {
      setNotice(t("saveFailed"));
      setOpeningId(undefined);
      return;
    }
    setProject(p);
    history.current.clear();
    setSelected([]);
    setNav([]);
    setShowTests(false);
    setProbes([]);
    setBreakpoints([]);
    setSourceBreakpoints([]);
    setPending(undefined);
    setFocus(undefined);
    setShowProjects(false);
    setFit(fit + 1);
  }
  function add(kind: Kind) {
    const n = circuit.components.length;
    const c = createComponent(
      kind,
      80 + (n % 4) * 180,
      60 + Math.floor(n / 4) * 120,
    );
    c.name = t(kind);
    edit((p) => p.circuits[activeId].components.push(c));
    setSelected([c.id]);
  }
  function remove() {
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
    clipboard.current = {
      components: structuredClone(
        circuit.components.filter((c) => selected.includes(c.id)),
      ),
      wires: structuredClone(
        circuit.wires.filter(
          (w) =>
            selected.includes(w.from.component) &&
            selected.includes(w.to.component),
        ),
      ),
      definitions: structuredClone(project.circuits),
    };
  }
  function paste() {
    const copied = clipboard.current;
    if (!copied) return;
    const ids: string[] = [];
    edit((p) => {
      const target = p.circuits[activeId],
        map = new Map<string, string>();
      for (const old of copied.components) {
        const id = uid();
        map.set(old.id, id);
        ids.push(id);
        target.components.push({
          ...structuredClone(old),
          id,
          x: old.x + 40,
          y: old.y + 40,
        });
        if (old.definitionId) {
          const addDefinition = (id: string, visited = new Set<string>()) => {
            if (visited.has(id) || p.circuits[id]) return;
            visited.add(id);
            const def = copied.definitions[id];
            if (!def) return;
            p.circuits[id] = structuredClone(def);
            for (const c of def.components)
              if (c.definitionId) addDefinition(c.definitionId, visited);
          };
          addDefinition(old.definitionId);
        }
      }
      for (const w of copied.wires)
        target.wires.push({
          ...structuredClone(w),
          id: uid(),
          from: { ...w.from, component: map.get(w.from.component)! },
          to: { ...w.to, component: map.get(w.to.component)! },
          points: w.points.map((p) => ({ x: p.x + 40, y: p.y + 40 })),
        });
    });
    setSelected(ids);
  }
  function duplicate() {
    const ids: string[] = [];
    edit((p) => {
      const c = p.circuits[activeId];
      const map = new Map<string, string>();
      for (const old of circuit.components.filter((c) =>
        selected.includes(c.id),
      )) {
        const id = uid();
        map.set(old.id, id);
        ids.push(id);
        c.components.push({
          ...structuredClone(old),
          id,
          x: old.x + 40,
          y: old.y + 40,
        });
      }
      for (const w of circuit.wires)
        if (map.has(w.from.component) && map.has(w.to.component))
          c.wires.push({
            ...structuredClone(w),
            id: uid(),
            from: { ...w.from, component: map.get(w.from.component)! },
            to: { ...w.to, component: map.get(w.to.component)! },
            points: w.points.map((p) => ({ x: p.x + 40, y: p.y + 40 })),
          });
    });
    setSelected(ids);
  }
  function toggle(id: string) {
    const c = circuit.components.find((c) => c.id === id);
    if (c?.kind === "input")
      edit((p) => {
        const n = p.circuits[activeId].components.find((c) => c.id === id)!;
        n.params.value = n.params.value ? 0 : 1;
      });
  }
  function move(id: string, delta: Point) {
    const ids = selected.includes(id) ? selected : [id];
    edit((p) => moveComponents(p.circuits[activeId], p, ids, delta));
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
        p.circuits[activeId].wires.push({
          id: uid(),
          from,
          to,
          points,
          pinned: !!waypoints.length,
        }),
      );
      setPending(undefined);
      setNotice("");
    } catch {
      setNotice(t("routeBlocked"));
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
        p.circuits[activeId].wires.push({
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
    } catch {
      setNotice(t("routeBlocked"));
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
    if (overlap) {
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
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (dialog) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowProjects(false);
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
          onChange={(e) =>
            edit((p) => {
              p.name = e.target.value;
            })
          }
        />
        <span className="local-indicator">
          {t(openingId ? "loading" : persistence.status)}
        </span>
        <div className="header-actions">
          <button
            onClick={() => {
              setShowProgram(!showProgram);
              setShowDebug(false);
            }}
          >
            {t("program")}
          </button>
          <button
            onClick={() => {
              setShowDebug(!showDebug);
              setShowProgram(false);
            }}
          >
            {t("debug")}
          </button>
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
      <main inert={!!openingId}>
        <aside className="library">
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
            <Learn lang={lang} t={t} open={openProject} project={project} />
          ) : libraryTab === "circuit" ? (
            <div className="circuit-list">
              <h3>{circuit.name}</h3>
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
              {categories.map((category) => (
                <section key={category.id}>
                  <h3>
                    {t(category.id)}
                    <ChevronDown size={12} />
                  </h3>
                  <div className="component-grid">
                    {category.kinds
                      .filter((k) =>
                        t(k).toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((k) => (
                        <button
                          key={k}
                          className="component-item"
                          onClick={() => add(k)}
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
                  </div>
                </section>
              ))}
              {Object.values(project.circuits).filter(
                (c) => c.id !== project.root && c.id !== activeId,
              ).length > 0 && (
                <section>
                  <h3>{t("subcircuits")}</h3>
                  {Object.values(project.circuits)
                    .filter((c) => c.id !== project.root && c.id !== activeId)
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          const instance = createComponent("instance", 80, 80);
                          instance.definitionId = c.id;
                          instance.name = c.name;
                          edit((p) =>
                            p.circuits[activeId].components.push(instance),
                          );
                          setSelected([instance.id]);
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                </section>
              )}
            </>
          )}
          <div className="library-bottom">
            <select
              aria-label={t("examples")}
              value=""
              onChange={(e) => {
                const factories = {
                  cpu: cpuProject,
                  counter: counterExample,
                  swap: swapExample,
                  adder: fullAdder,
                };
                if (e.target.value) {
                  void openProject(
                    factories[e.target.value as keyof typeof factories](),
                  );
                  setShowProgram(e.target.value === "cpu");
                  setShowDebug(false);
                }
              }}
            >
              <option value="">{t("examples")}</option>
              <option value="cpu">{t("cpuExample")}</option>
              <option value="counter">{t("counterExample")}</option>
              <option value="swap">{t("swapExample")}</option>
              <option value="adder">{t("fullAdder")}</option>
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
                {[1, 10, 100, 1000, 100000].map((n) => (
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
                      const ws = c.wires.filter((w) => !w.pinned);
                      for (const w of ws) w.points = [];
                      for (const w of ws) w.points = route(c, p, w.from, w.to);
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
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          <Canvas
            panMode={panMode}
            readOnly={!persistence.writable}
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
          {sim.reason && !(project.cpu && sim.reason === "halted") && (
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
          {showDebug && (
            <Debugger
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
              for (const w of c.wires) {
                if (w.from.component === component.id)
                  w.from.port = mapping[w.from.port];
                if (w.to.component === component.id)
                  w.to.port = mapping[w.to.port];
              }
              moveComponents(c, p, [component.id], { x: 0, y: 0 });
            });
            setShowReplacement(false);
          }}
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
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t("help")}
            className="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t("help")}</h2>
            <p>{t("shortcuts")}</p>
            <button autoFocus onClick={() => setHelp(false)}>
              {t("close")}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
