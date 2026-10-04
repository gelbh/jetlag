//! Adaptive stamp + marching-squares isoline for linear measuring near-regions.

use crate::geodesic::LatLng;
use crate::mask::{multipolygon_to_feature, GameArea};
use crate::types::PolygonFeature;
use geo::{Area, BooleanOps, Coord, LineString, MultiPolygon, Polygon};
use std::collections::{HashMap, HashSet};

const LINEAR_NEAR_REGION_FINE_PER_COARSE: usize = 4;
const LINEAR_NEAR_REGION_MAX_FINE_SAMPLES: usize = 2_048;

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum CellClass {
    Near,
    Far,
    Skip,
}

pub(crate) struct BoundingBox {
    pub south: f64,
    pub west: f64,
    pub north: f64,
    pub east: f64,
}

#[derive(Clone, Copy)]
struct MergedRect {
    row_start: usize,
    row_end: usize,
    col_start: usize,
    col_end: usize,
}

struct StampPlan {
    stamped: Vec<Vec<bool>>,
    remainder: Vec<Vec<bool>>,
}

pub(crate) fn build_isoline_near_region_from_grid(
    grid: &[Vec<CellClass>],
    distances: &[Vec<f64>],
    radius_meters: f64,
    game_area: &GameArea,
    bbox: &BoundingBox,
    divisions: usize,
    nearest_distance: impl Fn(LatLng) -> f64,
) -> Option<PolygonFeature> {
    let epsilon_meters = coarse_boundary_epsilon_meters(bbox, divisions);
    let boundary = mark_boundary_cells(grid, distances, radius_meters, epsilon_meters, divisions);
    let StampPlan { stamped, remainder } = stamp_fine_coarse_cells(&boundary, divisions);

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
        corner_distances.insert((fine_row, fine_col), nearest_distance(point));
    }

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
        corner_distances.insert((fine_row, fine_col), nearest_distance(point));
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
        push_usable_rings(
            &mut isoline_parts,
            marching_square_fill_rings(
                sw,
                se,
                ne,
                nw,
                corner_distance(fine_row, fine_col),
                corner_distance(fine_row, fine_col + 1),
                corner_distance(fine_row + 1, fine_col + 1),
                corner_distance(fine_row + 1, fine_col),
                radius_meters,
            ),
        );
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
            push_usable_rings(
                &mut isoline_parts,
                marching_square_fill_rings(
                    sw,
                    se,
                    ne,
                    nw,
                    corner_distance(south_fine, west_fine),
                    corner_distance(south_fine, east_fine),
                    corner_distance(north_fine, east_fine),
                    corner_distance(north_fine, west_fine),
                    radius_meters,
                ),
            );
        }
    }

    let mut interior_grid = vec![vec![CellClass::Skip; divisions]; divisions];
    for row in 0..divisions {
        for col in 0..divisions {
            if grid[row][col] == CellClass::Near && !boundary[row][col] {
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

    let united = fold_union_keep_parts(isoline_parts)?;
    let clipped = game_area.multipolygon.intersection(&united);
    if clipped.0.is_empty() {
        return None;
    }
    multipolygon_to_feature(&clipped)
}

fn push_usable_rings(parts: &mut Vec<MultiPolygon<f64>>, rings: Vec<Vec<Coord<f64>>>) {
    for ring in rings {
        let polygon = polygon_from_ring(ring);
        if polygon.unsigned_area() <= 0.0 {
            continue;
        }
        parts.push(MultiPolygon(vec![polygon]));
    }
}

pub(crate) fn fold_union_keep_parts(parts: Vec<MultiPolygon<f64>>) -> Option<MultiPolygon<f64>> {
    let mut usable: Vec<MultiPolygon<f64>> = Vec::new();
    for mp in parts {
        let polys: Vec<Polygon<f64>> =
            mp.0.into_iter()
                .filter(|polygon| polygon.unsigned_area() > 0.0 && polygon.exterior().0.len() >= 4)
                .collect();
        if !polys.is_empty() {
            usable.push(MultiPolygon(polys));
        }
    }
    if usable.is_empty() {
        return None;
    }
    let mut acc = usable.remove(0);
    for next in usable {
        let united = acc.union(&next);
        if united.0.is_empty() {
            acc.0.extend(next.0);
        } else {
            acc = united;
        }
    }
    if acc.0.is_empty() {
        None
    } else {
        Some(acc)
    }
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

fn stamp_fine_coarse_cells(boundary: &[Vec<bool>], divisions: usize) -> StampPlan {
    let mut stamped = vec![vec![false; divisions]; divisions];
    let mut remainder = vec![vec![false; divisions]; divisions];
    let halo_offsets: [(isize, isize); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];
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
    let mut over_cap = false;
    let fine_per_cell = LINEAR_NEAR_REGION_FINE_PER_COARSE * LINEAR_NEAR_REGION_FINE_PER_COARSE;
    for (row, col) in candidates {
        if !over_cap && fine_samples + fine_per_cell > LINEAR_NEAR_REGION_MAX_FINE_SAMPLES {
            over_cap = true;
        }
        if over_cap {
            remainder[row][col] = true;
            continue;
        }
        stamped[row][col] = true;
        fine_samples += fine_per_cell;
    }

    StampPlan { stamped, remainder }
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

#[cfg(test)]
mod tests {
    use super::*;
    use geo::Contains;
    use geo::Point;

    fn square(west: f64, south: f64, east: f64, north: f64) -> MultiPolygon<f64> {
        MultiPolygon(vec![Polygon::new(
            LineString(vec![
                Coord { x: west, y: south },
                Coord { x: east, y: south },
                Coord { x: east, y: north },
                Coord { x: west, y: north },
                Coord { x: west, y: south },
            ]),
            vec![],
        )])
    }

    fn collapsed_ring() -> MultiPolygon<f64> {
        MultiPolygon(vec![Polygon::new(
            LineString(vec![
                Coord { x: 0.0, y: 0.0 },
                Coord { x: 0.0, y: 0.0 },
                Coord { x: 0.0, y: 0.0 },
                Coord { x: 0.0, y: 0.0 },
            ]),
            vec![],
        )])
    }

    #[test]
    fn stamp_remainder_is_unstamped_candidate_suffix() {
        let divisions = 20;
        let boundary = vec![vec![true; divisions]; divisions];
        let StampPlan { stamped, remainder } = stamp_fine_coarse_cells(&boundary, divisions);
        let mut stamped_count = 0usize;
        let mut remainder_count = 0usize;
        let mut saw_remainder = false;
        for row in 0..divisions {
            for col in 0..divisions {
                if stamped[row][col] {
                    assert!(!saw_remainder, "stamped cell after remainder started");
                    stamped_count += 1;
                } else if remainder[row][col] {
                    saw_remainder = true;
                    remainder_count += 1;
                } else {
                    panic!("candidate {row},{col} neither stamped nor remainder");
                }
            }
        }
        let max_stamped =
            LINEAR_NEAR_REGION_MAX_FINE_SAMPLES / (LINEAR_NEAR_REGION_FINE_PER_COARSE.pow(2));
        assert_eq!(stamped_count, max_stamped);
        assert_eq!(remainder_count, divisions * divisions - max_stamped);
    }

    #[test]
    fn fold_union_keep_parts_does_not_null_valid_when_peer_is_degenerate() {
        let good = square(0.0, 0.0, 1.0, 1.0);
        let degenerate = collapsed_ring();
        let kept =
            fold_union_keep_parts(vec![good, degenerate]).expect("valid fragment must survive");
        assert!(kept.contains(&Point::new(0.5, 0.5)));
    }

    #[test]
    fn fold_union_keep_parts_keeps_disjoint_squares() {
        let left = square(0.0, 0.0, 1.0, 1.0);
        let right = square(2.0, 2.0, 3.0, 3.0);
        let kept = fold_union_keep_parts(vec![left, right]).expect("concat or union");
        assert!(kept.contains(&Point::new(0.5, 0.5)));
        assert!(kept.contains(&Point::new(2.5, 2.5)));
    }
}
