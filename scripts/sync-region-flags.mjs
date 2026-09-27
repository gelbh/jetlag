#!/usr/bin/env node
/**
 * Sync Recommended browse flags.
 *
 * - Countries / England / EU: FlagCDN
 * - North America / Asia continents: regional org flags (OAS, ASEAN)
 * - States, provinces, cantons, cities, wards, boroughs: Wikidata P41/P94
 * - Osaka ward flowers from city.osaka.lg.jp 区の花一覧
 * - Local overrides in scripts/flag-overrides/ (e.g. Kansai, Dublin councils)
 * - Skip entities with no distinct image (never inherit a parent flag)
 *
 * Usage: node scripts/sync-region-flags.mjs
 */
import { createWriteStream } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "region-flags");
const overrideDir = path.join(__dirname, "flag-overrides");
const outTs = path.join(
  root,
  "src",
  "domain",
  "regions",
  "bundledPresetFlagAssets.generated.ts",
);

const UA = "JetlagFlagSync/1.0 (https://github.com/gelbh/jetlag; flag sync)";

/** Country / nation-level FlagCDN codes (not Wikidata). */
const FLAGCDN = {
  "continent-europe": { code: "eu", alt: "European Union" },
  "country-ireland": { code: "ie", alt: "Ireland" },
  "country-uk": { code: "gb", alt: "United Kingdom" },
  "region-england": { code: "gb-eng", alt: "England" },
  "country-switzerland": { code: "ch", alt: "Switzerland" },
  "country-usa": { code: "us", alt: "United States" },
  "country-canada": { code: "ca", alt: "Canada" },
  "country-japan": { code: "jp", alt: "Japan" },
};

/**
 * Continental stand-ins from regional orgs (no official continent flags).
 * OAS covers the Americas; ASEAN covers Southeast Asia (best available mark).
 */
const REGION_ORG = {
  "continent-north-america": {
    qid: "Q123759",
    alt: "Organization of American States",
    // Fallback Commons path if SPARQL P41 is missing.
    commonsFile: "Flag of the Organization of American States.svg",
  },
  "continent-asia": {
    qid: "Q7768",
    alt: "ASEAN",
    commonsFile: "ASEAN Flag (1994).svg",
  },
};

/**
 * Local overrides (checked into scripts/flag-overrides/).
 * presentation: "flag" keeps opaque field colours; "cutout" punches near-white to alpha.
 */
const LOCAL_OVERRIDES = {
  "region-kansai": {
    file: "region-kansai.png",
    alt: "Kansai",
    identity: "local:kansai-region",
    presentation: "flag",
  },
  "region-kanto": {
    file: "region-kanto.png",
    alt: "Kantō",
    identity: "local:kanto-region",
    presentation: "flag",
  },
  dcc: {
    file: "dcc.png",
    alt: "Dublin City Council",
    identity: "local:dublin-city-council",
    presentation: "flag",
  },
  fingal: {
    file: "fingal.png",
    alt: "Fingal County Council",
    identity: "local:fingal-county-council",
    presentation: "flag",
  },
  sdcc: {
    file: "sdcc.png",
    alt: "South Dublin County Council",
    identity: "local:south-dublin-county-council",
    presentation: "flag",
  },
  dlr: {
    file: "dlr.png",
    alt: "Dún Laoghaire–Rathdown",
    identity: "local:dun-laoghaire-rathdown",
    presentation: "flag",
  },
  "metro-prince-rupert": {
    file: "metro-prince-rupert.png",
    alt: "Prince Rupert",
    identity: "local:prince-rupert",
    presentation: "flag",
  },
  "metro-portland-maine": {
    file: "metro-portland-maine.png",
    alt: "Portland",
    identity: "local:portland-maine",
    presentation: "flag",
  },
  "prefecture-osaka": {
    file: "prefecture-osaka.png",
    alt: "Osaka Prefecture",
    identity: "local:osaka-prefecture",
    presentation: "flag",
  },
  "staten-island": {
    file: "staten-island.png",
    alt: "Staten Island",
    identity: "local:staten-island",
    presentation: "flag",
  },
  redbridge: {
    file: "redbridge.png",
    alt: "Redbridge",
    identity: "local:redbridge",
    presentation: "cutout",
  },
};

