import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { AppUiProvider } from "@/components/ui/providers/AppUiProvider";

interface RenderWithAppUiOptions extends Omit<RenderOptions, "wrapper"> {
  wrapper?: RenderOptions["wrapper"];
}

export function renderWithAppUi(
  ui: ReactElement,
  { wrapper: UserWrapper, ...options }: RenderWithAppUiOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    const body = UserWrapper ? (
      <UserWrapper>{children}</UserWrapper>
    ) : (
      children
    );
    return <AppUiProvider>{body}</AppUiProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
