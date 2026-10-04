import { describe, expect, it } from "vitest";
import { appUpdateCopy } from "./appUpdateCopy";

describe("appUpdateCopy", () => {
  it("uses player-safe deferred wording for map chunk deferral", () => {
    expect(appUpdateCopy.deferredTitle).toBe("Update waiting");
    expect(appUpdateCopy.chunkDeferredBody).toMatch(/game ends/i);
  });

  it("uses refresh wording only for safe reload", () => {
    expect(appUpdateCopy.readyAction).toBe("Refresh now");
    expect(appUpdateCopy.readyTitle).toBe("Update ready");
  });
});