/**
 * Direct Commons files (Category:Flags of London boroughs).
 * Applied after Wikidata so real flag art wins over coat-of-arms (P94).
 * https://commons.wikimedia.org/wiki/Category:Flags_of_London_boroughs
 */
const COMMONS_FLAGS = {
  ealing: { commonsFile: "Ealing Flag.png", alt: "Ealing" },
  bexley: {
    commonsFile: "Flag of the Borough of Bexley.gif",
    alt: "Bexley",
  },
  hackney: {
    commonsFile: "Flag of the London Borough of Hackney.svg",
    alt: "Hackney",
  },
  haringey: {
    commonsFile: "Flag of the London Borough of Haringey.svg",
    alt: "Haringey",
  },
  havering: {
    commonsFile: "Flag of the London Borough of Havering.svg",
    alt: "Havering",
  },
  islington: {
    commonsFile: "Flag of the London Borough of Islington.svg",
    alt: "Islington",
  },
  "kingston-upon-thames": {
    commonsFile: "Flag of the London Borough of Kingston-upon-Thames.svg",
    alt: "Kingston Upon Thames",
  },
  sutton: {
    commonsFile: "Flag of the Borough of Sutton.jpg",
    alt: "Sutton",
  },
  "city-of-westminster": {
    commonsFile: "Flag of Westminster.png",
    alt: "City Of Westminster",
  },
  // NYC boroughs — https://en.wikipedia.org/wiki/Flags_of_New_York_City
  // Staten Island uses a local override (not on Commons).
  bronx: {
    commonsFile: "Flag of Borough of the Bronx.svg",
    alt: "Bronx",
  },
  brooklyn: {
    commonsFile: "Flag of Brooklyn, New York.svg",
    alt: "Brooklyn",
  },
  manhattan: {
    commonsFile: "Flag of the Borough of Manhattan.svg",
    alt: "Manhattan",
  },
  queens: {
    commonsFile: "Flag of Queens, New York.svg",
    alt: "Queens",
  },
};

/**
 * Osaka City ward flowers (区の花) — not flags; official district symbols.
 * https://www.city.osaka.lg.jp/shimin/page/0000288218.html
 */
const OSAKA_WARD_FLOWERS_BASE =
  "https://www.city.osaka.lg.jp/shimin/cmsfiles/contents/0000288/288218";
const OSAKA_WARD_FLOWERS = {
  "ward-27127": { jpg: "01kita.jpg", alt: "Kita" },
  "ward-27102": { jpg: "02miyakojima.jpg", alt: "Miyakojima" },
  "ward-27103": { jpg: "03fukushima.jpg", alt: "Fukushima" },
  "ward-27104": { jpg: "04konohana.jpg", alt: "Konohana" },
  "ward-27128": { jpg: "05chuo.jpg", alt: "Chūō" },
  "ward-27106": { jpg: "06nishi.jpg", alt: "Nishi" },
  "ward-27107": { jpg: "07minato.jpg", alt: "Minato" },
  "ward-27108": { jpg: "08taisho.jpg", alt: "Taishō" },
  "ward-27109": { jpg: "09tennoji.jpg", alt: "Tennōji" },
  "ward-27111": { jpg: "10nianiwa.jpg", alt: "Naniwa" },
  "ward-27113": { jpg: "11nishiyodogawa.jpg", alt: "Nishi-Yodogawa" },
  "ward-27123": { jpg: "12yodogawa.jpg", alt: "Yodogawa" },
  "ward-27114": { jpg: "13higashiyodogawa.jpg", alt: "Higashi-Yodogawa" },
  "ward-27115": { jpg: "14higashinari.jpg", alt: "Higashinari" },
  "ward-27116": { jpg: "15ikuno.jpg", alt: "Ikuno" },
  "ward-27117": { jpg: "16asahi.jpg", alt: "Asahi" },
  "ward-27118": { jpg: "17joto.jpg", alt: "Jōtō" },
  "ward-27124": { jpg: "18tsurumi.jpg", alt: "Tsurumi" },
  "ward-27119": { jpg: "19abeno.jpg", alt: "Abeno" },
  "ward-27125": { jpg: "20suminoe.jpg", alt: "Suminoe" },
  "ward-27120": { jpg: "21sumiyoshi.jpg", alt: "Sumiyoshi" },
  "ward-27121": { jpg: "22higashisumiyoshi.jpg", alt: "Higashi-Sumiyoshi" },
  "ward-27126": { jpg: "23hirano.jpg", alt: "Hirano" },
  "ward-27122": { jpg: "24nishinari.jpg", alt: "Nishinari" },
};

