//! Geometry kernel (Rust / WASM) — mask + half-plane + geodesic + voronoi.

pub mod geodesic;
pub mod geodesic_buffer;
pub mod half_plane;
pub mod mask;
pub mod tentacle;
pub mod types;
pub mod voronoi;

pub use geodesic_buffer::geodesic_line_buffer;
pub use half_plane::{
    build_half_plane_polygon, build_radar_shaded_region, DivisionAnchor, ShadedSide,
};
pub use mask::{
    build_end_game_mask_from_disks, build_mask_from_union_input, feature_contains_lng_lat,
    DiskSpec, GameArea, UnionInput,
};
pub use types::{GameAreaGeometry, PolygonFeature};

use geodesic_buffer::geodesic_line_buffer as geodesic_line_buffer_native;
use half_plane::{
    build_half_plane_polygon as build_half_plane_native,
    build_radar_shaded_region as build_radar_shaded_native,
};
use mask::{
    build_end_game_mask_from_disks as build_end_game_native,
    build_mask_from_union_input as build_mask_native,
};
use tentacle::{
    build_tentacle_elimination_region as build_tentacle_elimination_native,
    build_tentacle_poi_answer_elimination_region as build_tentacle_poi_answer_native,
    game_area_from_json, parse_anchor, parse_sites, parse_voronoi_cells,
};
use types::{DiskSpecJson, EliminationUnionInputJson};
use voronoi::spatial_voronoi_from_sites_json as spatial_voronoi_native;
use wasm_bindgen::prelude::*;

fn js_err(msg: impl Into<String>) -> JsValue {
    JsValue::from_str(&msg.into())
}

fn feature_to_js(feature: Option<PolygonFeature>) -> Result<JsValue, JsValue> {
    match feature {
        None => Ok(JsValue::UNDEFINED),
        Some(feature) => {
            let json = serde_json::to_string(&feature).map_err(|e| js_err(e.to_string()))?;
            Ok(JsValue::from_str(&json))
        }
    }
}

fn parse_union_input(input_json: &str) -> Result<UnionInput, JsValue> {
    let parsed: EliminationUnionInputJson =
        serde_json::from_str(input_json).map_err(|e| js_err(format!("input: {e}")))?;
    Ok(UnionInput {
        polygons: parsed.polygons,
        disks: parsed
            .disks
            .into_iter()
            .map(|d: DiskSpecJson| DiskSpec {
                center: d.center,
                radius_meters: d.radius_meters,
            })
            .collect(),
    })
}

fn parse_game_area(game_area_json: &str) -> Result<GameArea, JsValue> {
    let geometry: GameAreaGeometry =
        serde_json::from_str(game_area_json).map_err(|e| js_err(format!("gameArea: {e}")))?;
    GameArea::from_geometry(&geometry).ok_or_else(|| js_err("invalid game area geometry"))
}

fn parse_disks(disks_json: &str) -> Result<Vec<DiskSpec>, JsValue> {
    let parsed: Vec<DiskSpecJson> =
        serde_json::from_str(disks_json).map_err(|e| js_err(format!("disks: {e}")))?;
    Ok(parsed
        .into_iter()
        .map(|d| DiskSpec {
            center: d.center,
            radius_meters: d.radius_meters,
        })
        .collect())
}

/// WASM export: JSON in / JSON string or `undefined` out.
#[wasm_bindgen]
pub fn build_mask_from_union_input_json(
    input_json: &str,
    game_area_json: &str,
) -> Result<JsValue, JsValue> {
    let input = parse_union_input(input_json)?;
    let game_area = parse_game_area(game_area_json)?;
    feature_to_js(build_mask_native(&input, &game_area))
}

/// WASM export: JSON in / JSON string or `undefined` out.
#[wasm_bindgen]
pub fn build_end_game_mask_from_disks_json(
    game_area_json: &str,
    disks_json: &str,
) -> Result<JsValue, JsValue> {
    let game_area = parse_game_area(game_area_json)?;
    let disks = parse_disks(disks_json)?;
    feature_to_js(build_end_game_native(&game_area, &disks))
}

fn parse_lat_lng(point_json: &str, label: &str) -> Result<(f64, f64), JsValue> {
    let parsed: [f64; 2] =
        serde_json::from_str(point_json).map_err(|e| js_err(format!("{label}: {e}")))?;
    Ok((parsed[0], parsed[1]))
}

fn parse_shaded_side(value: &str) -> Result<ShadedSide, JsValue> {
    match value {
        "hot" => Ok(ShadedSide::Hot),
        "cold" => Ok(ShadedSide::Cold),
        _ => Err(js_err(format!("shadedSide: unknown value {value}"))),
    }
}

