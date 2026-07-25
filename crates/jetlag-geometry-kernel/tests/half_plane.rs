use jetlag_geometry_kernel::half_plane::{
    build_half_plane_polygon, build_radar_shaded_region, DivisionAnchor, ShadedSide,
};
use jetlag_geometry_kernel::mask::{feature_contains_lng_lat, GameArea};

fn london_game_area() -> GameArea {
    GameArea::polygon_box(-0.2, 51.4, -0.1, 51.5)
}

#[test]
fn cold_half_plane_contains_colder_side_of_thermo() {
    let area = london_game_area();
    // A west of B → bearing roughly east; cold = difference of hotter wedge.
    let point_a = (51.45, -0.18);
    let point_b = (51.46, -0.12);
    let cold = build_half_plane_polygon(
        point_a,
        point_b,
        &area,
        ShadedSide::Cold,
        DivisionAnchor::Midpoint,
    )
    .expect("cold half-plane");
    let hot = build_half_plane_polygon(
        point_a,
        point_b,
        &area,
        ShadedSide::Hot,
        DivisionAnchor::Midpoint,
    )
    .expect("hot half-plane");

    // A west of B → hotter wedge points east; cold owns west, hot owns east.
    let west_in_cold = feature_contains_lng_lat(&cold, -0.19, 51.45);
    let east_in_cold = feature_contains_lng_lat(&cold, -0.11, 51.45);
    let west_in_hot = feature_contains_lng_lat(&hot, -0.19, 51.45);
    let east_in_hot = feature_contains_lng_lat(&hot, -0.11, 51.45);
    assert!(west_in_cold, "cold half-plane should contain west probe");
    assert!(!east_in_cold, "cold half-plane should exclude east probe");
    assert!(!west_in_hot, "hot half-plane should exclude west probe");
    assert!(east_in_hot, "hot half-plane should contain east probe");
}

#[test]
fn radar_outside_excludes_disk_center() {
    let area = london_game_area();
    let center = (51.45, -0.15);
    let outside = build_radar_shaded_region(center, 400.0, &area, false).expect("outside");
    assert!(!feature_contains_lng_lat(&outside, -0.15, 51.45));
    assert!(feature_contains_lng_lat(&outside, -0.19, 51.49));
}

#[test]
fn radar_inside_contains_disk_center() {
    let area = london_game_area();
    let center = (51.45, -0.15);
    let inside = build_radar_shaded_region(center, 400.0, &area, true).expect("inside");
    assert!(feature_contains_lng_lat(&inside, -0.15, 51.45));
    assert!(!feature_contains_lng_lat(&inside, -0.19, 51.49));
}
