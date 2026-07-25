use jetlag_geometry_kernel::geodesic_buffer::geodesic_line_buffer;
use jetlag_geometry_kernel::mask::feature_contains_lng_lat;

#[test]
fn buffers_short_london_line() {
    let line = vec![[-0.12, 51.5], [-0.119, 51.501]];
    let buffered = geodesic_line_buffer(&line, 200.0, None).expect("buffer");

    // Midpoint of the segment should be inside the buffer.
    assert!(feature_contains_lng_lat(
        &buffered,
        (-0.12 + -0.119) / 2.0,
        (51.5 + 51.501) / 2.0,
    ));
    // Far away point should be outside.
    assert!(!feature_contains_lng_lat(&buffered, -0.2, 51.4));
}

#[test]
fn rejects_non_positive_sample_spacing() {
    let line = vec![[-0.12, 51.5], [-0.119, 51.501]];
    assert!(geodesic_line_buffer(&line, 200.0, Some(0.0)).is_none());
    assert!(geodesic_line_buffer(&line, 200.0, Some(-1.0)).is_none());
}
