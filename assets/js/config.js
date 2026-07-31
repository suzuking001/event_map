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
      loadBounds: [
        [34.58, 137.48],
        [35.31, 138.06],
      ],
      searchKeywords: ["浜松", "浜松市"],
    },
    {
      id: "osaka-open-data",
      url: "https://data.bodik.jp/api/3/action/datastore_search?resource_id=a6f32430-9e39-49f7-b429-6e4eadcc96de&limit=1000",
      format: "ckan-jsonp",
      refresh: true,
      currentAndFutureOnly: true,
      minimumRows: 20,
      sourceType: "open-data",
      sourceName: "大阪府イベント一覧",
      sourceUrl: "https://data.bodik.jp/dataset/270008_event",
      licenseName: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.ja",
      defaultCategory: "公園・自然",
      areaName: "大阪府",
      loadBounds: [
        [34.27, 134.85],
        [35.05, 135.75],
      ],
      searchKeywords: ["大阪", "大阪府"],
    },
    {
      id: "tottori-event-navi",
      url: "data/tottori_events.csv",
      encoding: "utf-8",
      refresh: true,
      refreshOnLoad: true,
      sourceType: "open-data",
      sourceName: "とっとりイベントナビ",
      sourceUrl: "https://tottori-eventnavi.jp/opendata",
      licenseName: "オープンデータ利用条件",
      licenseUrl: "https://tottori-eventnavi.jp/opendata",
      areaName: "鳥取県",
      loadBounds: [
        [35.05, 133.12],
        [35.62, 134.52],
      ],
      searchKeywords: ["鳥取", "鳥取県", "とっとり"],
    },
    {
      id: "okazaki-open-data",
      url: "https://data.bodik.jp/api/3/action/datastore_search?resource_id=92a4cbd7-1a7d-47ef-9ead-4c6e42fe6eba&limit=1000",
      format: "ckan-jsonp",
      refresh: true,
      currentAndFutureOnly: true,
      minimumRows: 20,
      sourceType: "open-data",
      sourceName: "岡崎市イベント一覧",
      sourceUrl: "https://data.bodik.jp/dataset/232025_event",
      licenseName: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.ja",
      areaName: "愛知県岡崎市",
      loadBounds: [
        [34.78, 137.04],
        [35.06, 137.42],
      ],
      searchKeywords: ["岡崎", "岡崎市"],
    },
    {
      id: "aizuwakamatsu-open-data",
      url: "https://data.data4citizen.jp/api/3/action/datastore_search_sql",
      format: "ckan-sql-jsonp",
      resourceId: "278639b4-8f7f-4bda-b36d-55711f19552b",
      dateFields: {
        start: "start_date",
        end: "end_date",
      },
      dateSeparator: "/",
      fieldMap: {
        NO: "_id",
        "イベント名": "title",
        "開始日": "start_date",
        "終了日": "end_date",
        "開始時間": "start_time",
        "終了時間": "end_time",
        "説明": "description",
        "場所名称": "place",
        "経度": "x",
        "緯度": "y",
        URL: "link",
        "募集開始日": "bosyu_start",
        "募集終了日": "bosyu_end",
        "募集案内": "bosyu_description",
        "問い合わせ先": "contact",
      },
      outputFields: [
        "NO",
        "イベント名",
        "開始日",
        "終了日",
        "開始時間",
        "終了時間",
        "説明",
        "場所名称",
        "経度",
        "緯度",
        "URL",
        "募集開始日",
        "募集終了日",
        "募集案内",
        "問い合わせ先",
      ],
      lineBreakToken: "#nr#",
      refresh: true,
      currentAndFutureOnly: true,
      minimumRows: 1,
      sourceType: "open-data",
      sourceName: "会津若松市のイベント情報",
      sourceUrl: "https://data.data4citizen.jp/dataset/10060001",
      licenseName: "クリエイティブ・コモンズ 表示",
      licenseUrl: "https://opendefinition.org/licenses/cc-by/",
      defaultCategory: "未分類",
      areaName: "福島県会津若松市",
      loadBounds: [
        [37.3, 139.68],
        [37.68, 140.12],
      ],
      searchKeywords: ["会津", "会津若松", "会津若松市"],
    },
    {
      id: "kawasaki-open-data",
      url: "data/kawasaki_events.csv",
      encoding: "utf-8",
      refresh: true,
      refreshOnLoad: true,
      sourceType: "open-data",
      sourceName: "川崎市のイベント情報のオープンデータ",
      sourceUrl: "https://eventapp.city.kawasaki.jp/data/api/v1/reference.html",
      licenseName: "CC BY 2.1 日本",
      licenseUrl: "https://creativecommons.org/licenses/by/2.1/jp/",
      areaName: "神奈川県川崎市",
      loadBounds: [
        [35.47, 139.43],
        [35.65, 139.82],
      ],
      searchKeywords: ["川崎", "川崎市"],
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
