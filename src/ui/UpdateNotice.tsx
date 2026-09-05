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
  const [failed, setFailed] = useState(false);
  if (!needed) return null;
  return (
    <div className="update-notice" role="status">
      <span>{t(failed ? "saveFailed" : "updateAvailable")}</span>
      <button
        onClick={async () => {
          if (await flush()) {
            await updateServiceWorker(true);
          } else setFailed(true);
        }}
      >
        {t("saveAndUpdate")}
      </button>
    </div>
  );
}
