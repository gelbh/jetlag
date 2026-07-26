import { afterEach, describe, expect, it } from "vitest";
import {
  acknowledgeHotfixReload,
  acknowledgeSoftReload,
  hasHotfixReloadBeenAcknowledged,
  hasSoftReloadBeenAcknowledged,
  shouldHonorSoftReload,
} from "./reloadAcknowledgements";

describe("reloadAcknowledgements", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("shouldHonorSoftReload is true only for new soft_reload ids", () => {
    expect(
      shouldHonorSoftReload({
        mitigation: { id: "mit-1", type: "soft_reload" },
        lastHonoredId: null,
      }),
    ).toBe(true);

    expect(
      shouldHonorSoftReload({
        mitigation: { id: "mit-1", type: "soft_reload" },
        lastHonoredId: "mit-1",
      }),
    ).toBe(false);

    expect(
      shouldHonorSoftReload({
        mitigation: { id: "mit-1", type: "reset_board" },
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
    acknowledgeSoftReload("mit-1");
    expect(hasSoftReloadBeenAcknowledged("mit-1")).toBe(true);
    expect(
      shouldHonorSoftReload({
        mitigation: { id: "mit-1", type: "soft_reload" },
        lastHonoredId: null,
      }),
    ).toBe(false);
  });

  it("still honors a different soft_reload mitigation id", () => {
    acknowledgeSoftReload("mit-1");
    expect(
      shouldHonorSoftReload({
        mitigation: { id: "mit-2", type: "soft_reload" },
        lastHonoredId: null,
      }),
    ).toBe(true);
  });

  it("tracks hotfix version acknowledgements across remounts", () => {
    expect(hasHotfixReloadBeenAcknowledged("0.10.2")).toBe(false);
    acknowledgeHotfixReload("0.10.2");
    expect(hasHotfixReloadBeenAcknowledged("0.10.2")).toBe(true);
    expect(hasHotfixReloadBeenAcknowledged("0.10.3")).toBe(false);
  });
});
