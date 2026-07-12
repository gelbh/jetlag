import { type Page, expect } from "@playwright/test";
import { defaultQuestionProgress } from "../../src/domain/tutorial/tutorialQuestions";
import type { QuestionTutorialId } from "../../src/domain/tutorial/tutorialQuestions";
import { waitForMapTilesLoaded } from "./map";
import { prepareE2EPage } from "./page-init";

const TOOL_TITLES: Record<QuestionTutorialId, string> = {
  matching: "Matching",
  measuring: "Measuring",
  thermometer: "Thermometer",
  radar: "Radar",
  tentacle: "Tentacles",
  photo: "Photo",
};

export async function seedTutorialHubProgress(page: Page) {
  const questions = defaultQuestionProgress();
  await page.addInitScript((seedQuestions) => {
    localStorage.setItem(
      "jetlag.tutorialProgress",
      JSON.stringify({
        core: 6,
        tools: -1,
        hider: -1,
        extras: -1,
        coreComplete: true,
        questions: seedQuestions,
      }),
    );
  }, questions);
}

export async function openTutorialHub(page: Page) {
  await seedTutorialHubProgress(page);
  await prepareE2EPage(page);
  await page.goto("/tutorial");
  await expect(page.getByRole("heading", { name: "Tutorial" })).toBeVisible();
}

export async function openQuestionTutorial(
  page: Page,
  toolId: QuestionTutorialId,
) {
  await openTutorialHub(page);
  await page.getByRole("button", { name: /Questions/i }).click();
  await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
  const title = TOOL_TITLES[toolId];
  await page
    .getByRole("button", { name: new RegExp(`^${title}\\b`) })
    .click();
  await expect(
    page.getByRole("heading", { name: "Try the wizard" }).or(
      page.getByRole("heading", { name: "Try the panel" }),
    ),
  ).toBeVisible();
}

export async function clickTutorialPreviewMap(
  page: Page,
  xRatio = 0.5,
  yRatio = 0.5,
) {
  const map = page.locator(
    ".tutorial-map-context-preview .leaflet-container",
  );
  await map.waitFor({ state: "visible" });
  await waitForMapTilesLoaded(page);
  const box = await map.boundingBox();
  if (!box) {
    throw new Error("Tutorial preview map is not visible.");
  }

  await map.click({
    position: {
      x: Math.floor(box.width * xRatio),
      y: Math.floor(box.height * yRatio),
    },
    force: true,
  });
}

export async function assertTutorialCommittedLock(page: Page) {
  await expect(
    page.locator('[data-tutorial-committed="true"]'),
  ).toBeVisible({ timeout: 15_000 });
}

export async function completeTutorialInteractiveStep(page: Page) {
  await assertTutorialCommittedLock(page);
  await page.getByRole("button", { name: "Got it" }).click();
}

export async function openSplitPanelStep(page: Page) {
  await page.getByRole("button", { name: "See walkthrough" }).click();
}

function tutorialToolPanel(page: Page) {
  return page.locator(".tutorial-interactive-panel");
}

export async function currentTutorialToolWizardStep(page: Page): Promise<number> {
  const stepper = tutorialToolPanel(page).getByRole("list", { name: "Progress" });
  const text = await stepper.innerText();
  const match = text.match(/(\d+) of \d+/);
  if (!match) {
    throw new Error(`Tutorial tool wizard has no step counter: "${text}"`);
  }
  return Number(match[1]);
}

export async function waitForTutorialToolWizardNext(page: Page) {
  await expect(
    tutorialToolPanel(page).getByRole("button", { name: "Next step" }),
  ).toBeEnabled({ timeout: 60_000 });
}

export async function advanceTutorialToolWizard(page: Page) {
  const before = await currentTutorialToolWizardStep(page);
  const next = tutorialToolPanel(page).getByRole("button", { name: "Next step" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
  await expect
    .poll(() => currentTutorialToolWizardStep(page), { timeout: 15_000 })
    .toBe(before + 1);
}

export async function waitForTutorialMapReady(page: Page) {
  await expect(
    page.getByText("Loading map for your area…"),
  ).toHaveCount(0, { timeout: 60_000 });
}
