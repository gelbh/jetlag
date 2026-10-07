export const VETO_ANSWER = { kind: "veto" as const };

export const VETO_SELECTED_REPLY = "veto";

export function isVetoAnswer(answer: unknown): boolean {
  return (
    typeof answer === "object" &&
    answer !== null &&
    "kind" in answer &&
    (answer as { kind: unknown }).kind === "veto"
  );
}
