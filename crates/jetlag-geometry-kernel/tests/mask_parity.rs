use jetlag_geometry_kernel::mask::{
    build_end_game_mask_from_disks, build_mask_from_union_input, feature_contains_lng_lat,
    DiskSpec, GameArea, UnionInput,
};
use jetlag_geometry_kernel::types::PolygonFeature;
use serde_json::json;

fn london_game_area() -> GameArea {
    GameArea::polygon_box(-0.2, 51.4, -0.1, 51.5)
}

fn square(west: f64) -> PolygonFeature {
    PolygonFeature {
        feature_type: "Feature".to_string(),
        properties: json!({}),
        geometry: json!({
            "type": "Polygon",
            "coordinates": [[
                [west, 51.42],
                [west + 0.03, 51.42],
                [west + 0.03, 51.48],
                [west, 51.48],
                [west, 51.42]
            ]]
        }),
    }
}

#[test]
fn unions_polygons_and_clips_to_game_area() {
    let area = london_game_area();
    // square(-0.22): west=-0.22..-0.19 crosses game-area west edge (-0.2)
    let input = UnionInput {
        polygons: vec![square(-0.22), square(-0.18)],
        disks: vec![],
    };
    let mask = build_mask_from_union_input(&input, &area).expect("mask");
    // Inside clipped square / union and game area
    assert!(feature_contains_lng_lat(&mask, -0.195, 51.45));
    assert!(feature_contains_lng_lat(&mask, -0.165, 51.45));
    // Gap between the two squares (not in either polygon)
    assert!(!feature_contains_lng_lat(&mask, -0.185, 51.45));
    // In the polygon west of the game-area boundary → clipped out
    assert!(!feature_contains_lng_lat(&mask, -0.21, 51.45));
    // Outside game area entirely
    assert!(!feature_contains_lng_lat(&mask, -0.25, 51.45));
}

#[test]
fn builds_end_game_mask_from_disks() {
    let area = london_game_area();
    let disks = vec![DiskSpec {
        center: [51.45, -0.15],
        radius_meters: 400.0,
    }];
    let mask = build_end_game_mask_from_disks(&area, &disks).expect("mask");
    // Disk center should be eliminated (outside remaining mask)
    assert!(!feature_contains_lng_lat(&mask, -0.15, 51.45));
    // Far corner of game area remains
    assert!(feature_contains_lng_lat(&mask, -0.19, 51.49));
}

#[test]
fn returns_none_when_disks_fully_cover_game_area() {
    let area = london_game_area();
    let disks = vec![DiskSpec {
        center: [51.45, -0.15],
        radius_meters: 50_000.0,
    }];
    assert!(build_end_game_mask_from_disks(&area, &disks).is_none());
}

#[test]
fn empty_input_returns_none() {
    let area = london_game_area();
    let input = UnionInput {
        polygons: vec![],
        disks: vec![],
    };
    assert!(build_mask_from_union_input(&input, &area).is_none());
}
