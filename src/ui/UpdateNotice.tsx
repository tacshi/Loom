import { useRegisterSW } from "virtual:pwa-register/react";
import { useRef, useState } from "react";
export default function UpdateNotice({
  flush,
  t,
}: {
  flush: () => Promise<boolean>;
  t: (s: string) => string;
}) {
  const latestFlush = useRef(flush);
  latestFlush.current = flush;
  const reloading = useRef(false);
  const cleanup = useRef(() => {});
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function reloadSafely() {
    if (reloading.current) return;
    reloading.current = true;
    cleanup.current();
    try {
      if (await latestFlush.current()) {
        location.reload();
        return;
      }
    } catch {
      /* Keep the document available for export when storage fails. */
    }
    reloading.current = false;
    setError("saveFailed");
    setBusy(false);
  }
  const {
    needRefresh: [needed],
    updateServiceWorker,
  } = useRegisterSW({ onNeedReload: () => void reloadSafely() });
  if (!needed) return null;
  async function update() {
    setBusy(true);
    setError("");
    if (!(await flush())) {
      setError("saveFailed");
      setBusy(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", reload);
      void reloadSafely();
    };
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("updateFailed");
      navigator.serviceWorker.addEventListener("controllerchange", reload, {
        once: true,
      });
      cleanup.current = () => {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("controllerchange", reload);
      };
      const waiting = registration.waiting;
      if (waiting) {
        waiting.addEventListener("statechange", () => {
          if (waiting.state === "activated") reload();
        });
        waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        await updateServiceWorker(true);
        await reloadSafely();
        return;
      }
      timer = setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", reload);
        setError("updateFailed");
        setBusy(false);
      }, 10000);
    } catch {
      navigator.serviceWorker.removeEventListener("controllerchange", reload);
      setError("updateFailed");
      setBusy(false);
    }
  }
  return (
    <div className="update-notice" role="status">
      <span>{t(error || "updateAvailable")}</span>
      <button disabled={busy} onClick={() => void update()}>
        {t(busy ? "updating" : "saveAndUpdate")}
      </button>
    </div>
  );
}
