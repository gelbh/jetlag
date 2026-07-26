import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acknowledgeHotfixReload,
  acknowledgeSoftReload,
  hasHotfixReloadBeenAcknowledged,
  hasSoftReloadBeenAcknowledged,
  shouldHonorSoftReload,
} from "./reloadAcknowledgements";
import type { SessionOpsMitigation } from "../map/annotations";

const softReloadMitigation = (
  id: string,
): SessionOpsMitigation => ({
  id,
  type: "soft_reload",
  appliedAt: "2026-07-26T00:00:00.000Z",
  appliedByUid: "admin",
  incidentId: "inc-1",
});

describe("reloadAcknowledgements", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shouldHonorSoftReload is true only for new soft_reload ids", () => {
    expect(
      shouldHonorSoftReload({
        mitigation: softReloadMitigation("mit-1"),
        lastHonoredId: null,
      }),
    ).toBe(true);

    expect(
      shouldHonorSoftReload({
        mitigation: softReloadMitigation("mit-1"),
        lastHonoredId: "mit-1",
      }),
    ).toBe(false);

    expect(
      shouldHonorSoftReload({
        mitigation: {
          ...softReloadMitigation("mit-1"),
          type: "reset_board",
        },
        lastHonoredId: null,
      }),
    ).toBe(false);

    expect(
      shouldHonorSoftReload({
        mitigation: null,
        lastHonoredId: null,
      }),
    ).toBe(false);
  });

  it("skips soft_reload after durable acknowledgement (simulates post-reload)", () => {
    expect(acknowledgeSoftReload("mit-1")).toBe(true);
    expect(hasSoftReloadBeenAcknowledged("mit-1")).toBe(true);
    expect(
      shouldHonorSoftReload({
        mitigation: softReloadMitigation("mit-1"),
        lastHonoredId: null,
      }),
    ).toBe(false);
  });

  it("still honors a different soft_reload mitigation id", () => {
    expect(acknowledgeSoftReload("mit-1")).toBe(true);
    expect(
      shouldHonorSoftReload({
        mitigation: softReloadMitigation("mit-2"),
        lastHonoredId: null,
      }),
    ).toBe(true);
  });

  it("tracks hotfix version acknowledgements across remounts", () => {
    expect(hasHotfixReloadBeenAcknowledged("0.10.2")).toBe(false);
    expect(acknowledgeHotfixReload("0.10.2")).toBe(true);
    expect(hasHotfixReloadBeenAcknowledged("0.10.2")).toBe(true);
    expect(hasHotfixReloadBeenAcknowledged("0.10.3")).toBe(false);
  });

  it("returns false from acknowledge when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(acknowledgeSoftReload("mit-x")).toBe(false);
    expect(acknowledgeHotfixReload("9.9.9")).toBe(false);
  });
});
