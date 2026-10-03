import { useLayoutEffect, useRef } from "react";

function nearestOverflowY(start: Element | null): HTMLElement | null {
  let node: Element | null = start?.parentElement ?? null;
  while (node) {
    if (node instanceof HTMLElement) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Keep a chat/log list pinned to the latest row (bottom), like a messaging app.
 * Scrolls only the nearest overflow parent so sheet open does not jump the page
 * (scrollIntoView walks ancestors).
 */
export function useStickScrollToBottom(dep: unknown) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const sentinel = bottomRef.current;
      if (!sentinel) {
        return;
      }
      const scroller = nearestOverflowY(sentinel);
      if (!scroller) {
        return;
      }
      scroller.scrollTop = scroller.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [dep]);

  return bottomRef;
}
