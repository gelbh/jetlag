import { describe, expect, it } from "vitest";
import { shouldShowOptionalAppUpdateBanner } from "./optionalAppUpdateUi";

describe("shouldShowOptionalAppUpdateBanner", () => {
  it("hides optional UI while reload is unsafe (session still live)", () => {
    expect(shouldShowOptionalAppUpdateBanner({ needsRefresh: true, safeToReload: false })).toBe(
      false,
    );
  });

  it("shows the global ready banner when an update is pending and reload is safe", () => {
    expect(shouldShowOptionalAppUpdateBanner({ needsRefresh: true, safeToReload: true })).toBe(
      true,
    );
  });

  it("stays hidden when no update is pending", () => {
    expect(shouldShowOptionalAppUpdateBanner({ needsRefresh: false, safeToReload: true })).toBe(
      false,
    );
  });
});
