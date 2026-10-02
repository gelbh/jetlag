import { useCallback } from "react";
import { type ExitSessionParams, exitSession } from "../../services/session/sessionExit";
import { useAppNavigate } from "../navigation/useAppNavigate";

type UseSessionExitParams = Omit<ExitSessionParams, "navigate">;

export function useSessionExit() {
  const navigate = useAppNavigate();

  return useCallback(
    (params: UseSessionExitParams) => exitSession({ ...params, navigate }),
    [navigate],
  );
}
