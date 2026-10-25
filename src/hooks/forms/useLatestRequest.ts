import { useCallback, useEffect, useRef } from "react";

function supersededError(): DOMException {
  return new DOMException("Superseded by a newer request.", "AbortError");
}

/**
 * Tracks the latest async request. Starting a new one, or cancelling, aborts
 * the previous request's signal so its network work stops and frees its slot.
 */
export function useLatestRequest() {
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const beginRequest = useCallback(() => {
    controllerRef.current?.abort(supersededError());
    controllerRef.current = new AbortController();
    requestIdRef.current += 1;
    return requestIdRef.current;
  }, []);

  const cancelRequests = useCallback(() => {
    controllerRef.current?.abort(supersededError());
    controllerRef.current = null;
    requestIdRef.current += 1;
  }, []);

  const isLatestRequest = useCallback(
    (requestId: number) => requestId === requestIdRef.current,
    [],
  );

  /** Signal of the request started by the latest {@link beginRequest}. */
  const requestSignal = useCallback((): AbortSignal | undefined => {
    return controllerRef.current?.signal;
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.abort(supersededError());
    },
    [],
  );

  return { beginRequest, cancelRequests, isLatestRequest, requestIdRef, requestSignal };
}
