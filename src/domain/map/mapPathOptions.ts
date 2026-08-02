/** Vector overlay stroke/fill options (formerly Leaflet PathOptions). */
export interface MapPathOptions {
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  stroke?: boolean;
  className?: string;
  noClip?: boolean;
  dashArray?: string | number[];
}
