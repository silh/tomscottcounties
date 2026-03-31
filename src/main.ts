import "ol/ol.css";
import "./style.css";
import Map from "ol/Map.js";
import View from "ol/View.js";
import GeoJSON from "ol/format/GeoJSON.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import Overlay from "ol/Overlay.js";
import { transformExtent } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import { Fill, Stroke, Style } from "ol/style.js";
import type { FeatureLike } from "ol/Feature.js";
import type { Coordinate } from "ol/coordinate.js";
import { getCenter } from "ol/extent.js";
import MultiPolygon from "ol/geom/MultiPolygon.js";
import Polygon from "ol/geom/Polygon.js";
import type { EpisodeInfo, EpisodesMap } from "./types/episodes.js";
// Bundled England-only polygons; join keys use `name` (= ONS CTY1921NM in prepare script).
import countiesFc from "./data/counties.geojson";
import episodesData from "../public/data/episodes.json";

const EPISODES_PANEL_COLLAPSED_KEY = "tomscottcounties:episodesPanelCollapsed";

/** Episodes keyed by county name (embedded at build time). */
const episodes: EpisodesMap = episodesData as EpisodesMap;

function warnDuplicateEpisodeIds(data: EpisodesMap): void {
  if (!import.meta.env.DEV) return;
  const byId = new globalThis.Map<number, string[]>();
  for (const [county, ep] of Object.entries(data)) {
    const list = byId.get(ep.id) ?? [];
    list.push(county);
    byId.set(ep.id, list);
  }
  for (const [id, counties] of byId) {
    if (counties.length > 1) {
      console.warn(`Duplicate episode id ${id}:`, counties.join(", "));
    }
  }
}

/** Stable “middle” of a county polygon for the popup tail (not the click pixel). */
function getCountyAnchor(feature: FeatureLike): Coordinate | null {
  const geometry = feature.getGeometry();
  if (!geometry) return null;
  if (geometry instanceof Polygon) {
    const c = geometry.getInteriorPoint().getCoordinates();
    return [c[0], c[1]];
  }
  if (geometry instanceof MultiPolygon) {
    const coords = geometry.getInteriorPoints().getCoordinates();
    if (coords.length === 0) return null;
    let best = coords[0];
    let bestM = coords[0][2] ?? 0;
    for (let i = 1; i < coords.length; i++) {
      const c = coords[i];
      const m = c[2] ?? 0;
      if (m > bestM) {
        bestM = m;
        best = c;
      }
    }
    return [best[0], best[1]];
  }
  return getCenter(geometry.getExtent());
}

function renderEpisodeList(container: HTMLElement, data: EpisodesMap): void {
  const sorted = Object.entries(data).sort((a, b) => b[1].id - a[1].id);
  const rows = sorted.map(([countyName, ep]) => {
    const watchUrl = `https://www.youtube.com/watch?v=${ep.youtubeId}`;
    const countyAttr = escapeHtml(countyName);
    return `<a class="episodes-item" href="${watchUrl}" target="_blank" rel="noopener noreferrer" data-county="${countyAttr}"><span class="episodes-item-county">${ep.id}. ${escapeHtml(countyName)}</span><span class="episodes-item-title">${escapeHtml(ep.title)}</span></a>`;
  });
  container.innerHTML = rows.join("");
}

function wireEpisodeListHover(
  container: HTMLElement,
  setHighlightCounty: (name: string | null) => void,
): void {
  for (const el of container.querySelectorAll<HTMLElement>(".episodes-item")) {
    const county = el.dataset.county;
    if (!county) continue;
    el.addEventListener("mouseenter", () => setHighlightCounty(county));
    el.addEventListener("mouseleave", () => setHighlightCounty(null));
  }
}

