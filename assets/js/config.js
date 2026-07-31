(() => {
  window.App = window.App || {};

  const EVENT_CSV_SOURCES = [
    {
      id: "hamamatsu-open-data",
      url: "https://static.hamamatsu.odpf.net/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.csv",
      encoding: "shift-jis",
      refresh: true,
      sourceType: "open-data",
      sourceName: "浜松市オープンデータ「イベント」",
      sourceUrl: "https://opendata.pref.shizuoka.jp/dataset/12874.html",
      licenseName: "CC BY 2.1 日本",
      licenseUrl: "https://creativecommons.org/licenses/by/2.1/jp/",
    },
    {
      id: "bundled-event-data",
      url: "data/current_and_future_events.csv",
      encoding: "utf-8",
      refresh: false,
      sourceType: "web",
    },
    {
      id: "osaka-open-data",
      url: "data/osaka_events.csv",
      encoding: "utf-8",
      refresh: true,
      sourceType: "open-data",
      sourceName: "大阪府イベント一覧",
      sourceUrl: "https://data.bodik.jp/dataset/270008_event",
      licenseName: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.ja",
      defaultCategory: "公園・自然",
      areaName: "大阪府",
    },
    {
      id: "tottori-event-navi",
      url: "data/tottori_events.csv",
      encoding: "utf-8",
      refresh: true,
      sourceType: "open-data",
      sourceName: "とっとりイベントナビ",
      sourceUrl: "https://tottori-eventnavi.jp/opendata",
      licenseName: "オープンデータ利用条件",
      licenseUrl: "https://tottori-eventnavi.jp/opendata",
      areaName: "鳥取県",
    },
    {
      id: "okazaki-open-data",
      url: "data/okazaki_events.csv",
      encoding: "utf-8",
      refresh: true,
      sourceType: "open-data",
      sourceName: "岡崎市イベント一覧",
      sourceUrl: "https://data.bodik.jp/dataset/232025_event",
      licenseName: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.ja",
      areaName: "愛知県岡崎市",
    },
  ];

  const TILE_URL =
    new URLSearchParams(window.location.search).get("tiles") ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  const TILE_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL)';

  const OVERVIEW_MAP = {
    url: "assets/maps/hamamatsu-overview.jpg?v=4",
    bounds: [
      [34.58, 137.4869556],
      [35.304395, 138.058702],
    ],
  };

  const VISITOR_COUNTER = {
    apiBase: "https://api.counterapi.dev/v1",
    namespace: "suzuking001-event-map",
    totalKey: "unique-visitors",
    dailyKeyPrefix: "visitors",
    historyDays: 7,
    timeZone: "Asia/Tokyo",
    productionHosts: ["suzuking001.github.io"],
    storagePrefix: "event-map-visitor-counter-v1",
  };

  window.App.config = {
    EVENT_CSV_SOURCES,
    TILE_URL,
    TILE_ATTRIBUTION,
    OVERVIEW_MAP,
    VISITOR_COUNTER,
  };
})();
