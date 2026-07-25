//! Union / clip / end-game mask operations.

use crate::types::PolygonFeature;
use geo::{Coord, Polygon};

/// Disk center is `[lat, lng]` (matches TS `LatLngTuple`).
#[derive(Debug, Clone)]
pub struct DiskSpec {
    pub center: [f64; 2],
    pub radius_meters: f64,
}

#[derive(Debug, Clone)]
pub struct UnionInput {
    pub polygons: Vec<PolygonFeature>,
    pub disks: Vec<DiskSpec>,
}

/// Play area as a closed ring polygon in lon/lat.
#[derive(Debug, Clone)]
pub struct GameArea {
    pub polygon: Polygon<f64>,
}

impl GameArea {
    /// Axis-aligned box: west, south, east, north (lon/lat degrees).
    pub fn polygon_box(west: f64, south: f64, east: f64, north: f64) -> Self {
        let exterior = vec![
            Coord { x: west, y: south },
            Coord { x: east, y: south },
            Coord { x: east, y: north },
            Coord { x: west, y: north },
            Coord { x: west, y: south },
        ];
        Self {
            polygon: Polygon::new(exterior.into(), vec![]),
        }
    }
}

/// Unions input polygons/disks and clips to the game area.
/// Stub: returns `None` until Task 2 implementation.
pub fn build_mask_from_union_input(
    _input: &UnionInput,
    _game_area: &GameArea,
) -> Option<PolygonFeature> {
    None
}

/// End-game mask: game area minus union of disks (or full area if no disks).
/// Stub: returns `None` until Task 2 implementation.
pub fn build_end_game_mask_from_disks(
    _game_area: &GameArea,
    _disks: &[DiskSpec],
) -> Option<PolygonFeature> {
    None
}
