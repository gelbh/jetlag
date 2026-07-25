//! Geodesic helpers matching TS `geodesicPrimitives` (Earth radius 6_371_000).

/// Matches TS `geodesicPrimitives` / Turf-ish spherical earth.
pub(crate) const EARTH_RADIUS_M: f64 = 6_371_000.0;

/// Lat/lng tuple as in TS `LatLngTuple`.
pub(crate) type LatLng = (f64, f64);

pub(crate) fn midpoint(a: LatLng, b: LatLng) -> LatLng {
    ((a.0 + b.0) / 2.0, (a.1 + b.1) / 2.0)
}

pub(crate) fn bearing_degrees(a: LatLng, b: LatLng) -> f64 {
    let lat1 = a.0.to_radians();
    let lat2 = b.0.to_radians();
    let d_lng = (b.1 - a.1).to_radians();
    let y = d_lng.sin() * lat2.cos();
    let x = lat1.cos() * lat2.sin() - lat1.sin() * lat2.cos() * d_lng.cos();
    (y.atan2(x).to_degrees() + 360.0) % 360.0
}

pub(crate) fn destination_point(origin: LatLng, distance_m: f64, bearing_deg: f64) -> LatLng {
    let δ = distance_m / EARTH_RADIUS_M;
    let θ = bearing_deg.to_radians();
    let φ1 = origin.0.to_radians();
    let λ1 = origin.1.to_radians();

    let sin_φ2 = φ1.sin() * δ.cos() + φ1.cos() * δ.sin() * θ.cos();
    let φ2 = sin_φ2.asin();
    let λ2 = λ1
        + (θ.sin() * δ.sin() * φ1.cos()).atan2(δ.cos() - φ1.sin() * sin_φ2);

    (φ2.to_degrees(), λ2.to_degrees())
}

/// Haversine distance in meters between two lat/lng points.
pub(crate) fn haversine_meters(a: LatLng, b: LatLng) -> f64 {
    let lat_delta = (b.0 - a.0).to_radians();
    let lng_delta = (b.1 - a.1).to_radians();
    let lat1 = a.0.to_radians();
    let lat2 = b.0.to_radians();
    let h = (lat_delta / 2.0).sin().powi(2)
        + lat1.cos() * lat2.cos() * (lng_delta / 2.0).sin().powi(2);
    2.0 * EARTH_RADIUS_M * h.sqrt().asin()
}
