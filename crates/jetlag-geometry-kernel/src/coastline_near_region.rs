//! Coastline near region via distance-threshold isoline on a game-area cell grid.

use crate::geodesic::{haversine_meters, LatLng};
use crate::linear_near_region_isoline::{
    build_isoline_near_region_from_grid, BoundingBox, CellClass,
};
use crate::mask::GameArea;
use crate::types::PolygonFeature;
use geo::{ClosestPoint, Contains, Coord, LineString, Point};

const MIN_GAME_AREA_LAT_SPAN: f64 = 0.005;
const MIN_GAME_AREA_LNG_SPAN: f64 = 0.005;
const LINEAR_NEAR_REGION_COARSE_MAX_CELLS: f64 = 256.0;
const LINEAR_NEAR_REGION_COARSE_MIN_DIVISIONS: u32 = 8;
const LINEAR_NEAR_REGION_COARSE_MAX_DIVISIONS: u32 = 16;

/// Distance-threshold near coast: isoline at R over a coarse/fine cell grid.
pub fn build_coastline_near_region_distance_threshold(
    segments: &[Vec<[f64; 2]>],
    radius_meters: f64,
    game_area: &GameArea,
    divisions: Option<u32>,
) -> Option<PolygonFeature> {
    if segments.is_empty() || radius_meters <= 0.0 {
        return None;
    }

    let bbox = normalize_bounding_box(game_area_bounding_box_raw(game_area));
    let divisions = divisions.unwrap_or_else(|| resolve_linear_near_region_coarse_divisions(&bbox));
    let divisions = divisions.max(1) as usize;

    let lat_step = (bbox.north - bbox.south) / divisions as f64;
    let lng_step = (bbox.east - bbox.west) / divisions as f64;

    let mut grid = vec![vec![CellClass::Skip; divisions]; divisions];
    let mut distances = vec![vec![f64::INFINITY; divisions]; divisions];
    let mut near_count = 0usize;
    let mut far_count = 0usize;

    for (row, grid_row) in grid.iter_mut().enumerate() {
        for (col, cell) in grid_row.iter_mut().enumerate() {
            let cell_south = bbox.south + row as f64 * lat_step;
            let cell_north = bbox.south + (row + 1) as f64 * lat_step;
            let cell_west = bbox.west + col as f64 * lng_step;
            let cell_east = bbox.west + (col + 1) as f64 * lng_step;
            let center: LatLng = (
                (cell_south + cell_north) / 2.0,
                (cell_west + cell_east) / 2.0,
            );

            if !game_area
                .multipolygon
                .contains(&Point::new(center.1, center.0))
            {
                continue;
            }

            let distance = nearest_distance_to_segments(center, segments);
            distances[row][col] = distance;
            if distance <= radius_meters {
                *cell = CellClass::Near;
                near_count += 1;
            } else {
                *cell = CellClass::Far;
                far_count += 1;
            }
        }
    }

    if near_count == 0 {
        return None;
    }

    if far_count == 0 {
        return game_area.to_feature();
    }

    build_isoline_near_region_from_grid(
        &grid,
        &distances,
        radius_meters,
        game_area,
        &bbox,
        divisions,
        |point| nearest_distance_to_segments(point, segments),
    )
}

fn resolve_linear_near_region_coarse_divisions(bbox: &BoundingBox) -> u32 {
    let lat_span = bbox.north - bbox.south;
    let lng_span = bbox.east - bbox.west;
    let area_ratio = (lat_span * lng_span) / (MIN_GAME_AREA_LAT_SPAN * MIN_GAME_AREA_LNG_SPAN);
    let target = (LINEAR_NEAR_REGION_COARSE_MAX_CELLS / area_ratio.max(0.01))
        .sqrt()
        .floor() as u32;
    target.clamp(
        LINEAR_NEAR_REGION_COARSE_MIN_DIVISIONS,
        LINEAR_NEAR_REGION_COARSE_MAX_DIVISIONS,
    )
}

fn game_area_bounding_box_raw(game_area: &GameArea) -> BoundingBox {
    let mut south = f64::INFINITY;
    let mut west = f64::INFINITY;
    let mut north = f64::NEG_INFINITY;
    let mut east = f64::NEG_INFINITY;

    for polygon in &game_area.multipolygon.0 {
        for coord in polygon.exterior().0.iter() {
            if coord.y < south {
                south = coord.y;
            }
            if coord.y > north {
                north = coord.y;
            }
            if coord.x < west {
                west = coord.x;
            }
            if coord.x > east {
                east = coord.x;
            }
        }
    }

    BoundingBox {
        south,
        west,
        north,
        east,
    }
}

