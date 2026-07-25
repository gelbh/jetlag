//! Geodesic line buffer matching TS `geodesicLineBuffer.ts`.

use crate::geodesic::{bearing_degrees, destination_point, haversine_meters, LatLng};
use crate::mask::multipolygon_to_feature;
use crate::types::PolygonFeature;
use geo::{Coord, LineString, MultiPolygon, Polygon};

const DEFAULT_SAMPLE_SPACING_METERS: f64 = 25.0;

/// LineString coordinates as `[lng, lat]` pairs (GeoJSON order).
pub type LineStringLngLat = Vec<[f64; 2]>;

fn sample_spacing_for_buffer(distance_meters: f64, sample_spacing_meters: f64) -> Option<f64> {
    if !sample_spacing_meters.is_finite() || sample_spacing_meters <= 0.0 {
        return None;
    }
    Some(sample_spacing_meters.min((distance_meters * 0.5).max(1.0)))
}

fn sample_line_coordinates(coordinates: &[[f64; 2]], spacing_meters: f64) -> Vec<[f64; 2]> {
    if coordinates.len() < 2 {
        return coordinates.to_vec();
    }

    let mut sampled: Vec<[f64; 2]> = vec![coordinates[0]];
    let mut carry = 0.0;

    for index in 1..coordinates.len() {
        let start = coordinates[index - 1];
        let end = coordinates[index];
        // haversine expects lat/lng
        let segment_meters = haversine_meters((start[1], start[0]), (end[1], end[0]));
        if segment_meters <= 0.0 {
            continue;
        }

        let mut traveled = 0.0;
        while carry + (segment_meters - traveled) >= spacing_meters {
            let remaining = spacing_meters - carry;
            traveled += remaining;
            carry = 0.0;
            let fraction = traveled / segment_meters;
            sampled.push([
                start[0] + (end[0] - start[0]) * fraction,
                start[1] + (end[1] - start[1]) * fraction,
            ]);
        }

        carry += segment_meters - traveled;
    }

    if let Some(last) = coordinates.last() {
        if sampled
            .last()
            .is_none_or(|tail| tail[0] != last[0] || tail[1] != last[1])
        {
            sampled.push(*last);
        }
    }

    sampled
}

fn extend_line_ends(coordinates: &[[f64; 2]], extension_meters: f64) -> Vec<[f64; 2]> {
    if coordinates.len() < 2 || extension_meters <= 0.0 {
        return coordinates.to_vec();
    }

    let first = coordinates[0];
    let second = coordinates[1];
    let before_last = coordinates[coordinates.len() - 2];
    let last = coordinates[coordinates.len() - 1];

    let start_anchor: LatLng = (first[1], first[0]);
    let end_anchor: LatLng = (last[1], last[0]);
    let start_bearing =
        (bearing_degrees(start_anchor, (second[1], second[0])) + 180.0) % 360.0;
    let end_bearing = bearing_degrees((before_last[1], before_last[0]), end_anchor);

    let extended_start = destination_point(start_anchor, extension_meters, start_bearing);
    let extended_end = destination_point(end_anchor, extension_meters, end_bearing);

    let mut out = Vec::with_capacity(coordinates.len() + 2);
    out.push([extended_start.1, extended_start.0]);
    out.extend_from_slice(coordinates);
    out.push([extended_end.1, extended_end.0]);
    out
}

/// Buffer a geodesic line by `distance_meters`. Coordinates are `[lng, lat]`.
pub fn geodesic_line_buffer(
    line: &LineStringLngLat,
    distance_meters: f64,
    sample_spacing_meters: Option<f64>,
) -> Option<PolygonFeature> {
    let spacing = sample_spacing_for_buffer(
        distance_meters,
        sample_spacing_meters.unwrap_or(DEFAULT_SAMPLE_SPACING_METERS),
    )?;

    let extended = extend_line_ends(line, distance_meters);
    let sampled = if extended.len() == 2 {
        extended
    } else {
        sample_line_coordinates(&extended, spacing)
    };

    if sampled.len() < 2 {
        return None;
    }

    let mut left_ring: Vec<[f64; 2]> = Vec::with_capacity(sampled.len());
    let mut right_ring: Vec<[f64; 2]> = Vec::with_capacity(sampled.len());

    for index in 0..sampled.len() {
        let [lng, lat] = sampled[index];
        let anchor: LatLng = (lat, lng);
        let bearing = if index < sampled.len() - 1 {
            let next = sampled[index + 1];
            bearing_degrees(anchor, (next[1], next[0]))
        } else if index > 0 {
            let previous = sampled[index - 1];
            bearing_degrees((previous[1], previous[0]), anchor)
        } else {
            0.0
        };

        let left = destination_point(anchor, distance_meters, bearing + 90.0);
        let right = destination_point(anchor, distance_meters, bearing - 90.0);
        left_ring.push([left.1, left.0]);
        right_ring.push([right.1, right.0]);
    }

    let mut ring: Vec<Coord<f64>> = Vec::with_capacity(right_ring.len() * 2 + 1);
    for pt in &right_ring {
        ring.push(Coord { x: pt[0], y: pt[1] });
    }
    for pt in left_ring.iter().rev() {
        ring.push(Coord { x: pt[0], y: pt[1] });
    }
    if let Some(first) = right_ring.first() {
        ring.push(Coord {
            x: first[0],
            y: first[1],
        });
    }

    let poly = Polygon::new(LineString(ring), vec![]);
    multipolygon_to_feature(&MultiPolygon(vec![poly]))
}
