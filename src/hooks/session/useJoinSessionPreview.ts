import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "../forms/useDebouncedValue";
import { isPremiumSession } from "../../domain/map/annotations";
import type { SessionRecord } from "../../domain/map/annotations";
import { resolvePlayerRole } from "../../domain/session/players/playerRole";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../../services/core/firebase/firebase";
import { lookupRemoteSessionByCode } from "../../services/firestore/firestoreAnnotations";
import { retryAsync } from "../../services/core/network/retryAsync";
import {
  isValidSessionCode,
  normalizeSessionCode,
} from "../../services/session/sessionCodes";
import {
  JOIN_PREVIEW_DEBOUNCE_MS,
  JOIN_PREVIEW_TTL_MS,
} from "../../services/session/joinSessionPreviewCache";

type JoinPreviewResult = Awaited<ReturnType<typeof lookupRemoteSessionByCode>>;

export type JoinSessionPreviewState = {
  previewSession: SessionRecord | null;
  previewPremium: boolean;
  lookupLoading: boolean;
  /** Suggested role when the uid already has a membership on the preview. */
  existingRole: PlayerRole | null;
};

async function fetchJoinPreview(normalized: string): Promise<{
  result: JoinPreviewResult;
  uid: string;
}> {
  const user = await ensureAnonymousUser();
  const result = await retryAsync(() => lookupRemoteSessionByCode(normalized));
  return { result, uid: user.uid };
}

/**
 * L4 TanStack Query pilot — join-code REST/callable lookup only.
 * Does not replace Firestore `onSnapshot` listeners.
 *
 * While the live code differs from the debounced code, preview is cleared so
 * invite-query navigations do not flash the previous session.
 */
export function useJoinSessionPreview(code: string): JoinSessionPreviewState {
  const debouncedCode = useDebouncedValue(code, JOIN_PREVIEW_DEBOUNCE_MS);
  const liveNormalized = normalizeSessionCode(code);
  const debouncedNormalized = normalizeSessionCode(debouncedCode);
  const settled = liveNormalized === debouncedNormalized;
  const enabled =
    isFirebaseConfigured() &&
    isValidSessionCode(debouncedNormalized) &&
    settled;

  const query = useQuery({
    queryKey: ["join-preview", debouncedNormalized] as const,
    queryFn: () => fetchJoinPreview(debouncedNormalized),
    enabled,
    staleTime: JOIN_PREVIEW_TTL_MS,
    gcTime: JOIN_PREVIEW_TTL_MS,
  });

  if (!enabled) {
    return {
      previewSession: null,
      previewPremium: false,
      lookupLoading:
        isFirebaseConfigured() &&
        isValidSessionCode(liveNormalized) &&
        !settled,
      existingRole: null,
    };
  }

  const payload = query.data;
  const result = payload?.result;
  const previewSession =
    result?.status === "found" ? result.session : null;
  const previewPremium = Boolean(
    previewSession && isPremiumSession(previewSession),
  );
  const existingRole =
    previewSession && payload?.uid && previewSession.memberRoles?.[payload.uid]
      ? resolvePlayerRole(previewSession.memberRoles, payload.uid)
      : null;

  return {
    previewSession,
    previewPremium,
    lookupLoading: query.isFetching || query.isPending,
    existingRole,
  };
}
