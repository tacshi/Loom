import { useEffect, useMemo, useRef } from "react";
import { Layer, Shape } from "react-konva";
import type Konva from "konva";
import type { Wire } from "../model/types";
import type { Bridge } from "../editor/crossings";
import {
  activeSignal,
  electronPath,
  electronPosition,
} from "../editor/electrons";

export default function Electrons({
  wires,
  bridges,
  values,
  path,
  running,
  dark,
  view,
  size,
}: {
  wires: Wire[];
  bridges: Bridge[];
  values: Record<string, string>;
  path: string;
  running: boolean;
  dark: boolean;
  view: { x: number; y: number; scale: number };
  size: { width: number; height: number };
}) {
  const layer = useRef<Konva.Layer>(null),
    phase = useRef(0);
  const paths = useMemo(
    () => wires.map((w) => ({ wire: w, path: electronPath(w, bridges) })),
    [wires, bridges],
  );
  const bridgeBuckets = useMemo(() => {
    const buckets = new Map<string, Bridge[]>();
    for (const b of bridges)
      for (
        let x = Math.floor((b.point.x - 8) / 32);
        x <= Math.floor((b.point.x + 8) / 32);
        x++
      )
        for (
          let y = Math.floor((b.point.y - 8) / 32);
          y <= Math.floor((b.point.y + 8) / 32);
          y++
        ) {
          const key = x + "," + y,
            list = buckets.get(key) ?? [];
          list.push(b);
          buckets.set(key, list);
        }
    return buckets;
  }, [bridges]);
  const enabled = useRef(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      if (!enabled.current) return;
      if (last) phase.current += (Math.min(now - last, 50) / 1000) * 60;
      last = now;
      layer.current?.batchDraw();
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      last = 0;
      enabled.current = running && !document.hidden && !motion.matches;
      layer.current?.batchDraw();
      if (enabled.current) frame = requestAnimationFrame(tick);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      enabled.current = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [running]);
  return (
    <Layer ref={layer} listening={false}>
      <Shape
        listening={false}
        sceneFunc={(ctx) => {
          if (!running || !enabled.current) return;
          const left = -view.x / view.scale,
            top = -view.y / view.scale,
            right = left + size.width / view.scale,
            bottom = top + size.height / view.scale;
          const spacing = Math.max(48, 24 / view.scale);
          ctx.fillStyle = dark ? "#b8ffcd" : "#55d78b";
          ctx.beginPath();
          for (const { wire, path: route } of paths) {
            if (
              !activeSignal(
                values[path + wire.to.component + ":" + wire.to.port],
              )
            )
              continue;
            for (
              let distance = phase.current % spacing;
              distance < route.length;
              distance += spacing
            ) {
              const p = electronPosition(route, distance);
              if (!p || p.x < left || p.x > right || p.y < top || p.y > bottom)
                continue;
              // The crossing wire disappears beneath the bridge's clearance halo.
              if (
                (
                  bridgeBuckets.get(
                    Math.floor(p.x / 32) + "," + Math.floor(p.y / 32),
                  ) ?? []
                ).some(
                  (b) =>
                    b.wire !== wire.id &&
                    Math.abs(p.x - b.point.x) < 8 &&
                    Math.abs(p.y - b.point.y) < 8,
                )
              )
                continue;
              ctx.moveTo(p.x + 2.5, p.y);
              ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            }
          }
          ctx.fill();
        }}
      />
    </Layer>
  );
}
