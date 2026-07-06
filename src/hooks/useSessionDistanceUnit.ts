import { useSessionStore } from "../state/sessionStore";
import { sessionDistanceUnit } from "../domain/sessionDistanceUnit";

export function useSessionDistanceUnit() {
  const session = useSessionStore((state) => state.session);
  return sessionDistanceUnit(session);
}
