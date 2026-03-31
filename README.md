# Tom Scott: England — counties map

Small single-page map of **historic English counties** (1921 ONS boundaries). Counties that have a curated YouTube entry are highlighted; clicking one opens a popup with the video title, thumbnail, and link.

Built with **OpenLayers**.

## Commands

| Command | Description |
| -------- | ----------- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server (Vite) |
| `pnpm build` | Typecheck + production build to `dist/` |
| `pnpm preview` | Serve the production build locally |

## Adding or updating episodes

Edit [`public/data/episodes.json`](public/data/episodes.json). Each key must be the **exact** county name used in the bundled GeoJSON (`name` on each feature — the ONS `CTY1921NM`, e.g. `Bedfordshire`, `Yorkshire (East Riding)`).

```json
{
  "Kent": {
    "id": 2,
    "youtubeId": "VIDEO_ID",
    "title": "Title as shown on YouTube"
  }
}
```

Thumbnails use `https://img.youtube.com/vi/{youtubeId}/mqdefault.jpg`. No server-side YouTube API is required.

## County boundaries (bundled GeoJSON)

Boundaries are **imported at build time** from [`src/data/counties.geojson`](src/data/counties.geojson) (England only, simplified for bundle size). The app does **not** load county geometry from a remote API at runtime.

To refresh from the official dataset:

1. `pnpm run fetch:geojson` — downloads full England & Wales GeoJSON to `_full.geojson` (gitignored, ~22 MB).
2. `pnpm run prepare:geojson` — filters out Wales, reprojects to WGS84, simplifies, writes `src/data/counties.geojson`.

Source: [Office for National Statistics — Counties (December 1921) Boundaries EW BGC](https://www.data.gov.uk/dataset/3a75496e-406b-4e4d-826a-7fa582c4dbeb/counties-december-1921-boundaries-ew-bgc) (Open Government Licence v3.0). Basemap tiles are © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

## Licence

County boundary data: ONS / Open Government Licence (see link above). This app’s code is yours to license as you choose unless you add other constraints.
