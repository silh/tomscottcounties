/**
 * One-time / dev script: reads ONS 1921 EW GeoJSON (EPSG:27700), drops Wales,
 * reprojects to WGS84, simplifies. Writes src/data/counties.geojson (bundled by Vite).
 *
 * Download source (63 features EW): pnpm run fetch:geojson (curl → _full.geojson)
 * Dataset: https://www.data.gov.uk/dataset/3a75496e-406b-4e4d-826a-7fa582c4dbeb/counties-december-1921-boundaries-ew-bgc
 *
 * Usage: pnpm run prepare:geojson
 *    or: node scripts/prepare-counties.mjs path/to/full.geojson
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import proj4 from "proj4";
import { simplify } from "@turf/simplify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const WELSH = new Set([
  "Anglesey",
  "Brecknockshire",
  "Caernarvonshire",
  "Cardiganshire",
  "Carmarthenshire",
  "Denbighshire",
  "Flintshire",
  "Glamorganshire",
  "Merionethshire",
  "Monmouthshire",
  "Montgomeryshire",
  "Pembrokeshire",
  "Radnorshire",
]);

proj4.defs(
  "EPSG:27700",
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +units=m +no_defs",
);

function transformCoords(coords) {
  if (typeof coords[0] === "number") {
    const [x, y] = coords;
    const [lon, lat] = proj4("EPSG:27700", "EPSG:4326", [x, y]);
    return [lon, lat];
  }
  return coords.map(transformCoords);
}

function transformGeometry(geom) {
  if (!geom) return geom;
  return {
    ...geom,
    coordinates: transformCoords(geom.coordinates),
  };
}

const inputPath = process.argv[2] || path.join(root, "_full.geojson");
const raw = fs.readFileSync(inputPath, "utf8");
const fc = JSON.parse(raw);

const englandFeatures = fc.features
  .filter((f) => !WELSH.has(f.properties?.CTY1921NM))
  .map((f) => {
    const geom = transformGeometry(f.geometry);
    const feature = {
      type: "Feature",
      properties: {
        name: f.properties.CTY1921NM,
        code: f.properties.CTY1921CD,
      },
      geometry: geom,
    };
    const simplified = simplify(feature, {
      tolerance: 0.0025,
      highQuality: false,
    });
    return simplified;
  });

const out = {
  type: "FeatureCollection",
  features: englandFeatures,
};

const outPath = path.join(root, "src", "data", "counties.geojson");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
console.log("Wrote", outPath, "features:", englandFeatures.length, "bytes:", fs.statSync(outPath).size);
