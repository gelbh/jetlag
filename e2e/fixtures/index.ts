import { type BrowserContext, test as base, type Page } from "@playwright/test";
import type { BlockExternalAssetsOptions } from "./network";
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
  /** Project-level stub options (resilience routes on the context for the SW). */
  e2eNetwork: BlockExternalAssetsOptions;
  localMap: Page;
  hostHider: HostHiderFixture;
}>({
  e2eNetwork: [{}, { option: true }],
  localMap: async ({ page, e2eNetwork }, runWithPage) => {
    await openMapWithLocalSession(page, { network: e2eNetwork });
    await runWithPage(page);
  },
  hostHider: async ({ browser, e2eNetwork }, runFixture) => {
    const ctx = await createMultiplayerContexts(browser, e2eNetwork);
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
export * from "./layout-assert";
export * from "./map";
export * from "./mobile-dock";
export * from "./multiplayer";
export * from "./network";
export * from "./page-init";
export * from "./resilience";
export * from "./seedUsernameProfileDocs";
export * from "./session";
export * from "./social-auth";
export * from "./timer";
export * from "./tools";
