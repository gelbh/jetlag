//! Spatial Voronoi (Wave-2). Local equirectangular planar frame + voronator
//! (d3-delaunay dual) clipped to a finite axis-aligned envelope.
//!
//! Output GeoJSON is hand-written with fixed-precision floats to keep the
//! WASM↔JS string path competitive with d3-delaunay on small site sets.

use serde::Deserialize;
use serde_json::Value;
use voronator::delaunator::Point as VPoint;
use voronator::VoronoiDiagram;

const METERS_PER_DEGREE_LAT: f64 = 110_574.0;
const METERS_PER_DEGREE_LNG_AT_EQUATOR: f64 = 111_320.0;
/// Extent multiplier applied to the sites' bbox span so boundary cells stay finite.
const EXTENT_MARGIN_MULTIPLIER: f64 = 3.0;
/// Floor margin for tightly clustered sites (tentacle/matching disk headroom).
const MIN_EXTENT_MARGIN_METERS: f64 = 50_000.0;
/// Lng/lat digits in GeoJSON (~0.1 m at mid-latitudes).
const COORD_PREC: usize = 7;

#[derive(Debug, Clone, Deserialize)]
#[cfg_attr(test, derive(serde::Serialize))]
struct SiteIn {
    lng: f64,
    lat: f64,
    #[serde(default)]
    properties: Value,
}

type PlanarPt = (f64, f64);
type ClipRect = (f64, f64, f64, f64); // min_x, min_y, max_x, max_y

fn meters_per_degree_lng(lat_degrees: f64) -> f64 {
    let scale =
        METERS_PER_DEGREE_LNG_AT_EQUATOR * (lat_degrees * std::f64::consts::PI / 180.0).cos();
    if scale == 0.0 {
        METERS_PER_DEGREE_LNG_AT_EQUATOR
    } else {
        scale
    }
}

fn dedupe_sites(sites: &[SiteIn]) -> Vec<SiteIn> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::with_capacity(sites.len());
    for site in sites {
        let key = (
            (site.lng * 1e9).round() as i64,
            (site.lat * 1e9).round() as i64,
        );
        if seen.insert(key) {
            out.push(site.clone());
        }
    }
    out
}

fn push_u64(buf: &mut String, mut value: u64) {
    if value == 0 {
        buf.push('0');
        return;
    }
    let mut digits = [0u8; 20];
    let mut n = 0;
    while value > 0 {
        digits[n] = (value % 10) as u8;
        value /= 10;
        n += 1;
    }
    while n > 0 {
        n -= 1;
        buf.push(char::from(b'0' + digits[n]));
    }
}

fn push_f64(buf: &mut String, value: f64, prec: usize) {
    if !value.is_finite() {
        buf.push('0');
        return;
    }
    let scale = match prec {
        5 => 100_000.0,
        6 => 1_000_000.0,
        7 => 10_000_000.0,
        _ => 10f64.powi(prec as i32),
    };
    let mut scaled = (value * scale).round() as i64;
    if scaled == 0 {
        buf.push('0');
        return;
    }
    if scaled < 0 {
        buf.push('-');
        scaled = -scaled;
    }
    let scale_i = scale as i64;
    let int_part = (scaled / scale_i) as u64;
    let mut frac = scaled % scale_i;
    push_u64(buf, int_part);
    if frac == 0 {
        return;
    }
    buf.push('.');
    let mut divisor = scale_i / 10;
    while divisor > 0 && frac < divisor {
        buf.push('0');
        divisor /= 10;
    }
    while frac % 10 == 0 {
        frac /= 10;
    }
    push_u64(buf, frac as u64);
}

fn clip_rect_ring(clip: ClipRect) -> Vec<PlanarPt> {
    let (min_x, min_y, max_x, max_y) = clip;
    vec![
        (min_x, min_y),
        (max_x, min_y),
        (max_x, max_y),
        (min_x, max_y),
        (min_x, min_y),
    ]
}

