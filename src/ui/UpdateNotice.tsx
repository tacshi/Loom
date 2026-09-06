import { useRegisterSW } from "virtual:pwa-register/react";
import { useState } from "react";
export default function UpdateNotice({
  flush,
  t,
}: {
  flush: () => Promise<boolean>;
  t: (s: string) => string;
}) {
  const {
    needRefresh: [needed],
    updateServiceWorker,
  } = useRegisterSW();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
      location.reload();
    };
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("updateFailed");
      navigator.serviceWorker.addEventListener("controllerchange", reload, {
        once: true,
      });
      const waiting = registration.waiting;
      if (waiting) {
        waiting.addEventListener("statechange", () => {
          if (waiting.state === "activated") reload();
        });
        waiting.postMessage({ type: "SKIP_WAITING" });
      } else await updateServiceWorker(true);
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
