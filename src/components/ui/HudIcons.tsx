import type { SVGProps } from "react";
import type { DockableMapTool } from "../../domain/mapTools";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function HudHomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V9.5" />
    </IconBase>
  );
}

export function HudSettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function HudUndoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3 10h11a4 4 0 0 1 0 8H9" />
      <path d="M7 6 3 10l4 4" />
    </IconBase>
  );
}

export function HudRedoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M21 10H10a4 4 0 0 0 0 8h5" />
      <path d="m17 6 4 4-4 4" />
    </IconBase>
  );
}

export function HudMoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function HudRadarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2" />
    </IconBase>
  );
}

export function HudZoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 8 8 4l8 4 4 8-8 4-8-4Z" />
    </IconBase>
  );
}

export function HudPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </IconBase>
  );
}

export function HudLayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </IconBase>
  );
}

const TOOL_ICONS: Partial<
  Record<DockableMapTool, (props: SVGProps<SVGSVGElement>) => React.ReactElement>
> = {
  radar: HudRadarIcon,
  zone: HudZoneIcon,
  pin: HudPinIcon,
};

export function HudToolIcon({
  tool,
  ...props
}: SVGProps<SVGSVGElement> & { tool: DockableMapTool }) {
  const Icon = TOOL_ICONS[tool];
  if (!Icon) {
    return null;
  }
  return <Icon {...props} />;
}
