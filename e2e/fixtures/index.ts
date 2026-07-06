import { test as base, type Page } from "@playwright/test";
import { openMapWithLocalSession } from "./session";

export const test = base.extend<{ localMap: Page }>({
  localMap: async ({ page }, runWithPage) => {
    await openMapWithLocalSession(page);
    await runWithPage(page);
  },
});

export { expect } from "@playwright/test";

export * from "./base";
export * from "./emulator";
export * from "./session";
export * from "./tools";
