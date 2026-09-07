import { useState } from "react";

export default function Help({
  close,
  t,
}: {
  close: () => void;
  t: (key: string) => string;
}) {
  const [fallback, setFallback] = useState<string>();
  const [copied, setCopied] = useState(false);
  async function copyReport() {
    const report = `Loom ${__APP_VERSION__}\nBuild: ${__BUILD_COMMIT__}\nBrowser: ${navigator.userAgent}\n\nSteps to reproduce:\n\nExpected:\n\nActual:\n`;
    setCopied(false);
    try {
      await navigator.clipboard.writeText(report);
      setFallback(undefined);
      setCopied(true);
    } catch {
      setFallback(report);
    }
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t("help")}
        className="dialog help-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{t("help")}</h2>
          <button autoFocus onClick={close}>
            {t("close")}
          </button>
        </div>
        <h3>{t("gettingStarted")}</h3>
        <p>{t("helpCourse")}</p>
        <p>{t("helpExamples")}</p>
        <p>{t("helpExport")}</p>
        <h3>{t("keyboardShortcuts")}</h3>
        <p>{t("shortcuts")}</p>
        <button onClick={() => void copyReport()}>
          {t(copied ? "reportCopied" : "copyBugReport")}
        </button>
        {fallback !== undefined && (
          <label>
            {t("copyReportManually")}
            <textarea
              aria-label={t("bugReport")}
              rows={10}
              readOnly
              value={fallback}
              onFocus={(e) => e.target.select()}
            />
          </label>
        )}
      </section>
    </div>
  );
}
