import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { HiderMapScreen } from "./HiderMapScreen";
import { AdminMapScreen } from "./AdminMapScreen";
import { ObserverMapScreen } from "./ObserverMapScreen";
import { SeekerMapScreen } from "./SeekerMapScreen";
import { useSessionHeartbeat } from "../hooks/session/useSessionHeartbeat";
import { teardownSessionUiState } from "../services/session/sessionCleanup";
import { useSessionStore } from "../state/sessionStore";

export function MapScreen() {
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);

  useSessionHeartbeat(session);

  useEffect(() => () => teardownSessionUiState(), []);

  if (!session || !session.gameArea) {
    return <Navigate to={session ? "/create" : "/"} replace />;
  }

  if (myRole === "hider") {
    return <HiderMapScreen />;
  }

  if (myRole === "admin") {
    return <AdminMapScreen />;
  }

  if (myRole === "observer") {
    return <ObserverMapScreen />;
  }

  return <SeekerMapScreen />;
}
