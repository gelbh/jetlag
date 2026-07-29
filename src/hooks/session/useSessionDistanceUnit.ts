import { useSessionStore } from "../../state/sessionStore";
import { sessionDistanceUnit } from "../../domain/session/meta/sessionDistanceUnit";

export function useSessionDistanceUnit() {
  const session = useSessionStore((state) => state.session);
  return sessionDistanceUnit(session);
}
