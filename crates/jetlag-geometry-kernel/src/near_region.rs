//! Near-region batch: buffer lines + union disks + clip to game area.

use crate::geodesic_buffer::geodesic_line_buffer;
use crate::mask::{
    disk_to_polygon, feature_to_multipolygon, fold_union, multipolygon_to_feature, DiskSpec,
    GameArea,
};
use crate::types::PolygonFeature;
use geo::{BooleanOps, MultiPolygon};

/// Buffer all geodesic line segments at `distance_meters`, union with disks,
/// then clip to `game_area`. Coordinates on each segment are `[lng, lat]`.
///
/// Skips failed individual line buffers. Returns `None` when nothing unions or
/// the intersection with the game area is empty.
pub fn build_near_region(
    segments: &[Vec<[f64; 2]>],
    distance_meters: f64,
    disks: &[DiskSpec],
    game_area: &GameArea,
) -> Option<PolygonFeature> {
    let mut parts: Vec<MultiPolygon<f64>> = Vec::new();

    if distance_meters > 0.0 {
        for segment in segments {
            let Some(feature) = geodesic_line_buffer(segment, distance_meters, None) else {
                continue;
            };
            let Some(mp) = feature_to_multipolygon(&feature) else {
                continue;
            };
            if !mp.0.is_empty() {
                parts.push(mp);
            }
        }
    }

    for disk in disks {
        if disk.radius_meters > 0.0 {
            parts.push(MultiPolygon(vec![disk_to_polygon(disk)]));
        }
    }

    let unioned = fold_union(parts)?;
    let clipped = game_area.multipolygon.intersection(&unioned);
    if clipped.0.is_empty() {
        return None;
    }
    multipolygon_to_feature(&clipped)
}