function main() {
  warnDuplicateEpisodeIds(episodes);

  const episodesPanel = document.getElementById("episodes-panel");
  const episodesListEl = document.getElementById("episodes-list");
  const episodesToggle = document.getElementById("episodes-panel-toggle");
  if (episodesListEl) {
    renderEpisodeList(episodesListEl, episodes);
  }

  if (episodesPanel instanceof HTMLElement && episodesToggle instanceof HTMLButtonElement) {
    if (localStorage.getItem(EPISODES_PANEL_COLLAPSED_KEY) === "true") {
      episodesPanel.classList.add("episodes-panel--collapsed");
      episodesToggle.setAttribute("aria-expanded", "false");
    }
  }

  const format = new GeoJSON({
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });
  const features = format.readFeatures(countiesFc);

  const visitedFill = new Fill({ color: "rgba(229, 57, 53, 0.38)" });
  const visitedStroke = new Stroke({ color: "rgba(198, 40, 40, 0.92)", width: 1.2 });
  const visitedHoverFill = new Fill({ color: "rgba(229, 57, 53, 0.58)" });
  const visitedHoverStroke = new Stroke({ color: "rgba(183, 28, 28, 1)", width: 2 });
  const neutralFill = new Fill({ color: "rgba(180, 180, 176, 0.22)" });
  const neutralStroke = new Stroke({ color: "rgba(130, 130, 126, 0.75)", width: 0.8 });

  const visitedStyle = new Style({
    fill: visitedFill,
    stroke: visitedStroke,
  });
  const visitedHoverStyle = new Style({
    fill: visitedHoverFill,
    stroke: visitedHoverStroke,
  });
  const neutralStyle = new Style({
    fill: neutralFill,
    stroke: neutralStroke,
  });

  let highlightCountyName: string | null = null;

  function countyStyle(feature: FeatureLike): Style {
    const name = feature.get("name") as string | undefined;
    if (name && episodes[name]) {
      if (name === highlightCountyName) return visitedHoverStyle;
      return visitedStyle;
    }
    return neutralStyle;
  }

  const vectorSource = new VectorSource({ features });
  const vectorLayer = new VectorLayer({
    source: vectorSource,
    style: countyStyle,
  });

  function setHighlightCounty(name: string | null): void {
    if (highlightCountyName === name) return;
    highlightCountyName = name;
    vectorLayer.changed();
    if (episodesListEl) {
      for (const el of episodesListEl.querySelectorAll<HTMLElement>(".episodes-item")) {
        const c = el.dataset.county;
        el.classList.toggle("episodes-item--active", c != null && c === name);
      }
    }
  }

  if (episodesListEl) {
    wireEpisodeListHover(episodesListEl, setHighlightCounty);
  }

  const popupEl = document.getElementById("popup");
  const popupBody = document.querySelector(".popup-body");
  if (!(popupEl instanceof HTMLElement) || !(popupBody instanceof HTMLElement)) {
    throw new Error("Popup elements missing from DOM");
  }
  const popupRoot = popupEl;
  const popupContent = popupBody;

  const overlay = new Overlay({
    element: popupRoot,
    autoPan: { animation: { duration: 0 }, margin: 20 },
    positioning: "bottom-center",
    offset: [0, -14],
    stopEvent: true,
  });

  function hidePopup(): void {
    overlay.setPosition(undefined);
    popupRoot.hidden = true;
  }

  function showPopup(coordinate: number[], countyName: string, episode: EpisodeInfo): void {
    const thumbUrl = `https://img.youtube.com/vi/${episode.youtubeId}/mqdefault.jpg`;
    const watchUrl = `https://www.youtube.com/watch?v=${episode.youtubeId}`;
    popupContent.innerHTML = `
        <p class="popup-county">${escapeHtml(countyName)}</p>
        <a class="popup-card-link" href="${watchUrl}" target="_blank" rel="noopener noreferrer">
          <img class="popup-thumb" src="${thumbUrl}" alt="" width="320" height="180" />
          <p class="popup-title">${escapeHtml(episode.title)}</p>
          <p class="popup-youtube-hint">Watch on YouTube</p>
        </a>
      `;
    popupRoot.hidden = false;
    overlay.setPosition(coordinate);
  }

  // England + nearby sea (excludes Ireland, Scotland, Wales as primary focus).
  const mapMaxExtent4326 = [-7.1, 49.55, 2.55, 56.05];
  // Slightly tighter first frame; still within mapMaxExtent4326.
  const initialViewExtent4326 = [-6.85, 49.72, 2.2, 55.92];
  const mapMaxExtent3857 = transformExtent(mapMaxExtent4326, "EPSG:4326", "EPSG:3857");

  const map = new Map({
    target: "map",
    layers: [new TileLayer({ source: new OSM() }), vectorLayer],
    overlays: [overlay],
    view: new View({
      center: [0, 0],
      zoom: 2,
      extent: mapMaxExtent3857,
      // Without this, wide/tall viewports cannot zoom out far enough to see the
      // whole constrained region (OL keeps the viewport inside the extent box).
      showFullExtent: true,
      maxZoom: 18,
    }),
  });
  const mapTarget = map.getTargetElement();

  map.getView().fit(transformExtent(initialViewExtent4326, "EPSG:4326", "EPSG:3857"), {
    padding: [96, 96, 96, 96],
    maxZoom: 5,
  });

  function refreshMapSize(): void {
    map.updateSize();
  }

  requestAnimationFrame(refreshMapSize);
  window.addEventListener("load", refreshMapSize);
  window.addEventListener("resize", refreshMapSize);

  if (episodesPanel instanceof HTMLElement && episodesToggle instanceof HTMLButtonElement) {
    episodesToggle.addEventListener("click", () => {
      const collapsed = episodesPanel.classList.toggle("episodes-panel--collapsed");
      episodesToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      localStorage.setItem(EPISODES_PANEL_COLLAPSED_KEY, collapsed ? "true" : "false");
      requestAnimationFrame(refreshMapSize);
    });
  }

  const mapEl = document.getElementById("map");
  if (mapEl) {
    const ro = new ResizeObserver(() => refreshMapSize());
    ro.observe(mapEl);
    mapEl.addEventListener("mouseleave", () => {
      if (mapTarget) mapTarget.style.cursor = "";
      setHighlightCounty(null);
    });
  }

  map.on("pointermove", (evt) => {
    let hitName: string | null = null;
    map.forEachFeatureAtPixel(
      evt.pixel,
      (feature) => {
        const name = feature.get("name") as string | undefined;
        if (name && episodes[name]) {
          hitName = name;
          return true;
        }
        return false;
      },
      { hitTolerance: 8, layerFilter: (l) => l === vectorLayer },
    );
    setHighlightCounty(hitName);
    if (mapTarget) {
      mapTarget.style.cursor = hitName ? "pointer" : "";
    }
  });

  map.on("click", (evt) => {
    let showed = false;
    map.forEachFeatureAtPixel(
      evt.pixel,
      (feature) => {
        const name = feature.get("name") as string | undefined;
        const ep = name ? episodes[name] : undefined;
        if (ep && name) {
          const anchor = getCountyAnchor(feature);
          if (anchor) {
            showPopup(anchor, name, ep);
            showed = true;
          }
          return true;
        }
        return false;
      },
      { hitTolerance: 8, layerFilter: (l) => l === vectorLayer },
    );
    if (!showed) hidePopup();
  });

  popupRoot.addEventListener("click", (e) => e.stopPropagation());

  const closeBtn = popupRoot.querySelector(".popup-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hidePopup();
    });
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main();
