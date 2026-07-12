import { useCallback } from "react";
import { useAppNavigate } from "../useAppNavigate";
import { exitSession, type ExitSessionParams } from "../../services/session/sessionExit";

type UseSessionExitParams = Omit<ExitSessionParams, "navigate">;

export function useSessionExit() {
  const navigate = useAppNavigate();

  return useCallback(
    (params: UseSessionExitParams) => exitSession({ ...params, navigate }),
    [navigate],
  );
}
