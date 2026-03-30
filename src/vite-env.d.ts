/// <reference types="vite/client" />

declare module "*.geojson" {
  import type { FeatureCollection } from "geojson";
  const value: FeatureCollection;
  export default value;
}
