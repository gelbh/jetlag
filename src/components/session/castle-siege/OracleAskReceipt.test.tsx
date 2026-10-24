import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { OracleAskReceipt } from "./OracleAskReceipt";

function renderReceipt(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("OracleAskReceipt", () => {
  it("shows oracle answer label and confirm-send without raw enemy coords", () => {
    const onConfirmSend = vi.fn();
    renderReceipt(
      <OracleAskReceipt receipt={{ kind: "radar", answer: "yes" }} onConfirmSend={onConfirmSend} />,
    );

    const answer = screen.getByTestId("castle-siege-oracle-ask-receipt-answer");
    expect(answer).toHaveTextContent("Inside · Yes");
    expect(answer.textContent).not.toMatch(/53\.|lat|lng/i);
    expect(document.body.textContent).not.toMatch(/"lat"|"lng"/);

    fireEvent.click(screen.getByRole("button", { name: /confirm send/i }));
    expect(onConfirmSend).toHaveBeenCalledTimes(1);
  });
});
