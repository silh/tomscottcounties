import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

function geojsonAsJsonPlugin() {
  return {
    name: "geojson-as-json",
    load(id: string) {
      if (id.endsWith(".geojson")) {
        const raw = readFileSync(id, "utf-8");
        return `export default ${JSON.stringify(JSON.parse(raw))}`;
      }
    },
  };
}

export default defineConfig({
  plugins: [geojsonAsJsonPlugin()],
  // Ensure asset URLs are correct for a project GitHub Pages site:
  // https://<user>.github.io/<repo>/...
  base: "/tomscottcounties/",
  build: {
    chunkSizeWarningLimit: 2500,
  },
});
