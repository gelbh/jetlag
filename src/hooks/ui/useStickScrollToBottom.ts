import { useLayoutEffect, useRef } from "react";

/**
 * Keep a chat/log list pinned to the latest row (bottom), like a messaging app.
 * Call with a changing dep (e.g. message count) so open + new items both stick.
 */
export function useStickScrollToBottom(_dep: unknown) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView?.({ block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return bottomRef;
}
