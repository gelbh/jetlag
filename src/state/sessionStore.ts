import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameArea, SessionRecord } from "../domain/map/annotations";
import type { PlayerRole } from "../domain/session/playerRole";
import { resolvePlayerRole } from "../domain/session/playerRole";

function structuredFieldEqual<T>(left: T, right: T): boolean {
  if (left === right) {
    return true;
  }

  if (left === undefined && right === undefined) {
    return true;
  }

  if (
    left === null ||
    right === null ||
    typeof left === "object" ||
    typeof right === "object"
  ) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return false;
}

function sessionRecordsEqual(
  left: SessionRecord | null,
  right: SessionRecord | null,
): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.code === right.code &&
    structuredFieldEqual(left.gameArea, right.gameArea) &&
    left.hostUid === right.hostUid &&
    left.createdAt === right.createdAt &&
    structuredFieldEqual(left.memberUids, right.memberUids) &&
    structuredFieldEqual(left.memberRoles, right.memberRoles) &&
    left.gameSize === right.gameSize &&
    left.distanceUnit === right.distanceUnit &&
    left.hidingZoneRadiusMeters === right.hidingZoneRadiusMeters &&
    left.hidingPeriodMinutes === right.hidingPeriodMinutes &&
    left.photoAnswerDeadlineMinutes === right.photoAnswerDeadlineMinutes &&
    left.questionAnswerDeadlineMinutes === right.questionAnswerDeadlineMinutes &&
    structuredFieldEqual(left.disabledTools, right.disabledTools) &&
    left.tentaclesEnabled === right.tentaclesEnabled &&
    structuredFieldEqual(
      left.thermometerPresetMiles,
      right.thermometerPresetMiles,
    ) &&
    structuredFieldEqual(
      left.thermometerPresetMeters,
      right.thermometerPresetMeters,
    ) &&
    left.tentacleMediumRadiusMeters === right.tentacleMediumRadiusMeters &&
    left.tentacleLargeRadiusMeters === right.tentacleLargeRadiusMeters &&
    structuredFieldEqual(left.customMatchingAreas, right.customMatchingAreas) &&
    structuredFieldEqual(left.customCategories, right.customCategories) &&
    structuredFieldEqual(left.customLocationPins, right.customLocationPins) &&
    structuredFieldEqual(
      left.customMeasureGeometries,
      right.customMeasureGeometries,
    ) &&
    left.regionPackId === right.regionPackId &&
    left.regionPackSubregionId === right.regionPackSubregionId &&
    left.bundledGeoRevision === right.bundledGeoRevision &&
    left.expansionPackEnabled === right.expansionPackEnabled &&
    left.customQuestionPackEnabled === right.customQuestionPackEnabled &&
    left.previewQuestionBeforeSend === right.previewQuestionBeforeSend &&
    left.tier === right.tier &&
    left.transitMetroId === right.transitMetroId &&
    left.endedAt === right.endedAt &&
    left.status === right.status &&
    left.timerAccumulatedMs === right.timerAccumulatedMs &&
    left.timerRunningSince === right.timerRunningSince &&
    left.endGameStartedAt === right.endGameStartedAt &&
    left.endGameStartedByUid === right.endGameStartedByUid &&
    left.endGameRequestedAt === right.endGameRequestedAt &&
    left.endGameRequestedByUid === right.endGameRequestedByUid &&
    left.hostAppVersion === right.hostAppVersion &&
    structuredFieldEqual(left.memberAppVersions, right.memberAppVersions)
  );
}

type SessionRecordStructuredKey =
  | "gameArea"
  | "memberUids"
  | "memberRoles"
  | "disabledTools"
  | "thermometerPresetMiles"
  | "thermometerPresetMeters"
  | "customMatchingAreas"
  | "customCategories"
  | "customLocationPins"
  | "customMeasureGeometries"
  | "memberAppVersions";

type SessionRecordScalarKey = Exclude<
  keyof SessionRecord,
  SessionRecordStructuredKey
>;

type _AssertSessionRecordEqualityComplete =
  SessionRecordScalarKey extends Exclude<keyof SessionRecord, SessionRecordStructuredKey>
    ? SessionRecordStructuredKey extends Exclude<
        keyof SessionRecord,
        SessionRecordScalarKey
      >
      ? true
      : never
    : never;

const _sessionRecordEqualityComplete: _AssertSessionRecordEqualityComplete = true;
void _sessionRecordEqualityComplete;

export type { MapTool } from "../domain/map/mapToolTypes";
export { useAnnotationStore } from "./annotationStore";
export { useMapStore, type LayerVisibility } from "./mapStore";
export type { MapStyle } from "../domain/map/mapBasemaps";

interface SessionState {
  session: SessionRecord | null;
  myUid: string | null;
  myRole: PlayerRole | null;
  pendingWrites: number;
  syncInFlight: number;
  lastSyncError: string | null;
  remoteUpdateNotice: string | null;
  setSession: (session: SessionRecord | null, myUid?: string | null) => void;
  setMyUid: (uid: string | null) => void;
  setGameArea: (gameArea: GameArea) => void;
  setPendingWrites: (count: number) => void;
  incrementPendingWrites: () => void;
  decrementPendingWrites: () => void;
  incrementSyncInFlight: () => void;
  decrementSyncInFlight: () => void;
  setLastSyncError: (message: string | null) => void;
  setRemoteUpdateNotice: (message: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      myUid: null,
      myRole: null,
      pendingWrites: 0,
      syncInFlight: 0,
      lastSyncError: null,
      remoteUpdateNotice: null,
      setSession: (session, myUid) =>
        set((state) => {
          const uid = myUid === undefined ? state.myUid : myUid;
          if (
            sessionRecordsEqual(session, state.session) &&
            uid === state.myUid
          ) {
            return state;
          }

          const sessionChanged =
            session?.id !== state.session?.id ||
            (session === null && state.session !== null);

          return {
            session,
            myUid: uid,
            myRole:
              session && uid
                ? resolvePlayerRole(session.memberRoles, uid)
                : null,
            ...(sessionChanged
              ? { remoteUpdateNotice: null, lastSyncError: null }
              : {}),
          };
        }),
      setMyUid: (myUid) =>
        set((state) => ({
          myUid,
          myRole:
            state.session && myUid
              ? resolvePlayerRole(state.session.memberRoles, myUid)
              : state.myRole,
        })),
      setGameArea: (gameArea) =>
        set((state) =>
          state.session
            ? {
                session: {
                  ...state.session,
                  gameArea,
                },
              }
            : state,
        ),
      setPendingWrites: (pendingWrites) => set({ pendingWrites }),
      incrementPendingWrites: () =>
        set((state) => ({ pendingWrites: state.pendingWrites + 1 })),
      decrementPendingWrites: () =>
        set((state) => ({
          pendingWrites: Math.max(0, state.pendingWrites - 1),
        })),
      incrementSyncInFlight: () =>
        set((state) => ({ syncInFlight: state.syncInFlight + 1 })),
      decrementSyncInFlight: () =>
        set((state) => ({
          syncInFlight: Math.max(0, state.syncInFlight - 1),
        })),
      setLastSyncError: (lastSyncError) => set({ lastSyncError }),
      setRemoteUpdateNotice: (remoteUpdateNotice) =>
        set({ remoteUpdateNotice }),
    }),
    {
      name: "jetlag-session",
      partialize: (state) => ({
        session: state.session,
        myUid: state.myUid,
        myRole: state.myRole,
      }),
    },
  ),
);
