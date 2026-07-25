//! Elimination-mask geometry kernel (Rust / WASM pilot).

pub mod mask;
pub mod types;

pub use mask::{
    build_end_game_mask_from_disks, build_mask_from_union_input, feature_contains_lng_lat,
    DiskSpec, GameArea, UnionInput,
};
pub use types::{GameAreaGeometry, PolygonFeature};

use mask::{build_end_game_mask_from_disks as build_end_game_native, build_mask_from_union_input as build_mask_native};
use types::{DiskSpecJson, EliminationUnionInputJson};
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
