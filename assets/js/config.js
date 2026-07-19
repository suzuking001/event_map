(() => {
  window.App = window.App || {};

  const EVENT_CSV_SOURCES = [
    {
      id: "hamamatsu-open-data",
      url: "https://static.hamamatsu.odpf.net/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.csv",
      encoding: "shift-jis",
      refresh: true,
    },
    {
      id: "bundled-event-data",
      url: "data/current_and_future_events.csv",
      encoding: "utf-8",
      refresh: false,
    },
  ];

  const TILE_URL =
    new URLSearchParams(window.location.search).get("tiles") ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL)';

  const OVERVIEW_MAP = {
    url: "assets/maps/hamamatsu-overview.webp?v=2",
    bounds: [
      [34.58, 137.4869556],
      [35.304395, 138.058702],
    ],
  };

  window.App.config = {
    EVENT_CSV_SOURCES,
    TILE_URL,
    TILE_ATTRIBUTION,
    OVERVIEW_MAP,
  };
})();
