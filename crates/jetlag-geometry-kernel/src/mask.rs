//! Union / clip / end-game mask operations.

use crate::types::{GameAreaGeometry, PolygonFeature};
use geo::{BooleanOps, Contains, Coord, LineString, MultiPolygon, Point, Polygon};
use serde_json::{json, Value};

/// Steps for geodesic disk approximation (matches Turf `steps: 64`).
const DISK_STEPS: usize = 64;
/// WGS84 mean Earth radius in meters (Turf / geographiclib-ish).
const EARTH_RADIUS_M: f64 = 6_371_008.8;

/// Disk center is `[lat, lng]` (matches TS `LatLngTuple`).
#[derive(Debug, Clone)]
pub struct DiskSpec {
    pub center: [f64; 2],
    pub radius_meters: f64,
}

#[derive(Debug, Clone)]
pub struct UnionInput {
    pub polygons: Vec<PolygonFeature>,
    pub disks: Vec<DiskSpec>,
}

/// Play area as MultiPolygon in lon/lat.
#[derive(Debug, Clone)]
pub struct GameArea {
    pub multipolygon: MultiPolygon<f64>,
}

impl GameArea {
    /// Axis-aligned box: west, south, east, north (lon/lat degrees).
    pub fn polygon_box(west: f64, south: f64, east: f64, north: f64) -> Self {
        let exterior = LineString(vec![
            Coord { x: west, y: south },
            Coord { x: east, y: south },
            Coord { x: east, y: north },
            Coord { x: west, y: north },
            Coord { x: west, y: south },
        ]);
        Self {
            multipolygon: MultiPolygon(vec![Polygon::new(exterior, vec![])]),
        }
    }

    pub fn from_geometry(geometry: &GameAreaGeometry) -> Option<Self> {
        let multipolygon = game_area_to_multipolygon(geometry)?;
        Some(Self { multipolygon })
    }

    pub fn to_feature(&self) -> Option<PolygonFeature> {
        multipolygon_to_feature(&self.multipolygon)
    }
}

/// Unions input polygons/disks and clips to the game area.
pub fn build_mask_from_union_input(
    input: &UnionInput,
    game_area: &GameArea,
) -> Option<PolygonFeature> {
    let unioned = union_elimination_parts(input)?;
    let clipped = game_area.multipolygon.intersection(&unioned);
    if clipped.0.is_empty() {
        return None;
    }
    multipolygon_to_feature(&clipped)
}

/// End-game mask: game area minus union of disks (or full area if no disks).
pub fn build_end_game_mask_from_disks(
    game_area: &GameArea,
    disks: &[DiskSpec],
) -> Option<PolygonFeature> {
    if disks.is_empty() {
        return game_area.to_feature();
    }

    let revealed = union_disk_specs(disks)?;
    let eliminated = game_area.multipolygon.difference(&revealed);
    if eliminated.0.is_empty() {
        // revealedZones fully covers the game area
        return None;
    }
    multipolygon_to_feature(&eliminated)
}

/// Point-in-mask helper for native parity tests (`[lng, lat]`).
pub fn feature_contains_lng_lat(feature: &PolygonFeature, lng: f64, lat: f64) -> bool {
    match feature_to_multipolygon(feature) {
        Some(mp) => mp.contains(&Point::new(lng, lat)),
        None => false,
    }
}

fn union_elimination_parts(input: &UnionInput) -> Option<MultiPolygon<f64>> {
    let poly_result = union_polygon_features(&input.polygons);
    let disk_result = union_disk_specs(&input.disks);
    merge_multipolygons(disk_result, poly_result)
}

fn union_polygon_features(features: &[PolygonFeature]) -> Option<MultiPolygon<f64>> {
    let mut parts: Vec<MultiPolygon<f64>> = Vec::new();
    for feature in features {
        if let Some(mp) = feature_to_multipolygon(feature) {
            if !mp.0.is_empty() {
                parts.push(mp);
            }
        }
    }
    fold_union(parts)
}

fn union_disk_specs(disks: &[DiskSpec]) -> Option<MultiPolygon<f64>> {
    if disks.is_empty() {
        return None;
    }
    let parts: Vec<MultiPolygon<f64>> = disks
        .iter()
        .map(|disk| MultiPolygon(vec![disk_to_polygon(disk)]))
        .collect();
    fold_union(parts)
}

fn fold_union(mut parts: Vec<MultiPolygon<f64>>) -> Option<MultiPolygon<f64>> {
    if parts.is_empty() {
        return None;
    }
    let mut acc = parts.remove(0);
    for next in parts {
        acc = acc.union(&next);
    }
    if acc.0.is_empty() {
        None
    } else {
        Some(acc)
    }
}

fn merge_multipolygons(
    left: Option<MultiPolygon<f64>>,
    right: Option<MultiPolygon<f64>>,
) -> Option<MultiPolygon<f64>> {
    match (left, right) {
        (None, None) => None,
        (Some(l), None) => Some(l),
        (None, Some(r)) => Some(r),
        (Some(l), Some(r)) => {
            let merged = l.union(&r);
            if merged.0.is_empty() {
                Some(l)
            } else {
                Some(merged)
            }
        }
    }
}

