//! Coastline near region via distance threshold on a game-area cell grid.

use crate::geodesic::{haversine_meters, LatLng};
use crate::mask::{multipolygon_to_feature, GameArea};
use crate::types::PolygonFeature;
use geo::{BooleanOps, ClosestPoint, Contains, Coord, LineString, MultiPolygon, Point, Polygon};

const MAX_SEA_LEVEL_SAMPLE_CELLS: f64 = 600.0;
const DEFAULT_SEA_LEVEL_DIVISIONS: u32 = 10;
const MAX_SMALL_AREA_DIVISIONS: u32 = 45;
const MIN_GAME_AREA_DIVISIONS: u32 = 8;
const MIN_GAME_AREA_LAT_SPAN: f64 = 0.005;
const MIN_GAME_AREA_LNG_SPAN: f64 = 0.005;

#[derive(Clone, Copy, PartialEq, Eq)]
enum CellClass {
    Near,
    Far,
    Skip,
}

struct BoundingBox {
    south: f64,
    west: f64,
    north: f64,
    east: f64,
}

#[derive(Clone, Copy)]
struct MergedRect {
    row_start: usize,
    row_end: usize,
    col_start: usize,
    col_end: usize,
}

/// Distance-threshold near coast: cells whose center is within `radius_meters` of any segment.
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
    let divisions = divisions.unwrap_or_else(|| resolve_game_area_cell_divisions(&bbox));
    let divisions = divisions.max(1) as usize;

    let lat_step = (bbox.north - bbox.south) / divisions as f64;
    let lng_step = (bbox.east - bbox.west) / divisions as f64;

    let mut grid = vec![vec![CellClass::Skip; divisions]; divisions];

    for row in 0..divisions {
        for col in 0..divisions {
            let cell_south = bbox.south + row as f64 * lat_step;
            let cell_north = bbox.south + (row + 1) as f64 * lat_step;
            let cell_west = bbox.west + col as f64 * lng_step;
            let cell_east = bbox.west + (col + 1) as f64 * lng_step;
            let center: LatLng = ((cell_south + cell_north) / 2.0, (cell_west + cell_east) / 2.0);

            if !game_area.multipolygon.contains(&Point::new(center.1, center.0)) {
                continue;
            }

            let distance = nearest_distance_to_segments(center, segments);
            grid[row][col] = if distance <= radius_meters {
                CellClass::Near
            } else {
                CellClass::Far
            };
        }
    }

    build_near_region_from_grid(&grid, game_area, &bbox, divisions)
}

fn resolve_game_area_cell_divisions(bbox: &BoundingBox) -> u32 {
    let lat_span = bbox.north - bbox.south;
    let lng_span = bbox.east - bbox.west;
    let area_ratio =
        (lat_span * lng_span) / (MIN_GAME_AREA_LAT_SPAN * MIN_GAME_AREA_LNG_SPAN);

    if area_ratio <= 1.0 {
        let target = (MAX_SEA_LEVEL_SAMPLE_CELLS / area_ratio.max(0.01)).sqrt().floor() as u32;
        return target
            .max(DEFAULT_SEA_LEVEL_DIVISIONS)
            .min(MAX_SMALL_AREA_DIVISIONS);
    }

    let target = (MAX_SEA_LEVEL_SAMPLE_CELLS / area_ratio).sqrt().floor() as u32;
    target
        .max(MIN_GAME_AREA_DIVISIONS)
        .min(DEFAULT_SEA_LEVEL_DIVISIONS)
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

fn merge_near_cell_rects(grid: &[Vec<CellClass>]) -> Vec<MergedRect> {
    let width = grid.first().map(|row| row.len()).unwrap_or(0);
    let mut row_runs: Vec<Vec<(usize, usize)>> = Vec::new();

    for row in grid {
        let mut runs = Vec::new();
        let mut run_start: Option<usize> = None;

        for col in 0..=width {
            let is_near = col < width && row[col] == CellClass::Near;
            match (is_near, run_start) {
                (true, None) => run_start = Some(col),
                (false, Some(start)) => {
                    runs.push((start, col));
                    run_start = None;
                }
                _ => {}
            }
        }
        row_runs.push(runs);
    }

    let mut all_rects = Vec::new();
    let mut open_rects: std::collections::HashMap<String, MergedRect> =
        std::collections::HashMap::new();

    for (row, runs) in row_runs.iter().enumerate() {
        let mut current_keys = std::collections::HashSet::new();

        for run in runs {
            let key = format!("{}:{}", run.0, run.1);
            current_keys.insert(key.clone());
            if let Some(existing) = open_rects.remove(&key) {
                if existing.row_end == row {
                    open_rects.insert(
                        key,
                        MergedRect {
                            row_end: row + 1,
                            ..existing
                        },
                    );
                    continue;
                }
                all_rects.push(existing);
            }
            open_rects.insert(
                key,
                MergedRect {
                    row_start: row,
                    row_end: row + 1,
                    col_start: run.0,
                    col_end: run.1,
                },
            );
        }

        for (key, rect) in open_rects.clone().iter() {
            if !current_keys.contains(key) && rect.row_end <= row {
                all_rects.push(*rect);
                open_rects.remove(key);
            }
        }
    }

    all_rects.extend(open_rects.into_values());
    all_rects
}

fn cell_ring(
    rect: &MergedRect,
    south: f64,
    west: f64,
    lat_step: f64,
    lng_step: f64,
) -> LineString<f64> {
    let cell_south = south + rect.row_start as f64 * lat_step;
    let cell_north = south + rect.row_end as f64 * lat_step;
    let cell_west = west + rect.col_start as f64 * lng_step;
    let cell_east = west + rect.col_end as f64 * lng_step;

    LineString(vec![
        Coord {
            x: cell_west,
            y: cell_south,
        },
        Coord {
            x: cell_east,
            y: cell_south,
        },
        Coord {
            x: cell_east,
            y: cell_north,
        },
        Coord {
            x: cell_west,
            y: cell_north,
        },
        Coord {
            x: cell_west,
            y: cell_south,
        },
    ])
}

fn build_near_region_from_grid(
    grid: &[Vec<CellClass>],
    game_area: &GameArea,
    bbox: &BoundingBox,
    divisions: usize,
) -> Option<PolygonFeature> {
    let rects = merge_near_cell_rects(grid);
    if rects.is_empty() {
        return None;
    }

    let lat_step = (bbox.north - bbox.south) / divisions as f64;
    let lng_step = (bbox.east - bbox.west) / divisions as f64;

    let polys: Vec<Polygon<f64>> = rects
        .iter()
        .map(|rect| Polygon::new(cell_ring(rect, bbox.south, bbox.west, lat_step, lng_step), vec![]))
        .collect();

    let near_mp = MultiPolygon(polys);
    let clipped = game_area.multipolygon.intersection(&near_mp);
    if clipped.0.is_empty() {
        return None;
    }
    multipolygon_to_feature(&clipped)
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
            &[segment.clone()],
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
}
