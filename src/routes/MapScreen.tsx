import { Navigate } from "react-router-dom";
import { HiderMapScreen } from "./HiderMapScreen";
import { ObserverMapScreen } from "./ObserverMapScreen";
import { SeekerMapScreen } from "./SeekerMapScreen";
import { useSessionStore } from "../state/sessionStore";

export function MapScreen() {
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);

  if (!session || !session.gameArea) {
    return <Navigate to={session ? "/create" : "/"} replace />;
  }

  if (myRole === "hider") {
    return <HiderMapScreen />;
  }

  if (myRole === "observer") {
    return <ObserverMapScreen />;
  }

  return <SeekerMapScreen />;
}
