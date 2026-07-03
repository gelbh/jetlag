import { useCallback, useRef } from "react";

export function useLatestRequest() {
  const requestIdRef = useRef(0);

  const beginRequest = useCallback(() => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }, []);

  const cancelRequests = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  const isLatestRequest = useCallback(
    (requestId: number) => requestId === requestIdRef.current,
    [],
  );

  return { beginRequest, cancelRequests, isLatestRequest, requestIdRef };
}
