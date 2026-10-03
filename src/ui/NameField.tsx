import { useState, type InputHTMLAttributes } from "react";
import { NAME_LIMIT } from "../model/names";

/** Keep a temporarily empty required name out of the saved document. */
export default function NameField({
  value,
  commit,
  onBlur,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  commit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string>();
  const finish = () => {
    setDraft(undefined);
  };
  return (
    <input
      {...rest}
      maxLength={NAME_LIMIT}
      value={draft ?? value}
      onChange={(e) => {
        setDraft(e.target.value);
        if (e.target.value.trim() && e.target.value.length <= NAME_LIMIT)
          commit(e.target.value);
      }}
      onBlur={(e) => {
        finish();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish();
        if (e.key === "Escape") {
          e.stopPropagation();
          finish();
        }
        rest.onKeyDown?.(e);
      }}
    />
  );
}
