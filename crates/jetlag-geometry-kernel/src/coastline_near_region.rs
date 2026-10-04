//! Coastline near region via distance-threshold isoline on a game-area cell grid.

use crate::geodesic::{haversine_meters, LatLng};
use crate::mask::{fold_union, multipolygon_to_feature, GameArea};
use crate::types::PolygonFeature;
use geo::{BooleanOps, ClosestPoint, Contains, Coord, LineString, MultiPolygon, Point, Polygon};
use std::collections::{HashMap, HashSet};

const MIN_GAME_AREA_LAT_SPAN: f64 = 0.005;
const MIN_GAME_AREA_LNG_SPAN: f64 = 0.005;
const LINEAR_NEAR_REGION_COARSE_MAX_CELLS: f64 = 256.0;
const LINEAR_NEAR_REGION_FINE_PER_COARSE: usize = 4;
const LINEAR_NEAR_REGION_MAX_FINE_SAMPLES: usize = 2_048;
const LINEAR_NEAR_REGION_COARSE_MIN_DIVISIONS: u32 = 8;
const LINEAR_NEAR_REGION_COARSE_MAX_DIVISIONS: u32 = 16;

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
    let divisions =
        divisions.unwrap_or_else(|| resolve_linear_near_region_coarse_divisions(&bbox));
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
        segments,
        radius_meters,
        game_area,
        &bbox,
        divisions,
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

fn coarse_boundary_epsilon_meters(bbox: &BoundingBox, divisions: usize) -> f64 {
    let lat_step = (bbox.north - bbox.south) / divisions as f64;
    let lng_step = (bbox.east - bbox.west) / divisions as f64;
    let mid_lat = (bbox.south + bbox.north) / 2.0;
    let lat_meters = lat_step * 111_320.0;
    let lng_meters = lng_step * 111_320.0 * (mid_lat * std::f64::consts::PI / 180.0).cos();
    (lat_meters.hypot(lng_meters)) / 2.0 + 1.0
}

fn mark_boundary_cells(
    grid: &[Vec<CellClass>],
    distances: &[Vec<f64>],
    radius_meters: f64,
    epsilon_meters: f64,
    divisions: usize,
) -> Vec<Vec<bool>> {
    let mut boundary = vec![vec![false; divisions]; divisions];
    let neighbors: [(isize, isize); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];

    for row in 0..divisions {
        for col in 0..divisions {
            let cell_class = grid[row][col];
            if cell_class != CellClass::Near && cell_class != CellClass::Far {
                continue;
            }
            if (distances[row][col] - radius_meters).abs() <= epsilon_meters {
                boundary[row][col] = true;
                continue;
            }
            for (d_row, d_col) in neighbors {
                let n_row = row as isize + d_row;
                let n_col = col as isize + d_col;
                if n_row < 0
                    || n_row >= divisions as isize
                    || n_col < 0
                    || n_col >= divisions as isize
                {
                    continue;
                }
                let neighbor_class = grid[n_row as usize][n_col as usize];
                if (neighbor_class == CellClass::Near || neighbor_class == CellClass::Far)
                    && neighbor_class != cell_class
                {
                    boundary[row][col] = true;
                    break;
                }
            }
        }
    }

    boundary
}

fn stamp_fine_coarse_cells(boundary: &[Vec<bool>], divisions: usize) -> Vec<Vec<bool>> {
    let mut stamped = vec![vec![false; divisions]; divisions];
    let halo_offsets: [(isize, isize); 5] = [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)];
    let mut candidates: Vec<(usize, usize)> = Vec::new();

    for row in 0..divisions {
        for col in 0..divisions {
            if boundary[row][col] {
                candidates.push((row, col));
            }
        }
    }
    for row in 0..divisions {
        for col in 0..divisions {
            if boundary[row][col] {
                continue;
            }
            let mut in_halo = false;
            for (d_row, d_col) in halo_offsets {
                if d_row == 0 && d_col == 0 {
                    continue;
                }
                let n_row = row as isize + d_row;
                let n_col = col as isize + d_col;
                if n_row < 0
                    || n_row >= divisions as isize
                    || n_col < 0
                    || n_col >= divisions as isize
                {
                    continue;
                }
                if boundary[n_row as usize][n_col as usize] {
                    in_halo = true;
                    break;
                }
            }
            if in_halo {
                candidates.push((row, col));
            }
        }
    }

    let mut fine_samples = 0usize;
    let fine_per_cell = LINEAR_NEAR_REGION_FINE_PER_COARSE * LINEAR_NEAR_REGION_FINE_PER_COARSE;
    for (row, col) in candidates {
        if fine_samples + fine_per_cell > LINEAR_NEAR_REGION_MAX_FINE_SAMPLES {
            break;
        }
        stamped[row][col] = true;
        fine_samples += fine_per_cell;
    }

    stamped
}

