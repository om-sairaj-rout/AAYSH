import { useRef, useCallback } from "react";

/** Ignore stale async responses when filters/tabs change faster than the network. */
export const useLatestRequestId = () => {
  const requestIdRef = useRef(0);

  const startRequest = useCallback(() => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }, []);

  const isLatestRequest = useCallback(
    (requestId) => requestId === requestIdRef.current,
    []
  );

  return { startRequest, isLatestRequest };
};