/**
 * Wikidata QIDs for admin1 + settlement + Tokyo wards + London boroughs.
 * Keys match hierarchy segment id or preset subregionId.
 * Only kept when P41 or P94 resolves to a distinct image.
 */
const WIKIDATA = {
  "state-ny": { qid: "Q1384", alt: "New York" },
  "state-me": { qid: "Q724", alt: "Maine" },
  "province-bc": { qid: "Q1973", alt: "British Columbia" },
  "canton-zurich": { qid: "Q11943", alt: "Canton of Zürich" },
  "canton-lucerne": { qid: "Q12121", alt: "Canton of Lucerne" },
  "county-dublin": { qid: "Q173500", alt: "County Dublin" },
  "metro-london": { qid: "Q23306", alt: "Greater London" },
  "metro-nyc": { qid: "Q60", alt: "New York City" },
  "metro-tokyo": { qid: "Q1490", alt: "Tokyo" },
  "metro-osaka": { qid: "Q35765", alt: "Osaka City" },
  "metro-portland-maine": { qid: "Q49201", alt: "Portland" },
  "metro-prince-rupert": { qid: "Q1015639", alt: "Prince Rupert" },
  "lucerne-metro": { qid: "Q4191", alt: "Lucerne" },
  "zurich-city": { qid: "Q72", alt: "Zürich" },
  // Kantō / Kansai have no P41/P94 on Wikidata — local overrides.
  // Tokyo special wards (List of municipal flags of Kantō region).
  "ward-13101": { qid: "Q214051", alt: "Chiyoda" },
  "ward-13102": { qid: "Q212704", alt: "Chūō" },
  "ward-13103": { qid: "Q190088", alt: "Minato" },
  "ward-13104": { qid: "Q179645", alt: "Shinjuku" },
  "ward-13105": { qid: "Q212713", alt: "Bunkyō" },
  "ward-13106": { qid: "Q232641", alt: "Taitō" },
  "ward-13107": { qid: "Q235135", alt: "Sumida" },
  "ward-13108": { qid: "Q215175", alt: "Kōtō" },
  "ward-13109": { qid: "Q233495", alt: "Shinagawa" },
  "ward-13110": { qid: "Q233903", alt: "Meguro" },
  "ward-13111": { qid: "Q217234", alt: "Ōta" },
  "ward-13112": { qid: "Q231645", alt: "Setagaya" },
  "ward-13113": { qid: "Q193638", alt: "Shibuya" },
  "ward-13114": { qid: "Q234087", alt: "Nakano" },
  "ward-13115": { qid: "Q232631", alt: "Suginami" },
  "ward-13116": { qid: "Q236680", alt: "Toshima" },
  "ward-13117": { qid: "Q235130", alt: "Kita" },
  "ward-13118": { qid: "Q232624", alt: "Arakawa" },
  "ward-13119": { qid: "Q232635", alt: "Itabashi" },
  "ward-13120": { qid: "Q232655", alt: "Nerima" },
  "ward-13121": { qid: "Q213464", alt: "Adachi" },
  "ward-13122": { qid: "Q232628", alt: "Katsushika" },
  "ward-13123": { qid: "Q214056", alt: "Edogawa" },
  // London boroughs (P41 flag, else P94 arms). Redbridge has neither.
  "barking-and-dagenham": { qid: "Q205358", alt: "Barking And Dagenham" },
  barnet: { qid: "Q151048", alt: "Barnet" },
  bexley: { qid: "Q207208", alt: "Bexley" },
  brent: { qid: "Q207201", alt: "Brent" },
  bromley: { qid: "Q208201", alt: "Bromley" },
  camden: { qid: "Q202088", alt: "Camden" },
  "city-of-london": { qid: "Q23311", alt: "City Of London" },
  "city-of-westminster": { qid: "Q179351", alt: "City Of Westminster" },
  croydon: { qid: "Q26888", alt: "Croydon" },
  ealing: { qid: "Q207218", alt: "Ealing" },
  enfield: { qid: "Q210531", alt: "Enfield" },
  greenwich: { qid: "Q693450", alt: "Greenwich" },
  hackney: { qid: "Q205679", alt: "Hackney" },
  "hammersmith-and-fulham": {
    qid: "Q40478",
    alt: "Hammersmith And Fulham",
  },
  haringey: { qid: "Q213560", alt: "Haringey" },
  harrow: { qid: "Q210476", alt: "Harrow" },
  havering: { qid: "Q215038", alt: "Havering" },
  hillingdon: { qid: "Q205690", alt: "Hillingdon" },
  hounslow: { qid: "Q214162", alt: "Hounslow" },
  islington: { qid: "Q205817", alt: "Islington" },
  "kensington-and-chelsea": {
    qid: "Q188801",
    alt: "Kensington And Chelsea",
  },
  "kingston-upon-thames": { qid: "Q32508", alt: "Kingston Upon Thames" },
  lambeth: { qid: "Q202059", alt: "Lambeth" },
  lewisham: { qid: "Q215030", alt: "Lewisham" },
  merton: { qid: "Q32504", alt: "Merton" },
  newham: { qid: "Q208139", alt: "Newham" },
  // redbridge Q208955: no P41/P94 — omit
  "richmond-upon-thames": { qid: "Q32515", alt: "Richmond Upon Thames" },
  southwark: { qid: "Q730706", alt: "Southwark" },
  sutton: { qid: "Q320378", alt: "Sutton" },
  "tower-hamlets": { qid: "Q208152", alt: "Tower Hamlets" },
  "waltham-forest": { qid: "Q40608", alt: "Waltham Forest" },
  wandsworth: { qid: "Q210563", alt: "Wandsworth" },
};

