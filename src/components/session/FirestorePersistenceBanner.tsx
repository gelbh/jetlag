import { useState } from "react";
import { isFirestorePersistenceUnavailable } from "../../services/core/firebase";

const DISMISS_KEY = "jetlag-firestore-persistence-warning-dismissed";

function shouldShowPersistenceBanner(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  return (
    isFirestorePersistenceUnavailable() &&
    sessionStorage.getItem(DISMISS_KEY) !== "1"
  );
}

export function FirestorePersistenceBanner() {
  const [visible, setVisible] = useState(shouldShowPersistenceBanner);

  if (!visible) {
    return null;
  }

  return (
    <p
      className="map-float-alert pointer-events-auto mx-3 mt-1.5 border-2 border-status-warning/40 bg-status-warning-surface px-3 py-2 text-center text-sm font-semibold text-pretty text-status-warning"
      role="status"
      aria-live="polite"
    >
      Offline cache unavailable on this device. Map data may not reload without
      signal.{" "}
      <button
        type="button"
        className="underline"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
      >
        Dismiss
      </button>
    </p>
  );
}
