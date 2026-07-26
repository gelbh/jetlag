import { describe, expect, it } from "vitest";
import { appUpdateCopy } from "./appUpdateCopy";

describe("appUpdateCopy", () => {
  it("uses player-safe deferred wording", () => {
    expect(appUpdateCopy.deferredTitle).toBe("Update waiting");
    expect(appUpdateCopy.deferredBody).toMatch(/game ends/i);
    expect(appUpdateCopy.deferredDismiss).toBe("Later");
  });

  it("uses refresh wording only for safe reload", () => {
    expect(appUpdateCopy.readyAction).toBe("Refresh now");
    expect(appUpdateCopy.readyTitle).toBe("Update ready");
  });
});
