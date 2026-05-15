import { describe, expect, it } from "vitest";
import { resolveSyncStatus } from "./sync";

describe("resolveSyncStatus", () => {
  it("reports errors before other sync states", () => {
    expect(
      resolveSyncStatus({
        online: true,
        inFlightWrites: 2,
        queuedWrites: 3,
        lastSyncError: "Write failed",
      }),
    ).toBe("error");
  });

  it("reports saving when writes are in flight", () => {
    expect(
      resolveSyncStatus({
        online: true,
        inFlightWrites: 1,
        queuedWrites: 0,
        lastSyncError: null,
      }),
    ).toBe("saving");
  });

  it("reports offline when disconnected or queued", () => {
    expect(
      resolveSyncStatus({
        online: false,
        inFlightWrites: 0,
        queuedWrites: 0,
        lastSyncError: null,
      }),
    ).toBe("offline");

    expect(
      resolveSyncStatus({
        online: true,
        inFlightWrites: 0,
        queuedWrites: 2,
        lastSyncError: null,
      }),
    ).toBe("offline");
  });

  it("reports synced when online with no pending work", () => {
    expect(
      resolveSyncStatus({
        online: true,
        inFlightWrites: 0,
        queuedWrites: 0,
        lastSyncError: null,
      }),
    ).toBe("synced");
  });
});
