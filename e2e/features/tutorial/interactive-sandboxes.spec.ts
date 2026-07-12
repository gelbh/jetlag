import { test, expect } from "../../fixtures";
import {
  advanceTutorialToolWizard,
  clickTutorialPreviewMap,
  completeTutorialInteractiveStep,
  openQuestionTutorial,
  waitForTutorialMapReady,
  waitForTutorialToolWizardNext,
} from "../../fixtures/tutorial-interactive";

async function chooseTutorialAnswer(page: import("@playwright/test").Page, name: string) {
  const option = page
    .locator(".tutorial-interactive-panel")
    .getByRole("button", { name, exact: true });
  await expect(option).toBeEnabled({ timeout: 15_000 });
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
}

test.describe("tutorial interactive sandboxes", () => {
  test("@smoke completes matching sandbox wizard", async ({ page }) => {
    await openQuestionTutorial(page, "matching");
    await waitForTutorialMapReady(page);
    await clickTutorialPreviewMap(page);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await page.locator(".tutorial-interactive-panel select.field-input").selectOption("museum");
    await expect(page.getByText("Finding nearest feature")).toHaveCount(0, {
      timeout: 60_000,
    });
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await chooseTutorialAnswer(page, "Yes");
    await page
      .locator(".tutorial-interactive-panel")
      .getByRole("button", { name: "Add match question" })
      .click();
    await completeTutorialInteractiveStep(page);
  });

  test("@smoke completes radar sandbox wizard", async ({ page }) => {
    await openQuestionTutorial(page, "radar");
    await waitForTutorialMapReady(page);
    await clickTutorialPreviewMap(page);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await page
      .locator(".tutorial-interactive-panel")
      .getByRole("button", { name: /Mile|km/i })
      .first()
      .click();
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await chooseTutorialAnswer(page, "Yes");
    await page
      .locator(".tutorial-interactive-panel")
      .getByRole("button", { name: "Add radar question" })
      .click();
    await completeTutorialInteractiveStep(page);
  });

  test("completes measuring sandbox wizard", async ({ page }) => {
    await openQuestionTutorial(page, "measuring");
    await waitForTutorialMapReady(page);
    await clickTutorialPreviewMap(page);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await page.locator(".tutorial-interactive-panel select.field-input").selectOption("museum");
    await expect(page.getByText("Finding nearest feature")).toHaveCount(0, {
      timeout: 60_000,
    });
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await clickTutorialPreviewMap(page, 0.6, 0.4);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await chooseTutorialAnswer(page, "Closer");
    await page
      .locator(".tutorial-interactive-panel")
      .getByRole("button", { name: "Add measure question" })
      .click();
    await completeTutorialInteractiveStep(page);
  });

  test("completes thermometer sandbox wizard", async ({ page }) => {
    await openQuestionTutorial(page, "thermometer");
    await page
      .locator(".tutorial-interactive-panel")
      .getByRole("button", { name: "Manual pins" })
      .click();
    await advanceTutorialToolWizard(page);
    await waitForTutorialMapReady(page);
    await clickTutorialPreviewMap(page, 0.35, 0.5);
    await clickTutorialPreviewMap(page, 0.65, 0.5);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await chooseTutorialAnswer(page, "Hotter");
    await page
      .locator(".tutorial-interactive-panel")
      .getByRole("button", { name: "Add thermometer" })
      .click();
    await completeTutorialInteractiveStep(page);
  });

  test("completes tentacle sandbox wizard", async ({ page }) => {
    await openQuestionTutorial(page, "tentacle");
    await waitForTutorialMapReady(page);
    await clickTutorialPreviewMap(page);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await page.locator(".tutorial-interactive-panel select.field-input").selectOption("museum");
    await expect(page.getByText("Loading locations within")).toHaveCount(0, {
      timeout: 60_000,
    });
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await waitForTutorialToolWizardNext(page);
    await advanceTutorialToolWizard(page);
    await chooseTutorialAnswer(page, "Nearby museum");
    await page
      .locator(".tutorial-interactive-panel")
      .getByRole("button", { name: "Add tentacle question" })
      .click();
    await completeTutorialInteractiveStep(page);
  });

  test("shows photo panel on interactive step", async ({ page }) => {
    await openQuestionTutorial(page, "photo");
    await expect(
      page.getByRole("heading", { name: "Try the panel" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
  });
});
