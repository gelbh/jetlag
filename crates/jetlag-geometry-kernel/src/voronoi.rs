//! Spatial Voronoi (Wave-2). Local equirectangular planar frame + geo Voronoi.

use geo::{
    Coord, LineString, MultiPoint, Point, Polygon, Voronoi, VoronoiClip, VoronoiError,
    VoronoiParams,
};
use serde::Deserialize;
use serde_json::{json, Map, Value};

const METERS_PER_DEGREE_LAT: f64 = 110_574.0;
const METERS_PER_DEGREE_LNG_AT_EQUATOR: f64 = 111_320.0;
/// Extent multiplier applied to the sites' bbox span so boundary cells stay finite.
const EXTENT_MARGIN_MULTIPLIER: f64 = 3.0;
/// Floor margin for tightly clustered sites (tentacle/matching disk headroom).
const MIN_EXTENT_MARGIN_METERS: f64 = 50_000.0;

#[derive(Debug, Clone, Deserialize)]
struct SiteIn {
    lng: f64,
    lat: f64,
    #[serde(default)]
    properties: Value,
}

fn meters_per_degree_lng(lat_degrees: f64) -> f64 {
    let scale = METERS_PER_DEGREE_LNG_AT_EQUATOR * (lat_degrees * std::f64::consts::PI / 180.0).cos();
    if scale == 0.0 {
        METERS_PER_DEGREE_LNG_AT_EQUATOR
    } else {
        scale
    }
}

fn dedupe_sites(sites: &[SiteIn]) -> Vec<SiteIn> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for site in sites {
        let key = format!("{},{}", site.lng, site.lat);
        if seen.insert(key) {
            out.push(site.clone());
        }
    }
    out
}

fn clip_polygon(min_x: f64, min_y: f64, max_x: f64, max_y: f64) -> Polygon<f64> {
    Polygon::new(
        LineString::from(vec![
            Coord { x: min_x, y: min_y },
            Coord { x: max_x, y: min_y },
            Coord { x: max_x, y: max_y },
            Coord { x: min_x, y: max_y },
            Coord { x: min_x, y: min_y },
        ]),
        vec![],
    )
}

fn polygon_to_geojson(
    polygon: &Polygon<f64>,
    properties: Value,
    from_planar: &dyn Fn(f64, f64) -> [f64; 2],
) -> Value {
    let ring: Vec<Vec<f64>> = polygon
        .exterior()
        .coords()
        .map(|c| {
            let [lng, lat] = from_planar(c.x, c.y);
            vec![lng, lat]
        })
        .collect();
    json!({
        "type": "Feature",
        "properties": properties,
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        }
    })
}

/// Build a GeoJSON FeatureCollection of Voronoi cells for the given sites JSON.
pub fn spatial_voronoi_from_sites_json(sites_json: &str) -> Result<String, String> {
    let sites: Vec<SiteIn> =
        serde_json::from_str(sites_json).map_err(|e| format!("sites: {e}"))?;
    let feature_collection = spatial_voronoi_feature_collection(&sites)?;
    serde_json::to_string(&feature_collection).map_err(|e| e.to_string())
}