async function sparql(query, attempt = 1) {
  const url =
    "https://query.wikidata.org/sparql?" +
    new URLSearchParams({ query, format: "json" });
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": UA },
  });
  const text = await res.text();
  if (!res.ok) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      return sparql(query, attempt + 1);
    }
    throw new Error(`SPARQL ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      return sparql(query, attempt + 1);
    }
    throw new Error(`SPARQL non-JSON: ${text.slice(0, 200)}`);
  }
}

async function fetchWikidataImages(qids) {
  const values = qids.map((qid) => `wd:${qid}`).join(" ");
  const query = `
SELECT ?item ?flag ?arms WHERE {
  VALUES ?item { ${values} }
  OPTIONAL { ?item wdt:P41 ?flag. }
  OPTIONAL { ?item wdt:P94 ?arms. }
}`;
  const data = await sparql(query);
  const byQid = new Map();
  for (const row of data.results.bindings) {
    const qid = row.item.value.split("/").pop();
    byQid.set(qid, {
      flag: row.flag?.value ?? null,
      arms: row.arms?.value ?? null,
    });
  }
  return byQid;
}

function commonsThumbUrl(specialFilePathUrl, width = 128) {
  // Special:FilePath URLs accept width=
  const url = new URL(specialFilePathUrl.replace("http://", "https://"));
  url.searchParams.set("width", String(width));
  return url.toString();
}

/** Stable image identity so Lucerne canton + city sharing one Commons file dedupe. */
function commonsIdentity(specialFilePathUrl) {
  try {
    const url = new URL(specialFilePathUrl.replace("http://", "https://"));
    const raw = decodeURIComponent(url.pathname.split("/").pop() || "");
    return `commons:${raw.toLowerCase()}`;
  } catch {
    return specialFilePathUrl;
  }
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    throw new Error(`download ${res.status} ${url}`);
  }
  await pipeline(res.body, createWriteStream(dest));
}

/** Re-encode to a stable RGBA PNG; optionally punch near-white to transparent. */
async function finalizePng(srcPath, destPath, presentation) {
  const { data, info } = await sharp(srcPath)
    .resize({
      width: 128,
      height: 128,
      fit: presentation === "cutout" ? "inside" : "inside",
      withoutEnlargement: false,
      background: presentation === "flag" ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (presentation === "cutout") {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Punch paper/white matte; keep pale flower petals that aren't near-white.
      if (r >= 242 && g >= 242 && b >= 242) {
        data[i + 3] = 0;
      }
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(destPath);
}

async function writeAsset(assets, segmentId, {
  alt,
  source,
  identity,
  presentation,
  destPath,
}) {
  assets[segmentId] = {
    src: `/region-flags/${path.basename(destPath)}`,
    alt,
    source,
    identity,
    presentation,
  };
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  /** @type {Record<string, { src: string; alt: string; source: string; identity: string; presentation: "flag" | "cutout" }>} */
  const assets = {};

  for (const [segmentId, { code, alt }] of Object.entries(FLAGCDN)) {
    const file = `${segmentId}.png`;
    const dest = path.join(outDir, file);
    const tmp = path.join(outDir, `${segmentId}.src.bin`);
    const url = `https://flagcdn.com/w80/${code}.png`;
    process.stdout.write(`FlagCDN ${segmentId} ← ${code}… `);
    await download(url, tmp);
    await finalizePng(tmp, dest, "flag");
    await rm(tmp, { force: true });
    await writeAsset(assets, segmentId, {
      alt,
      source: `flagcdn:${code}`,
      identity: `flagcdn:${code}`,
      presentation: "flag",
      destPath: dest,
    });
    console.log("ok");
  }

  const orgQids = Object.values(REGION_ORG).map((entry) => entry.qid);
  const settlementQids = Object.values(WIKIDATA).map((entry) => entry.qid);
  const images = await fetchWikidataImages([...orgQids, ...settlementQids]);

  for (const [segmentId, { qid, alt, commonsFile }] of Object.entries(
    REGION_ORG,
  )) {
    const hit = images.get(qid);
    const imageUrl =
      hit?.flag ||
      hit?.arms ||
      `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsFile)}`;
    const prop = hit?.flag ? "P41" : hit?.arms ? "P94" : "commons";
    const presentation = prop === "P94" ? "cutout" : "flag";
    const file = `${segmentId}.png`;
    const dest = path.join(outDir, file);
    const tmp = path.join(outDir, `${segmentId}.src.bin`);
    const url = commonsThumbUrl(imageUrl, 256);
    process.stdout.write(`RegionOrg ${segmentId} ← ${prop}… `);
    try {
      await download(url, tmp);
      await finalizePng(tmp, dest, presentation);
      await rm(tmp, { force: true });
      await writeAsset(assets, segmentId, {
        alt,
        source: `wikidata:${qid}:${prop}`,
        identity: commonsIdentity(imageUrl),
        presentation,
        destPath: dest,
      });
      console.log("ok");
    } catch (error) {
      await rm(tmp, { force: true });
      console.log(`fail (${error.message}) — skip`);
    }
  }

  for (const [segmentId, { qid, alt }] of Object.entries(WIKIDATA)) {
    const hit = images.get(qid);
    const imageUrl = hit?.flag || hit?.arms || null;
    if (!imageUrl) {
      console.log(`Wikidata ${segmentId} (${qid}): no P41/P94 — skip`);
      continue;
    }
    const prop = hit.flag ? "P41" : "P94";
    const presentation = prop === "P94" ? "cutout" : "flag";
    const file = `${segmentId}.png`;
    const dest = path.join(outDir, file);
    const tmp = path.join(outDir, `${segmentId}.src.bin`);
    const url = commonsThumbUrl(imageUrl, 256);
    process.stdout.write(`Wikidata ${segmentId} ← ${prop}… `);
    try {
      await download(url, tmp);
      await finalizePng(tmp, dest, presentation);
      await rm(tmp, { force: true });
      await writeAsset(assets, segmentId, {
        alt,
        source: `wikidata:${qid}:${prop}`,
        identity: commonsIdentity(imageUrl),
        presentation,
        destPath: dest,
      });
      console.log("ok");
    } catch (error) {
      await rm(tmp, { force: true });
      console.log(`fail (${error.message}) — skip`);
    }
  }

  for (const [segmentId, { commonsFile, alt }] of Object.entries(
    COMMONS_FLAGS,
  )) {
    const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsFile)}`;
    const file = `${segmentId}.png`;
    const dest = path.join(outDir, file);
    const tmp = path.join(outDir, `${segmentId}.src.bin`);
    const url = commonsThumbUrl(imageUrl, 256);
    process.stdout.write(`Commons ${segmentId} ← ${commonsFile}… `);
    try {
      await download(url, tmp);
      await finalizePng(tmp, dest, "flag");
      await rm(tmp, { force: true });
      await writeAsset(assets, segmentId, {
        alt,
        source: `commons:${commonsFile}`,
        identity: commonsIdentity(imageUrl),
        presentation: "flag",
        destPath: dest,
      });
      console.log("ok");
    } catch (error) {
      await rm(tmp, { force: true });
      console.log(`fail (${error.message}) — skip`);
    }
  }

  for (const [segmentId, { jpg, alt }] of Object.entries(OSAKA_WARD_FLOWERS)) {
    const url = `${OSAKA_WARD_FLOWERS_BASE}/${jpg}`;
    const file = `${segmentId}.png`;
    const dest = path.join(outDir, file);
    const tmp = path.join(outDir, `${segmentId}.src.jpg`);
    process.stdout.write(`OsakaFlower ${segmentId} ← ${jpg}… `);
    try {
      await download(url, tmp);
      await finalizePng(tmp, dest, "cutout");
      await rm(tmp, { force: true });
      await writeAsset(assets, segmentId, {
        alt,
        source: `osaka-ward-flower:${jpg}`,
        identity: `osaka-ward-flower:${jpg}`,
        presentation: "cutout",
        destPath: dest,
      });
      console.log("ok");
    } catch (error) {
      await rm(tmp, { force: true });
      console.log(`fail (${error.message}) — skip`);
    }
  }

  for (const [segmentId, { file, alt, identity, presentation }] of Object.entries(
    LOCAL_OVERRIDES,
  )) {
    const srcPath = path.join(overrideDir, file);
    const dest = path.join(outDir, file);
    process.stdout.write(`Local ${segmentId} ← ${file}… `);
    try {
      await finalizePng(srcPath, dest, presentation);
      await writeAsset(assets, segmentId, {
        alt,
        source: `local:${file}`,
        identity,
        presentation,
        destPath: dest,
      });
      console.log("ok");
    } catch (error) {
      console.log(`fail (${error.message}) — skip`);
    }
  }

  const ts = `/* Generated by scripts/sync-region-flags.mjs — do not edit by hand. */
export const BUNDLED_PRESET_FLAG_ASSETS = ${JSON.stringify(assets, null, 2)} as const;

export type BundledPresetFlagSegmentId = keyof typeof BUNDLED_PRESET_FLAG_ASSETS;
`;

  await writeFile(outTs, ts, "utf8");
  console.log(`\nWrote ${Object.keys(assets).length} assets → ${outTs}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
