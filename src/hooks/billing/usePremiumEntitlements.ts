import { useEffect } from "react";
import { usePremiumEntitlementsStore } from "../../state/premiumEntitlementsStore";
import { usePermanentAuthUser } from "./usePermanentAuthUser";

export function usePremiumEntitlements() {
  const entitlements = usePremiumEntitlementsStore((state) => state.entitlements);
  const loading = usePremiumEntitlementsStore((state) => state.loading);
  const hydrated = usePremiumEntitlementsStore((state) => state.hydrated);
  const refresh = usePremiumEntitlementsStore((state) => state.refresh);
  const setEntitlements = usePremiumEntitlementsStore(
    (state) => state.setEntitlements,
  );
  const { user } = usePermanentAuthUser();

  useEffect(() => {
    usePremiumEntitlementsStore.getState().setUid(user?.uid ?? null);
  }, [user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.uid]);

  return {
    entitlements,
    loading: loading && !hydrated,
    hydrated,
    refresh,
    setEntitlements,
  };
}
