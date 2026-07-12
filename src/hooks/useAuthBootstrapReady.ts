import { useEffect, useState } from "react";
import {
  isAuthBootstrapReady,
  isFirebaseConfigured,
  subscribeAuthBootstrapReady,
} from "../services/core/firebase";

export function useAuthBootstrapReady(): boolean {
  const [ready, setReady] = useState(
    () => !isFirebaseConfigured() || isAuthBootstrapReady(),
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      return;
    }

    if (isAuthBootstrapReady()) {
      setReady(true);
      return;
    }

    return subscribeAuthBootstrapReady(() => {
      setReady(true);
    });
  }, []);

  return ready;
}
