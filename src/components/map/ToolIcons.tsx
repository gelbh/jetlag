import type { ReactElement, SVGProps } from "react";
import type { DockableMapTool } from "../../domain/map/mapTools";
import { IconBase } from "../ui/iconBase";

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

export function HudMatchingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4" y="6" width="8" height="8" rx="1" />
      <rect x="12" y="10" width="8" height="8" rx="1" />
    </IconBase>
  );
}

export function HudMeasuringIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 12h16" />
      <path d="M7 9v6M12 8v8M17 10v4" />
    </IconBase>
  );
}

export function HudThermometerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 1 1 4 0Z" />
    </IconBase>
  );
}

export function HudTentacleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 10V4M12 14v6M10 12H4M14 12h6M10.5 9.5 6 5M13.5 9.5 18 5M10.5 14.5 6 19M13.5 14.5 18 19" />
    </IconBase>
  );
}

export function HudPhotoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </IconBase>
  );
}

const TOOL_ICONS: Partial<
  Record<DockableMapTool, (props: SVGProps<SVGSVGElement>) => ReactElement>
> = {
  matching: HudMatchingIcon,
  measuring: HudMeasuringIcon,
  thermometer: HudThermometerIcon,
  radar: HudRadarIcon,
  tentacle: HudTentacleIcon,
  photo: HudPhotoIcon,
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
