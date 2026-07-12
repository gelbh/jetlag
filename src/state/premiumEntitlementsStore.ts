import { create } from "zustand";
import type { PremiumEntitlements } from "../domain/billing/premiumProducts";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import { fetchPremiumEntitlements } from "../services/billing/premiumBilling";

interface PremiumEntitlementsState {
  uid: string | null;
  entitlements: PremiumEntitlements | null;
  loading: boolean;
  hydrated: boolean;
  generation: number;
  setUid: (uid: string | null) => void;
  setEntitlements: (entitlements: PremiumEntitlements | null) => void;
  refresh: () => Promise<PremiumEntitlements | null>;
}

let inflightRefresh: Promise<PremiumEntitlements | null> | null = null;
let inflightUid: string | null = null;

export const usePremiumEntitlementsStore = create<PremiumEntitlementsState>(
  (set, get) => ({
    uid: null,
    entitlements: null,
    loading: false,
    hydrated: false,
    generation: 0,
    setUid: (uid) => {
      if (get().uid === uid) {
        return;
      }

      set({
        uid,
        entitlements: null,
        hydrated: false,
        generation: get().generation + 1,
      });
    },
    setEntitlements: (entitlements) => {
      set({ entitlements, loading: false, hydrated: true });
    },
    refresh: async () => {
      if (!isFirebaseConfigured()) {
        set({ entitlements: null, loading: false, hydrated: true });
        return null;
      }

      const generation = get().generation;
      const user = await ensureAnonymousUser();
      if (!user?.uid) {
        set({ entitlements: null, loading: false, hydrated: true });
        return null;
      }
      get().setUid(user.uid);

      if (inflightRefresh && inflightUid === user.uid) {
        return inflightRefresh;
      }

      set({ loading: true });
      inflightUid = user.uid;

      inflightRefresh = (async () => {
        try {
          const next = await fetchPremiumEntitlements();
          if (get().uid === user.uid && get().generation === generation) {
            set({ entitlements: next, loading: false, hydrated: true });
          }
          return next;
        } catch {
          if (get().uid === user.uid && get().generation === generation) {
            set({ entitlements: null, loading: false, hydrated: true });
          }
          return null;
        } finally {
          inflightRefresh = null;
          inflightUid = null;
        }
      })();

      return inflightRefresh;
    },
  }),
);