fn spatial_voronoi_feature_collection(sites: &[SiteIn]) -> Result<Value, String> {
    if sites.is_empty() {
        return Ok(json!({
            "type": "FeatureCollection",
            "features": [],
        }));
    }

    let working = dedupe_sites(sites);
    if working.is_empty() {
        return Ok(json!({
            "type": "FeatureCollection",
            "features": [],
        }));
    }

    let mean_lat = working.iter().map(|s| s.lat).sum::<f64>() / working.len() as f64;
    let lng_scale = meters_per_degree_lng(mean_lat);
    let to_planar = |lng: f64, lat: f64| -> (f64, f64) {
        (lng * lng_scale, lat * METERS_PER_DEGREE_LAT)
    };
    let from_planar = |x: f64, y: f64| -> [f64; 2] {
        [x / lng_scale, y / METERS_PER_DEGREE_LAT]
    };

    let points: Vec<(f64, f64)> = working
        .iter()
        .map(|s| to_planar(s.lng, s.lat))
        .collect();
    let xs: Vec<f64> = points.iter().map(|(x, _)| *x).collect();
    let ys: Vec<f64> = points.iter().map(|(_, y)| *y).collect();
    let min_x = xs.iter().copied().fold(f64::INFINITY, f64::min);
    let max_x = xs.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let min_y = ys.iter().copied().fold(f64::INFINITY, f64::min);
    let max_y = ys.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let span_x = max_x - min_x;
    let span_y = max_y - min_y;
    let margin = span_x.max(span_y).max(MIN_EXTENT_MARGIN_METERS) * EXTENT_MARGIN_MULTIPLIER;
    let clip = clip_polygon(min_x - margin, min_y - margin, max_x + margin, max_y + margin);

    let mut planar_points: Vec<Point<f64>> = points
        .iter()
        .map(|(x, y)| Point::new(*x, *y))
        .collect();

    // geo Voronoi needs ≥3 non-collinear sites. Inject phantoms off the line
    // so 1–2 site (and collinear) cases still yield finite cells for real sites.
    ensure_non_collinear_triangulation(&mut planar_points, margin);

    let multi = MultiPoint::from(planar_points);
    let all_cells = multi
        .voronoi_cells_with_params(VoronoiParams::new().clip(VoronoiClip::Polygon(&clip)))
        .map_err(|e| format!("voronoi: {e}"))?;

    if all_cells.len() < working.len() {
        return Err(format!(
            "voronoi: expected at least {} cells, got {}",
            working.len(),
            all_cells.len()
        ));
    }
    let cells = &all_cells[..working.len()];

    let features: Vec<Value> = working
        .iter()
        .zip(cells.iter())
        .map(|(site, cell)| {
            let props = if site.properties.is_null() {
                Value::Object(Map::new())
            } else {
                site.properties.clone()
            };
            polygon_to_geojson(cell, props, &from_planar)
        })
        .collect();

    Ok(json!({
        "type": "FeatureCollection",
        "features": features,
    }))
}

/// Ensure `points` has ≥3 vertices that are not collinear (mutates by appending phantoms).
fn ensure_non_collinear_triangulation(points: &mut Vec<Point<f64>>, margin: f64) {
    if points.is_empty() {
        return;
    }
    let origin = points[0];
    let second = if points.len() > 1 {
        points[1]
    } else {
        Point::new(origin.x() + margin * 0.01, origin.y())
    };
    let dx = second.x() - origin.x();
    let dy = second.y() - origin.y();
    let len = (dx * dx + dy * dy).sqrt().max(1.0);
    let nx = -dy / len * margin * 0.25;
    let ny = dx / len * margin * 0.25;
    let mx = (origin.x() + second.x()) * 0.5;
    let my = (origin.y() + second.y()) * 0.5;

    let mut k = 1.0;
    while points.len() < 3 {
        points.push(Point::new(mx + nx * k, my + ny * k));
        k += 1.0;
    }

    // If still collinear (all original points on a line), add another off-axis phantom.
    let probe = MultiPoint::from(points.clone());
    if matches!(
        probe.voronoi_cells_with_params(VoronoiParams::new()),
        Err(VoronoiError::CollinearInput)
    ) {
        points.push(Point::new(mx + nx * 2.0 + margin * 0.1, my + ny * 2.0));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use geo::Contains;

    #[test]
    fn empty_sites_empty_fc() {
        let fc = spatial_voronoi_feature_collection(&[]).unwrap();
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
        let fc = spatial_voronoi_feature_collection(&sites).unwrap();
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
        let fc = spatial_voronoi_feature_collection(&sites).unwrap();
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
        let fc = spatial_voronoi_feature_collection(&sites).unwrap();
        let west = &fc["features"].as_array().unwrap()[0];
        let coords = west["geometry"]["coordinates"][0]
            .as_array()
            .unwrap()
            .iter()
            .map(|c| {
                let pair = c.as_array().unwrap();
                Coord {
                    x: pair[0].as_f64().unwrap(),
                    y: pair[1].as_f64().unwrap(),
                }
            })
            .collect::<Vec<_>>();
        let poly = Polygon::new(LineString::from(coords), vec![]);
        // Site itself should lie in its cell (lng/lat as x/y in geo Coord).
        assert!(poly.contains(&Point::new(-0.18, 51.45)));
        // A point slightly toward the neighbor but still west of the midpoint.
        let near = Point::new(-0.165, 51.45);
        assert!(poly.contains(&near));
    }
}
