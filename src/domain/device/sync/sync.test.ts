import { describe, expect, it } from "vitest";
import { resolveSyncStatus, isEffectivelyOffline } from "./sync";

describe("resolveSyncStatus", () => {
  it("reports errors before other sync states", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: true,
        inFlightWrites: 2,
        queuedWrites: 3,
        ledgerPending: 0,
        fromCache: false,
        lastSyncError: "Write failed",
      }),
    ).toBe("error");
  });

  it("reports saving when writes are in flight", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: true,
        inFlightWrites: 1,
        queuedWrites: 0,
        ledgerPending: 0,
        fromCache: false,
        lastSyncError: null,
      }),
    ).toBe("saving");
  });

  it("reports offline when disconnected or queued", () => {
    expect(
      resolveSyncStatus({
        online: false,
        reachable: false,
        inFlightWrites: 0,
        queuedWrites: 0,
        ledgerPending: 0,
        fromCache: false,
        lastSyncError: null,
      }),
    ).toBe("offline");

    expect(
      resolveSyncStatus({
        online: true,
        reachable: true,
        inFlightWrites: 0,
        queuedWrites: 2,
        ledgerPending: 0,
        fromCache: false,
        lastSyncError: null,
      }),
    ).toBe("offline");
  });

  it("reports degraded when online but unreachable", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: false,
        inFlightWrites: 0,
        queuedWrites: 0,
        ledgerPending: 0,
        fromCache: false,
        lastSyncError: null,
      }),
    ).toBe("degraded");
  });

  it("reports synced when online with no pending work", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: true,
        inFlightWrites: 0,
        queuedWrites: 0,
        ledgerPending: 0,
        fromCache: false,
        lastSyncError: null,
      }),
    ).toBe("synced");
  });

  it("counts ledger pending as offline-queued when unreachable", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: false,
        inFlightWrites: 0,
        queuedWrites: 0,
        ledgerPending: 2,
        fromCache: false,
        lastSyncError: null,
      }),
    ).toBe("offline");
  });

  it("reports offline (not saving) when the browser is offline mid-write", () => {
    expect(
      resolveSyncStatus({
        online: false,
        reachable: null,
        inFlightWrites: 1,
        queuedWrites: 0,
        ledgerPending: 1,
        fromCache: true,
        lastSyncError: null,
      }),
    ).toBe("offline");
  });

  it("shows saving while ledger pending and reachable", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: true,
        inFlightWrites: 0,
        queuedWrites: 0,
        ledgerPending: 1,
        fromCache: false,
        lastSyncError: null,
      }),
    ).toBe("saving");
  });

  it("shows stale when data is from cache and nothing pending", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: null,
        inFlightWrites: 0,
        queuedWrites: 0,
        ledgerPending: 0,
        fromCache: true,
        lastSyncError: null,
      }),
    ).toBe("stale");
  });

  it("prefers degraded over stale when the probe failed", () => {
    expect(
      resolveSyncStatus({
        online: true,
        reachable: false,
        inFlightWrites: 0,
        queuedWrites: 0,
        ledgerPending: 0,
        fromCache: true,
        lastSyncError: null,
      }),
    ).toBe("degraded");
  });
});

describe("isEffectivelyOffline", () => {
  it("is offline when the browser reports disconnected", () => {
    expect(isEffectivelyOffline({ online: false, reachable: true })).toBe(
      true,
    );
  });

  it("is offline when online but reachability probe failed", () => {
    expect(isEffectivelyOffline({ online: true, reachable: false })).toBe(
      true,
    );
  });

  it("is not offline when online and reachability is unknown or ok", () => {
    expect(isEffectivelyOffline({ online: true, reachable: null })).toBe(
      false,
    );
    expect(isEffectivelyOffline({ online: true, reachable: true })).toBe(
      false,
    );
  });
});
