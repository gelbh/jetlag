use jetlag_geometry_kernel::mask::{feature_contains_lng_lat, DiskSpec, GameArea};
use jetlag_geometry_kernel::near_region::build_near_region;

fn london_box() -> GameArea {
    GameArea::polygon_box(-0.15, 51.48, -0.10, 51.52)
}

#[test]
fn empty_input_returns_none() {
    let area = london_box();
    assert!(build_near_region(&[], 0.0, &[], &area).is_none());
    assert!(build_near_region(&[], 500.0, &[], &area).is_none());
}

#[test]
fn single_segment_buffer_clips_to_game_area() {
    let area = london_box();
    let segment = vec![[-0.12, 51.5], [-0.119, 51.501]];
    let near = build_near_region(&[segment], 200.0, &[], &area).expect("near region");

    assert!(feature_contains_lng_lat(
        &near,
        (-0.12 + -0.119) / 2.0,
        (51.5 + 51.501) / 2.0,
    ));
    // Outside the play area box.
    assert!(!feature_contains_lng_lat(&near, -0.20, 51.40));
}

#[test]
fn two_overlapping_segments_union() {
    let area = london_box();
    let a = vec![[-0.12, 51.5], [-0.119, 51.501]];
    let b = vec![[-0.1195, 51.5005], [-0.1185, 51.5015]];
    let near = build_near_region(&[a, b], 150.0, &[], &area).expect("near region");
    assert!(feature_contains_lng_lat(&near, -0.1195, 51.5005));
}

#[test]
fn disks_only_equal_radius() {
    let area = london_box();
    let disks = [
        DiskSpec {
            center: [51.50, -0.12],
            radius_meters: 300.0,
        },
        DiskSpec {
            center: [51.505, -0.115],
            radius_meters: 300.0,
        },
    ];
    let near = build_near_region(&[], 0.0, &disks, &area).expect("near region");
    assert!(feature_contains_lng_lat(&near, -0.12, 51.50));
}

#[test]
fn segments_and_disks_combine() {
    let area = london_box();
    let segment = vec![[-0.13, 51.49], [-0.125, 51.492]];
    let disks = [DiskSpec {
        center: [51.505, -0.11],
        radius_meters: 250.0,
    }];
    let near = build_near_region(&[segment], 200.0, &disks, &area).expect("near region");
    assert!(feature_contains_lng_lat(&near, -0.11, 51.505));
}

#[test]
fn no_intersection_with_game_area_returns_none() {
    let area = london_box();
    // Far west of the box.
    let segment = vec![[-0.50, 51.5], [-0.49, 51.501]];
    assert!(build_near_region(&[segment], 50.0, &[], &area).is_none());
}
