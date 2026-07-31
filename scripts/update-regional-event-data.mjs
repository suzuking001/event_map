import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");

const SOURCES = [
  {
    id: "osaka-open-data",
    label: "大阪府イベント一覧",
    url: "https://data.bodik.jp/dataset/388c34d1-f97a-4865-a547-8e89c53a364a/resource/a6f32430-9e39-49f7-b429-6e4eadcc96de/download/270008_event.csv",
    output: "osaka_events.csv",
    minimumRows: 20,
  },
  {
    id: "tottori-event-navi",
    label: "とっとりイベントナビ",
    url: "https://tottori-eventnavi.jp/api/opendata/events-export?format=csv",
    output: "tottori_events.csv",
    minimumRows: 20,
  },
  {
    id: "okazaki-open-data",
    label: "岡崎市イベント一覧",
    url: "https://data.bodik.jp/dataset/beb99975-6d85-4463-8767-0cb1d7c414e0/resource/92a4cbd7-1a7d-47ef-9ead-4c6e42fe6eba/download/232025_event.csv",
    output: "okazaki_events.csv",
    minimumRows: 20,
  },
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

const main = async () => {
  const { date } = parseArgs(process.argv.slice(2));
  const todayText = date || formatTokyoDate(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayText) || parseDateValue(todayText) == null) {
    throw new Error(`日付が不正です: ${todayText}`);
  }

  const downloads = await Promise.all(
    SOURCES.map(source => downloadSource(source, todayText))
  );
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
