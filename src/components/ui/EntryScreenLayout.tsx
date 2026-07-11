import type { ReactNode } from "react";

interface EntryScreenLayoutProps {
  children: ReactNode;
  justify?: "between" | "center" | "start";
}

export function EntryScreenLayout({
  children,
  justify = "between",
}: EntryScreenLayoutProps) {
  const justifyClass =
    justify === "center"
      ? "justify-center gap-8 overflow-y-auto"
      : justify === "start"
        ? "justify-start gap-4"
        : "justify-between";

  const paddingClass =
    justify === "start" ? "py-6" : "py-8";

  return (
    <main
      className={`home-poster home-terminal-accent flex min-h-[100dvh] flex-col ${justifyClass} px-5 ${paddingClass} pb-[max(1rem,env(safe-area-inset-bottom))]`}
    >
      {children}
    </main>
  );
}
