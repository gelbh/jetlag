import { create } from "zustand";
import type { AdminDivisionCounts } from "../services/geo/overpass/adminDivisionAvailability";

export interface PreloadJobCounts {
  gameAreaKey: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
}

interface PreloadStoreState {
  activeGameAreaKey: string | null;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  /**
   * Critical preload (admin boundaries) started at create/join. Kept apart so
   * the map screen's main preload `reset` cannot wipe its counts.
   */
  critical: PreloadJobCounts | null;
  dismissed: boolean;
  adminDivisionCounts: AdminDivisionCounts | null;
  reset: (gameAreaKey: string, totalJobs: number) => void;
  recordSuccess: (gameAreaKey: string) => void;
  recordFailure: (gameAreaKey: string) => void;
  resetCritical: (gameAreaKey: string, totalJobs: number) => void;
  recordCriticalJob: (gameAreaKey: string, outcome: "success" | "failure") => void;
  dismiss: () => void;
  setAdminDivisionCounts: (gameAreaKey: string, counts: AdminDivisionCounts) => void;
}

export const usePreloadStore = create<PreloadStoreState>((set, get) => ({
  activeGameAreaKey: null,
  totalJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  critical: null,
  dismissed: false,
  adminDivisionCounts: null,
  reset: (gameAreaKey, totalJobs) =>
    set({
      activeGameAreaKey: gameAreaKey,
      totalJobs,
      completedJobs: 0,
      failedJobs: 0,
      dismissed: false,
      adminDivisionCounts: null,
    }),
  recordSuccess: (gameAreaKey) => {
    if (get().activeGameAreaKey !== gameAreaKey) {
      return;
    }

    set((state) => ({
      completedJobs: state.completedJobs + 1,
    }));
  },
  recordFailure: (gameAreaKey) => {
    if (get().activeGameAreaKey !== gameAreaKey) {
      return;
    }

    set((state) => ({
      failedJobs: state.failedJobs + 1,
      completedJobs: state.completedJobs + 1,
    }));
  },
  resetCritical: (gameAreaKey, totalJobs) =>
    set({
      critical: { gameAreaKey, totalJobs, completedJobs: 0, failedJobs: 0 },
      dismissed: false,
    }),
  recordCriticalJob: (gameAreaKey, outcome) => {
    const critical = get().critical;
    if (critical?.gameAreaKey !== gameAreaKey) {
      return;
    }

    set({
      critical: {
        ...critical,
        completedJobs: critical.completedJobs + 1,
        failedJobs: critical.failedJobs + (outcome === "failure" ? 1 : 0),
      },
    });
  },
  dismiss: () => set({ dismissed: true }),
  setAdminDivisionCounts: (gameAreaKey, counts) => {
    if (get().activeGameAreaKey !== gameAreaKey) {
      return;
    }

    set({ adminDivisionCounts: counts });
  },
}));

/** Main and critical job counts for the active play area, summed. */
function combinedJobs(state: PreloadStoreState): Omit<PreloadJobCounts, "gameAreaKey"> {
  const main = state.activeGameAreaKey
    ? {
        totalJobs: state.totalJobs,
        completedJobs: state.completedJobs,
        failedJobs: state.failedJobs,
      }
    : { totalJobs: 0, completedJobs: 0, failedJobs: 0 };
  const critical = state.critical;
  if (
    !critical ||
    (state.activeGameAreaKey !== null && critical.gameAreaKey !== state.activeGameAreaKey)
  ) {
    return main;
  }
  return {
    totalJobs: main.totalJobs + critical.totalJobs,
    completedJobs: main.completedJobs + critical.completedJobs,
    failedJobs: main.failedJobs + critical.failedJobs,
  };
}

export function selectPreloadBanner(state: PreloadStoreState): {
  visible: boolean;
  loading: boolean;
  failed: boolean;
  completedJobs: number;
  totalJobs: number;
  title: string;
  body: string;
} {
  const jobs = combinedJobs(state);
  if (state.dismissed || jobs.totalJobs === 0) {
    return {
      visible: false,
      loading: false,
      failed: false,
      completedJobs: 0,
      totalJobs: 0,
      title: "",
      body: "",
    };
  }

  const finished = jobs.completedJobs >= jobs.totalJobs;
  const loading = !finished;
  const failed = jobs.failedJobs > 0;

  if (!loading && !failed) {
    return {
      visible: false,
      loading: false,
      failed: false,
      completedJobs: 0,
      totalJobs: 0,
      title: "",
      body: "",
    };
  }

  if (loading) {
    return {
      visible: true,
      loading: true,
      failed: false,
      completedJobs: jobs.completedJobs,
      totalJobs: jobs.totalJobs,
      title: "Map preload",
      body: "Caching coastlines, transit, and tool data for this play area.",
    };
  }

  return {
    visible: true,
    loading: false,
    failed: true,
    completedJobs: jobs.completedJobs,
    totalJobs: jobs.totalJobs,
    title: "Preload incomplete",
    body: "Some caches failed. Tools may run slower until the next session.",
  };
}
