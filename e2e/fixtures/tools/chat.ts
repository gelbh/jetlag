import { type Locator, type Page, expect } from "@playwright/test";
import { dismissMapOnboarding } from "../page-init";
import {
  dismissActiveToolPanel,
  PENDING_QUESTION_TEXT,
} from "./question-wizards";

export function questionAlertBanner(page: Page): Locator {
  return page.getByTestId("question-alert-banner");
}

/** Game-chat message list — excludes the sticky map answer banner. */
export function gameChatScroll(page: Page): Locator {
  return page.locator(".jl-game-chat-scroll");
}

export async function openChat(page: Page) {
  if (await page.getByLabel("Chat tabs").isVisible().catch(() => false)) {
    return;
  }

  await dismissActiveToolPanel(page);
  await dismissMapOnboarding(page);

  if (await page.getByLabel("Chat tabs").isVisible().catch(() => false)) {
    return;
  }

  const dockChat = page.getByLabel(/Open chat/i).first();
  await expect(dockChat).toBeVisible({ timeout: 15_000 });
  await dockChat.click({ force: true });
  await expect(page.getByLabel("Chat tabs")).toBeVisible({ timeout: 15_000 });
}

async function resolveAnswerButton(
  page: Page,
  name: string | RegExp,
): Promise<Locator> {
  let resolved: Locator | undefined;
  await expect(async () => {
    const bannerButton = questionAlertBanner(page).getByRole("button", {
      name,
    });
    if (await bannerButton.isVisible().catch(() => false)) {
      resolved = bannerButton;
      return;
    }

    await openChat(page);
    const chatButton = page
      .getByRole("dialog", { name: /^Chat$/i })
      .getByRole("button", { name })
      .or(gameChatScroll(page).getByRole("button", { name }));
    await expect(chatButton.first()).toBeVisible({ timeout: 2_000 });
    resolved = chatButton.first();
  }).toPass({ timeout: 20_000 });

  if (!resolved) {
    throw new Error(`Answer control not found: ${String(name)}`);
  }
  return resolved;
}

export async function answerInChat(page: Page, label: string) {
  const answerButton = await resolveAnswerButton(
    page,
    `Send answer: ${label}`,
  );
  await answerButton.click({ force: true });
}

export async function answerPhotoCannotInChat(page: Page) {
  await dismissActiveToolPanel(page);
  const answerButton = await resolveAnswerButton(
    page,
    "I cannot answer the question",
  );
  await answerButton.evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.click();
    }
  });
}

export async function answerPhotoSentExternallyInChat(page: Page) {
  const answerButton = await resolveAnswerButton(page, "Mark sent");
  await answerButton.evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.click();
    }
  });
}

export async function answerYesInChat(page: Page) {
  await answerInChat(page, "Yes");
}

export async function expectPendingQuestionText(
  page: Page,
  pattern: RegExp = PENDING_QUESTION_TEXT,
) {
  const banner = questionAlertBanner(page);
  if (await banner.isVisible().catch(() => false)) {
    await expect(banner.getByText(pattern)).toBeVisible({ timeout: 20_000 });
    return;
  }

  await openChat(page);
  await expect(gameChatScroll(page).getByText(pattern)).toBeVisible({
    timeout: 20_000,
  });
}

export async function expectChatAnswer(page: Page, answer: string) {
  await openChat(page);
  const chat = page
    .getByRole("dialog", { name: /^Chat$/i })
    .or(gameChatScroll(page));
  // Tip chat renders the answer as its own paragraph (not "Answered: yes").
  await expect(
    chat.getByText(new RegExp(`^(?:Answered:\\s*)?${answer}$`, "i")).first(),
  ).toBeVisible({
    timeout: 20_000,
  });
}
