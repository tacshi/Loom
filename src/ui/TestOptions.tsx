import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function TestOptions({
  saved,
  circuit,
  t,
}: {
  saved: () => void;
  circuit: () => void;
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
      ref={root}
      className="test-options"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={t("testOptions")}
        title={t("testOptions")}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="test-options-popup" id={id}>
          <button
            onClick={() => {
              setOpen(false);
              saved();
            }}
          >
            {t("sequentialTests")}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              circuit();
            }}
          >
            {t("circuitTests")}
          </button>
        </div>
      )}
    </div>
  );
}
