export type EpisodeInfo = {
  /** Incrementing release order; higher = newer. Sidebar lists newest first. */
  id: number;
  youtubeId: string;
  title: string;
};

/**
 * Keys must match each feature’s `name` in `counties.geojson` (ONS `CTY1921NM`).
 * Edit `public/data/episodes.json` as episodes release.
 */
export type EpisodesMap = Record<string, EpisodeInfo>;
