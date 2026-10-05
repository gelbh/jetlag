use jetlag_geometry_kernel::mask::{
    feature_contains_lng_lat, union_polygon_features_to_feature,
};
use jetlag_geometry_kernel::types::PolygonFeature;
use serde_json::json;

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
fn unions_overlapping_squares_without_game_area_clip() {
    let united = union_polygon_features_to_feature(&[square(-0.22), square(-0.18)])
        .expect("union");
    assert!(feature_contains_lng_lat(&united, -0.21, 51.45));
    assert!(feature_contains_lng_lat(&united, -0.165, 51.45));
    assert!(!feature_contains_lng_lat(&united, -0.185, 51.45));
}

#[test]
fn empty_input_returns_none() {
    assert!(union_polygon_features_to_feature(&[]).is_none());
}
