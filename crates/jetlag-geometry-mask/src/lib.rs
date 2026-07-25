//! Elimination-mask geometry kernel (Rust / WASM pilot).

pub mod mask;
pub mod types;

pub use mask::{
    build_end_game_mask_from_disks, build_mask_from_union_input, feature_contains_lng_lat,
    DiskSpec, GameArea, UnionInput,
};
pub use types::{GameAreaGeometry, PolygonFeature};
