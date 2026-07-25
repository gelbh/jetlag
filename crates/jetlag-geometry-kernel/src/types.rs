//! Serde mirrors of the TypeScript kernel JSON shapes.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// GeoJSON Feature with Polygon or MultiPolygon geometry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolygonFeature {
    #[serde(rename = "type")]
    pub feature_type: String,
    #[serde(default)]
    pub properties: Value,
    pub geometry: Value,
}

/// Plain play-area polygon / multipolygon geometry (no Feature wrapper).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GameAreaGeometry {
    Polygon { coordinates: Vec<Vec<Vec<f64>>> },
    MultiPolygon {
        coordinates: Vec<Vec<Vec<Vec<f64>>>>,
    },
}

/// Disk center is `[lat, lng]` (matches TS `LatLngTuple`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskSpecJson {
    pub center: [f64; 2],
    #[serde(rename = "radiusMeters")]
    pub radius_meters: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EliminationUnionInputJson {
    pub polygons: Vec<PolygonFeature>,
    pub disks: Vec<DiskSpecJson>,
}
