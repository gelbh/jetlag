#!/usr/bin/env python3
"""Export swissBOUNDARIES3D cantons + municipalities to WGS84 GeoJSON.

CRS: EPSG:2056 (CH1903+ / LV95) -> EPSG:4326 via pyproj/PROJ.
Do not use approximate lv95_to_wgs84 formulas.

Deps (maintainer venv): pyshp, pyproj
  python3 -m venv .tmp-swiss-venv && .tmp-swiss-venv/bin/pip install pyshp pyproj

Example:
  .tmp-swiss-venv/bin/python scripts/export-switzerland-boundaries.py \\
    --source-dir /path/to/extracted-shp \\
    --out-dir public/geo/switzerland
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

try:
    import shapefile
    from pyproj import Transformer
except ImportError as exc:  # pragma: no cover
    print("Missing deps. Install: pip install pyshp pyproj", file=sys.stderr)
    raise SystemExit(1) from exc

SIMPLIFY_TOL_DEG = 0.0014  # ~150 m; country-scale pack size band

CANTON_BY_NUM = {
    1: ("zurich", "Zürich"),
    2: ("bern", "Bern"),
    3: ("lucerne", "Lucerne"),
    4: ("uri", "Uri"),
    5: ("schwyz", "Schwyz"),
    6: ("obwalden", "Obwalden"),
    7: ("nidwalden", "Nidwalden"),
    8: ("glarus", "Glarus"),
    9: ("zug", "Zug"),
    10: ("fribourg", "Fribourg"),
    11: ("solothurn", "Solothurn"),
    12: ("basel-stadt", "Basel-Stadt"),
    13: ("basel-landschaft", "Basel-Landschaft"),
    14: ("schaffhausen", "Schaffhausen"),
    15: ("appenzell-ausserrhoden", "Appenzell Ausserrhoden"),
    16: ("appenzell-innerrhoden", "Appenzell Innerrhoden"),
    17: ("st-gallen", "St. Gallen"),
    18: ("graubunden", "Graubünden"),
    19: ("aargau", "Aargau"),
    20: ("thurgau", "Thurgau"),
    21: ("ticino", "Ticino"),
    22: ("vaud", "Vaud"),
    23: ("valais", "Valais"),
    24: ("neuchatel", "Neuchâtel"),
    25: ("geneva", "Geneva"),
    26: ("jura", "Jura"),
}

# Gameplay control points (lon, lat) -> expected cantonId
CITY_CONTROLS = (
    ("zurich", 8.5402, 47.3782),
    ("bern", 7.4474, 46.9480),
    ("geneva", 6.1432, 46.2044),
    ("ticino", 8.9511, 46.0037),
)

TRANSFORMER = Transformer.from_crs("EPSG:2056", "EPSG:4326", always_xy=True)


def lv95_to_wgs84(easting: float, northing: float) -> tuple[float, float]:
    """Proper CRS transform (PROJ). Not the swisstopo approximate formulas."""
    lon, lat = TRANSFORMER.transform(easting, northing)
    return float(lon), float(lat)


def assert_crs_controls() -> None:
    """Fail fast if PROJ path is broken (round-trip + finite origin)."""
    inverse = Transformer.from_crs("EPSG:4326", "EPSG:2056", always_xy=True)
    for canton_id, lon, lat in CITY_CONTROLS:
        e, n = inverse.transform(lon, lat)
        lon2, lat2 = lv95_to_wgs84(e, n)
        dist_m = haversine_m(lon, lat, lon2, lat2)
        if dist_m > 1.0:
            raise RuntimeError(
                f"CRS round-trip failed for {canton_id}: {dist_m:.2f} m (limit 1 m)"
            )
    olon, olat = lv95_to_wgs84(2_600_000.0, 1_200_000.0)
    if not (math.isfinite(olon) and math.isfinite(olat)):
        raise RuntimeError("LV95 origin transform produced non-finite coords")
    if not (5.9 < olon < 10.6 and 45.7 < olat < 47.9):
        raise RuntimeError(f"LV95 origin outside CH bbox: {olon}, {olat}")


def haversine_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    radius = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlamb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlamb / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def slugify(name: str) -> str:
    text = name.strip().lower()
    replacements = {
        "ä": "ae",
        "ö": "oe",
        "ü": "ue",
        "ß": "ss",
        "à": "a",
        "á": "a",
        "â": "a",
        "ã": "a",
        "å": "a",
        "è": "e",
        "é": "e",
        "ê": "e",
        "ë": "e",
        "ì": "i",
        "í": "i",
        "î": "i",
        "ï": "i",
        "ò": "o",
        "ó": "o",
        "ô": "o",
        "õ": "o",
        "ù": "u",
        "ú": "u",
        "û": "u",
        "ç": "c",
        "ñ": "n",
        "'": "",
        "’": "",
        ".": "",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def perpendicular_distance(point, start, end) -> float:
    if start == end:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    x, y = point
    x1, y1 = start
    x2, y2 = end
    num = abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1)
    den = math.hypot(y2 - y1, x2 - x1)
    return num / den if den else 0.0


def douglas_peucker(points: list[list[float]], tolerance: float) -> list[list[float]]:
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    max_dist = -1.0
    index = 0
    for i in range(1, len(points) - 1):
        dist = perpendicular_distance(points[i], start, end)
        if dist > max_dist:
            index = i
            max_dist = dist
    if max_dist > tolerance:
        left = douglas_peucker(points[: index + 1], tolerance)
        right = douglas_peucker(points[index:], tolerance)
        return left[:-1] + right
    return [start, end]


def simplify_ring(ring: list[list[float]], tolerance: float) -> list[list[float]]:
    if len(ring) < 4:
        return ring
    closed = ring[0] == ring[-1]
    body = ring[:-1] if closed else ring
    simplified = douglas_peucker(body, tolerance)
    if len(simplified) < 3:
        return ring
    if closed and simplified[0] != simplified[-1]:
        simplified = simplified + [simplified[0]]
    return simplified


def convert_coords(points) -> list[list[float]]:
    out = []
    for pt in points:
        lon, lat = lv95_to_wgs84(float(pt[0]), float(pt[1]))
        out.append([round(lon, 5), round(lat, 5)])
    return out


def shape_to_geojson_geometry(shape, tolerance: float):
    points = convert_coords(shape.points)
    parts = list(shape.parts) + [len(points)]
    rings = []
    for i in range(len(parts) - 1):
        ring = points[parts[i] : parts[i + 1]]
        ring = simplify_ring(ring, tolerance)
        if len(ring) >= 4:
            rings.append(ring)
    if not rings:
        return None
    polygons: list[list[list[list[float]]]] = []
    current: list[list[list[float]]] | None = None
    for ring in rings:
        area = 0.0
        for i in range(len(ring) - 1):
            area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
        clockwise = area < 0
        if current is None:
            current = [ring]
            polygons.append(current)
            continue
        outer = current[0]
        o_lons = [p[0] for p in outer]
        o_lats = [p[1] for p in outer]
        r_lons = [p[0] for p in ring]
        r_lats = [p[1] for p in ring]
        contained = (
            min(r_lons) >= min(o_lons)
            and max(r_lons) <= max(o_lons)
            and min(r_lats) >= min(o_lats)
            and max(r_lats) <= max(o_lats)
            and abs(area)
            < abs(
                sum(
                    outer[i][0] * outer[i + 1][1] - outer[i + 1][0] * outer[i][1]
                    for i in range(len(outer) - 1)
                )
            )
        )
        outer_clockwise = (
            sum(
                outer[i][0] * outer[i + 1][1] - outer[i + 1][0] * outer[i][1]
                for i in range(len(outer) - 1)
            )
            < 0
        )
        if contained and (clockwise != outer_clockwise):
            current.append(ring)
        else:
            current = [ring]
            polygons.append(current)
    if len(polygons) == 1:
        return {"type": "Polygon", "coordinates": polygons[0]}
    return {"type": "MultiPolygon", "coordinates": polygons}


def point_in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        denom = yj - yi
        if ((yi > lat) != (yj > lat)) and (
            lon < (xj - xi) * (lat - yi) / (denom if denom != 0 else 1e-30) + xi
        ):
            inside = not inside
        j = i
    return inside


def point_in_geom(lon: float, lat: float, geom) -> bool:
    coords = geom["coordinates"]
    polys = [coords] if geom["type"] == "Polygon" else coords
    for poly in polys:
        if not poly or not point_in_ring(lon, lat, poly[0]):
            continue
        if any(point_in_ring(lon, lat, hole) for hole in poly[1:]):
            continue
        return True
    return False


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf8",
    )


def ensure_source(source_dir: Path, zip_path: Path | None) -> Path:
    needed = [
        "swissBOUNDARIES3D_1_5_TLM_KANTONSGEBIET.shp",
        "swissBOUNDARIES3D_1_5_TLM_HOHEITSGEBIET.shp",
    ]
    if all((source_dir / name).exists() for name in needed):
        return source_dir
    if zip_path is None or not zip_path.exists():
        raise FileNotFoundError(
            f"Missing SHP in {source_dir} and no usable --zip {zip_path}"
        )
    source_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if "KANTONSGEBIET" in name or "HOHEITSGEBIET" in name:
                zf.extract(name, source_dir)
    # Flatten if zip nested
    for name in needed:
        if (source_dir / name).exists():
            continue
        matches = list(source_dir.rglob(name))
        if not matches:
            raise FileNotFoundError(f"Could not extract {name} from {zip_path}")
        for sibling in matches[0].parent.glob("swissBOUNDARIES3D_1_5_TLM_*"):
            target = source_dir / sibling.name
            if not target.exists():
                sibling.replace(target)
    return source_dir


def export_boundaries(source_dir: Path, out_dir: Path) -> dict:
    assert_crs_controls()

    canton_reader = shapefile.Reader(str(source_dir / "swissBOUNDARIES3D_1_5_TLM_KANTONSGEBIET"))
    field_names = [f[0] for f in canton_reader.fields[1:]]
    canton_features = []
    for shape_rec in canton_reader.iterShapeRecords():
        rec = dict(zip(field_names, shape_rec.record))
        if rec.get("ICC") != "CH":
            continue
        num = int(rec["KANTONSNUM"])
        canton_id, display = CANTON_BY_NUM[num]
        geom = shape_to_geojson_geometry(shape_rec.shape, SIMPLIFY_TOL_DEG)
        if geom is None:
            raise RuntimeError(f"empty geometry for canton {canton_id}")
        canton_features.append(
            {
                "type": "Feature",
                "properties": {"name": display, "cantonId": canton_id},
                "geometry": geom,
            }
        )
    if len(canton_features) != 26:
        raise RuntimeError(f"expected 26 cantons, got {len(canton_features)}")
    canton_features.sort(key=lambda f: f["properties"]["cantonId"])

    for expected_id, lon, lat in CITY_CONTROLS:
        hits = [
            f["properties"]["cantonId"]
            for f in canton_features
            if point_in_geom(lon, lat, f["geometry"])
        ]
        if hits != [expected_id]:
            raise RuntimeError(f"city PIP failed for {expected_id}: hits={hits}")

    muni_reader = shapefile.Reader(str(source_dir / "swissBOUNDARIES3D_1_5_TLM_HOHEITSGEBIET"))
    muni_fields = [f[0] for f in muni_reader.fields[1:]]
    by_canton: dict[str, list] = defaultdict(list)
    all_muni = []
    for shape_rec in muni_reader.iterShapeRecords():
        rec = dict(zip(muni_fields, shape_rec.record))
        if rec.get("OBJEKTART") != "Gemeindegebiet":
            continue
        if rec.get("ICC") != "CH":
            continue
        if rec.get("KANTONSNUM") is None:
            continue
        num = int(rec["KANTONSNUM"])
        if num not in CANTON_BY_NUM:
            continue
        canton_id, _ = CANTON_BY_NUM[num]
        name = str(rec["NAME"]).strip()
        bfs = int(rec["BFS_NUMMER"])
        base_slug = slugify(name) or f"municipality-{bfs}"
        geom = shape_to_geojson_geometry(shape_rec.shape, SIMPLIFY_TOL_DEG)
        if geom is None:
            continue
        feature = {
            "type": "Feature",
            "properties": {
                "name": name,
                "cantonId": canton_id,
                "municipalityId": f"{base_slug}-{bfs}",
            },
            "geometry": geom,
        }
        by_canton[canton_id].append(feature)
        all_muni.append(feature)

    missing = [cid for cid, _ in CANTON_BY_NUM.values() if not by_canton[cid]]
    if missing:
        raise RuntimeError(f"missing municipality slices: {missing}")

    all_muni.sort(key=lambda f: (f["properties"]["cantonId"], f["properties"]["municipalityId"]))
    write_json(out_dir / "cantons.geojson", {"type": "FeatureCollection", "features": canton_features})
    write_json(
        out_dir / "municipalities.geojson",
        {"type": "FeatureCollection", "features": all_muni},
    )
    for canton_id, features in by_canton.items():
        features.sort(key=lambda f: f["properties"]["municipalityId"])
        write_json(
            out_dir / "municipalities" / f"{canton_id}.geojson",
            {"type": "FeatureCollection", "features": features},
        )

    attribution = (
        "Swiss boundaries: swissBOUNDARIES3D © swisstopo\n"
        "Dataset year: 2026 (swissboundaries3d_2026-01 edition)\n"
        "CRS: source EPSG:2056 (CH1903+ / LV95) reprojected to EPSG:4326 via PROJ/pyproj\n"
        "Terms: see https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d\n"
    )
    (out_dir / "ATTRIBUTION.txt").write_text(attribution, encoding="utf8")

    summary = {
        "cantons": len(canton_features),
        "municipalities": len(all_muni),
        "per_canton": {cid: len(by_canton[cid]) for cid, _ in CANTON_BY_NUM.values()},
        "crs": "EPSG:2056->EPSG:4326 via pyproj",
        "city_pip": "ok",
    }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=Path(".tmp-swissboundaries"),
        help="Directory with extracted swissBOUNDARIES3D SHP files",
    )
    parser.add_argument(
        "--zip",
        type=Path,
        default=Path(".tmp-swissboundaries3d_2026-01_shp.zip"),
        help="Optional zip to extract when SHP files are missing",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("public/geo/switzerland"),
        help="Output pack geo directory (writes boundaries + ATTRIBUTION only)",
    )
    args = parser.parse_args()
    source = ensure_source(args.source_dir, args.zip)
    summary = export_boundaries(source, args.out_dir)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
