import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { AppUiProvider } from "@/components/ui/providers/AppUiProvider";
import { resetAllStores } from "./helpers/storeReset";
import { RouteTransitionTestProvider } from "./RouteTransitionTestProvider";

interface RenderWithRouterOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  routerProps?: MemoryRouterProps;
  resetStores?: boolean;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
}

export function renderWithRouter(
  ui: ReactElement,
  { route = "/", routerProps, resetStores = true, ...options }: RenderWithRouterOptions = {},
) {
  if (resetStores) {
    resetAllStores();
  }

  window.history.pushState({}, "", route);
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppUiProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]} {...routerProps}>
            <RouteTransitionTestProvider>{children}</RouteTransitionTestProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </AppUiProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
