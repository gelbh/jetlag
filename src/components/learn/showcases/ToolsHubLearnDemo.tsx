import { useNavigate } from "react-router-dom";
import { HudToolIcon } from "@/components/map/icons/ToolIcons";
import { AskCatalogRail } from "@/components/tools/ask/AskCatalogRail";
import type { DockableMapTool } from "@/domain/map/mapTools";

const TOOL_ROWS: readonly { id: string; path: string; label: string; tool: DockableMapTool }[] = [
  { id: "matching", path: "/tools/matching", label: "Matching", tool: "matching" },
  { id: "measuring", path: "/tools/measuring", label: "Measuring", tool: "measuring" },
  { id: "thermometer", path: "/tools/thermometer", label: "Thermometer", tool: "thermometer" },
  { id: "radar", path: "/tools/radar", label: "Radar", tool: "radar" },
  { id: "tentacle", path: "/tools/tentacles", label: "Tentacles", tool: "tentacle" },
  { id: "photo", path: "/tools/photo", label: "Photo", tool: "photo" },
];

/** Real Ask catalog rail that routes into each tool explainer. */
export function ToolsHubLearnDemo() {
  const navigate = useNavigate();
  return (
    <AskCatalogRail
      rows={TOOL_ROWS.map((row) => ({
        id: row.id,
        label: row.label,
        icon: <HudToolIcon tool={row.tool} width={20} height={20} />,
      }))}
      selectedId={null}
      onSelect={(id) => {
        const row = TOOL_ROWS.find((item) => item.id === id);
        if (row) navigate(row.path);
      }}
      aria-label="Question tools"
      hint="Tap a tool to open its guide"
      columns={2}
    />
  );
}
