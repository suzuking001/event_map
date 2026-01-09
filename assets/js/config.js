(() => {
  window.App = window.App || {};

  const EVENT_CSV_URL =
    "https://static.hamamatsu.odpf.net/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.csv";

  const TILE_URL =
    new URLSearchParams(window.location.search).get("tiles") ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL)';

  const DATASET_ATTRIBUTION = [
    '<span class="attribution-block">データ(CC BY):',
    `<a href="${EVENT_CSV_URL}" target="_blank" rel="noopener">浜松市イベント</a>`,
    "</span>",
    '<span class="attribution-block">提供: <a href="https://opendata.pref.shizuoka.jp/" target="_blank" rel="noopener">静岡県オープンデータポータル</a> / <a href="https://www.city.hamamatsu.shizuoka.jp/opendata/index.html" target="_blank" rel="noopener">浜松市オープンデータ</a></span>',
  ].join(" ");

  window.App.config = {
    EVENT_CSV_URL,
    TILE_URL,
    TILE_ATTRIBUTION,
    DATASET_ATTRIBUTION,
  };
})();
