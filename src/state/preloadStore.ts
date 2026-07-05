import { create } from "zustand";

interface PreloadStoreState {
  activeGameAreaKey: string | null;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  dismissed: boolean;
  reset: (gameAreaKey: string, totalJobs: number) => void;
  recordSuccess: (gameAreaKey: string) => void;
  recordFailure: (gameAreaKey: string) => void;
  dismiss: () => void;
}

export const usePreloadStore = create<PreloadStoreState>((set, get) => ({
  activeGameAreaKey: null,
  totalJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  dismissed: false,
  reset: (gameAreaKey, totalJobs) =>
    set({
      activeGameAreaKey: gameAreaKey,
      totalJobs,
      completedJobs: 0,
      failedJobs: 0,
      dismissed: false,
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
  dismiss: () => set({ dismissed: true }),
}));

export function selectPreloadBanner(state: PreloadStoreState): {
  visible: boolean;
  loading: boolean;
  failed: boolean;
  label: string;
} {
  if (
    !state.activeGameAreaKey ||
    state.dismissed ||
    state.totalJobs === 0
  ) {
    return { visible: false, loading: false, failed: false, label: "" };
  }

  const finished = state.completedJobs >= state.totalJobs;
  const loading = !finished;
  const failed = state.failedJobs > 0;

  if (!loading && !failed) {
    return { visible: false, loading: false, failed: false, label: "" };
  }

  if (loading) {
    return {
      visible: true,
      loading: true,
      failed: false,
      label: `Loading map data (${state.completedJobs}/${state.totalJobs})…`,
    };
  }

  return {
    visible: true,
    loading: false,
    failed: true,
    label: "Some map data failed — tools may be slower until you retry.",
  };
}
