(() => {
  window.App = window.App || {};

  const EVENT_CSV_URL =
    "https://static.hamamatsu.odpf.net/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.csv";

  const TILE_URL =
    new URLSearchParams(window.location.search).get("tiles") ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL)';

  window.App.config = {
    EVENT_CSV_URL,
    TILE_URL,
    TILE_ATTRIBUTION,
  };
})();
