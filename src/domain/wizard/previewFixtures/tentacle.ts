import type { TentaclePoi } from "../../map/annotations";
import type { TentacleExtendedCategoryId } from "../../questions";
import { milesToMeters } from "../../map/distance";
export interface TentaclePreviewFixture {
  categoryId: TentacleExtendedCategoryId | null;
  categoryChosen: boolean;
  searchRadiusMeters: number;
  poiOptions: TentaclePoi[];
  selectedPoiId: string | null;
  outOfReach: boolean;
  loading: boolean;
  awaitingPlacement: boolean;
  hasCenter: boolean;
  awaitHiderAnswer: boolean;
}

const TUTORIAL_POIS: TentaclePoi[] = [
  {
    id: "tutorial-poi-1",
    name: "National Museum",
    lat: 53.3402,
    lng: -6.2549,
    category: "museum",
  },
  {
    id: "tutorial-poi-2",
    name: "Dublin Castle",
    lat: 53.3429,
    lng: -6.2674,
    category: "museum",
  },
];

export const TENTACLE_PREVIEW_ANCHOR: TentaclePreviewFixture = {
  categoryId: null,
  categoryChosen: false,
  searchRadiusMeters: milesToMeters(1),
  poiOptions: [],
  selectedPoiId: null,
  outOfReach: false,
  loading: false,
  awaitingPlacement: true,
  hasCenter: false,
  awaitHiderAnswer: false,
};

export const TENTACLE_PREVIEW_SOLO_ANSWER: TentaclePreviewFixture = {
  categoryId: "museum",
  categoryChosen: true,
  searchRadiusMeters: milesToMeters(1),
  poiOptions: TUTORIAL_POIS,
  selectedPoiId: "tutorial-poi-1",
  outOfReach: false,
  loading: false,
  awaitingPlacement: false,
  hasCenter: true,
  awaitHiderAnswer: false,
};

export const TENTACLE_PREVIEW_HIDERS_LOCATIONS: TentaclePreviewFixture = {
  ...TENTACLE_PREVIEW_SOLO_ANSWER,
  selectedPoiId: null,
  awaitHiderAnswer: true,
};
