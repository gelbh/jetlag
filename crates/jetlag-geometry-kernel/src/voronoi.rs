//! Spatial Voronoi (Wave-2). Local equirectangular planar frame + voronator
//! (d3-delaunay dual) clipped to a finite axis-aligned envelope.

use serde_json::Value;
use voronator::delaunator::Point as VPoint;
use voronator::VoronoiDiagram;

const METERS_PER_DEGREE_LAT: f64 = 110_574.0;
const METERS_PER_DEGREE_LNG_AT_EQUATOR: f64 = 111_320.0;
/// Extent multiplier applied to the sites' bbox span so boundary cells stay finite.
const EXTENT_MARGIN_MULTIPLIER: f64 = 3.0;
/// Floor margin for tightly clustered sites (tentacle/matching disk headroom).
const MIN_EXTENT_MARGIN_METERS: f64 = 50_000.0;

#[derive(Debug, Clone)]
struct SiteIn {
    lng: f64,
    lat: f64,
    #[cfg_attr(not(test), allow(dead_code))]
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

fn voronoi_rings_for_points(
    points: &[PlanarPt],
    clip: ClipRect,
) -> Result<Vec<Vec<PlanarPt>>, String> {
    if points.is_empty() {
        return Ok(Vec::new());
    }
    let (min_x, min_y, max_x, max_y) = clip;
    let vpoints: Vec<VPoint> = points.iter().map(|&(x, y)| VPoint { x, y }).collect();
    let min = VPoint { x: min_x, y: min_y };
    let max = VPoint { x: max_x, y: max_y };
    // voronator clips to [min,max] and handles 1–2 sites via its own helper corners.
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

/// Packed rings for `coords = [lng0, lat0, lng1, lat1, …]`.
/// Layout: for each cell — `vertex_count`, then `lng,lat` pairs (closed ring).
/// Does **not** dedupe — caller must pass unique sites (TS wrapper matches SoT).
pub fn spatial_voronoi_rings_from_coords(coords: &[f64]) -> Result<Vec<f64>, String> {
    if coords.is_empty() {
        return Ok(Vec::new());
    }
    if coords.len() % 2 != 0 {
        return Err("voronoi: coords length must be even (lng/lat pairs)".into());
    }
    let sites: Vec<SiteIn> = coords
        .chunks_exact(2)
        .map(|pair| SiteIn {
            lng: pair[0],
            lat: pair[1],
            properties: Value::Null,
        })
        .collect();
    for site in &sites {
        if !site.lng.is_finite() || !site.lat.is_finite() {
            return Err("voronoi: non-finite coordinate".into());
        }
    }
    let (rings, lng_scale) = spatial_voronoi_compute(&sites)?;
    if sites.len() != rings.len() {
        return Err("voronoi: ring count mismatch".into());
    }
    let mut out: Vec<f64> = Vec::with_capacity(rings.iter().map(|r| 1 + r.len() * 2).sum());
    for ring in &rings {
        out.push(ring.len() as f64);
        for &(x, y) in ring {
            if !x.is_finite() || !y.is_finite() {
                return Err("voronoi: non-finite coordinate".into());
            }
            out.push(x / lng_scale);
            out.push(y / METERS_PER_DEGREE_LAT);
        }
    }
    Ok(out)
}

/// Compute planar Voronoi rings for sites as given (no dedupe).
fn spatial_voronoi_compute(sites: &[SiteIn]) -> Result<(Vec<Vec<PlanarPt>>, f64), String> {
    if sites.is_empty() {
        return Ok((Vec::new(), 1.0));
    }
    let mean_lat = sites.iter().map(|s| s.lat).sum::<f64>() / sites.len() as f64;
    let lng_scale = meters_per_degree_lng(mean_lat);
    let points: Vec<PlanarPt> = sites
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
    Ok((rings, lng_scale))
}

#[cfg(test)]
mod json_fixture {
    use super::*;
    use core::fmt::Write as _;

    /// Lng/lat digits in GeoJSON (~0.1 m at mid-latitudes).
    const COORD_PREC: usize = 7;

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

    fn push_coord(buf: &mut String, value: f64) -> Result<(), String> {
        if !value.is_finite() {
            return Err("voronoi: non-finite coordinate".into());
        }
        write!(buf, "{value:.COORD_PREC$}").map_err(|e| e.to_string())?;
        Ok(())
    }

    fn write_feature_collection_json(
        working: &[SiteIn],
        rings: &[Vec<PlanarPt>],
        lng_scale: f64,
    ) -> Result<String, String> {
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
                push_coord(&mut buf, x / lng_scale)?;
                buf.push(',');
                push_coord(&mut buf, y / METERS_PER_DEGREE_LAT)?;
                buf.push(']');
            }
            buf.push_str("]]}}");
        }

        buf.push_str("]}");
        Ok(buf)
    }

    pub(super) fn spatial_voronoi_feature_collection_json(
        sites: &[SiteIn],
    ) -> Result<String, String> {
        if sites.is_empty() {
            return Ok(r#"{"type":"FeatureCollection","features":[]}"#.to_string());
        }
        let working = dedupe_sites(sites);
        let (rings, lng_scale) = spatial_voronoi_compute(&working)?;
        write_feature_collection_json(&working, &rings, lng_scale)
    }
}

#[cfg(test)]
mod tests {
    use super::json_fixture::spatial_voronoi_feature_collection_json;
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

    #[test]
    fn packed_rings_match_site_count() {
        let coords = [
            -0.18, 51.44, -0.12, 51.45, -0.15, 51.5, -0.2, 51.48,
        ];
        let packed = spatial_voronoi_rings_from_coords(&coords).unwrap();
        let mut offset = 0usize;
        let mut cells = 0usize;
        while offset < packed.len() {
            let n = packed[offset] as usize;
            offset += 1 + n * 2;
            cells += 1;
        }
        assert_eq!(cells, 4);
        assert_eq!(offset, packed.len());
    }

    #[test]
    fn packed_rings_keep_near_duplicate_coords() {
        // TS string keys keep both; rings path must not collapse via 1e9 rounding.
        let coords = [-0.18, 51.44, -0.18, 51.44 + 4e-10, -0.12, 51.45];
        let packed = spatial_voronoi_rings_from_coords(&coords).unwrap();
        let mut offset = 0usize;
        let mut cells = 0usize;
        while offset < packed.len() {
            let n = packed[offset] as usize;
            offset += 1 + n * 2;
            cells += 1;
        }
        assert_eq!(cells, 3);
    }

    #[test]
    fn packed_rings_reject_non_finite() {
        let err = spatial_voronoi_rings_from_coords(&[-0.18, f64::NAN]).unwrap_err();
        assert!(err.contains("non-finite"));
    }
}
