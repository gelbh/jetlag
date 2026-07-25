//! Half-plane / radar shaded regions matching TS `radarHalfPlane.ts`.

use crate::geodesic::{bearing_degrees, destination_point, midpoint, LatLng};
use crate::mask::{disk_to_polygon, multipolygon_to_feature, DiskSpec, GameArea};
use crate::types::PolygonFeature;
use geo::{BooleanOps, BoundingRect, Coord, LineString, MultiPolygon, Polygon};

const DIAGONAL_METERS: f64 = 250_000.0;
const RADAR_STEPS: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShadedSide {
    Hot,
    Cold,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DivisionAnchor {
    Midpoint,
    Start,
}

fn bbox_polygon(game_area: &GameArea) -> Option<MultiPolygon<f64>> {
    let rect = game_area.multipolygon.bounding_rect()?;
    let exterior = LineString(vec![
        Coord {
            x: rect.min().x,
            y: rect.min().y,
        },
        Coord {
            x: rect.max().x,
            y: rect.min().y,
        },
        Coord {
            x: rect.max().x,
            y: rect.max().y,
        },
        Coord {
            x: rect.min().x,
            y: rect.max().y,
        },
        Coord {
            x: rect.min().x,
            y: rect.min().y,
        },
    ]);
    Some(MultiPolygon(vec![Polygon::new(exterior, vec![])]))
}

fn hotter_side_polygon(anchor: LatLng, bearing: f64) -> MultiPolygon<f64> {
    let left = destination_point(anchor, DIAGONAL_METERS, bearing + 90.0);
    let right = destination_point(anchor, DIAGONAL_METERS, bearing - 90.0);
    let far = destination_point(anchor, DIAGONAL_METERS, bearing);
    // Rings are [lng, lat]
    let exterior = LineString(vec![
        Coord {
            x: anchor.1,
            y: anchor.0,
        },
        Coord {
            x: left.1,
            y: left.0,
        },
        Coord {
            x: far.1,
            y: far.0,
        },
        Coord {
            x: right.1,
            y: right.0,
        },
        Coord {
            x: anchor.1,
            y: anchor.0,
        },
    ]);
    MultiPolygon(vec![Polygon::new(exterior, vec![])])
}

fn or_bbox(result: MultiPolygon<f64>, game_area: &GameArea) -> Option<PolygonFeature> {
    if result.0.is_empty() {
        multipolygon_to_feature(&bbox_polygon(game_area)?)
    } else {
        multipolygon_to_feature(&result)
    }
}

/// Build thermometer half-plane clipped to the game area.
/// `point_a` / `point_b` are `(lat, lng)`.
pub fn build_half_plane_polygon(
    point_a: LatLng,
    point_b: LatLng,
    game_area: &GameArea,
    shaded_side: ShadedSide,
    division_anchor: DivisionAnchor,
) -> Option<PolygonFeature> {
    let anchor = match division_anchor {
        DivisionAnchor::Start => point_a,
        DivisionAnchor::Midpoint => midpoint(point_a, point_b),
    };
    let bearing = bearing_degrees(point_a, point_b);
    let hotter = hotter_side_polygon(anchor, bearing);

    match shaded_side {
        ShadedSide::Cold => {
            let colder = game_area.multipolygon.difference(&hotter);
            or_bbox(colder, game_area)
        }
        ShadedSide::Hot => {
            let hotter_clipped = game_area.multipolygon.intersection(&hotter);
            or_bbox(hotter_clipped, game_area)
        }
    }
}

/// Radar shaded region: disk when `shaded_inside`, else game area minus disk.
/// `center` is `(lat, lng)`.
pub fn build_radar_shaded_region(
    center: LatLng,
    radius_meters: f64,
    game_area: &GameArea,
    shaded_inside: bool,
) -> Option<PolygonFeature> {
    let disk = DiskSpec {
        center: [center.0, center.1],
        radius_meters,
    };
    // disk_to_polygon uses DISK_STEPS=64 (matches Turf / RADAR_STEPS).
    debug_assert_eq!(RADAR_STEPS, 64);
    let circle_mp = MultiPolygon(vec![disk_to_polygon(&disk)]);

    if shaded_inside {
        return multipolygon_to_feature(&circle_mp);
    }

    let outside = game_area.multipolygon.difference(&circle_mp);
    if outside.0.is_empty() {
        None
    } else {
        multipolygon_to_feature(&outside)
    }
}