/// Geodesic disk polygon (`center` is `[lat, lng]`), 64-step Turf-compatible.
pub(crate) fn disk_to_polygon(disk: &DiskSpec) -> Polygon<f64> {
    let lat = disk.center[0];
    let lng = disk.center[1];
    let mut coords = Vec::with_capacity(DISK_STEPS + 1);
    for i in 0..DISK_STEPS {
        let bearing = (i as f64) * 360.0 / (DISK_STEPS as f64);
        let (dest_lat, dest_lng) = destination_point(lat, lng, disk.radius_meters, bearing);
        coords.push(Coord {
            x: dest_lng,
            y: dest_lat,
        });
    }
    if let Some(first) = coords.first().copied() {
        coords.push(first);
    }
    Polygon::new(LineString(coords), vec![])
}

/// Destination from `(lat, lng)` along geodesic approx (haversine destination).
fn destination_point(lat: f64, lng: f64, distance_m: f64, bearing_deg: f64) -> (f64, f64) {
    let δ = distance_m / EARTH_RADIUS_M;
    let θ = bearing_deg.to_radians();
    let φ1 = lat.to_radians();
    let λ1 = lng.to_radians();

    let sin_φ1 = φ1.sin();
    let cos_φ1 = φ1.cos();
    let sin_δ = δ.sin();
    let cos_δ = δ.cos();

    let sin_φ2 = sin_φ1 * cos_δ + cos_φ1 * sin_δ * θ.cos();
    let φ2 = sin_φ2.asin();
    let y = θ.sin() * sin_δ * cos_φ1;
    let x = cos_δ - sin_φ1 * sin_φ2;
    let λ2 = λ1 + y.atan2(x);

    (φ2.to_degrees(), λ2.to_degrees())
}

fn game_area_to_multipolygon(geometry: &GameAreaGeometry) -> Option<MultiPolygon<f64>> {
    match geometry {
        GameAreaGeometry::Polygon { coordinates } => {
            let poly = rings_to_polygon(coordinates)?;
            Some(MultiPolygon(vec![poly]))
        }
        GameAreaGeometry::MultiPolygon { coordinates } => {
            let mut polys = Vec::new();
            for poly_coords in coordinates {
                if let Some(poly) = rings_to_polygon(poly_coords) {
                    polys.push(poly);
                }
            }
            if polys.is_empty() {
                None
            } else {
                Some(MultiPolygon(polys))
            }
        }
    }
}

fn feature_to_multipolygon(feature: &PolygonFeature) -> Option<MultiPolygon<f64>> {
    let geom_type = feature.geometry.get("type")?.as_str()?;
    match geom_type {
        "Polygon" => {
            let coords = feature.geometry.get("coordinates")?;
            let rings: Vec<Vec<Vec<f64>>> = serde_json::from_value(coords.clone()).ok()?;
            let poly = rings_to_polygon(&rings)?;
            Some(MultiPolygon(vec![poly]))
        }
        "MultiPolygon" => {
            let coords = feature.geometry.get("coordinates")?;
            let polys_coords: Vec<Vec<Vec<Vec<f64>>>> =
                serde_json::from_value(coords.clone()).ok()?;
            let mut polys = Vec::new();
            for poly_coords in polys_coords {
                if let Some(poly) = rings_to_polygon(&poly_coords) {
                    polys.push(poly);
                }
            }
            if polys.is_empty() {
                None
            } else {
                Some(MultiPolygon(polys))
            }
        }
        _ => None,
    }
}

fn rings_to_polygon(rings: &[Vec<Vec<f64>>]) -> Option<Polygon<f64>> {
    if rings.is_empty() {
        return None;
    }
    let exterior = coords_to_linestring(&rings[0])?;
    let interiors: Vec<LineString<f64>> = rings[1..]
        .iter()
        .filter_map(|ring| coords_to_linestring(ring))
        .collect();
    Some(Polygon::new(exterior, interiors))
}

fn coords_to_linestring(ring: &[Vec<f64>]) -> Option<LineString<f64>> {
    if ring.len() < 4 {
        return None;
    }
    let mut coords = Vec::with_capacity(ring.len());
    for pair in ring {
        if pair.len() < 2 {
            return None;
        }
        coords.push(Coord {
            x: pair[0],
            y: pair[1],
        });
    }
    // Ensure closed
    if let (Some(first), Some(last)) = (coords.first().copied(), coords.last().copied()) {
        if first != last {
            coords.push(first);
        }
    }
    Some(LineString(coords))
}

pub(crate) fn multipolygon_to_feature(mp: &MultiPolygon<f64>) -> Option<PolygonFeature> {
    if mp.0.is_empty() {
        return None;
    }
    if mp.0.len() == 1 {
        let poly = &mp.0[0];
        return Some(PolygonFeature {
            feature_type: "Feature".to_string(),
            properties: json!({}),
            geometry: json!({
                "type": "Polygon",
                "coordinates": polygon_to_coords(poly),
            }),
        });
    }
    let coordinates: Vec<Value> = mp
        .0
        .iter()
        .map(|poly| Value::Array(polygon_to_coords(poly)))
        .collect();
    Some(PolygonFeature {
        feature_type: "Feature".to_string(),
        properties: json!({}),
        geometry: json!({
            "type": "MultiPolygon",
            "coordinates": coordinates,
        }),
    })
}

fn polygon_to_coords(poly: &Polygon<f64>) -> Vec<Value> {
    let mut rings = Vec::new();
    rings.push(Value::Array(linestring_to_coords(poly.exterior())));
    for interior in poly.interiors() {
        rings.push(Value::Array(linestring_to_coords(interior)));
    }
    rings
}

fn linestring_to_coords(ls: &LineString<f64>) -> Vec<Value> {
    ls.0
        .iter()
        .map(|c| json!([c.x, c.y]))
        .collect()
}
