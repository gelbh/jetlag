import { sessionDistanceUnit } from "../../domain/session/meta/sessionDistanceUnit";
import { useSessionStore } from "../../state/sessionStore";

export function useSessionDistanceUnit() {
  const session = useSessionStore((state) => state.session);
  return sessionDistanceUnit(session);
}
