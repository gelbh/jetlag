//! Tentacle elimination regions (Wave-2). Voronoi cells are supplied by TS (d3-geo-voronoi).

use crate::mask::{
    disk_to_polygon, feature_to_multipolygon, fold_union, multipolygon_to_feature, DiskSpec,
    GameArea,
};
use crate::types::{GameAreaGeometry, PolygonFeature};
use geo::{BooleanOps, MultiPolygon, Polygon};
use serde::Deserialize;
use serde_json::Value;

const POI_CELL_FALLBACK_RADIUS_M: f64 = 25.0;

#[derive(Debug, Clone, Deserialize)]
pub struct TentacleSiteJson {
    pub id: String,
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct FeatureCollectionJson {
    features: Vec<PolygonFeature>,
}

fn build_search_disk(anchor: [f64; 2], radius_meters: f64) -> Polygon<f64> {
    disk_to_polygon(&DiskSpec {
        center: anchor,
        radius_meters,
    })
}

fn site_id_from_properties(properties: &Value, keys: &[&str]) -> Option<String> {
    if let Some(site) = properties.get("site") {
        if let Some(site_props) = site.get("properties").and_then(|p| p.as_object()) {
            for key in keys {
                if let Some(value) = site_props.get(*key).and_then(|v| v.as_str()) {
                    return Some(value.to_string());
                }
            }
        }
    }
    for key in keys {
        if let Some(value) = properties.get(*key).and_then(|v| v.as_str()) {
            return Some(value.to_string());
        }
    }
    None
}

fn site_id_by_coordinates(cell: &PolygonFeature, sites: &[TentacleSiteJson]) -> Option<String> {
    let properties = &cell.properties;
    let site = properties.get("site")?;
    let coords = site
        .get("geometry")
        .and_then(|g| g.get("coordinates"))
        .and_then(|c| c.as_array())?;
    if coords.len() < 2 {
        return None;
    }
    let lng = coords[0].as_f64()?;
    let lat = coords[1].as_f64()?;

    let mut nearest_id: Option<String> = None;
    let mut min_dist_sq = f64::INFINITY;
    let mut runner_up_dist_sq = f64::INFINITY;

    for site in sites {
        let d_lng = site.lng - lng;
        let d_lat = site.lat - lat;
        let dist_sq = d_lng * d_lng + d_lat * d_lat;
        if dist_sq < min_dist_sq {
            runner_up_dist_sq = min_dist_sq;
            min_dist_sq = dist_sq;
            nearest_id = Some(site.id.clone());
        } else if dist_sq < runner_up_dist_sq {
            runner_up_dist_sq = dist_sq;
        }
    }

    if nearest_id.is_none() || !min_dist_sq.is_finite() || runner_up_dist_sq - min_dist_sq < 1e-12 {
        return None;
    }
    nearest_id
}

fn resolve_cell_site_id(cell: &PolygonFeature, sites: &[TentacleSiteJson]) -> Option<String> {
    let keys = ["poiId", "featureId"];
    site_id_from_properties(&cell.properties, &keys)
        .or_else(|| site_id_by_coordinates(cell, sites))
}

fn polygon_cells(features: &[PolygonFeature]) -> Vec<PolygonFeature> {
    features
        .iter()
        .filter(|f| {
            f.geometry
                .get("type")
                .and_then(|t| t.as_str())
                .is_some_and(|t| t == "Polygon" || t == "MultiPolygon")
        })
        .cloned()
        .collect()
}

fn every_site_has_resolvable_cell(
    features: &[PolygonFeature],
    sites: &[TentacleSiteJson],
) -> bool {
    let mut resolved = std::collections::HashSet::new();
    for cell in features {
        if let Some(site_id) = resolve_cell_site_id(cell, sites) {
            resolved.insert(site_id);
        }
    }
    sites.iter().all(|site| resolved.contains(&site.id))
}

fn clip_to_game_area(
    mp: MultiPolygon<f64>,
    game_area: &GameArea,
) -> Option<PolygonFeature> {
    let clipped = game_area.multipolygon.intersection(&mp);
    if clipped.0.is_empty() {
        None
    } else {
        multipolygon_to_feature(&clipped)
    }
}

fn intersect_with_disk(
    feature: &MultiPolygon<f64>,
    disk: &Polygon<f64>,
) -> Option<MultiPolygon<f64>> {
    let disk_mp = MultiPolygon(vec![disk.clone()]);
    let result = feature.intersection(&disk_mp);
    if result.0.is_empty() {
        None
    } else {
        Some(result)
    }
}

fn answered_cell_in_disk(
    cells: &[PolygonFeature],
    answered_site_id: &str,
    sites: &[TentacleSiteJson],
    disk: &Polygon<f64>,
) -> Option<MultiPolygon<f64>> {
    for cell in cells {
        if resolve_cell_site_id(cell, sites).as_deref() == Some(answered_site_id) {
            if let Some(mp) = feature_to_multipolygon(cell) {
                if let Some(clipped) = intersect_with_disk(&mp, disk) {
                    return Some(clipped);
                }
            }
        }
    }

    let answered_site = sites.iter().find(|s| s.id == answered_site_id)?;
    let site_hole = disk_to_polygon(&DiskSpec {
        center: [answered_site.lat, answered_site.lng],
        radius_meters: POI_CELL_FALLBACK_RADIUS_M,
    });
    let site_mp = MultiPolygon(vec![site_hole]);
    intersect_with_disk(&site_mp, disk)
}

fn build_elimination_via_disk_difference(
    anchor: [f64; 2],
    radius_meters: f64,
    cells: &[PolygonFeature],
    answered_site_id: &str,
    sites: &[TentacleSiteJson],
    game_area: &GameArea,
) -> Option<PolygonFeature> {
    let disk = build_search_disk(anchor, radius_meters);
    let answered_in_disk = answered_cell_in_disk(cells, answered_site_id, sites, &disk)?;
    let disk_mp = MultiPolygon(vec![disk]);
    let eliminated = disk_mp.difference(&answered_in_disk);
    if eliminated.0.is_empty() {
        return None;
    }
    clip_to_game_area(eliminated, game_area)
}

fn build_elimination_via_wrong_cell_union(
    anchor: [f64; 2],
    radius_meters: f64,
    cells: &[PolygonFeature],
    answered_site_id: &str,
    sites: &[TentacleSiteJson],
    game_area: &GameArea,
) -> Option<PolygonFeature> {
    let wrong_mps: Vec<MultiPolygon<f64>> = cells
        .iter()
        .filter(|cell| {
            resolve_cell_site_id(cell, sites)
                .is_some_and(|id| id != answered_site_id)
        })
        .filter_map(feature_to_multipolygon)
        .collect();

    if wrong_mps.is_empty() {
        return None;
    }

    let merged = if wrong_mps.len() == 1 {
        wrong_mps.into_iter().next()
    } else {
        fold_union(wrong_mps)
    }?;

    let disk = build_search_disk(anchor, radius_meters);
    let in_disk = intersect_with_disk(&merged, &disk)?;
    clip_to_game_area(in_disk, game_area)
}

/// Build tentacle elimination region within the search disk (TS kernel parity).
pub fn build_tentacle_elimination_region(
    anchor: [f64; 2],
    radius_meters: f64,
    sites: &[TentacleSiteJson],
    answered_site_id: &str,
    game_area: &GameArea,
    voronoi_cells: &[PolygonFeature],
) -> Option<PolygonFeature> {
    if sites.len() < 2 {
        return None;
    }
    if !sites.iter().any(|s| s.id == answered_site_id) {
        return None;
    }

    let polygon_cells = polygon_cells(voronoi_cells);
    let all_cells_resolvable = every_site_has_resolvable_cell(voronoi_cells, sites);
    let use_wrong_cell_union = sites.len() == 2 && all_cells_resolvable;

    if use_wrong_cell_union {
        if let Some(region) = build_elimination_via_wrong_cell_union(
            anchor,
            radius_meters,
            &polygon_cells,
            answered_site_id,
            sites,
            game_area,
        ) {
            return Some(region);
        }
    }

    build_elimination_via_disk_difference(
        anchor,
        radius_meters,
        &polygon_cells,
        answered_site_id,
        sites,
        game_area,
    )
}

fn build_tentacle_exterior_elimination(
    anchor: [f64; 2],
    radius_meters: f64,
    game_area: &GameArea,
) -> Option<PolygonFeature> {
    let disk = build_search_disk(anchor, radius_meters);
    let disk_mp = MultiPolygon(vec![disk]);
    let exterior = game_area.multipolygon.difference(&disk_mp);
    if exterior.0.is_empty() {
        return None;
    }
    clip_to_game_area(exterior, game_area)
}

fn merge_features(
    left: Option<PolygonFeature>,
    right: Option<PolygonFeature>,
    game_area: &GameArea,
) -> Option<PolygonFeature> {
    match (left, right) {
        (None, None) => None,
        (Some(l), None) => Some(l),
        (None, Some(r)) => Some(r),
        (Some(l), Some(r)) => {
            let l_mp = feature_to_multipolygon(&l)?;
            let r_mp = feature_to_multipolygon(&r)?;
            let merged = l_mp.union(&r_mp);
            if merged.0.is_empty() {
                return Some(l);
            }
            clip_to_game_area(merged, game_area).or(Some(l))
        }
    }
}

/// POI-answer tentacle elimination: exterior + inner Voronoi shading.
pub fn build_tentacle_poi_answer_elimination_region(
    anchor: [f64; 2],
    radius_meters: f64,
    sites: &[TentacleSiteJson],
    answered_site_id: &str,
    game_area: &GameArea,
    voronoi_cells: &[PolygonFeature],
) -> Option<PolygonFeature> {
    if !sites.iter().any(|s| s.id == answered_site_id) {
        return None;
    }

    let exterior = build_tentacle_exterior_elimination(anchor, radius_meters, game_area);

    if sites.len() < 2 {
        return exterior;
    }

    let inner = build_tentacle_elimination_region(
        anchor,
        radius_meters,
        sites,
        answered_site_id,
        game_area,
        voronoi_cells,
    );

    merge_features(exterior, inner, game_area)
}

pub fn parse_sites(sites_json: &str) -> Result<Vec<TentacleSiteJson>, String> {
    serde_json::from_str(sites_json).map_err(|e| format!("sites: {e}"))
}

pub fn parse_voronoi_cells(cells_json: &str) -> Result<Vec<PolygonFeature>, String> {
    let parsed: FeatureCollectionJson =
        serde_json::from_str(cells_json).map_err(|e| format!("voronoiCells: {e}"))?;
    Ok(parsed.features)
}

pub fn parse_anchor(anchor_json: &str) -> Result<[f64; 2], String> {
    let parsed: [f64; 2] =
        serde_json::from_str(anchor_json).map_err(|e| format!("anchor: {e}"))?;
    Ok(parsed)
}

pub fn game_area_from_json(game_area_json: &str) -> Result<GameArea, String> {
    let geometry: GameAreaGeometry =
        serde_json::from_str(game_area_json).map_err(|e| format!("gameArea: {e}"))?;
    GameArea::from_geometry(&geometry).ok_or_else(|| "invalid game area geometry".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn london_game_area() -> GameArea {
        GameArea::polygon_box(-0.2, 51.4, -0.1, 51.5)
    }

    #[test]
    fn fewer_than_two_sites_returns_none() {
        let area = london_game_area();
        let sites = vec![TentacleSiteJson {
            id: "west".to_string(),
            lat: 51.45,
            lng: -0.18,
        }];
        assert!(build_tentacle_elimination_region(
            [51.45, -0.15],
            1609.344,
            &sites,
            "west",
            &area,
            &[],
        )
        .is_none());
    }
}
