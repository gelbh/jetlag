import { type Page, expect } from "@playwright/test";
import { dismissMapOnboarding } from "../page-init";
import { clickOverflowToolButton } from "./navigation";
import { dismissActiveToolPanel } from "./question-wizards";

export async function openChat(page: Page) {
  if (await page.getByLabel("Chat tabs").isVisible().catch(() => false)) {
    return;
  }

  await dismissActiveToolPanel(page);
  await dismissMapOnboarding(page);

  const dockChat = page.getByRole("button", { name: "Open chat" });
  if (await dockChat.isVisible().catch(() => false)) {
    await dockChat.click();
    return;
  }

  const chatTab = page.getByRole("button", { name: "Chat", exact: true });
  if (await chatTab.isVisible().catch(() => false)) {
    await chatTab.click();
    return;
  }

  await clickOverflowToolButton(page, "Open chat");
}

export async function answerInChat(page: Page, label: string) {
  const answerButton = page.getByRole("button", { name: `Send answer: ${label}` });
  if (!(await answerButton.isVisible().catch(() => false))) {
    await openChat(page);
  }
  await expect(answerButton).toBeVisible({ timeout: 20_000 });
  await answerButton.click();
}

export async function answerPhotoCannotInChat(page: Page) {
  const answerButton = page.getByRole("button", {
    name: "I cannot answer the question",
  });
  if (!(await answerButton.isVisible().catch(() => false))) {
    await openChat(page);
  }
  await expect(answerButton).toBeVisible({ timeout: 20_000 });
  await answerButton.click();
}

export async function answerYesInChat(page: Page) {
  await answerInChat(page, "Yes");
}

export async function expectChatAnswer(page: Page, answer: string) {
  const answered = page.getByText(new RegExp(`Answered: ${answer}`, "i"));
  if (!(await answered.isVisible().catch(() => false))) {
    await openChat(page);
  }
  await expect(answered).toBeVisible({
    timeout: 20_000,
  });
}
