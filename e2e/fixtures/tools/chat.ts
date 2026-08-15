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

  // Hider chat uses jl-panel-hider-wizard above the dock; if still mounted after
  // dismiss (exit animation / bare Close), treat chat as already open.
  if (await page.getByLabel("Chat tabs").isVisible().catch(() => false)) {
    return;
  }

  const dockChat = page.getByRole("button", { name: "Open chat" });
  if (await dockChat.isVisible().catch(() => false)) {
    await dockChat.click({ force: true });
    await expect(page.getByLabel("Chat tabs")).toBeVisible({ timeout: 15_000 });
    return;
  }

  const unreadChat = page.getByRole("button", {
    name: "Open chat, unread messages",
  });
  if (await unreadChat.isVisible().catch(() => false)) {
    await unreadChat.click({ force: true });
    await expect(page.getByLabel("Chat tabs")).toBeVisible({ timeout: 15_000 });
    return;
  }

  const chatTab = page.getByRole("button", { name: "Chat", exact: true });
  if (await chatTab.isVisible().catch(() => false)) {
    await chatTab.click();
    await expect(page.getByLabel("Chat tabs")).toBeVisible({ timeout: 15_000 });
    return;
  }

  throw new Error("Chat control not found on map chrome");
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
    const chatButton = gameChatScroll(page).getByRole("button", { name });
    await expect(chatButton).toBeVisible({ timeout: 2_000 });
    resolved = chatButton;
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
  await answerButton.click();
}

export async function answerPhotoCannotInChat(page: Page) {
  const answerButton = await resolveAnswerButton(
    page,
    "I cannot answer the question",
  );
  await answerButton.click();
}

export async function answerPhotoSentExternallyInChat(page: Page) {
  const answerButton = await resolveAnswerButton(page, "Mark sent");
  await answerButton.click();
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
  await expect(
    gameChatScroll(page).getByText(new RegExp(`Answered: ${answer}`, "i")),
  ).toBeVisible({
    timeout: 20_000,
  });
}