fn remainder_coarse_cells(
    stamped: &[Vec<bool>],
    boundary: &[Vec<bool>],
    divisions: usize,
) -> Vec<Vec<bool>> {
    let mut remainder = vec![vec![false; divisions]; divisions];
    let halo_offsets: [(isize, isize); 5] = [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)];
    for row in 0..divisions {
        for col in 0..divisions {
            if stamped[row][col] {
                continue;
            }
            for (d_row, d_col) in halo_offsets {
                let n_row = row as isize + d_row;
                let n_col = col as isize + d_col;
                if n_row < 0
                    || n_row >= divisions as isize
                    || n_col < 0
                    || n_col >= divisions as isize
                {
                    continue;
                }
                if boundary[n_row as usize][n_col as usize] {
                    remainder[row][col] = true;
                    break;
                }
            }
        }
    }
    remainder
}

fn interpolate_crossing(
    from: Coord<f64>,
    from_distance: f64,
    to: Coord<f64>,
    to_distance: f64,
    iso: f64,
) -> Coord<f64> {
    let span = to_distance - from_distance;
    let t = if span.abs() < 1e-12 {
        0.5
    } else {
        (iso - from_distance) / span
    };
    let clamped = t.clamp(0.0, 1.0);
    Coord {
        x: from.x + clamped * (to.x - from.x),
        y: from.y + clamped * (to.y - from.y),
    }
}

fn polygon_from_ring(mut ring: Vec<Coord<f64>>) -> Polygon<f64> {
    if let (Some(first), Some(last)) = (ring.first().copied(), ring.last().copied()) {
        if first != last {
            ring.push(first);
        }
    }
    Polygon::new(LineString(ring), vec![])
}

fn marching_square_fill_rings(
    sw: Coord<f64>,
    se: Coord<f64>,
    ne: Coord<f64>,
    nw: Coord<f64>,
    d_sw: f64,
    d_se: f64,
    d_ne: f64,
    d_nw: f64,
    iso: f64,
) -> Vec<Vec<Coord<f64>>> {
    let sw_in = d_sw <= iso;
    let se_in = d_se <= iso;
    let ne_in = d_ne <= iso;
    let nw_in = d_nw <= iso;
    let code = (usize::from(sw_in))
        | (usize::from(se_in) << 1)
        | (usize::from(ne_in) << 2)
        | (usize::from(nw_in) << 3);
    let bottom = || interpolate_crossing(sw, d_sw, se, d_se, iso);
    let right = || interpolate_crossing(se, d_se, ne, d_ne, iso);
    let top = || interpolate_crossing(ne, d_ne, nw, d_nw, iso);
    let left = || interpolate_crossing(nw, d_nw, sw, d_sw, iso);
    let saddle_inside = (d_sw + d_se + d_ne + d_nw) / 4.0 <= iso;

    match code {
        0 => vec![],
        1 => vec![vec![sw, bottom(), left()]],
        2 => vec![vec![se, right(), bottom()]],
        3 => vec![vec![sw, se, right(), left()]],
        4 => vec![vec![ne, top(), right()]],
        5 => {
            if saddle_inside {
                vec![vec![sw, bottom(), right(), ne, top(), left()]]
            } else {
                vec![vec![sw, bottom(), left()], vec![ne, top(), right()]]
            }
        }
        6 => vec![vec![se, ne, top(), bottom()]],
        7 => vec![vec![sw, se, ne, top(), left()]],
        8 => vec![vec![nw, left(), top()]],
        9 => vec![vec![sw, bottom(), top(), nw]],
        10 => {
            if saddle_inside {
                vec![vec![se, right(), top(), nw, left(), bottom()]]
            } else {
                vec![vec![se, right(), bottom()], vec![nw, left(), top()]]
            }
        }
        11 => vec![vec![sw, se, right(), top(), nw]],
        12 => vec![vec![ne, nw, left(), right()]],
        13 => vec![vec![sw, bottom(), right(), ne, nw]],
        14 => vec![vec![se, ne, nw, left(), bottom()]],
        15 => vec![vec![sw, se, ne, nw]],
        _ => vec![],
    }
}

