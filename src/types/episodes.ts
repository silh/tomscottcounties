export type EpisodeInfo = {
  youtubeId: string;
  title: string;
};

/**
 * Keys must match each feature’s `name` in `counties.geojson` (ONS `CTY1921NM`).
 * Edit `public/data/episodes.json` as episodes release; `London` is a demo row for the linked return video.
 */
export type EpisodesMap = Record<string, EpisodeInfo>;
