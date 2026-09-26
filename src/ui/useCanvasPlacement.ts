import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { geometry, ports, pinPosition } from "../model/components";
import {
  GRID,
  type Component,
  type Project,
  type Point,
  type Circuit,
} from "../model/types";
import {
  placementOrigin,
  snapPlacement,
  placementHaptics,
  type Guides,
} from "../editor/placement";
import { alignmentTargets, type Alignment } from "../editor/alignment";
export type PlacementDraft = {
  component: Component;
  definitions?: Project["circuits"];
  projectId: string;
  circuitId: string;
  start?: Point;
  pointerId?: number;
  releaseCapture?: () => void;
};
export type PlacementProps = {
  placement?: PlacementDraft;
  commitPlacement: (draft: PlacementDraft, at: Point) => boolean;
  cancelPlacement: () => void;
  /** Called when a palette item is clicked instead of dragged. */
  hintPlacement?: () => void;
};
export function useCanvasPlacement(
  props: PlacementProps & {
    host: RefObject<HTMLDivElement | null>;
    project: Project;
    circuit: Circuit;
    view: Point & { scale: number };
    readOnly: boolean;
  },
) {
  const targets = useMemo(
    () =>
      props.placement
        ? alignmentTargets(props.circuit, props.project)
        : { x: [], y: [] },
    [props.circuit, props.project, !!props.placement],
  );
  const latest = useRef({ ...props, targets });
  latest.current = { ...props, targets };
  const [preview, setPreview] = useState<{ position: Point; guides: Guides }>();
  const draft = props.placement;
  const previewProject = useMemo(
    () =>
      draft?.definitions
        ? {
            ...props.project,
            circuits: { ...props.project.circuits, ...draft.definitions },
          }
        : props.project,
    [props.project, draft],
  );
  useEffect(() => {
    setPreview(undefined);
    if (!draft) return;
    let active = !draft.start,
      finished = false;
    let raw: Point | undefined, current: typeof preview;
    const held: { x?: Alignment; y?: Alignment } = {};
    const feedback = placementHaptics((ms) => navigator.vibrate?.(ms));
    const cancel = () => {
      if (finished) return;
      finished = true;
      setPreview(undefined);
      latest.current.cancelPlacement();
      draft.releaseCapture?.();
    };
    const valid = () => {
      const p = latest.current;
      return (
        !p.readOnly &&
        p.project.id === draft.projectId &&
        p.circuit.id === draft.circuitId
      );
    };
    const update = (client?: Point) => {
      if (!valid()) {
        cancel();
        return;
      }
      const { host, project, view, targets } = latest.current;
      const rect = host.current!.getBoundingClientRect();
      const targetProject = draft.definitions
        ? {
            ...project,
            circuits: { ...project.circuits, ...draft.definitions },
          }
        : project;
      const g = geometry(draft.component, targetProject);
      if (client) {
        if (
          client.x < rect.left ||
          client.x >= rect.right ||
          client.y < rect.top ||
          client.y >= rect.bottom
        ) {
          current = undefined;
          held.x = held.y = undefined;
          feedback.align([]);
          setPreview(undefined);
          return;
        }
        raw = placementOrigin(client, rect, view, g);
      }
      if (!raw)
        raw = placementOrigin(
          { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
          rect,
          view,
          g,
        );
      current = snapPlacement(
        raw,
        targets,
        {
          x: [0, g.w / 2, g.w],
          y: [
            0,
            g.h / 2,
            g.h,
            ...ports(draft.component, targetProject).map(
              (p) =>
                pinPosition(draft.component, p.id, targetProject).y -
                draft.component.y,
            ),
          ],
        },
        // Keyboard steps remain exactly one grid unit, even when zoomed out.
        draft.start ? view.scale : Infinity,
        held,
      );
      feedback.align(current.guides);
      setPreview(current);
    };
    const commit = () => {
      if (finished) return;
      if (
        valid() &&
        current &&
        latest.current.commitPlacement(draft, current.position)
      )
        feedback.drop();
      cancel();
    };
    const move = (e: PointerEvent) => {
      if (finished || e.pointerId !== draft.pointerId) return;
      if (
        !active &&
        draft.start &&
        Math.hypot(e.clientX - draft.start.x, e.clientY - draft.start.y) >= 5
      )
        active = true;
      if (active) update({ x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      if (!finished && e.pointerId === draft.pointerId) {
        if (active) update({ x: e.clientX, y: e.clientY });
        else latest.current.hintPlacement?.();
        commit();
      }
    };
    const abort = (e: PointerEvent) => {
      if (e.pointerId === draft.pointerId) cancel();
    };
    const pointerDown = () => {
      if (!draft.start) cancel();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        cancel();
        return;
      }
      if (
        ![
          "Escape",
          "Enter",
          " ",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        cancel();
        return;
      }
      if (draft.start || (e.repeat && (e.key === "Enter" || e.key === " ")))
        return;
      if (e.key === "Enter") {
        commit();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        raw = { ...(current?.position ?? raw!) };
        raw.x +=
          e.key === "ArrowLeft" ? -GRID : e.key === "ArrowRight" ? GRID : 0;
        raw.y += e.key === "ArrowUp" ? -GRID : e.key === "ArrowDown" ? GRID : 0;
        held.x = held.y = undefined;
        update();
      }
    };
    if (active) update();
    window.addEventListener("pointerdown", pointerDown, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", abort);
    window.addEventListener("lostpointercapture", abort);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointerdown", pointerDown, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", abort);
      window.removeEventListener("lostpointercapture", abort);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", key, true);
      draft.releaseCapture?.();
    };
  }, [draft]);
  return { preview: draft ? preview : undefined, previewProject };
}
