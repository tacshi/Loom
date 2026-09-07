import { activeSignal } from "../editor/electrons";
import SevenSegment from "./SevenSegment";
import Electrons from "./Electrons";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Group,
  Circle,
  Line,
  Shape,
} from "react-konva";
import type Konva from "konva";
import {
  GRID,
  snap,
  type Circuit,
  type Project,
  type Point,
  type Endpoint,
} from "../model/types";
import { geometry, ports, pinPosition, pinNormal } from "../model/components";
import { nearestAlignment, type Alignment } from "../editor/alignment";
import { crossings,wireMetrics } from "../editor/crossings";
import { orthogonal, moveSegment, previewMove } from "../editor/routing";
export type CanvasProps = {
  project: Project;
  circuit: Circuit;
  selected: string[];
  setSelected: (s: string[]) => void;
  move: (id: string, delta: Point) => boolean | void;
  markerMove?: (id: string, p: Point) => void;
  t: (k: string) => string;
  dark: boolean;
  fitToken: number;
  pending?: Endpoint;
  pin: (e: Endpoint, waypoints?: Point[]) => void;
  cancel: () => void;
  segment: (id: string, index: number, at: Point) => void;
  branch: (id: string, at: Point) => void;
  toggle?: (id: string) => void;
  button?: (id: string, down: boolean) => void;
  enter?: (id: string) => void;
  values?: Record<string, string>;
  path?: string;
  focus?: string;
  readOnly?: boolean;
  panMode?: boolean;
  running?: boolean;
  notice?: string;
  dismissNotice?: () => void;
};
function Canvas({
  project,
  circuit,
  selected,
  setSelected,
  move,
  t,
  dark,
  fitToken,
  pending,
  pin,
  cancel,
  segment,
  branch,
  toggle,
  button,
  enter,
  values = {},
  path = "",
  focus,
  readOnly = false,
  panMode = false,
  running = false,
  notice,
  dismissNotice,
  markerMove,
}: CanvasProps) {
  const networkLayer = useRef<Konva.Layer>(null);
  const dragLayer = useRef<Konva.Layer>(null);
  const selectionRef = useRef(selected);
  selectionRef.current = selected;
  const moveRef = useRef(move);
  moveRef.current = move;
  const wireLayer = useRef<Konva.Layer>(null);
  const host = useRef<HTMLDivElement>(null),
    stage = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [view, setView] = useState({ x: 60, y: 60, scale: 1 });
  // Safari may defer animation frames after native file dialogs. Paused edits
  // must paint on commit rather than wait for Konva's next animation frame.
  useEffect(() => {
    if (!running) stage.current?.draw();
  }, [project, circuit, selected, values, view, size, dark, pending, running]);
  const [spaceHeld, setSpace] = useState(false);
  const space = spaceHeld || panMode;
  const cancelledDrag = useRef(false);
  const [wireDrag, setWireDrag] = useState<{
    id: string;
    index: number;
    at: Point;
  }>();
  const [waypoints, setWaypoints] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [horizontal, setHorizontal] = useState(true);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point }>();
  const [guides, setGuides] = useState<{ axis: "x" | "y"; value: number }[]>(
    [],
  );
  const held = useRef<{ x?: Alignment; y?: Alignment }>({});
  const [dragged, setDragged] = useState<{ id: string; delta: Point }>();
  function clearScene() {
    networkLayer.current?.clearCache();
    wireLayer.current?.clearCache();
  }
  function cacheScene() {
    const s = stage.current;
    if (!s) return;
    const scale = s.scaleX();
    for (const layer of [networkLayer.current, wireLayer.current])
      if (layer && !layer.isCached())
        layer.cache({
          x: (-s.x() - 250) / scale,
          y: (-s.y() - 250) / scale,
          width: (s.width() + 500) / scale,
          height: (s.height() + 500) / scale,
          pixelRatio: scale,
        });
  }
  useEffect(() => {
    const ro = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    ro.observe(host.current!);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    setWaypoints([]);
  }, [pending]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest("input,textarea,select,[role=dialog]")
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        setSpace(true);
        const stage = networkLayer.current?.getStage();
        if (stage && networkLayer.current) {
          const scale = stage.scaleX();
          for (const layer of [networkLayer.current, wireLayer.current])
            layer?.cache({
              x: (-stage.x() - 250) / scale,
              y: (-stage.y() - 250) / scale,
              width: (stage.width() + 500) / scale,
              height: (stage.height() + 500) / scale,
              pixelRatio: scale,
            });
        }
      }
      if (e.key === "Escape") {
        cancelledDrag.current = true;
        for (const node of [
          ...(stage.current?.find("Group") ?? []),
          ...(stage.current?.find("Line") ?? []),
        ])
          if (node.isDragging()) node.stopDrag();
        setWireDrag(undefined);
        cancel();
        setMarquee(undefined);
        setWaypoints([]);
      }
      if (e.key.toLowerCase() === "r") setHorizontal((v) => !v);
    };
    const up = (e?: KeyboardEvent) => {
      if (!e || e.code === "Space") {
        setSpace(false);
        networkLayer.current?.clearCache();
        wireLayer.current?.clearCache();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const blur = () => up();
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [cancel]);
  useEffect(() => {
    if (!circuit.components.length) {
      setView({ x: 60, y: 60, scale: 1 });
      return;
    }
    const cs = focus
      ? circuit.components.filter((c) => c.id === focus)
      : circuit.components;
    if (!cs.length) return;
    const minX = Math.min(...cs.map((c) => c.x)),
      minY = Math.min(...cs.map((c) => c.y));
    const maxX = Math.max(...cs.map((c) => c.x + geometry(c, project).w)),
      maxY = Math.max(...cs.map((c) => c.y + geometry(c, project).h));
    if (focus && view.scale >= 0.65 && minX * view.scale + view.x >= 12 &&
      minY * view.scale + view.y >= 12 && maxX * view.scale + view.x <= size.width - 12 &&
      maxY * view.scale + view.y <= size.height - 12) return;
    const scale = Math.max(
      0.1,
      Math.min(
        1.2,
        (size.width - 100) / (maxX - minX),
        (size.height - 100) / (maxY - minY),
      ),
    );
    setView({ x: 50 - minX * scale, y: 50 - minY * scale, scale });
  }, [fitToken, circuit.id, focus]);
  const alignmentTargets = useMemo(() => {
    const x = new Set<number>(),
      y = new Set<number>();
    for (const c of circuit.components) {
      if (selected.includes(c.id)) continue;
      const g = geometry(c, project);
      [c.x, c.x + g.w / 2, c.x + g.w].forEach((n) => x.add(n));
      [
        c.y,
        c.y + g.h / 2,
        c.y + g.h,
        ...ports(c, project).map((p) => pinPosition(c, p.id, project).y),
      ].forEach((n) => y.add(n));
    }
    for (const w of circuit.wires) {
      if (
        selected.includes(w.from.component) ||
        selected.includes(w.to.component)
      )
        continue;
      for (let i = 1; i < w.points.length; i++) {
        const a = w.points[i - 1],
          b = w.points[i];
        if (a.x === b.x) x.add(a.x);
        if (a.y === b.y) y.add(a.y);
      }
    }
    return { x: [...x].sort((a, b) => a - b), y: [...y].sort((a, b) => a - b) };
  }, [circuit, project, selected]);
  const alignmentRef = useRef(alignmentTargets);
  alignmentRef.current = alignmentTargets;
  const intersections = useMemo(
    () => crossings(circuit.wires),
    [circuit.wires],
  );
  const bridgeIndex = useMemo(() => {
    const map = new Map<string, typeof intersections.bridges>();
    for (const bridge of intersections.bridges) {
      const key = bridge.wire + ":" + bridge.segment;
      const list = map.get(key) ?? [];
      list.push(bridge);
      map.set(key, list);
    }
    return map;
  }, [intersections]);
  const colors = dark
    ? { surface: "#203532", text: "#ecf5ef", line: "#90aa9d", grid: "#354b43" }
    : { surface: "#fff", text: "#223d35", line: "#728e80", grid: "#d4ded6" };
  const world = () => {
    const p = stage.current!.getPointerPosition()!;
    return { x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale };
  };
  const start =
    pending && circuit.components.find((c) => c.id === pending.component);
  const startAt = start
    ? pinPosition(start, pending!.port, project)
    : undefined;
  const preview = startAt
    ? [
        startAt,
        ...waypoints,
        ...orthogonal(waypoints.at(-1) ?? startAt, cursor, horizontal).slice(1),
      ]
    : [];
  const moving = useMemo(
    () =>
      dragged
        ? previewMove(
            circuit,
            project,
            selected.includes(dragged.id) ? selected : [dragged.id],
            dragged.delta,
          )
        : undefined,
    [dragged, circuit, project, selected],
  );
  const finishSelect = () => {
    if (marquee) {
      const { start: a, end: b } = marquee;
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 5)
        setSelected(
          circuit.components
            .filter(
              (c) =>
                c.x >= Math.min(a.x, b.x) &&
                c.y >= Math.min(a.y, b.y) &&
                c.x + geometry(c, project).w <= Math.max(a.x, b.x) &&
                c.y + geometry(c, project).h <= Math.max(a.y, b.y),
            )
            .map((c) => c.id),
        );
      setMarquee(undefined);
    }
  };
  return (
    <div
      className="canvas-host"
      ref={host}
      style={{ cursor: space ? "grab" : pending ? "crosshair" : "default" }}
    >
      <Stage
        ref={stage}
        {...size}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        draggable={space}
        onDragStart={(e) => {
          if (e.target === stage.current) cacheScene();
        }}
        onDragMove={(e) => {
          if (
            e.target === stage.current &&
            (Math.abs(e.target.x() - view.x) > 180 ||
              Math.abs(e.target.y() - view.y) > 180)
          ) {
            clearScene();
            setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
            requestAnimationFrame(cacheScene);
          }
        }}
        onDragEnd={(e) => {
          if (e.target === stage.current) {
            clearScene();
            setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
          }
        }}
        onMouseDown={(e) => {
          if (e.target === stage.current && !space) {
            const p = world();
            if (pending)
              setWaypoints([...waypoints, { x: snap(p.x), y: snap(p.y) }]);
            else {
              setSelected([]);
              setMarquee({ start: p, end: p });
            }
          }
        }}
        onMouseMove={() => {
          const p = world();
          if (pending) setCursor({ x: snap(p.x), y: snap(p.y) });
          if (marquee) setMarquee({ ...marquee, end: p });
        }}
        onMouseUp={finishSelect}
        onMouseLeave={finishSelect}
        onWheel={(e) => {
          e.evt.preventDefault();
          const pos = stage.current!.getPointerPosition()!;
          if (e.evt.shiftKey) {
            setView((v) => ({
              ...v,
              x: v.x - e.evt.deltaY,
              y: v.y - e.evt.deltaX,
            }));
            return;
          }
          const scale = Math.min(
            3,
            Math.max(0.1, view.scale * (e.evt.deltaY > 0 ? 0.92 : 1.08)),
          );
          setView({
            scale,
            x: pos.x - ((pos.x - view.x) * scale) / view.scale,
            y: pos.y - ((pos.y - view.y) * scale) / view.scale,
          });
        }}
      >
        <Layer listening={false}>
          <Shape
            sceneFunc={(ctx) => {
              const s = GRID * view.scale;
              if (s < 7) return;
              ctx.save();
              ctx.scale(1 / view.scale, 1 / view.scale);
              ctx.translate(-view.x, -view.y);
              ctx.fillStyle = colors.grid;
              for (let x = ((view.x % s) + s) % s; x < size.width; x += s)
                for (let y = ((view.y % s) + s) % s; y < size.height; y += s) {
                  ctx.beginPath();
                  ctx.arc(x, y, 1, 0, Math.PI * 2);
                  ctx.fill();
                }
              ctx.restore();
            }}
          />
        </Layer>
        <WireLayer
          layerRef={wireLayer}
          wires={circuit.wires}
          values={values}
          selection={selected
            .filter(
              (id) =>
                circuit.wires.some((w) => w.id === id) ||
                circuit.nets.some((n) => n.id === id),
            )
            .join()}
          pending={pending}
          view={view}
          dark={dark}
          readOnly={readOnly}
          space={space}
        >
          {circuit.wires.map((w) => {
            const metrics=wireMetrics(view.scale,selected.includes(w.id)||selected.includes(w.netId??''));
            const val = values[path + w.to.component + ":" + w.to.port];
            const color =
              selected.includes(w.id) || selected.includes(w.netId ?? "")
                ? "#d39235"
                : val?.includes("Z") ? "#8c78b3" : activeSignal(val)
                  ? "#31a573"
                  : colors.line;
            return (
              <Group key={w.id}>
                {w.points.slice(1).map((p, i) => {
                  const a = w.points[i];
                  return (
                    <Group key={i}>
                      <Shape
                        listening={false}
                        sceneFunc={(ctx) => {
                          ctx.beginPath();
                          ctx.moveTo(a.x, a.y);
                          const bridges = (
                            bridgeIndex.get(w.id + ":" + i) ?? []
                          ).toSorted((l, r) =>
                            a.x < p.x
                              ? l.point.x - r.point.x
                              : r.point.x - l.point.x,
                          );
                          for (const bridge of bridges) {
                            const radius = Math.min(
                              metrics.bridgeRadius,
                              Math.abs(bridge.point.x - a.x) / 2,
                              Math.abs(p.x - bridge.point.x) / 2,
                            );
                            const direction = a.x < p.x ? 1 : -1;
                            ctx.lineTo(
                              bridge.point.x - direction * radius,
                              a.y,
                            );
                            ctx.bezierCurveTo(
                              bridge.point.x - direction * radius,
                              a.y - radius * 1.4,
                              bridge.point.x + direction * radius,
                              a.y - radius * 1.4,
                              bridge.point.x + direction * radius,
                              a.y,
                            );
                          }
                          ctx.lineTo(p.x, p.y);
                          ctx.strokeStyle = color;
                          ctx.lineWidth = metrics.strokeWidth;
                          ctx.lineCap = "round";
                          ctx.lineJoin = "round";
                          ctx.stroke();
                        }}
                      />
                      <Line
                        points={[a.x, a.y, p.x, p.y]}
                        stroke={color}
                        opacity={0}
                        strokeWidth={metrics.strokeWidth}
                        hitStrokeWidth={metrics.hitStrokeWidth}
                        draggable={!readOnly && !pending && !space}
                        onDragStart={() => {
                          cancelledDrag.current = false;
                        }}
                        onDragMove={(e) => {
                          e.cancelBubble = true;
                          setWireDrag({
                            id: w.id,
                            index: i,
                            at: {
                              x: a.x + e.target.x(),
                              y: a.y + e.target.y(),
                            },
                          });
                        }}
                        dragBoundFunc={(pos) =>
                          a.y === p.y
                            ? { x: view.x, y: pos.y }
                            : { x: pos.x, y: view.y }
                        }
                        onMouseDown={(e) => {
                          if (space) return;
                          e.cancelBubble = true;
                          if (pending) branch(w.id, world());
                          else setSelected([w.id]);
                        }}
                        onDragEnd={(e) => {
                          e.cancelBubble = true;
                          const d = { x: e.target.x(), y: e.target.y() };
                          e.target.position({ x: 0, y: 0 });
                          setWireDrag(undefined);
                          if (cancelledDrag.current) return;
                          segment(w.id, i, { x: a.x + d.x, y: a.y + d.y });
                        }}
                      />
                    </Group>
                  );
                })}
                {w.junction && (
                  <Circle
                    x={w.junction.x}
                    y={w.junction.y}
                    radius={4}
                    fill={color}
                  />
                )}
              </Group>
            );
          })}
          <Shape listening={false} sceneFunc={ctx=>{
            // Paint bridges after every wire, so draw order cannot join unrelated nets.
            const byId=new Map(circuit.wires.map(w=>[w.id,w]));
            for(const bridge of intersections.bridges){
              const w=byId.get(bridge.wire)!,a=w.points[bridge.segment],b=w.points[bridge.segment+1];
              const active=selected.includes(w.id)||selected.includes(w.netId??''),metrics=wireMetrics(view.scale,active);
              const radius=Math.min(metrics.bridgeRadius,Math.abs(bridge.point.x-a.x)/2,Math.abs(b.x-bridge.point.x)/2),direction=a.x<b.x?1:-1;
              const tail=Math.min(metrics.bridgeHalo+metrics.strokeWidth,Math.abs(bridge.point.x-a.x)-radius,Math.abs(b.x-bridge.point.x)-radius),x=bridge.point.x,y=bridge.point.y;
              const value=values[path+w.to.component+':'+w.to.port],color=active?'#d39235':value?.includes('Z')?'#8c78b3':activeSignal(value)?'#31a573':colors.line;
              ctx.save();ctx.lineCap='butt';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x-direction*(radius+tail),y);ctx.lineTo(x-direction*radius,y);ctx.bezierCurveTo(x-direction*radius,y-radius*1.4,x+direction*radius,y-radius*1.4,x+direction*radius,y);ctx.lineTo(x+direction*(radius+tail),y);
              ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';ctx.lineWidth=metrics.strokeWidth+2*metrics.bridgeHalo;ctx.stroke();
              ctx.globalCompositeOperation='source-over';ctx.strokeStyle=color;ctx.lineWidth=metrics.strokeWidth;ctx.stroke();ctx.restore();
            }
          }}/>
          {intersections.junctions.map((p, i) => (
            <Circle
              key={"junction" + i}
              x={p.x}
              y={p.y}
              radius={3}
              fill={colors.line}
              listening={false}
            />
          ))}
        </WireLayer>
        <Electrons wires={circuit.wires} bridges={intersections.bridges} values={values} path={path} running={running} dark={dark} view={view} size={size} />
        <ComponentLayer
          layerRef={networkLayer}
          circuit={circuit}
          waypoints={waypoints}
          project={project}
          view={view}
          values={values}
          pending={pending}
          space={space}
          readOnly={readOnly}
          dark={dark}
          dragged={selected.length > 1 ? dragged : undefined}
        >
          {circuit.components
            .filter((c) => {
              const g = geometry(c, project);
              return (
                (c.x + g.w) * view.scale + view.x > -200 &&
                c.x * view.scale + view.x < size.width + 200 &&
                (c.y + g.h) * view.scale + view.y > -200 &&
                c.y * view.scale + view.y < size.height + 200
              );
            })
            .map((c) => {
              const g = geometry(c, project);
              const delta =
                dragged && dragged.id !== c.id && selected.includes(c.id)
                  ? dragged.delta
                  : { x: 0, y: 0 };
              const value =
                values[
                  path +
                    c.id +
                    ":" +
                    (c.kind === "probe" || c.kind === "portOut"
                      ? "in"
                      : ["register", "counter", "dff"].includes(c.kind)
                        ? "q"
                        : "out")
                ];
              return (
                <Group
                  key={c.id}
                  x={c.x + delta.x}
                  y={c.y + delta.y}
                  draggable={!readOnly && !space && !pending}
                  onDragStart={(e) => {
                    cancelledDrag.current = false;
                    if (selectionRef.current.length <= 1 && dragLayer.current)
                      e.target.moveTo(dragLayer.current);
                  }}
                  onDblClick={(e) => {
                    e.cancelBubble = true;
                    c.kind === "instance" ? enter?.(c.id) : toggle?.(c.id);
                  }}
                  onMouseDown={(e) => {
                    if (space || pending) return;
                    e.cancelBubble = true;
                    setSelected(
                      e.evt.shiftKey
                        ? [...new Set([...selectionRef.current, c.id])]
                        : selected.includes(c.id)
                          ? selected
                          : [c.id],
                    );
                  }}
                  onDragMove={(e) => {
                    const raw = { x: e.target.x(), y: e.target.y() };
                    const result = { x: snap(raw.x), y: snap(raw.y) };
                    const gs: { axis: "x" | "y"; value: number }[] = [];
                    for (const axis of ["x", "y"] as const) {
                      const own =
                        axis === "x"
                          ? [0, g.w / 2, g.w]
                          : [
                              0,
                              g.h / 2,
                              g.h,
                              ...ports(c, project).map(
                                (p) => pinPosition(c, p.id, project).y - c.y,
                              ),
                            ];
                      const previous = held.current[axis];
                      const target =
                        previous &&
                        Math.abs(raw[axis] - previous.position) <
                          12 / view.scale
                          ? previous
                          : nearestAlignment(
                              alignmentRef.current[axis],
                              raw[axis],
                              own,
                              8 / view.scale,
                            );
                      if (target) {
                        result[axis] = target.position;
                        gs.push({ axis, value: target.line });
                      }
                      held.current[axis] = target;
                    }
                    e.target.position(result);
                    setGuides(gs);
                    setDragged({
                      id: c.id,
                      delta: { x: result.x - c.x, y: result.y - c.y },
                    });
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    if (
                      e.target.getLayer() === dragLayer.current &&
                      networkLayer.current
                    )
                      e.target.moveTo(networkLayer.current);
                    const delta = {
                      x: snap(e.target.x()) - c.x,
                      y: snap(e.target.y()) - c.y,
                    };
                    setDragged(undefined);
                    setGuides([]);
                    held.current = {};
                    if (cancelledDrag.current) {
                      e.target.position({ x: c.x, y: c.y });
                      return;
                    }
                    if (moveRef.current(c.id, delta) === false)
                      e.target.position({ x: c.x, y: c.y });
                  }}
                >
                  <ComponentGlyph
                    c={c}
                    project={project}
                    selected={false}
                    dark={dark}
                    value={value}
                    button={button}
                    segments={
                      c.kind === "sevenSegment"
                        ? ["a", "b", "c", "d", "e", "f", "g", "dp"]
                            .map((id) => values[path + c.id + ":" + id] ?? "X")
                            .join("")
                        : undefined
                    }
                    pending={pending}
                    scale={view.scale}
                    readOnly={readOnly}
                    cacheGlyph={circuit.components.length > 200}
                    space={space}
                    waypoints={waypoints}
                    pin={pin}
                  />
                </Group>
              );
            })}
        </ComponentLayer>
        <Layer>
          {circuit.markers.map((m) => {
            const n = circuit.nets.find((n) => n.id === m.netId),
              c =
                m.endpoint &&
                circuit.components.find((c) => c.id === m.endpoint!.component),
              at =
                c && m.endpoint
                  ? pinPosition(c, m.endpoint.port, project)
                  : undefined;
            return (
              <Group key={m.id}>
                {at && (
                  <Line
                    lineCap="round"
                    lineJoin="round"
                    points={orthogonal(at, { x: m.x, y: m.y + 10 }).flatMap(
                      (p) => [p.x, p.y],
                    )}
                    stroke={colors.line}
                    strokeWidth={2}
                  />
                )}
                <Group
                  x={m.x}
                  y={m.y}
                  draggable={!space && !readOnly}
                  onMouseDown={(e) => {
                    if (space) return;
                    e.cancelBubble = true;
                    setSelected([m.netId]);
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    markerMove?.(m.id, {
                      x: snap(e.target.x()),
                      y: snap(e.target.y()),
                    });
                  }}
                >
                  <Rect
                    width={100}
                    height={20}
                    fill={colors.surface}
                    stroke={
                      selected.includes(m.netId) ? "#d39235" : colors.line
                    }
                    cornerRadius={3}
                  />
                  <Text
                    x={6}
                    y={4}
                    width={88}
                    height={14}
                    wrap="none"
                    ellipsis
                    text={
                      (n?.name || t("net")) +
                      (n && n.width > 1 ? " [" + (n.width - 1) + ":0]" : "")
                    }
                    fontSize={11}
                    fill={colors.text}
                  />
                </Group>
              </Group>
            );
          })}
        </Layer>
        <Layer ref={dragLayer} />
        <Layer listening={false}>
          {moving &&
            moving.circuit.wires
              .filter((w) => {
                const old = circuit.wires.find((n) => n.id === w.id);
                return old && w !== old;
              })
              .map((w) => (
                <Line
                    lineCap="round"
                    lineJoin="round"
                  key={"move-" + w.id}
                  points={w.points.flatMap((p) => [p.x, p.y])}
                  stroke={moving.valid ? "#2b9b64" : "#c94d42"}
                  strokeWidth={2}
                  dash={[5, 3]}
                />
              ))}
          {wireDrag &&
            (() => {
              const w = circuit.wires.find((w) => w.id === wireDrag.id);
              return w ? (
                <Line
                    lineCap="round"
                    lineJoin="round"
                  points={moveSegment(w, wireDrag.index, wireDrag.at).flatMap(
                    (p) => [p.x, p.y],
                  )}
                  stroke="#d39235"
                  strokeWidth={3}
                  dash={[6, 3]}
                />
              ) : null;
            })()}
          {circuit.components
            .filter((c) => selected.includes(c.id))
            .map((c) => {
              const g = geometry(c, project);
              const delta =
                dragged && selected.includes(c.id)
                  ? dragged.delta
                  : { x: 0, y: 0 };
              return (
                <Rect
                  key={c.id}
                  x={c.x + delta.x}
                  y={c.y + delta.y}
                  width={g.w}
                  height={g.h}
                  cornerRadius={6}
                  stroke="#25815c"
                  strokeWidth={2}
                  listening={false}
                />
              );
            })}
          {preview.length > 0 && (
            <Line
                    lineCap="round"
                    lineJoin="round"
              points={preview.flatMap((p) => [p.x, p.y])}
              stroke="#2b9b64"
              strokeWidth={2}
              dash={[6, 4]}
            />
          )}
          {circuit.components.filter(c=>selected.includes(c.id)||pending?.component===c.id).flatMap(c=>ports(c,project).map(p=>{
            const at=pinPosition(c,p.id,project),delta=dragged&&selected.includes(c.id)?dragged.delta:{x:0,y:0};
            return <Circle key={'pin-mask:'+c.id+':'+p.id} x={at.x+delta.x} y={at.y+delta.y} radius={5} fill={pending?.component===c.id&&pending.port===p.id?'#e0ad58':colors.surface} stroke={pending?'#39a672':colors.line} strokeWidth={2} listening={false}/>;
          }))}
          {guides.map((g) => (
            <Line
              key={g.axis}
              points={
                g.axis === "x"
                  ? [
                      g.value,
                      -view.y / view.scale,
                      g.value,
                      (size.height - view.y) / view.scale,
                    ]
                  : [
                      -view.x / view.scale,
                      g.value,
                      (size.width - view.x) / view.scale,
                      g.value,
                    ]
              }
              stroke="#cf9b47"
              strokeWidth={1}
              dash={[4, 4]}
            />
          ))}
          {marquee && (
            <Rect
              x={Math.min(marquee.start.x, marquee.end.x)}
              y={Math.min(marquee.start.y, marquee.end.y)}
              width={Math.abs(marquee.end.x - marquee.start.x)}
              height={Math.abs(marquee.end.y - marquee.start.y)}
              fill="#4eaa7b22"
              stroke="#3e9366"
              strokeWidth={1}
            />
          )}
        </Layer>
      </Stage>
      {notice && <div role="status" className="notice canvas-notice">{notice}<button aria-label={t("dismissNotice")} onClick={dismissNotice}>×</button></div>}
      {!circuit.components.length && (
        <div className="canvas-empty">
          <div className="empty-gate">&</div>
          <h2>{t("emptyTitle")}</h2>
          <p>{t("emptyBody")}</p>
        </div>
      )}
      {pending && <div className="wire-hint">{t("wireHint")}</div>}
      <div className="zoom-label">{Math.round(view.scale * 100)}%</div>
    </div>
  );
}

