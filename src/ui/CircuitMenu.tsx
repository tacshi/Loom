import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export default function CircuitMenu({
  disabled,
  tidy,
  t,
}: {
  disabled: boolean;
  tidy: () => void;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open]);
  return (
    <div
      className="circuit-menu"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        title={t("circuitActions")}
        aria-label={t("circuitActions")}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="circuit-menu-actions" id={id}>
          <button
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              tidy();
              trigger.current?.focus();
            }}
          >
            {t("rerouteAll")}
          </button>
        </div>
      )}
    </div>
  );
}
