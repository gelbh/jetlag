import { useState } from "react";
import { isFirestorePersistenceUnavailable } from "@/services/core/firebase/firebase";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";

const DISMISS_KEY = "jetlag-firestore-persistence-warning-dismissed";

function shouldShowPersistenceBanner(): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  return isFirestorePersistenceUnavailable() && sessionStorage.getItem(DISMISS_KEY) !== "1";
}

export function FirestorePersistenceBanner() {
  const [visible, setVisible] = useState(shouldShowPersistenceBanner);

  if (!visible) {
    return null;
  }

  return (
    <MapFloatSurface
      tone="warn"
      role="status"
      aria-live="polite"
      className="pointer-events-auto mx-3 mt-1.5 text-center text-sm font-semibold text-pretty"
    >
      Offline cache unavailable on this device. Map data may not reload without signal.{" "}
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
    </MapFloatSurface>
  );
}
