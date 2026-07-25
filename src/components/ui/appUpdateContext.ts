import { createContext } from "react";

export interface AppUpdateContextValue {
  inActiveMapSession: boolean;
  safeToReload: boolean;
  showMapChip: boolean;
  showGlobalBanner: boolean;
  dismissDeferred: () => void;
  applyUpdate: () => void;
  /** Hotfix grace countdown (Task 8 chip consumes these). */
  hotfixGraceActive: boolean;
  hotfixGraceSecondsRemaining: number | null;
  hotfixRequiredMinAppVersion: string | null;
}

export const AppUpdateContext = createContext<AppUpdateContextValue | null>(
  null,
);
