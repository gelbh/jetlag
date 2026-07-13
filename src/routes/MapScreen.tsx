import { useEffect, type ReactNode } from "react";
import { AppNavigate } from "../navigation/AppNavigate";
import { HiderMapScreen } from "./HiderMapScreen";
import { AdminMapScreen } from "./AdminMapScreen";
import { ObserverMapScreen } from "./ObserverMapScreen";
import { SeekerMapScreen } from "./SeekerMapScreen";
import { useSessionHeartbeat } from "../hooks/session/useSessionHeartbeat";
import { teardownSessionUiState } from "../services/session/sessionCleanup";
import { useSessionStore } from "../state/sessionStore";

function MapScreenShell({ children }: { children: ReactNode }) {
  return (
    <div data-edge-swipe="off" className="h-full min-h-0">
      {children}
    </div>
  );
}

export function MapScreen() {
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);

  useSessionHeartbeat(session);

  useEffect(() => () => teardownSessionUiState(), []);

  if (!session || !session.gameArea) {
    return <AppNavigate to={session ? "/create" : "/"} replace />;
  }

  if (myRole === "hider") {
    return (
      <MapScreenShell>
        <HiderMapScreen />
      </MapScreenShell>
    );
  }

  if (myRole === "admin") {
    return (
      <MapScreenShell>
        <AdminMapScreen />
      </MapScreenShell>
    );
  }

  if (myRole === "observer") {
    return (
      <MapScreenShell>
        <ObserverMapScreen />
      </MapScreenShell>
    );
  }

  return (
    <MapScreenShell>
      <SeekerMapScreen />
    </MapScreenShell>
  );
}