type GlyphProps = {
  c: Circuit["components"][number];
  project: Project;
  selected: boolean;
  dark: boolean;
  value?: string;
  button?: CanvasProps["button"];
  segments?: string;
  pending?: Endpoint;
  scale: number;
  waypoints: Point[];
  space: boolean;
  readOnly: boolean;
  cacheGlyph: boolean;
  pin: CanvasProps["pin"];
};
const ComponentGlyph = memo(
  function ComponentGlyph({
    c,
    project,
    selected,
    dark,
    value,
    button,
    segments,
    pending,
    scale,
    waypoints,
    space,
    readOnly,
    cacheGlyph,
    pin,
  }: GlyphProps) {
    const g = geometry(c, project);
    const cached = useRef<Konva.Group>(null);
    useLayoutEffect(() => {
      if (!cacheGlyph) return;
      const pad = Math.ceil(10 / scale);
      cached.current?.cache({
        x: -pad,
        y: -pad,
        width: g.w + 2 * pad,
        height: g.h + 2 * pad,
        pixelRatio: Math.max(0.5, scale),
      });
      return () => {
        cached.current?.clearCache();
      };
    }, [c, project, selected, dark, value, segments, pending, scale, cacheGlyph]);
    const colors = dark
      ? { surface: "#203532", text: "#ecf5ef", line: "#90aa9d" }
      : { surface: "#fff", text: "#223d35", line: "#728e80" };
    return (
      <Group ref={cached}>
        <Rect
          width={g.w}
          height={g.h}
          fill={colors.surface}
          cornerRadius={6}
          stroke={selected ? "#25815c" : colors.line}
          strokeWidth={selected ? 2 : 1}
        />
        <Text
          x={12}
          y={g.h - 25}
          width={g.w - 24}
          text={c.name}
          wrap="none"
          height={18}
          fontSize={12}
          fontFamily="ui-monospace, monospace"
          fill={colors.text}
          ellipsis
        />
        {c.kind === "button" ? (
          <Group onMouseDown={e => {e.cancelBubble=true;}} onPointerDown={e => { if(readOnly || e.evt.button !== 0)return; e.cancelBubble=true; (e.evt.target as Element)?.setPointerCapture?.(e.evt.pointerId); button?.(c.id,true); }}
            onPointerUp={e => {e.cancelBubble=true;button?.(c.id,false);}} onPointerCancel={() => button?.(c.id,false)}>
            <Rect x={30} y={g.h / 2 - 24} width={60} height={36} cornerRadius={6} fill={value === "1" ? "#25815c" : colors.surface} stroke={colors.line} />
            <Text x={30} y={g.h / 2 - 16} width={60} align="center" text={value === "1" ? "1" : "0"} fill={value === "1" ? "#fff" : colors.text} listening={false} />
          </Group>
        ) : c.kind === "sevenSegment" ? (
          <SevenSegment
            width={g.w}
            height={g.h}
            segments={segments ?? "XXXXXXXX"}
            dark={dark}
          />
        ) : (
          <Text
            x={30}
            y={g.h / 2 - 17}
            width={60}
            align="center"
            text={
              value ??
              {
                input: "0",
                button: "0",
                triState: "3STATE",
                constant: "1",
                probe: "—",
                not: "¬",
                and: "&",
                or: "≥1",
                xor: "=1",
                nand: "&̅",
                nor: "≥1̅",
                xnor: "=1̅",
                mux: "MUX",
                decoder: "DEC",
                split: "SPLIT",
                join: "JOIN",
                adder: "+",
                subtractor: "−",
                compare: "= / <",
                register: "REG",
                counter: "+1",
                dff: "D",
                ram: "RAM",
                rom: "ROM",
                portIn: "IN",
                portOut: "OUT",
                instance: "ƒ",
                buffer: "BUF",
                keyboard: "KBD",
                terminal: "TERM",
                display: "PIX",
                sevenSegment: "",
              }[c.kind]
            }
            wrap="none"
            height={24}
            fontSize={value ? 16 : c.kind.length < 6 ? 20 : 12}
            fill={colors.text}
            ellipsis
          />
        )}
        {ports(c, project).map((p) => {
          const at = pinPosition(c, p.id, project),
            normal = pinNormal(c, p.id, project);
          return (
            <Group
              key={p.id}
              x={at.x - c.x}
              y={at.y - c.y}
              onMouseDown={(e) => {
                if (space) return;
                e.cancelBubble = true;
                pin({ component: c.id, port: p.id }, waypoints);
              }}
            >
              <Circle
                radius={5}
                hitStrokeWidth={14 / scale}
                fill={
                  pending?.component === c.id && pending.port === p.id
                    ? "#e0ad58"
                    : colors.surface
                }
                stroke={pending ? "#39a672" : colors.line}
                strokeWidth={2}
              />
              <Text
                visible={scale >= 0.65}
                x={normal.x < 0 ? 9 : normal.x > 0 ? -47 : -8}
                y={normal.y < 0 ? 9 : normal.y > 0 ? -18 : -5}
                width={normal.y ? 16 : 38}
                align={
                  normal.x < 0 ? "left" : normal.x > 0 ? "right" : "center"
                }
                text={p.name}
                wrap="none"
                ellipsis
                fontSize={10}
                fill={colors.line}
                listening={false}
              />
            </Group>
          );
        })}
      </Group>
    );
  },
  (a, b) =>
    a.c === b.c &&
    a.project === b.project &&
    a.selected === b.selected &&
    a.dark === b.dark &&
    a.value === b.value &&
    (a.c.kind !== "button" || a.button === b.button) &&
    a.segments === b.segments &&
    a.pending === b.pending &&
    a.scale === b.scale &&
    a.waypoints === b.waypoints &&
    a.space === b.space &&
    a.readOnly === b.readOnly &&
    a.cacheGlyph === b.cacheGlyph,
);
const ComponentLayer = memo(
  function ComponentLayer({
    layerRef,
    children,
  }: {
    layerRef: React.RefObject<Konva.Layer | null>;
    children: React.ReactNode;
    project: Project;
    circuit: Circuit;
    waypoints: Point[];
    view: Point & { scale: number };
    values: CanvasProps["values"];
    pending?: Endpoint;
    space: boolean;
    readOnly: boolean;
    dark: boolean;
    dragged?: { id: string; delta: Point };
  }) {
    return <Layer ref={layerRef}>{children}</Layer>;
  },
  (a, b) =>
    a.project === b.project &&
    a.circuit === b.circuit &&
    a.waypoints === b.waypoints &&
    a.view === b.view &&
    a.values === b.values &&
    a.pending === b.pending &&
    a.space === b.space &&
    a.readOnly === b.readOnly &&
    a.dark === b.dark &&
    a.dragged === b.dragged,
);
const WireLayer = memo(
  function WireLayer({
    layerRef,
    children,
  }: {
    layerRef: React.RefObject<Konva.Layer | null>;
    children: React.ReactNode;
    wires: Circuit["wires"];
    values: CanvasProps["values"];
    selection: string;
    pending?: Endpoint;
    view: Point & { scale: number };
    dark: boolean;
    readOnly: boolean;
    space: boolean;
  }) {
    return <Layer ref={layerRef}>{children}</Layer>;
  },
  (a, b) =>
    a.wires === b.wires &&
    a.values === b.values &&
    a.selection === b.selection &&
    a.pending === b.pending &&
    a.view === b.view &&
    a.dark === b.dark &&
    a.readOnly === b.readOnly &&
    a.space === b.space,
);
export default memo(
  Canvas,
  (a, b) =>
    a.project === b.project &&
    a.circuit === b.circuit &&
    a.selected === b.selected &&
    a.t === b.t &&
    a.dark === b.dark &&
    a.fitToken === b.fitToken &&
    a.pending === b.pending &&
    a.values === b.values &&
    a.path === b.path &&
    a.focus === b.focus &&
    a.readOnly === b.readOnly &&
    a.panMode === b.panMode &&
    a.button === b.button &&
    a.running === b.running &&
    a.notice === b.notice,
);
