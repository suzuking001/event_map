import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "assets", "maps", "hamamatsu-overview.svg");

// Nominatim bounding box for OSM relation 4674741 (浜松市), with the offshore
// administrative area trimmed so the fallback focuses on the usable land map.
const BOUNDS = {
  south: 34.58,
  west: 137.4869556,
  north: 35.304395,
  east: 138.058702,
};

const WIDTH = 1600;
const mercatorY = lat => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const northY = mercatorY(BOUNDS.north);
const southY = mercatorY(BOUNDS.south);
const HEIGHT = Math.round(
  WIDTH * (northY - southY) / (((BOUNDS.east - BOUNDS.west) * Math.PI) / 180)
);

const project = point => ({
  x: ((point.lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * WIDTH,
  y: ((northY - mercatorY(point.lat)) / (northY - southY)) * HEIGHT,
});

const number = value => Math.round(value);

const linePath = (geometry, close = false) => {
  if (!geometry || geometry.length < 2) return "";
  const points = [];
  let previous;
  for (const coordinate of geometry) {
    const current = project(coordinate);
    if (
      !previous ||
      Math.abs(current.x - previous.x) >= 0.45 ||
      Math.abs(current.y - previous.y) >= 0.45
    ) {
      points.push(current);
      previous = current;
    }
  }
  if (points.length < 2) return "";
  const commands = points.map(
    (point, index) => `${index ? "L" : "M"}${number(point.x)} ${number(point.y)}`
  );
  if (close) commands.push("Z");
  return commands.join("");
};

const coordinatePath = (coordinates, close = false) =>
  linePath(coordinates.map(([lon, lat]) => ({ lon, lat })), close);

const clipRing = coordinates => {
  const boundaries = [
    {
      inside: ([lon]) => lon >= BOUNDS.west,
      intersect: ([lonA, latA], [lonB, latB]) => [
        BOUNDS.west,
        latA + ((latB - latA) * (BOUNDS.west - lonA)) / (lonB - lonA),
      ],
    },
    {
      inside: ([lon]) => lon <= BOUNDS.east,
      intersect: ([lonA, latA], [lonB, latB]) => [
        BOUNDS.east,
        latA + ((latB - latA) * (BOUNDS.east - lonA)) / (lonB - lonA),
      ],
    },
    {
      inside: ([, lat]) => lat >= BOUNDS.south,
      intersect: ([lonA, latA], [lonB, latB]) => [
        lonA + ((lonB - lonA) * (BOUNDS.south - latA)) / (latB - latA),
        BOUNDS.south,
      ],
    },
    {
      inside: ([, lat]) => lat <= BOUNDS.north,
      intersect: ([lonA, latA], [lonB, latB]) => [
        lonA + ((lonB - lonA) * (BOUNDS.north - latA)) / (latB - latA),
        BOUNDS.north,
      ],
    },
  ];

  let output = coordinates;
  for (const boundary of boundaries) {
    const input = output;
    output = [];
    if (!input.length) break;
    let previous = input[input.length - 1];
    for (const current of input) {
      const currentInside = boundary.inside(current);
      const previousInside = boundary.inside(previous);
      if (currentInside) {
        if (!previousInside) output.push(boundary.intersect(previous, current));
        output.push(current);
      } else if (previousInside) {
        output.push(boundary.intersect(previous, current));
      }
      previous = current;
    }
  }
  return output;
};

const intersectsBounds = coordinates => {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coordinates) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return !(
    maxLon < BOUNDS.west ||
    minLon > BOUNDS.east ||
    maxLat < BOUNDS.south ||
    minLat > BOUNDS.north
  );
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
};

const overpassBounds = `${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}`;
const overpassQuery = `
[out:json][timeout:120];
(
  rel(4674741);
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${overpassBounds});
  way["railway"~"^(rail|light_rail)$"](${overpassBounds});
  way["waterway"~"^(river|canal)$"]["name"](${overpassBounds});
  way["natural"="water"](${overpassBounds});
);
out geom;
`;

const fetchOverpass = async () => {
  const body = new URLSearchParams({ data: overpassQuery });
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastError;
  for (const endpoint of endpoints) {
    try {
      return await fetchJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "HamamatsuEventMap/1.0 (static fallback map generator)",
        },
        body,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const [osm, land] = await Promise.all([
  fetchOverpass(),
  fetchJson(
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson"
  ),
]);

const layers = {
  land: [],
  water: [],
  river: [],
  rail: [],
  tertiary: [],
  secondary: [],
  primary: [],
  trunk: [],
  motorway: [],
  boundary: [],
};

for (const feature of land.features) {
  const polygons = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  for (const polygon of polygons) {
    if (!polygon.some(intersectsBounds)) continue;
    const pathData = polygon
      .map(clipRing)
      .filter(ring => ring.length >= 3)
      .map(ring => coordinatePath(ring, true))
      .join("");
    if (pathData) layers.land.push(pathData);
  }
}

for (const element of osm.elements) {
  const tags = element.tags || {};
  if (element.type === "way" && element.geometry) {
    if (tags.highway && layers[tags.highway]) {
      layers[tags.highway].push(linePath(element.geometry));
    } else if (tags.railway) {
      layers.rail.push(linePath(element.geometry));
    } else if (tags.waterway) {
      layers.river.push(linePath(element.geometry));
    } else if (tags.natural === "water") {
      layers.water.push(linePath(element.geometry, true));
    }
  }

  if (element.type === "relation" && element.members) {
    if (element.id === 4674741) {
      for (const member of element.members) {
        if (member.geometry) layers.boundary.push(linePath(member.geometry));
      }
    } else if (tags.natural === "water") {
      const pathData = element.members
        .filter(member => member.geometry)
        .map(member => linePath(member.geometry, member.role === "outer" || member.role === "inner"))
        .join("");
      if (pathData) layers.water.push(pathData);
    }
  }
}

const group = (className, paths) =>
  paths.filter(Boolean).length
    ? `<path class="${className}" d="${paths.filter(Boolean).join("")}"/>`
    : "";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none">
  <title>浜松市ローカル概要地図</title>
  <metadata>Map data © OpenStreetMap contributors (ODbL); coastline © Natural Earth (public domain). Generated for Hamamatsu Event Map.</metadata>
  <style>
    .land{fill:#eef0e8;stroke:none}.water{fill:#b9d9e8;stroke:#91c4da;stroke-width:.6;fill-rule:evenodd}
    .river,.boundary,.rail,.tertiary,.secondary,.primary,.trunk,.motorway{vector-effect:non-scaling-stroke}
    .river{fill:none;stroke:#72b4cf;stroke-width:.8;stroke-linecap:round}.boundary{fill:none;stroke:#697780;stroke-width:.8;stroke-dasharray:4 3}
    .rail{fill:none;stroke:#606a72;stroke-width:.9;stroke-dasharray:3 3;stroke-linecap:round}.tertiary,.secondary,.primary,.trunk,.motorway{fill:none;stroke-linecap:round;stroke-linejoin:round}
    .tertiary{stroke:#fff;stroke-width:.8}.secondary{stroke:#e7c58f;stroke-width:1}.primary{stroke:#e9ad63;stroke-width:1.4}.trunk{stroke:#dc914f;stroke-width:1.8}.motorway{stroke:#cf7444;stroke-width:2.2}
  </style>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#b9d9e8"/>
  ${group("land", layers.land)}
  ${group("water", layers.water)}
  ${group("river", layers.river)}
  ${group("rail", layers.rail)}
  ${group("tertiary", layers.tertiary)}
  ${group("secondary", layers.secondary)}
  ${group("primary", layers.primary)}
  ${group("trunk", layers.trunk)}
  ${group("motorway", layers.motorway)}
  ${group("boundary", layers.boundary)}
</svg>`;

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, svg, "utf8");

const counts = Object.fromEntries(
  Object.entries(layers).map(([name, paths]) => [name, paths.filter(Boolean).length])
);
console.log(JSON.stringify({ output: OUTPUT, width: WIDTH, height: HEIGHT, counts }, null, 2));