fn parse_division_anchor(value: &str) -> Result<DivisionAnchor, JsValue> {
    match value {
        "midpoint" => Ok(DivisionAnchor::Midpoint),
        "start" => Ok(DivisionAnchor::Start),
        _ => Err(js_err(format!("divisionAnchor: unknown value {value}"))),
    }
}

/// WASM export: thermometer half-plane. Points are `[lat, lng]` JSON arrays.
#[wasm_bindgen]
pub fn build_half_plane_polygon_json(
    point_a_json: &str,
    point_b_json: &str,
    game_area_json: &str,
    shaded_side: &str,
    division_anchor: &str,
) -> Result<JsValue, JsValue> {
    let point_a = parse_lat_lng(point_a_json, "pointA")?;
    let point_b = parse_lat_lng(point_b_json, "pointB")?;
    let game_area = parse_game_area(game_area_json)?;
    let shaded = parse_shaded_side(shaded_side)?;
    let anchor = parse_division_anchor(division_anchor)?;
    feature_to_js(build_half_plane_native(
        point_a, point_b, &game_area, shaded, anchor,
    ))
}

/// WASM export: radar shaded disk / outside. Center is `[lat, lng]` JSON.
#[wasm_bindgen]
pub fn build_radar_shaded_region_json(
    center_json: &str,
    radius_meters: f64,
    game_area_json: &str,
    shaded_inside: bool,
) -> Result<JsValue, JsValue> {
    let center = parse_lat_lng(center_json, "center")?;
    let game_area = parse_game_area(game_area_json)?;
    feature_to_js(build_radar_shaded_native(
        center,
        radius_meters,
        &game_area,
        shaded_inside,
    ))
}

/// WASM export: geodesic line buffer. `coordinates_json` is `[[lng,lat],...]`.
/// Pass `sample_spacing_meters` as `undefined`/null for the default spacing.
#[wasm_bindgen]
pub fn geodesic_line_buffer_json(
    coordinates_json: &str,
    distance_meters: f64,
    sample_spacing_meters: Option<f64>,
) -> Result<JsValue, JsValue> {
    let coordinates: Vec<[f64; 2]> = serde_json::from_str(coordinates_json)
        .map_err(|e| js_err(format!("coordinates: {e}")))?;
    feature_to_js(geodesic_line_buffer_native(
        &coordinates,
        distance_meters,
        sample_spacing_meters,
    ))
}

/// WASM export: spatial Voronoi cells for sites `[{lng,lat,properties},…]`.
#[wasm_bindgen]
pub fn build_spatial_voronoi_json(sites_json: &str) -> Result<JsValue, JsValue> {
    let json = spatial_voronoi_native(sites_json).map_err(js_err)?;
    Ok(JsValue::from_str(&json))
}

/// WASM export: tentacle elimination within search disk. Anchor is `[lat,lng]` JSON.
#[wasm_bindgen]
pub fn build_tentacle_elimination_region_json(
    anchor_json: &str,
    radius_meters: f64,
    sites_json: &str,
    answered_site_id: &str,
    game_area_json: &str,
    voronoi_cells_json: &str,
) -> Result<JsValue, JsValue> {
    let anchor = parse_anchor(anchor_json).map_err(js_err)?;
    let sites = parse_sites(sites_json).map_err(js_err)?;
    let game_area = game_area_from_json(game_area_json).map_err(js_err)?;
    let cells = parse_voronoi_cells(voronoi_cells_json).map_err(js_err)?;
    feature_to_js(build_tentacle_elimination_native(
        anchor,
        radius_meters,
        &sites,
        answered_site_id,
        &game_area,
        &cells,
    ))
}

/// WASM export: POI-answer tentacle elimination (exterior + inner shading).
#[wasm_bindgen]
pub fn build_tentacle_poi_answer_elimination_region_json(
    anchor_json: &str,
    radius_meters: f64,
    sites_json: &str,
    answered_site_id: &str,
    game_area_json: &str,
    voronoi_cells_json: &str,
) -> Result<JsValue, JsValue> {
    let anchor = parse_anchor(anchor_json).map_err(js_err)?;
    let sites = parse_sites(sites_json).map_err(js_err)?;
    let game_area = game_area_from_json(game_area_json).map_err(js_err)?;
    let cells = parse_voronoi_cells(voronoi_cells_json).map_err(js_err)?;
    feature_to_js(build_tentacle_poi_answer_native(
        anchor,
        radius_meters,
        &sites,
        answered_site_id,
        &game_area,
        &cells,
    ))
}