fn bisect_clip_rect(a: PlanarPt, b: PlanarPt, clip: ClipRect) -> (Vec<PlanarPt>, Vec<PlanarPt>) {
    let mid = ((a.0 + b.0) * 0.5, (a.1 + b.1) * 0.5);
    let dx = b.0 - a.0;
    let dy = b.1 - a.1;
    let len = (dx * dx + dy * dy).sqrt().max(1.0);
    let n_a = (-dx / len, -dy / len);
    let n_b = (dx / len, dy / len);

    let clip_half = |normal: PlanarPt| -> Vec<PlanarPt> {
        let (min_x, min_y, max_x, max_y) = clip;
        let corners = [
            (min_x, min_y),
            (max_x, min_y),
            (max_x, max_y),
            (min_x, max_y),
        ];
        let mut out = Vec::with_capacity(6);
        let mut prev = corners[3];
        let mut prev_inside = (prev.0 - mid.0) * normal.0 + (prev.1 - mid.1) * normal.1 >= 0.0;
        for &curr in &corners {
            let curr_inside = (curr.0 - mid.0) * normal.0 + (curr.1 - mid.1) * normal.1 >= 0.0;
            if curr_inside {
                if !prev_inside {
                    let prev_d = (prev.0 - mid.0) * normal.0 + (prev.1 - mid.1) * normal.1;
                    let curr_d = (curr.0 - mid.0) * normal.0 + (curr.1 - mid.1) * normal.1;
                    let t = prev_d / (prev_d - curr_d);
                    out.push((prev.0 + t * (curr.0 - prev.0), prev.1 + t * (curr.1 - prev.1)));
                }
                out.push(curr);
            } else if prev_inside {
                let prev_d = (prev.0 - mid.0) * normal.0 + (prev.1 - mid.1) * normal.1;
                let curr_d = (curr.0 - mid.0) * normal.0 + (curr.1 - mid.1) * normal.1;
                let t = prev_d / (prev_d - curr_d);
                out.push((prev.0 + t * (curr.0 - prev.0), prev.1 + t * (curr.1 - prev.1)));
            }
            prev = curr;
            prev_inside = curr_inside;
        }
        if out.len() < 3 {
            return Vec::new();
        }
        let first = out[0];
        out.push(first);
        out
    };

    (clip_half(n_a), clip_half(n_b))
}

fn voronoi_rings_for_points(points: &[PlanarPt], clip: ClipRect) -> Result<Vec<Vec<PlanarPt>>, String> {
    match points.len() {
        0 => Ok(Vec::new()),
        1 => Ok(vec![clip_rect_ring(clip)]),
        2 => {
            let (r0, r1) = bisect_clip_rect(points[0], points[1], clip);
            if r0.is_empty() || r1.is_empty() {
                return Err("voronoi: two-site clip produced empty cell".into());
            }
            Ok(vec![r0, r1])
        }
        _ => voronoi_rings_voronator(points, clip),
    }
}

fn voronoi_rings_voronator(
    points: &[PlanarPt],
    clip: ClipRect,
) -> Result<Vec<Vec<PlanarPt>>, String> {
    let (min_x, min_y, max_x, max_y) = clip;
    let vpoints: Vec<VPoint> = points.iter().map(|&(x, y)| VPoint { x, y }).collect();
    let min = VPoint { x: min_x, y: min_y };
    let max = VPoint { x: max_x, y: max_y };
    let diagram = VoronoiDiagram::new(&min, &max, &vpoints)
        .ok_or_else(|| "voronoi: collinear or degenerate input".to_string())?;

    let cells = diagram.cells();
    if cells.len() != points.len() {
        return Err(format!(
            "voronoi: cell count {} != site count {}",
            cells.len(),
            points.len()
        ));
    }

    let mut rings = Vec::with_capacity(points.len());
    for cell in cells {
        let pts = cell.points();
        if pts.len() < 3 {
            return Err("voronoi: empty cell".into());
        }
        let mut ring: Vec<PlanarPt> = pts.iter().map(|p| (p.x, p.y)).collect();
        if let (Some(first), Some(last)) = (ring.first().copied(), ring.last().copied()) {
            if (first.0 - last.0).abs() > 1e-12 || (first.1 - last.1).abs() > 1e-12 {
                ring.push(first);
            }
        }
        if ring.len() < 4 {
            return Err("voronoi: empty cell".into());
        }
        rings.push(ring);
    }
    Ok(rings)
}

