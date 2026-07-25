use jetlag_geometry_mask::mask::{build_mask_from_union_input, GameArea, UnionInput};

#[test]
fn empty_polygons_returns_none() {
    let area = GameArea::polygon_box(-0.2, 51.4, -0.1, 51.5);
    let input = UnionInput {
        polygons: vec![],
        disks: vec![],
    };
    assert!(build_mask_from_union_input(&input, &area).is_none());
}
