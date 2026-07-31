import { mkdir, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");

const SOURCES = [
  {
    id: "tottori-event-navi",
    label: "とっとりイベントナビ",
    url: "https://tottori-eventnavi.jp/api/opendata/events-export?format=csv",
    output: "tottori_events.csv",
    minimumRows: 20,
  },
];

const KAWASAKI_SOURCE = {
  id: "kawasaki-open-data",
  label: "川崎市のイベント情報",
  url: "https://eventapp.city.kawasaki.jp/data/api/v1/events",
  output: "kawasaki_events.csv",
  horizonDays: 365,
  minimumRows: 50,
  maximumPages: 20,
  placeIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const KAWASAKI_HEADERS = [
  "NO",
  "イベント名",
  "開始日",
  "終了日",
  "開催日一覧",
  "開始時間",
  "終了時間",
  "開催時間補足",
  "説明",
  "場所名称",
  "住所",
  "緯度",
  "経度",
  "カテゴリー",
  "URL",
  "開催区",
  "対象者",
  "対象者補足",
  "料金",
  "定員",
  "申込方法",
  "主催者",
  "問い合わせ先",
  "バリアフリー",
  "備考",
  "更新日時",
];

const parseArgs = args => {
  const dateArg = args.find(value => value.startsWith("--date="));
  return {
    date: dateArg ? dateArg.slice("--date=".length) : "",
  };
};

const formatTokyoDate = date => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const parseDateValue = value => {
  const match = String(value || "").trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return year * 10000 + month * 100 + day;
};

const addDays = (dateText, days) => {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`日付が不正です: ${dateText}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const parseCSV = text => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = (rows.shift() || []).map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header
  );
  return {
    headers,
    rows: rows.filter(values => values.some(value => String(value).trim())),
  };
};

const serializeCSV = ({ headers, rows }) => {
  const escapeField = value => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers, ...rows]
    .map(row => row.map(escapeField).join(","))
    .join("\r\n") + "\r\n";
};

const decodeCSV = buffer => {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("shift-jis", { fatal: true }).decode(bytes);
  }
};

const filterCurrentAndFuture = (payload, todayText) => {
  const startIndex = payload.headers.indexOf("開始日");
  const endIndex = payload.headers.indexOf("終了日");
  if (startIndex < 0 && endIndex < 0) {
    throw new Error("開始日または終了日の列がありません。");
  }

  const todayValue = parseDateValue(todayText);
  return {
    headers: payload.headers,
    rows: payload.rows.filter(row => {
      const endValue = endIndex >= 0 ? parseDateValue(row[endIndex]) : null;
      const startValue = startIndex >= 0 ? parseDateValue(row[startIndex]) : null;
      const eventEndValue = endValue ?? startValue;
      return eventEndValue != null && eventEndValue >= todayValue;
    }),
  };
};

const downloadSource = async (source, todayText) => {
  const response = await fetch(source.url, {
    headers: { "user-agent": "event-map-open-data-sync/1.0" },
  });
  if (!response.ok) {
    throw new Error(`${source.label}: HTTP ${response.status} ${response.statusText}`);
  }
  const text = decodeCSV(await response.arrayBuffer());
  const filtered = filterCurrentAndFuture(parseCSV(text), todayText);
  if (filtered.rows.length < source.minimumRows) {
    throw new Error(
      `${source.label}: ${filtered.rows.length}件しか取得できなかったため更新を中止しました。`
    );
  }
  return {
    source,
    csv: serializeCSV(filtered),
    count: filtered.rows.length,
  };
};

const stringifyList = values =>
  Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean))).join("\n");

const EMAIL_ADDRESS_PATTERN = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi;
const PHONE_NUMBER_PATTERNS = [
  /(?<![\dA-Z])0\d{1,4}[\-‐‑‒–—―ー－]\d{1,4}[\-‐‑‒–—―ー－]\d{3,4}(?!\d)/gi,
  /(?<![\dA-Z])0\d{1,4}\s*[（(]\d{1,4}[）)]\s*\d{3,4}(?!\d)/gi,
  /(?<![\dA-Z])0\d{1,4}\s+\d{1,4}\s+\d{3,4}(?!\d)/gi,
  /(?<![\dA-Z])0\d{9,10}(?!\d)/gi,
  /(?<![\dA-Z])\+81[\s\-‐‑‒–—―ー－]*(?:\(0\)[\s\-‐‑‒–—―ー－]*)?\d{1,4}[\s\-‐‑‒–—―ー－]+\d{1,4}[\s\-‐‑‒–—―ー－]+\d{3,4}(?!\d)/gi,
];

const removeDirectContactDetails = value => {
  let text = String(value || "").replace(EMAIL_ADDRESS_PATTERN, "");
  PHONE_NUMBER_PATTERNS.forEach(pattern => {
    text = text.replace(pattern, "");
  });
  return text
    .replace(/(?:メール|E-?mail|電話|TEL|FAX)\s*[:：]\s*(?=(?:[／/|,、，;；]|$))/gi, "")
    .replace(/[ \t]+(?=\n|$)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/(?:\s*[／/|]\s*){2,}/g, " / ")
    .replace(/^\s*[／/|,、，;；]+|[／/|,、，;；]+\s*$/g, "")
    .trim();
};

const assertNoDirectContactDetails = ({ headers, rows }) => {
  const excludedHeaders = new Set([
    "NO",
    "開始日",
    "終了日",
    "開催日一覧",
    "開始時間",
    "終了時間",
    "緯度",
    "経度",
    "URL",
    "更新日時",
  ]);
  const violations = [];
  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const header = headers[columnIndex];
      if (excludedHeaders.has(header)) return;
      const text = String(value || "");
      const hasEmail = new RegExp(EMAIL_ADDRESS_PATTERN.source, "i").test(text);
      const hasPhone = PHONE_NUMBER_PATTERNS.some(pattern =>
        new RegExp(pattern.source, "i").test(text)
      );
      if (hasEmail || hasPhone) violations.push(`${rowIndex + 2}行目「${header}」`);
    });
  });
  if (violations.length) {
    throw new Error(
      `川崎市イベントデータに直接連絡先が残っています: ${violations.slice(0, 5).join("、")}`
    );
  }
};

const buildKawasakiEventId = event => {
  const seed = [
    event.title,
    event.created_date,
    event.organizer,
    event.place_adr,
    event.open_url,
  ].map(value => String(value || "")).join("|");
  return `KAWASAKI-${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`;
};

const getKawasakiEventUrl = event =>
  event.open_url ||
  (event.rel_list || []).find(item => item && item.rel_url)?.rel_url ||
  (event.entry_list || []).find(item => item && item.entry_url)?.entry_url ||
  "";

const getKawasakiLocation = event => {
  const hasCoordinates = (latitude, longitude) =>
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) !== 0 &&
    Number(longitude) !== 0;
  if (hasCoordinates(event.place_lat, event.place_lon)) {
    return {
      latitude: Number(event.place_lat),
      longitude: Number(event.place_lon),
      address: event.place_adr || "",
    };
  }
  const subLocation = (event.event_location || []).find(location =>
    location && hasCoordinates(location.latitude, location.longitude)
  );
  return subLocation
    ? {
        latitude: Number(subLocation.latitude),
        longitude: Number(subLocation.longitude),
        address: subLocation.venue_address || event.place_adr || "",
      }
    : null;
};

const formatKawasakiEntries = entries => stringifyList(
  (entries || []).map(entry => [
    entry.entry_from && entry.entry_to
      ? `${entry.entry_from}〜${entry.entry_to}`
      : entry.entry_from || entry.entry_to || "",
    removeDirectContactDetails(entry.entry_post),
    removeDirectContactDetails(entry.entry_ext),
  ].filter(Boolean).join(" / "))
);

const formatKawasakiContacts = contacts => stringifyList(
  (contacts || []).map(contact => [
    removeDirectContactDetails(contact.contact),
    removeDirectContactDetails(contact.contact_ext),
  ].filter(Boolean).join(" / "))
);

const fetchKawasakiPage = async (source, page, from, to, place) => {
  const url = new URL(source.url);
  url.searchParams.set("page", String(page));
  url.searchParams.set("format", "JSON");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  if (place) url.searchParams.set("place", String(place));
  const response = await fetch(url, {
    headers: { "user-agent": "event-map-open-data-sync/1.0" },
  });
  if (!response.ok) {
    throw new Error(`${source.label}: HTTP ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload.event_data) || !Number.isInteger(payload.total_pages)) {
    throw new Error(`${source.label}: APIレスポンスの形式が不正です。`);
  }
  if (payload.total_pages > source.maximumPages) {
    throw new Error(`${source.label}: ページ数が上限を超えました (${payload.total_pages})。`);
  }
  return payload;
};

const downloadKawasakiEvents = async (source, todayText) => {
  const endText = addDays(todayText, source.horizonDays);
  const eventsById = new Map();
  for (const place of source.placeIds) {
    const firstPage = await fetchKawasakiPage(source, 1, todayText, endText, place);
    const pages = [firstPage];
    for (let page = 2; page <= firstPage.total_pages; page += 1) {
      pages.push(await fetchKawasakiPage(source, page, todayText, endText, place));
    }
    pages.flatMap(payload => payload.event_data).forEach(event => {
      const id = buildKawasakiEventId(event);
      if (!eventsById.has(id)) eventsById.set(id, event);
    });
  }
  const events = Array.from(eventsById.values());

  const startValue = parseDateValue(todayText);
  const endValue = parseDateValue(endText);
  const rows = events.flatMap(event => {
    const location = getKawasakiLocation(event);
    if (!location) return [];
    const dateEntries = (event.date_list || [])
      .filter(item => {
        const value = parseDateValue(item && item.date);
        return value != null && value >= startValue && value <= endValue;
      })
      .sort((left, right) => String(left.date).localeCompare(String(right.date)));
    const occurrenceDates = Array.from(new Set(dateEntries.map(item => item.date)));
    if (occurrenceDates.length === 0) return [];

    const startTimes = Array.from(new Set(dateEntries.map(item => item.time_from).filter(Boolean)));
    const endTimes = Array.from(new Set(dateEntries.map(item => item.time_to).filter(Boolean)));
    const timeRanges = Array.from(new Set(dateEntries.map(item => {
      const from = item.time_from || "";
      const to = item.time_to || "";
      return from && to ? `${from}〜${to}` : from || to;
    }).filter(Boolean)));
    const timeNotes = stringifyList([
      ...(timeRanges.length > 1 ? timeRanges : []),
      ...dateEntries.map(item => item.time_ext),
    ]);
    const notes = stringifyList([event.status_ext, event.note]);
    const categories = String(event.type1 || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean)
      .join(";");
    const values = {
      NO: buildKawasakiEventId(event),
      "イベント名": removeDirectContactDetails(event.title) || "イベント",
      "開始日": occurrenceDates[0],
      "終了日": occurrenceDates.at(-1),
      "開催日一覧": occurrenceDates.join(";"),
      "開始時間": startTimes.length === 1 ? startTimes[0] : "",
      "終了時間": endTimes.length === 1 ? endTimes[0] : "",
      "開催時間補足": removeDirectContactDetails(timeNotes),
      "説明": removeDirectContactDetails(event.content),
      "場所名称": removeDirectContactDetails(location.address || event.place) || "川崎市",
      "住所": removeDirectContactDetails(location.address),
      "緯度": location.latitude,
      "経度": location.longitude,
      "カテゴリー": removeDirectContactDetails(categories) || "未分類",
      URL: getKawasakiEventUrl(event),
      "開催区": removeDirectContactDetails(event.place),
      "対象者": removeDirectContactDetails(event.target),
      "対象者補足": removeDirectContactDetails(stringifyList([event.target_ext, event.target_area_ext])),
      "料金": removeDirectContactDetails(event.cost_ext),
      "定員": removeDirectContactDetails(event.capacity_ext),
      "申込方法": formatKawasakiEntries(event.entry_list),
      "主催者": removeDirectContactDetails(event.organizer),
      "問い合わせ先": formatKawasakiContacts(event.contact_list),
      "バリアフリー": removeDirectContactDetails(event.barrier_free),
      "備考": removeDirectContactDetails(notes),
      "更新日時": event.upd_date || "",
    };
    return [KAWASAKI_HEADERS.map(header => values[header] ?? "")];
  });

  if (rows.length < source.minimumRows) {
    throw new Error(`${source.label}: ${rows.length}件しか取得できなかったため更新を中止しました。`);
  }
  assertNoDirectContactDetails({ headers: KAWASAKI_HEADERS, rows });
  return {
    source,
    csv: serializeCSV({ headers: KAWASAKI_HEADERS, rows }),
    count: rows.length,
  };
};

const main = async () => {
  const { date } = parseArgs(process.argv.slice(2));
  const todayText = date || formatTokyoDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayText) || parseDateValue(todayText) == null) {
    throw new Error(`日付が不正です: ${todayText}`);
  }

  const downloads = await Promise.all([
    ...SOURCES.map(source => downloadSource(source, todayText)),
    downloadKawasakiEvents(KAWASAKI_SOURCE, todayText),
  ]);
  await mkdir(DATA_DIR, { recursive: true });

  for (const result of downloads) {
    const outputPath = path.join(DATA_DIR, result.source.output);
    const temporaryPath = `${outputPath}.tmp`;
    await writeFile(temporaryPath, result.csv, "utf8");
    await rename(temporaryPath, outputPath);
    console.log(`${result.source.label}: ${result.count}件 -> ${path.relative(PROJECT_ROOT, outputPath)}`);
  }
};

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
