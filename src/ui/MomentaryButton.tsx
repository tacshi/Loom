import { useEffect, useRef } from "react";
export default function MomentaryButton({
  held,
  disabled,
  change,
  label,
}: {
  held: boolean;
  disabled: boolean;
  change: (down: boolean, source: string) => void;
  label: string;
}) {
  const current = useRef(change);
  current.current = change;
  useEffect(() => () => current.current(false, "all"), []);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={held}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        change(true, "pointer");
      }}
      onPointerUp={() => change(false, "pointer")}
      onPointerCancel={() => change(false, "pointer")}
      onLostPointerCapture={() => change(false, "pointer")}
      onBlur={() => change(false, "all")}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (!e.repeat) change(true, "key:" + e.key);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          change(false, "key:" + e.key);
        }
      }}
    >
      {label}
    </button>
  );
}
