import { useRef, useState, useEffect } from "react";
import type { Component } from "../model/types";
import { decodeMemory, encodeMemory } from "../persistence/memoryFile";
export default function MemoryEditor({
  component,
  id,
  values,
  running,
  write,
  importWords,
  t,
}: {
  component: Component;
  id: string;
  values: number[];
  running: boolean;
  write: (address: number, value: number) => void;
  importWords: (start: number, words: number[]) => void;
  t: (s: string) => string;
}) {
  const [address, setAddress] = useState(0),
    [base, setBase] = useState<10 | 16>(16),
    [endian, setEndian] = useState<"little" | "big">("little"),
    [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null),
    size = 2 ** (component.params.addressBits ?? 8),
    words =
      component.kind === "rom"
        ? Array.from({ length: size }, (_, i) => component.image?.[i] ?? 0)
        : values;
  const prior = useRef<{ id: string; words: number[] } | undefined>(undefined),
    [changed, setChanged] = useState<Set<number>>(new Set());
  useEffect(() => {
    const before = prior.current;
    if (before?.id !== id) setChanged(new Set());
    else {
      const delta = words.flatMap((v, i) => (before.words[i] !== v ? [i] : []));
      if (delta.length) setChanged((old) => new Set([...old, ...delta]));
    }
    prior.current = { id, words: [...words] };
  }, [id, values, component.image]);
  function download(binary: boolean) {
    try {
      const blob = binary
        ? new Blob([encodeMemory(words, component.width, endian).buffer])
        : new Blob([
            words
              .map((v) => {
                if (v < 0) throw new Error("unknownMemoryExport");
                return v
                  .toString(16)
                  .padStart(Math.ceil(component.width / 4), "0");
              })
              .join("\n"),
          ]);
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = component.name + (binary ? ".bin" : ".hex");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="memory-panel">
      <h3>
        {id} · {size} × {component.width}
      </h3>
      <div className="timeline-controls">
        <label>
          {t("address")}
          <input
            type="number"
            min={0}
            max={size - 1}
            value={address}
            onChange={(e) =>
              setAddress(
                Math.max(0, Math.min(size - 1, Number(e.target.value))),
              )
            }
          />
        </label>
        <select
          aria-label={t("numberFormat")}
          value={base}
          onChange={(e) => setBase(Number(e.target.value) as 10 | 16)}
        >
          <option value={16}>HEX</option>
          <option value={10}>DEC</option>
        </select>
        <select
          aria-label={t("byteOrder")}
          value={endian}
          onChange={(e) => setEndian(e.target.value as "little" | "big")}
        >
          <option value="little">{t("littleEndian")}</option>
          <option value="big">{t("bigEndian")}</option>
        </select>
        <button disabled={running} onClick={() => file.current?.click()}>
          {t("importMemory")}
        </button>
        <button onClick={() => download(true)}>{t("exportBinary")}</button>
        <button onClick={() => download(false)}>{t("exportHex")}</button>
      </div>
      <input
        type="file"
        hidden
        ref={file}
        accept=".bin,.hex,.txt"
        onChange={async (e) => {
          try {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 262144 * 4) throw new Error("invalidMemoryImage");
            const data = /\.bin$/i.test(f.name)
              ? new Uint8Array(await f.arrayBuffer())
              : await f.text();
            const next = decodeMemory(
              data,
              component.width,
              address,
              size,
              endian,
            );
            importWords(address, next);
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert">
          {error === "invalidMemoryWord"
            ? t("memoryWordRange").replace(
                "{max}",
                (2 ** component.width - 1).toString(base).toUpperCase(),
              )
            : t(error)}
        </p>
      )}
      <div className="memory-cells">
        {words.slice(address, address + 64).map((v, i) => (
          <label
            key={address + i}
            className={changed.has(address + i) ? "memory-changed" : ""}
            title={changed.has(address + i) ? t("changed") : undefined}
          >
            <span>{(address + i).toString(16).padStart(2, "0")}</span>
            <input
              aria-label={t("memoryWord") + " " + (address + i)}
              key={`${address + i}:${v}:${base}`}
              defaultValue={v < 0 ? "X" : v.toString(base).toUpperCase()}
              disabled={running}
              onBlur={(e) => {
                if (
                  e.target.value ===
                  (v < 0 ? "X" : v.toString(base).toUpperCase())
                )
                  return;
                const text = e.target.value.trim(),
                  valid =
                    base === 16
                      ? /^[0-9a-f]+$/i.test(text)
                      : /^\d+$/.test(text),
                  n = parseInt(text, base);
                if (!valid || n > 2 ** component.width - 1) {
                  e.target.value = v < 0 ? "X" : v.toString(base);
                  setError("invalidMemoryWord");
                  return;
                }
                if (n !== v) write(address + i, n);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
