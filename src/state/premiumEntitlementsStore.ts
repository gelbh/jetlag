import { create } from "zustand";
import type { PremiumEntitlements } from "../domain/billing/premiumProducts";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import { fetchPremiumEntitlements } from "../services/billing/premiumBilling";

const STORAGE_KEY = "jetlag-premium-entitlements-v1";
const SOFT_STALE_MS = 10 * 60 * 1000;

interface PersistedEntitlements {
  uid: string;
  entitlements: PremiumEntitlements;
  fetchedAt: number;
}

interface PremiumEntitlementsState {
  uid: string | null;
  entitlements: PremiumEntitlements | null;
  loading: boolean;
  hydrated: boolean;
  softStale: boolean;
  generation: number;
  setUid: (uid: string | null) => void;
  setEntitlements: (entitlements: PremiumEntitlements | null) => void;
  hydrateFromStorage: () => void;
  refresh: () => Promise<PremiumEntitlements | null>;
}

let inflightRefresh: Promise<PremiumEntitlements | null> | null = null;
let inflightUid: string | null = null;

function readPersistedSnapshot(): PersistedEntitlements | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedEntitlements;
    if (
      typeof parsed?.uid !== "string" ||
      !parsed.entitlements ||
      typeof parsed.fetchedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedSnapshot(snapshot: PersistedEntitlements): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export const usePremiumEntitlementsStore = create<PremiumEntitlementsState>(
  (set, get) => ({
    uid: null,
    entitlements: null,
    loading: false,
    hydrated: false,
    softStale: false,
    generation: 0,
    setUid: (uid) => {
      if (get().uid === uid) {
        return;
      }

      set({
        uid,
        entitlements: null,
        hydrated: false,
        softStale: false,
        generation: get().generation + 1,
      });
      if (uid) {
        get().hydrateFromStorage();
      }
    },
    setEntitlements: (entitlements) => {
      set({ entitlements, loading: false, hydrated: true, softStale: false });
    },
    hydrateFromStorage: () => {
      const uid = get().uid;
      if (!uid) {
        return;
      }
      const snapshot = readPersistedSnapshot();
      if (!snapshot || snapshot.uid !== uid) {
        return;
      }
      set({
        entitlements: snapshot.entitlements,
        softStale: Date.now() - snapshot.fetchedAt > SOFT_STALE_MS,
      });
    },
    refresh: async () => {
      if (!isFirebaseConfigured()) {
        set({ entitlements: null, loading: false, hydrated: true, softStale: false });
        return null;
      }

      const user = await ensureAnonymousUser();
      if (!user?.uid) {
        set({ entitlements: null, loading: false, hydrated: true, softStale: false });
        return null;
      }
      get().setUid(user.uid);
      const generation = get().generation;

      if (inflightRefresh && inflightUid === user.uid) {
        return inflightRefresh;
      }

      set({ loading: true });
      inflightUid = user.uid;

      inflightRefresh = (async () => {
        try {
          const next = await fetchPremiumEntitlements();
          if (get().uid === user.uid && get().generation === generation) {
            set({
              entitlements: next,
              loading: false,
              hydrated: true,
              softStale: false,
            });
            if (next) {
              writePersistedSnapshot({
                uid: user.uid,
                entitlements: next,
                fetchedAt: Date.now(),
              });
            }
          }
          return next;
        } catch {
          if (get().uid === user.uid && get().generation === generation) {
            const existing = get().entitlements ?? readPersistedSnapshot()?.entitlements ?? null;
            set({
              entitlements: existing,
              loading: false,
              hydrated: true,
              softStale: existing !== null,
            });
          }
          return get().entitlements;
        } finally {
          inflightRefresh = null;
          inflightUid = null;
        }
      })();

      return inflightRefresh;
    },
  }),
);
