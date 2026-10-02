import { type BrowserContext, test as base, type Page } from "@playwright/test";
import {
  createHostSession,
  createMultiplayerContexts,
  joinAsRole,
  openMapWithLocalSession,
} from "./session";

export type HostHiderFixture = {
  hostPage: Page;
  guestPage: Page;
  code: string;
  hostContext: BrowserContext;
  guestContext: BrowserContext;
};

export const test = base.extend<{
  localMap: Page;
  hostHider: HostHiderFixture;
}>({
  localMap: async ({ page }, runWithPage) => {
    await openMapWithLocalSession(page);
    await runWithPage(page);
  },
  hostHider: async ({ browser }, runFixture) => {
    const ctx = await createMultiplayerContexts(browser);
    const { code } = await createHostSession(ctx.hostPage);
    await joinAsRole(ctx.guestPage, code, "hider");
    await runFixture({ ...ctx, code });
    await ctx.cleanup();
  },
});

export { expect } from "@playwright/test";

export * from "./base";
export * from "./dom";
export * from "./emulator";
export * from "./end-game";
export * from "./firestore-seed";
export * from "./layout-assert";
export * from "./map";
export * from "./mobile-dock";
export * from "./multiplayer";
export * from "./network";
export * from "./page-init";
export * from "./session";
export * from "./social-auth";
export * from "./timer";
export * from "./tools";
