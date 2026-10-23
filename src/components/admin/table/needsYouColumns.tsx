import { Box } from "@mantine/core";
import { formatFreshnessAge } from "@/domain/admin/formatAdminFreshness";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import type { AdminColumn } from "./AdminDataTable";
import type { NeedsYouRow } from "./needsYouRows";

export const NEEDS_YOU_DEFAULT_SORT = { id: "age", dir: "asc" } as const;

const DASH = "–";

function ms(iso: string): number | null {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

export function buildNeedsYouColumns(): AdminColumn<NeedsYouRow>[] {
  return [
    {
      id: "kind",
      label: "Kind",
      defaultVisible: true,
      render: (row) => (
        <Box component="span" style={{ color: "var(--color-flag)", fontSize: 13, fontWeight: 600 }}>
          {row.kind === "incident" ? "Incident" : "Preload"}
        </Box>
      ),
      sortValue: (row) => row.kind,
    },
    {
      id: "code",
      label: "Code",
      defaultVisible: true,
      pinned: true,
      render: (row) => (row.code ? <SessionCode code={row.code} /> : DASH),
      sortValue: (row) => row.code,
    },
    {
      id: "summary",
      label: "Summary",
      defaultVisible: true,
      render: (row) => (
        <Box
          component="span"
          title={row.summary}
          style={{
            display: "block",
            maxWidth: 360,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.summary}
        </Box>
      ),
      sortValue: (row) => row.summary,
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      render: (row) => <StatusMark tone={row.status.tone} label={row.status.label} />,
      sortValue: (row) => row.status.label,
    },
    {
      id: "reporterRole",
      label: "Reporter role",
      defaultVisible: true,
      render: (row) => row.reporterRole ?? DASH,
      sortValue: (row) => row.reporterRole,
    },
    {
      id: "age",
      label: "Age",
      defaultVisible: true,
      render: (row) => formatFreshnessAge(row.createdAt),
      sortValue: (row) => ms(row.createdAt),
    },
    {
      id: "agent",
      label: "Coding agent",
      defaultVisible: false,
      render: (row) => row.agent ?? DASH,
      sortValue: (row) => row.agent,
    },
    {
      id: "appVersion",
      label: "App version",
      defaultVisible: false,
      render: (row) => row.appVersion ?? DASH,
      sortValue: (row) => row.appVersion,
    },
    {
      id: "platform",
      label: "Platform",
      defaultVisible: false,
      render: (row) => row.platform ?? DASH,
      sortValue: (row) => row.platform,
    },
  ];
}
