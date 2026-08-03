export function shouldFlushOfflineQueueOnVisibility(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}

export function shouldFlushOfflineQueueOnPageShow(event: PageTransitionEvent): boolean {
  return event.persisted;
}

export function bindOfflineQueueResumeFlush(flush: () => void): () => void {
  const handleVisibilityChange = () => {
    if (shouldFlushOfflineQueueOnVisibility()) {
      flush();
    }
  };

  const handlePageShow = (event: PageTransitionEvent) => {
    if (shouldFlushOfflineQueueOnPageShow(event)) {
      flush();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pageshow", handlePageShow);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pageshow", handlePageShow);
  };
}
