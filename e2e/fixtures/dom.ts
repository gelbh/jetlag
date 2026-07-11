import { type Locator } from "@playwright/test";

export async function clickViaEvaluate(element: Locator) {
  await element.evaluate((node) => {
    node.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
}
