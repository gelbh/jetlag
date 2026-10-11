import { Paper, Title } from "@mantine/core";
import { type ReactNode, useId } from "react";
import "./AdminFixedDesk.css";

type AdminFixedDeskMode = "sessions" | "incidents";

interface AdminFixedDeskProps {
  mode: AdminFixedDeskMode;
  sessions: ReactNode;
  monitor: ReactNode;
  inbox: ReactNode;
  detail: ReactNode;
  actions: ReactNode;
}

function RegionTitle({ id, children }: { id: string; children: string }) {
  return (
    <Title
      order={2}
      id={id}
      ff="var(--font-display)"
      fz="0.6875rem"
      fw={700}
      lts="0.12em"
      tt="uppercase"
      c="var(--color-ink)"
      px="xs"
      py={6}
    >
      {children}
    </Title>
  );
}

function DeskPane({
  className,
  title,
  label,
  children,
}: {
  className: string;
  title?: string;
  label?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <Paper
      component={title || label ? "section" : "div"}
      aria-labelledby={title ? titleId : undefined}
      aria-label={label}
      withBorder
      radius={0}
      shadow="none"
      bg="var(--color-canvas)"
      display="flex"
      style={{ "--paper-border-color": "var(--color-rule)" }}
      className={className}
    >
      {title ? <RegionTitle id={titleId}>{title}</RegionTitle> : null}
      {children}
    </Paper>
  );
}

export function AdminFixedDesk({
  mode,
  sessions,
  monitor,
  inbox,
  detail,
  actions,
}: AdminFixedDeskProps) {
  return (
    <div className="jl-ops-fixed-desk" data-testid="admin-fixed-desk" data-desk-mode={mode}>
      <DeskPane className="jl-ops-fixed-region jl-ops-fixed-region--sessions" title="Sessions">
        {sessions}
      </DeskPane>
      <DeskPane className="jl-ops-fixed-region jl-ops-fixed-region--monitor" title="Monitor">
        {monitor}
      </DeskPane>
      {mode === "incidents" ? (
        <section
          className="jl-ops-fixed-region jl-ops-fixed-region--incidents"
          aria-label="Incidents"
        >
          <DeskPane className="jl-ops-fixed-region">{inbox}</DeskPane>
          <DeskPane className="jl-ops-fixed-region" label="Incident detail">
            {detail}
          </DeskPane>
          <DeskPane className="jl-ops-fixed-region">{actions}</DeskPane>
        </section>
      ) : null}
    </div>
  );
}
