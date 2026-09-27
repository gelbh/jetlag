import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { jetlagTheme } from "@/theme/theme";
import {
  ChatPanel,
  type ChatPanelModel,
  type ChatPanelProps,
} from "./ChatPanel";

vi.mock("../../hooks/layout/useDesktopLayout", () => ({
  useDesktopLayout: () => false,
}));

vi.mock("../../hooks/layout/useVisualViewportBottomInset", () => ({
  useVisualViewportBottomInset: () => 0,
}));

vi.mock("../ui/sheets/SheetHost", () => ({
  SheetHost: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="chat-sheet">{children}</div> : null),
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
  it("accepts a single model options object", () => {
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

    const props: ChatPanelProps = {
      model: baseModel,
    };
    const keys = Object.keys(props) as Array<keyof ChatPanelProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <ChatPanel {...props} />
      </MantineProvider>,
    );

    expect(screen.getByTestId("chat-sheet")).toBeInTheDocument();
    expect(screen.getByText("Chat body")).toBeInTheDocument();
  });
});
