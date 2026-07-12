import { useContext } from "react";
import {
  AppUpdateContext,
  type AppUpdateContextValue,
} from "../components/ui/appUpdateContext";

export function useAppUpdateState(): AppUpdateContextValue {
  const value = useContext(AppUpdateContext);
  if (!value) {
    throw new Error("useAppUpdateState must be used within AppUpdateProvider");
  }
  return value;
}

export type { AppUpdateContextValue };
