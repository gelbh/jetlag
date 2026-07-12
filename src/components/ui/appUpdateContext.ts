import { createContext } from "react";

export interface AppUpdateContextValue {
  inActiveMapSession: boolean;
  safeToReload: boolean;
  showMapChip: boolean;
  showGlobalBanner: boolean;
  dismissDeferred: () => void;
  applyUpdate: () => void;
}

export const AppUpdateContext = createContext<AppUpdateContextValue | null>(
  null,
);