fn normalize_bounding_box(box_: BoundingBox) -> BoundingBox {
    let mut south = box_.south;
    let mut west = box_.west;
    let mut north = box_.north;
    let mut east = box_.east;

    let lat_span = north - south;
    if lat_span < MIN_GAME_AREA_LAT_SPAN {
        let center = (north + south) / 2.0;
        south = center - MIN_GAME_AREA_LAT_SPAN / 2.0;
        north = center + MIN_GAME_AREA_LAT_SPAN / 2.0;
    }

    let lng_span = east - west;
    if lng_span < MIN_GAME_AREA_LNG_SPAN {
        let center = (east + west) / 2.0;
        west = center - MIN_GAME_AREA_LNG_SPAN / 2.0;
        east = center + MIN_GAME_AREA_LNG_SPAN / 2.0;
    }

    BoundingBox {
        south,
        west,
        north,
        east,
    }
}

fn segment_bounding_box(segment: &[[f64; 2]]) -> BoundingBox {
    let mut south = f64::INFINITY;
    let mut west = f64::INFINITY;
    let mut north = f64::NEG_INFINITY;
    let mut east = f64::NEG_INFINITY;

    for [lng, lat] in segment {
        if *lat < south {
            south = *lat;
        }
        if *lat > north {
            north = *lat;
        }
        if *lng < west {
            west = *lng;
        }
        if *lng > east {
            east = *lng;
        }
    }

    BoundingBox {
        south,
        west,
        north,
        east,
    }
}

fn bbox_min_distance_meters(box_: &BoundingBox, point: LatLng) -> f64 {
    let lat = point.0;
    let lng = point.1;
    let clamped_lat = lat.clamp(box_.south, box_.north);
    let clamped_lng = lng.clamp(box_.west, box_.east);
    haversine_meters(point, (clamped_lat, clamped_lng))
}

fn nearest_distance_to_segments(point: LatLng, segments: &[Vec<[f64; 2]>]) -> f64 {
    let mut nearest = f64::INFINITY;

    for segment in segments {
        if segment.len() < 2 {
            continue;
        }

        let bbox = segment_bounding_box(segment);
        let lower_bound = bbox_min_distance_meters(&bbox, point);
        if lower_bound >= nearest {
            continue;
        }

        let line: LineString<f64> = LineString(
            segment
                .iter()
                .map(|&[lng, lat]| Coord { x: lng, y: lat })
                .collect(),
        );
        let query = Point::new(point.1, point.0);
        let closest = line.closest_point(&query);
        let closest_coord = match closest {
            geo::Closest::Intersection(c) | geo::Closest::SinglePoint(c) => c,
            geo::Closest::Indeterminate => continue,
        };
        let distance = haversine_meters(point, (closest_coord.y(), closest_coord.x()));
        if distance < nearest {
            nearest = distance;
        }
    }

    nearest
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geodesic::{bearing_degrees, destination_point};
    use crate::mask::feature_contains_lng_lat;

    #[test]
    fn point_at_radius_plus_500m_is_outside_distance_threshold_region() {
        let area = GameArea::polygon_box(-0.15, 51.48, -0.10, 51.52);
        let segment = vec![[-0.12, 51.5], [-0.119, 51.501]];
        let radius_meters = 2_000.0;

        let near = build_coastline_near_region_distance_threshold(
            std::slice::from_ref(&segment),
            radius_meters,
            &area,
            Some(32),
        )
        .expect("near region");

        let coast_mid: LatLng = (51.5005, -0.1195);
        let bearing = bearing_degrees(coast_mid, (51.51, -0.1195));
        let probe = destination_point(coast_mid, radius_meters + 500.0, bearing);

        assert!(!feature_contains_lng_lat(&near, probe.1, probe.0));
    }

    #[test]
    fn none_divisions_uses_linear_coarse_budget() {
        let area = GameArea::polygon_box(-1.0, 50.0, 1.0, 52.0);
        let bbox = normalize_bounding_box(game_area_bounding_box_raw(&area));
        let divisions = resolve_linear_near_region_coarse_divisions(&bbox);
        assert!(divisions >= LINEAR_NEAR_REGION_COARSE_MIN_DIVISIONS);
        assert!(divisions <= LINEAR_NEAR_REGION_COARSE_MAX_DIVISIONS);
    }
}