fn merge_near_cell_rects(grid: &[Vec<CellClass>]) -> Vec<MergedRect> {
    let width = grid.first().map(|row| row.len()).unwrap_or(0);
    let mut row_runs: Vec<Vec<(usize, usize)>> = Vec::new();

    for row in grid {
        let mut runs = Vec::new();
        let mut run_start: Option<usize> = None;

        for (col, cell) in row.iter().enumerate() {
            match (*cell == CellClass::Near, run_start) {
                (true, None) => run_start = Some(col),
                (false, Some(start)) => {
                    runs.push((start, col));
                    run_start = None;
                }
                _ => {}
            }
        }
        if let Some(start) = run_start {
            runs.push((start, width));
        }
        row_runs.push(runs);
    }

    let mut all_rects = Vec::new();
    let mut open_rects: HashMap<String, MergedRect> = HashMap::new();

    for (row, runs) in row_runs.iter().enumerate() {
        let mut current_keys = HashSet::new();

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
) -> Option<MultiPolygon<f64>> {
    let rects = merge_near_cell_rects(grid);
    if rects.is_empty() {
        return None;
    }

    let lat_step = (bbox.north - bbox.south) / divisions as f64;
    let lng_step = (bbox.east - bbox.west) / divisions as f64;

    let polys: Vec<Polygon<f64>> = rects
        .iter()
        .map(|rect| {
            Polygon::new(
                cell_ring(rect, bbox.south, bbox.west, lat_step, lng_step),
                vec![],
            )
        })
        .collect();

    let near_mp = MultiPolygon(polys);
    let clipped = game_area.multipolygon.intersection(&near_mp);
    if clipped.0.is_empty() {
        None
    } else {
        Some(clipped)
    }
}

fn build_isoline_near_region_from_grid(
    grid: &[Vec<CellClass>],
    distances: &[Vec<f64>],
    segments: &[Vec<[f64; 2]>],
    radius_meters: f64,
    game_area: &GameArea,
    bbox: &BoundingBox,
    divisions: usize,
) -> Option<PolygonFeature> {
    let epsilon_meters = coarse_boundary_epsilon_meters(bbox, divisions);
    let boundary = mark_boundary_cells(grid, distances, radius_meters, epsilon_meters, divisions);
    let stamped = stamp_fine_coarse_cells(&boundary, divisions);

    let lat_step = (bbox.north - bbox.south) / divisions as f64;
    let lng_step = (bbox.east - bbox.west) / divisions as f64;
    let fine_lat_step = lat_step / LINEAR_NEAR_REGION_FINE_PER_COARSE as f64;
    let fine_lng_step = lng_step / LINEAR_NEAR_REGION_FINE_PER_COARSE as f64;

    let mut stamped_fine_cells: Vec<(usize, usize)> = Vec::new();
    for row in 0..divisions {
        for col in 0..divisions {
            if !stamped[row][col] {
                continue;
            }
            let base_row = row * LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let base_col = col * LINEAR_NEAR_REGION_FINE_PER_COARSE;
            for fr in 0..LINEAR_NEAR_REGION_FINE_PER_COARSE {
                for fc in 0..LINEAR_NEAR_REGION_FINE_PER_COARSE {
                    stamped_fine_cells.push((base_row + fr, base_col + fc));
                }
            }
        }
    }

    let mut corner_keys: HashSet<(usize, usize)> = HashSet::new();
    let mut corners_to_sample: Vec<(usize, usize)> = Vec::new();
    let mut add_corner = |fine_row: usize, fine_col: usize| {
        let key = (fine_row, fine_col);
        if corner_keys.insert(key) {
            corners_to_sample.push(key);
        }
    };
    for &(fine_row, fine_col) in &stamped_fine_cells {
        add_corner(fine_row, fine_col);
        add_corner(fine_row, fine_col + 1);
        add_corner(fine_row + 1, fine_col);
        add_corner(fine_row + 1, fine_col + 1);
    }

    let mut corner_distances: HashMap<(usize, usize), f64> = HashMap::new();
    for &(fine_row, fine_col) in &corners_to_sample {
        let point: LatLng = (
            bbox.south + fine_row as f64 * fine_lat_step,
            bbox.west + fine_col as f64 * fine_lng_step,
        );
        corner_distances.insert(
            (fine_row, fine_col),
            nearest_distance_to_segments(point, segments),
        );
    }

    let remainder = remainder_coarse_cells(&stamped, &boundary, divisions);
    let mut remainder_corner_keys: HashSet<(usize, usize)> = HashSet::new();
    let mut remainder_corners: Vec<(usize, usize)> = Vec::new();
    let mut add_remainder_corner = |fine_row: usize, fine_col: usize| {
        let key = (fine_row, fine_col);
        if corner_keys.contains(&key) || !remainder_corner_keys.insert(key) {
            return;
        }
        remainder_corners.push(key);
    };
    for row in 0..divisions {
        for col in 0..divisions {
            if !remainder[row][col] {
                continue;
            }
            let south_fine = row * LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let west_fine = col * LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let north_fine = south_fine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let east_fine = west_fine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
            add_remainder_corner(south_fine, west_fine);
            add_remainder_corner(south_fine, east_fine);
            add_remainder_corner(north_fine, west_fine);
            add_remainder_corner(north_fine, east_fine);
        }
    }
    for &(fine_row, fine_col) in &remainder_corners {
        let point: LatLng = (
            bbox.south + fine_row as f64 * fine_lat_step,
            bbox.west + fine_col as f64 * fine_lng_step,
        );
        corner_distances.insert(
            (fine_row, fine_col),
            nearest_distance_to_segments(point, segments),
        );
    }

    let corner_distance = |fine_row: usize, fine_col: usize| -> f64 {
        corner_distances
            .get(&(fine_row, fine_col))
            .copied()
            .unwrap_or(f64::INFINITY)
    };

    let mut isoline_parts: Vec<MultiPolygon<f64>> = Vec::new();
    for &(fine_row, fine_col) in &stamped_fine_cells {
        let sw = Coord {
            x: bbox.west + fine_col as f64 * fine_lng_step,
            y: bbox.south + fine_row as f64 * fine_lat_step,
        };
        let se = Coord {
            x: bbox.west + (fine_col + 1) as f64 * fine_lng_step,
            y: bbox.south + fine_row as f64 * fine_lat_step,
        };
        let ne = Coord {
            x: bbox.west + (fine_col + 1) as f64 * fine_lng_step,
            y: bbox.south + (fine_row + 1) as f64 * fine_lat_step,
        };
        let nw = Coord {
            x: bbox.west + fine_col as f64 * fine_lng_step,
            y: bbox.south + (fine_row + 1) as f64 * fine_lat_step,
        };
        let rings = marching_square_fill_rings(
            sw,
            se,
            ne,
            nw,
            corner_distance(fine_row, fine_col),
            corner_distance(fine_row, fine_col + 1),
            corner_distance(fine_row + 1, fine_col + 1),
            corner_distance(fine_row + 1, fine_col),
            radius_meters,
        );
        for ring in rings {
            isoline_parts.push(MultiPolygon(vec![polygon_from_ring(ring)]));
        }
    }

    for row in 0..divisions {
        for col in 0..divisions {
            if !remainder[row][col] {
                continue;
            }
            let south_fine = row * LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let west_fine = col * LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let north_fine = south_fine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let east_fine = west_fine + LINEAR_NEAR_REGION_FINE_PER_COARSE;
            let sw = Coord {
                x: bbox.west + col as f64 * lng_step,
                y: bbox.south + row as f64 * lat_step,
            };
            let se = Coord {
                x: bbox.west + (col + 1) as f64 * lng_step,
                y: bbox.south + row as f64 * lat_step,
            };
            let ne = Coord {
                x: bbox.west + (col + 1) as f64 * lng_step,
                y: bbox.south + (row + 1) as f64 * lat_step,
            };
            let nw = Coord {
                x: bbox.west + col as f64 * lng_step,
                y: bbox.south + (row + 1) as f64 * lat_step,
            };
            let rings = marching_square_fill_rings(
                sw,
                se,
                ne,
                nw,
                corner_distance(south_fine, west_fine),
                corner_distance(south_fine, east_fine),
                corner_distance(north_fine, east_fine),
                corner_distance(north_fine, west_fine),
                radius_meters,
            );
            for ring in rings {
                isoline_parts.push(MultiPolygon(vec![polygon_from_ring(ring)]));
            }
        }
    }

    let mut interior_grid = vec![vec![CellClass::Skip; divisions]; divisions];
    for row in 0..divisions {
        for col in 0..divisions {
            if grid[row][col] == CellClass::Near && !stamped[row][col] {
                interior_grid[row][col] = CellClass::Near;
            }
        }
    }

    if let Some(interior) = build_near_region_from_grid(&interior_grid, game_area, bbox, divisions)
    {
        isoline_parts.push(interior);
    }

    if isoline_parts.is_empty() {
        return None;
    }

    let united = fold_union(isoline_parts)?;
    let clipped = game_area.multipolygon.intersection(&united);
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