fn write_feature_collection_json(
    working: &[SiteIn],
    rings: &[Vec<PlanarPt>],
    lng_scale: f64,
) -> Result<String, String> {
    // Rough capacity: ~80 bytes per ring vertex + properties.
    let vertex_estimate: usize = rings.iter().map(|r| r.len()).sum();
    let mut buf = String::with_capacity(64 + working.len() * 96 + vertex_estimate * 24);
    buf.push_str(r#"{"type":"FeatureCollection","features":["#);

    for (i, (site, ring)) in working.iter().zip(rings.iter()).enumerate() {
        if i > 0 {
            buf.push(',');
        }
        buf.push_str(r#"{"type":"Feature","properties":"#);
        match &site.properties {
            Value::Null => buf.push_str("{}"),
            other => {
                let props = serde_json::to_string(other).map_err(|e| e.to_string())?;
                buf.push_str(&props);
            }
        }
        buf.push_str(r#","geometry":{"type":"Polygon","coordinates":[["#);
        for (j, &(x, y)) in ring.iter().enumerate() {
            if j > 0 {
                buf.push(',');
            }
            buf.push('[');
            push_f64(&mut buf, x / lng_scale, COORD_PREC);
            buf.push(',');
            push_f64(&mut buf, y / METERS_PER_DEGREE_LAT, COORD_PREC);
            buf.push(']');
        }
        buf.push_str("]]}}");
    }

    buf.push_str("]}");
    Ok(buf)
}

/// Build a GeoJSON FeatureCollection of Voronoi cells for the given sites JSON.
pub fn spatial_voronoi_from_sites_json(sites_json: &str) -> Result<String, String> {
    let sites: Vec<SiteIn> =
        serde_json::from_str(sites_json).map_err(|e| format!("sites: {e}"))?;
    spatial_voronoi_feature_collection_json(&sites)
}

fn spatial_voronoi_feature_collection_json(sites: &[SiteIn]) -> Result<String, String> {
    if sites.is_empty() {
        return Ok(r#"{"type":"FeatureCollection","features":[]}"#.to_string());
    }

    let working = dedupe_sites(sites);
    if working.is_empty() {
        return Ok(r#"{"type":"FeatureCollection","features":[]}"#.to_string());
    }

    let mean_lat = working.iter().map(|s| s.lat).sum::<f64>() / working.len() as f64;
    let lng_scale = meters_per_degree_lng(mean_lat);
    let points: Vec<PlanarPt> = working
        .iter()
        .map(|s| (s.lng * lng_scale, s.lat * METERS_PER_DEGREE_LAT))
        .collect();

    let mut min_x = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_y = f64::NEG_INFINITY;
    for &(x, y) in &points {
        min_x = min_x.min(x);
        max_x = max_x.max(x);
        min_y = min_y.min(y);
        max_y = max_y.max(y);
    }
    let span_x = max_x - min_x;
    let span_y = max_y - min_y;
    let margin = span_x.max(span_y).max(MIN_EXTENT_MARGIN_METERS) * EXTENT_MARGIN_MULTIPLIER;
    let clip = (min_x - margin, min_y - margin, max_x + margin, max_y + margin);

    let rings = voronoi_rings_for_points(&points, clip)?;
    if rings.len() != working.len() {
        return Err(format!(
            "voronoi: cell count {} != site count {}",
            rings.len(),
            working.len()
        ));
    }

    write_feature_collection_json(&working, &rings, lng_scale)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn parse_fc(json_str: &str) -> Value {
        serde_json::from_str(json_str).unwrap()
    }

    fn point_in_ring(ring: &[(f64, f64)], p: (f64, f64)) -> bool {
        let mut inside = false;
        let mut j = ring.len() - 1;
        for i in 0..ring.len() {
            let (xi, yi) = ring[i];
            let (xj, yj) = ring[j];
            let intersect = ((yi > p.1) != (yj > p.1))
                && (p.0 < (xj - xi) * (p.1 - yi) / (yj - yi + f64::EPSILON) + xi);
            if intersect {
                inside = !inside;
            }
            j = i;
        }
        inside
    }

    fn feature_ring(feature: &Value) -> Vec<(f64, f64)> {
        feature["geometry"]["coordinates"][0]
            .as_array()
            .unwrap()
            .iter()
            .map(|c| {
                let pair = c.as_array().unwrap();
                (pair[0].as_f64().unwrap(), pair[1].as_f64().unwrap())
            })
            .collect()
    }

    #[test]
    fn empty_sites_empty_fc() {
        let fc = parse_fc(&spatial_voronoi_feature_collection_json(&[]).unwrap());
        assert_eq!(fc["features"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn two_sites_preserve_properties() {
        let sites = vec![
            SiteIn {
                lng: -0.18,
                lat: 51.45,
                properties: json!({"poiId": "west"}),
            },
            SiteIn {
                lng: -0.12,
                lat: 51.45,
                properties: json!({"poiId": "east"}),
            },
        ];
        let fc = parse_fc(&spatial_voronoi_feature_collection_json(&sites).unwrap());
        let features = fc["features"].as_array().unwrap();
        assert_eq!(features.len(), 2);
        assert_eq!(features[0]["properties"]["poiId"], "west");
        assert_eq!(features[1]["properties"]["poiId"], "east");
        assert_eq!(features[0]["geometry"]["type"], "Polygon");
    }

    #[test]
    fn duplicate_coords_keep_first() {
        let sites = vec![
            SiteIn {
                lng: -0.15,
                lat: 51.45,
                properties: json!({"poiId": "a"}),
            },
            SiteIn {
                lng: -0.15,
                lat: 51.45,
                properties: json!({"poiId": "dup"}),
            },
            SiteIn {
                lng: -0.12,
                lat: 51.45,
                properties: json!({"poiId": "b"}),
            },
        ];
        let fc = parse_fc(&spatial_voronoi_feature_collection_json(&sites).unwrap());
        let features = fc["features"].as_array().unwrap();
        assert_eq!(features.len(), 2);
        assert_eq!(features[0]["properties"]["poiId"], "a");
    }

    #[test]
    fn site_cell_contains_site_with_disk_headroom() {
        let sites = vec![
            SiteIn {
                lng: -0.18,
                lat: 51.45,
                properties: json!({"poiId": "west"}),
            },
            SiteIn {
                lng: -0.12,
                lat: 51.45,
                properties: json!({"poiId": "east"}),
            },
        ];
        let fc = parse_fc(&spatial_voronoi_feature_collection_json(&sites).unwrap());
        let west = &fc["features"].as_array().unwrap()[0];
        let coords = feature_ring(west);
        assert!(point_in_ring(&coords, (-0.18, 51.45)));
        assert!(point_in_ring(&coords, (-0.165, 51.45)));
    }

    #[test]
    fn four_sites_produce_four_cells() {
        let sites = vec![
            SiteIn {
                lng: -0.18,
                lat: 51.44,
                properties: json!({"poiId": "west"}),
            },
            SiteIn {
                lng: -0.12,
                lat: 51.45,
                properties: json!({"poiId": "east"}),
            },
            SiteIn {
                lng: -0.15,
                lat: 51.5,
                properties: json!({"poiId": "north"}),
            },
            SiteIn {
                lng: -0.2,
                lat: 51.48,
                properties: json!({"poiId": "far"}),
            },
        ];
        let fc = parse_fc(&spatial_voronoi_feature_collection_json(&sites).unwrap());
        assert_eq!(fc["features"].as_array().unwrap().len(), 4);
    }
}

