import { useState, type InputHTMLAttributes } from "react";

/**
 * Integer input that commits valid values as they are typed but keeps an
 * empty or out-of-range draft visible until blur or Enter. Clamping on every
 * keystroke would turn "clear, then type 8" into 18.
 */
export default function NumberField({
  value,
  min,
  max,
  commit,
  onBlur,
  ...rest
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "min" | "max" | "type" | "onChange"
> & {
  value: number;
  min: number;
  max: number;
  commit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string>();
  const parse = (text: string) => {
    const n = Number(text);
    return text.trim() === "" || !Number.isFinite(n) ? undefined : Math.trunc(n);
  };
  const finish = () => {
    if (draft === undefined) return;
    setDraft(undefined);
    const n = parse(draft);
    if (n === undefined) return;
    const clamped = Math.min(max, Math.max(min, n));
    if (clamped !== value) commit(clamped);
  };
  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={draft ?? value}
      onChange={(e) => {
        const text = e.target.value,
          n = parse(text);
        setDraft(text);
        if (n !== undefined && n >= min && n <= max && n !== value) commit(n);
      }}
      onBlur={(e) => {
        finish();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish();
        else if (e.key === "Escape" && draft !== undefined) {
          e.stopPropagation();
          setDraft(undefined);
        }
        rest.onKeyDown?.(e);
      }}
    />
  );
}
