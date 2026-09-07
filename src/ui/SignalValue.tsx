import { format, type Signal } from "../simulator/signal";
export default function SignalValue({
  value,
  t,
}: {
  value: unknown;
  t: (s: string) => string;
}) {
  if (
    value &&
    typeof value === "object" &&
    "known" in value &&
    "width" in value
  ) {
    const signal = value as Signal;
    if (signal.width === 1) {
      const text = signal.highZ
        ? t("floatingSignal")
        : !signal.known
          ? t("unknownSignal")
          : signal.value
            ? t("bitOn")
            : t("bitOff");
      return (
        <span className={`signal-value signal-${format(signal)}`}>
          <span aria-hidden="true" className="bit-lamp" />
          {text}
        </span>
      );
    }
    return (
      <details className="bus-value">
        <summary>
          {format(signal)}{" "}
          <small>
            {signal.width} {t("bits")}
          </small>
        </summary>
        <code>{format(signal, 2)}</code>
      </details>
    );
  }
  if (typeof value === "string")
    return <pre className="test-output">{value || "∅"}</pre>;
  return (
    <span>
      {value === null || value === undefined
        ? t("unknownSignal")
        : String(value)}
    </span>
  );
}
