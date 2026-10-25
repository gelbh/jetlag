import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { ChatPanel, type ChatPanelModel } from "./ChatPanel";

vi.mock("../../hooks/layout/useVisualViewportBottomInset", () => ({
  useVisualViewportBottomInset: () => 0,
}));

vi.mock("../ui/sheets/SheetHost", () => ({
  SheetHost: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="chat-sheet">{children}</div> : null,
}));

vi.mock("./ChatPanelBody", () => ({
  ChatPanelBody: () => <div>Chat body</div>,
}));

const baseModel: ChatPanelModel = {
  open: true,
  onClose: vi.fn(),
  messages: [],
  sessionId: "session-1",
  senderUid: "uid-1",
  senderRole: "seeker",
  isHider: false,
  onAnswerQuestion: vi.fn(),
};

describe("ChatPanel public props (AC #1)", () => {
  it("mounts with model options", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <ChatPanel model={baseModel} />
      </MantineProvider>,
    );

    expect(screen.getByTestId("chat-sheet")).toBeInTheDocument();
    expect(screen.getByText("Chat body")).toBeInTheDocument();
  });
});
