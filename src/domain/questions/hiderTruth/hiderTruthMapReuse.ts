import type { HiderTruthResult } from "./shared";

function truthEqual(
  left: HiderTruthResult | undefined,
  right: HiderTruthResult | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }

  return (
    left.replyId === right.replyId &&
    left.label === right.label &&
    left.unavailable === right.unavailable &&
    left.unavailableReason === right.unavailableReason
  );
}

export function reuseHiderTruthMapIfEqual(
  previous: ReadonlyMap<string, HiderTruthResult>,
  next: ReadonlyMap<string, HiderTruthResult>,
): ReadonlyMap<string, HiderTruthResult> {
  if (previous === next) {
    return previous;
  }
  if (previous.size !== next.size) {
    return next;
  }

  for (const [questionId, truth] of next) {
    if (!truthEqual(previous.get(questionId), truth)) {
      return next;
    }
  }

  return previous;
}
