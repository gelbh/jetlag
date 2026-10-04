import { MantineProvider } from "@mantine/core";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { ClientMinVersionGate } from "./ClientMinVersionGate";

const subscribeMock = vi.fn();

vi.mock("@/hooks/app/useAuthBootstrapReady", () => ({
  useAuthBootstrapReady: () => true,
}));

const appCheckArmed = vi.hoisted(() => ({ value: true }));

vi.mock("@/hooks/app/useAppCheckArmed", () => ({
  useAppCheckArmed: () => appCheckArmed.value,
}));

vi.mock("@/services/core/firebase/authBootstrapState", () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock("@/domain/device/changelog", () => ({
  APP_VERSION: "0.10.8",
}));

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: () => ({
    applyUpdate: vi.fn(),
    safeToReload: true,
    showGlobalBanner: false,
    hotfixGraceActive: false,
    hotfixGraceSecondsRemaining: null,
    hotfixRequiredMinAppVersion: null,
  }),
}));

vi.mock("@/services/firestore/clientMinVersion", () => ({
  subscribeClientMinVersion: (
    onChange: (min: string | null) => void,
    onError: (error: Error) => void,
  ) => {
    subscribeMock(onChange, onError);
    return () => {};
  },
}));

function renderGate(children: React.ReactNode) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <ClientMinVersionGate>{children}</ClientMinVersionGate>
    </MantineProvider>,
  );
}

describe("ClientMinVersionGate", () => {
  beforeEach(() => {
    subscribeMock.mockReset();
    appCheckArmed.value = true;
  });

  it("does not subscribe (Firestore → App Check) until a consumer arms App Check", async () => {
    appCheckArmed.value = false;

    const view = renderGate(<div>app-content</div>);
    // Let the gate's dynamic listener import settle before asserting.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("app-content")).toBeInTheDocument();
    expect(subscribeMock).not.toHaveBeenCalled();

    appCheckArmed.value = true;
    view.rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <ClientMinVersionGate>
          <div>app-content</div>
        </ClientMinVersionGate>
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(subscribeMock).toHaveBeenCalledOnce();
    });
  });

  it("blocks with update-required UI when below global min", async () => {
    subscribeMock.mockImplementation((onChange: (min: string | null) => void) => {
      onChange("0.11.0");
    });

    renderGate(<div>app-content</div>);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Update required/i);
    expect(screen.queryByText("app-content")).toBeNull();
  });

  it("renders children when at or above min", async () => {
    subscribeMock.mockImplementation((onChange: (min: string | null) => void) => {
      onChange("0.10.0");
    });

    renderGate(<div>app-content</div>);

    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("fail-opens when min doc is missing", async () => {
    subscribeMock.mockImplementation((onChange: (min: string | null) => void) => {
      onChange(null);
    });

    renderGate(<div>app-content</div>);

    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("fail-opens when the min-version listener errors", async () => {
    subscribeMock.mockImplementation(
      (_onChange: (min: string | null) => void, onError: (error: Error) => void) => {
        onError(new Error("unavailable"));
      },
    );

    renderGate(<div>app-content</div>);

    await waitFor(() => expect(subscribeMock).toHaveBeenCalled());
    expect(screen.getByText("app-content")).toBeInTheDocument();
  });

  it("does not subscribe when unmounted before the listener module loads", async () => {
    const { unmount } = renderGate(<div>app-content</div>);
    unmount();

    await vi.dynamicImportSettled();
    expect(subscribeMock).not.toHaveBeenCalled();
  });
});
