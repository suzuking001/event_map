(() => {
  const {
    EVENT_CSV_SOURCES,
    TILE_URL,
    TILE_ATTRIBUTION,
    OVERVIEW_MAP,
  } = window.App.config;
  const { fetchCSV, parseCSV } = window.App.csv;
  const { escapeHtml } = window.App.utils;

  let menuToggle = null;
  const detailsModal = document.getElementById("details-modal");
  const detailsBody = document.getElementById("details-body");
  const detailsClose = document.getElementById("details-close");
  const detailsTitle = detailsModal ? detailsModal.querySelector(".details-title") : null;
  const aboutModal = document.getElementById("about-modal");
  const aboutClose = document.getElementById("about-close");
  const aboutButton = document.getElementById("about-button");
  const aboutStart = document.getElementById("about-start");
  const loading = document.getElementById("loading");

  const dateStart = document.getElementById("date-start");
  const dateEnd = document.getElementById("date-end");
  const dateClear = document.getElementById("date-clear");
  const dateRangeHint = document.getElementById("date-range-hint");
  const dateInfo = document.getElementById("date-info");
  const searchInput = document.getElementById("search-input");
  const categoryFilters = document.getElementById("category-filters");
  const categoryAll = document.getElementById("category-all");
  const categoryNone = document.getElementById("category-none");
  const filterSummary = document.getElementById("filter-summary");
  const visibleCount = document.getElementById("visible-count");
  const totalCount = document.getElementById("total-count");
  const dataRefreshStatus = document.getElementById("data-refresh-status");

  const CATEGORY_PALETTE = [
    "#2563eb",
    "#10b981",
    "#f97316",
    "#ef4444",
    "#0ea5e9",
    "#22c55e",
    "#f59e0b",
    "#14b8a6",
    "#e11d48",
    "#84cc16",
  ];

  const CATEGORY_ICON_RULES = [
    { pattern: /講座|教室|学習|ワークショップ/, icon: "📚" },
    { pattern: /スポーツ|運動|競技/, icon: "⚽" },
    { pattern: /こそだて|子育て|親子|こども|子ども/, icon: "🧸" },
    { pattern: /おんがく|音楽|コンサート|ライブ/, icon: "🎵" },
    { pattern: /かんきょう|環境|自然|エコ/, icon: "🌿" },
    { pattern: /おしらせ|お知らせ|案内/, icon: "📢" },
    { pattern: /そうだん|相談/, icon: "💬" },
    { pattern: /イベント|祭|催し/, icon: "🎪" },
  ];

  const getCategoryIcon = category => {
    const text = String(category || "");
    const rule = CATEGORY_ICON_RULES.find(item => item.pattern.test(text));
    return rule ? rule.icon : "📍";
  };

  const escapeValue = value => escapeHtml(value == null ? "" : value);

  const clampColor = value => Math.max(0, Math.min(255, value));

  const adjustColor = (hex, amount) => {
    if (!hex || hex[0] !== "#" || hex.length !== 7) {
      return hex;
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const next = value =>
      clampColor(value + amount).toString(16).padStart(2, "0");
    return `#${next(r)}${next(g)}${next(b)}`;
  };

  const hashString = value => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  };

  const categoryColorMap = new Map();
  const getCategoryColor = category => {
    if (!category) {
      return "#64748b";
    }
    if (categoryColorMap.has(category)) {
      return categoryColorMap.get(category);
    }
    const color =
      category === "未分類"
        ? "#6b7280"
        : CATEGORY_PALETTE[hashString(category) % CATEGORY_PALETTE.length];
    categoryColorMap.set(category, color);
    return color;
  };

  const parseDateValue = value => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  };

  const formatDateRange = (start, end) => {
    const startText = start ? String(start).trim() : "";
    const endText = end ? String(end).trim() : "";
    if (startText && endText && startText !== endText) {
      return `${startText}〜${endText}`;
    }
    if (startText) {
      return startText;
    }
    if (endText) {
      return endText;
    }
    return "日程未設定";
  };

  const formatTimeRange = (start, end) => {
    const startText = start ? String(start).trim() : "";
    const endText = end ? String(end).trim() : "";
    if (startText && endText) {
      return `${startText}〜${endText}`;
    }
    return startText || endText || "";
  };

  const normalizeUrl = raw => {
    const trimmed = raw ? String(raw).trim() : "";
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const getFaviconUrl = rawUrl => {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized) return "";
    try {
      const url = new URL(normalized);
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        url.hostname
      )}&sz=128`;
    } catch (error) {
      return "";
    }
  };

  const normalizeCategories = value => {
    const raw = value ? String(value).trim() : "";
    if (!raw) return ["未分類"];
    // "・" is part of official category names such as "講座・教室".
    const parts = raw.split(/[、/／]/).map(item => item.trim()).filter(Boolean);
    return parts.length ? parts : [raw];
  };

  const buildSearchText = fields => {
    const parts = [
      fields["イベント名"],
      fields["イベント名_カナ"],
      fields["イベント名_英語"],
      fields["場所名称"],
      fields["説明"],
      fields["住所"],
      fields["主催者"],
      fields["カテゴリー"],
      fields["区"],
      fields["備考"],
    ]
      .filter(Boolean)
      .map(value => String(value).trim())
      .filter(Boolean);
    return parts.join(" ").toLowerCase();
  };

  const debounce = (fn, waitMs) => {
    let timer = null;
    return (...args) => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, waitMs);
    };
  };

  const buildDetailsHtml = (event, headers) => {
    const rawUrl = event.fields.URL || "";
    const normalizedUrl = normalizeUrl(rawUrl);
    const urlButton = normalizedUrl
      ? `<a class="details-link-button" href="${escapeValue(normalizedUrl)}" target="_blank" rel="noopener">WEBページを開く</a>`
      : `<button class="details-link-button" type="button" disabled>WEBページなし</button>`;
    const faviconUrl = getFaviconUrl(rawUrl);
    const faviconHtml = faviconUrl
      ? `<img class="details-favicon" src="${escapeValue(faviconUrl)}" alt="WEBサイトのアイコン" loading="lazy" referrerpolicy="no-referrer">`
      : "";
    const searchQuery = `浜松市 ${event.name || "イベント"}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    const searchButton = `<a class="details-link-button" href="${searchUrl}" target="_blank" rel="noopener">Googleで検索</a>`;
    const dateRange = formatDateRange(event.startDate, event.endDate);
    const timeRange = formatTimeRange(event.startTime, event.endTime);
    const categoryText = event.categories.join(" / ");

    const summaryLines = [
      `期間: ${escapeValue(dateRange)}`,
      timeRange ? `時間: ${escapeValue(timeRange)}` : "",
      categoryText ? `カテゴリ: ${escapeValue(categoryText)}` : "",
      event.place ? `会場: ${escapeValue(event.place)}` : "",
    ].filter(Boolean);

    const summaryHtml = summaryLines.length
      ? `<div class="details-summary">${summaryLines
          .map(line => `<div>${line}</div>`)
          .join("")}</div>`
      : "";

    const rowsHtml = headers
      .map(header => {
        const rawValue = event.fields[header] || "";
        let valueHtml = escapeValue(rawValue).replace(/\r?\n/g, "<br>");
        if (header === "URL") {
          const normalizedValue = normalizeUrl(rawValue);
          valueHtml = normalizedValue
            ? `<a href="${escapeValue(normalizedValue)}" target="_blank" rel="noopener">${escapeValue(rawValue)}</a>`
            : "未記載";
        } else if (!valueHtml) {
          valueHtml = "未記載";
        }
        return `
          <div class="detail-row">
            <div class="detail-label">${escapeValue(header)}</div>
            <div class="detail-value">${valueHtml}</div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="details-actions">${faviconHtml}${urlButton}${searchButton}</div>
      ${summaryHtml}
      <div class="details-grid">${rowsHtml}</div>
    `;
  };

  const compareEventsForDisplay = (a, b) => {
    const aDate = a.startValue == null ? Number.POSITIVE_INFINITY : a.startValue;
    const bDate = b.startValue == null ? Number.POSITIVE_INFINITY : b.startValue;
    return aDate - bDate || a.name.localeCompare(b.name, "ja");
  };

  const getEventGroupPlace = events => {
    const places = Array.from(new Set(events.map(event => event.place).filter(Boolean)));
    return places.length === 1 ? places[0] : "同じ場所";
  };

  const buildEventGroupListHtml = events => {
    const place = getEventGroupPlace(events);
    const rows = events
      .map((event, index) => `
        <button class="event-group-list-item" type="button" data-group-event-index="${index}">
          <span class="event-group-list-icon" aria-hidden="true">${escapeValue(event.categoryIcon)}</span>
          <span class="event-group-list-copy">
            <strong>${escapeValue(event.name)}</strong>
            <span>${escapeValue(formatDateRange(event.startDate, event.endDate))}・${escapeValue(
              event.primaryCategory
            )}</span>
            ${event.place && event.place !== place ? `<small>${escapeValue(event.place)}</small>` : ""}
          </span>
          <span class="event-group-list-arrow" aria-hidden="true">›</span>
        </button>
      `)
      .join("");

    return `
      <div class="event-group-list-summary">
        <strong>${escapeValue(place)}</strong>
        <span>選択期間内のイベント ${events.length}件</span>
      </div>
      <div class="event-group-list">${rows}</div>
    `;
  };

  const hashText = text => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `${text.length}-${(hash >>> 0).toString(16)}`;
  };

  const buildFreshCsvUrl = csvUrl => {
    const url = new URL(csvUrl, window.location.href);
    url.searchParams.set("_event_map_refresh", String(Date.now()));
    return url.toString();
  };

  const formatCheckedTime = date =>
    new Intl.DateTimeFormat("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const setDataRefreshStatus = (message, state = "checking") => {
    if (!dataRefreshStatus) return;
    dataRefreshStatus.textContent = message;
    dataRefreshStatus.dataset.state = state;
  };

  const setDetailsOpen = (isOpen, htmlContent = "", titleText = "") => {
    if (!detailsModal || !detailsBody) {
      return;
    }
    if (isOpen) {
      if (detailsTitle) {
        detailsTitle.textContent = titleText || "イベント詳細";
      }
      detailsBody.innerHTML = htmlContent;
      detailsModal.inert = false;
      detailsModal.setAttribute("aria-hidden", "false");
      if (detailsClose) {
        detailsClose.focus();
      }
      detailsModal.classList.toggle("open", true);
      return;
    }
    if (detailsModal.contains(document.activeElement) && menuToggle) {
      menuToggle.focus();
    }
    detailsModal.classList.toggle("open", false);
    detailsModal.setAttribute("aria-hidden", "true");
    detailsModal.inert = true;
  };

  const setAboutOpen = isOpen => {
    if (!aboutModal) {
      return;
    }
    if (isOpen) {
      setDetailsOpen(false);
      aboutModal.inert = false;
      aboutModal.setAttribute("aria-hidden", "false");
      aboutModal.classList.toggle("open", true);
      if (aboutStart) {
        aboutStart.focus();
      } else if (aboutClose) {
        aboutClose.focus();
      }
      return;
    }
    if (aboutModal.contains(document.activeElement) && aboutButton) {
      aboutButton.focus();
    }
    aboutModal.classList.toggle("open", false);
    aboutModal.setAttribute("aria-hidden", "true");
    aboutModal.inert = true;
  };

  const setLoading = (isOpen, message = "データを読み込んでいます...") => {
    if (!loading) {
      return;
    }
    loading.textContent = message;
    loading.classList.toggle("open", isOpen);
    loading.setAttribute("aria-hidden", String(!isOpen));
  };

  const buildWorkerId = () => {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `csv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const fetchCSVViaWorker = (url, encoding = "shift-jis") =>
    new Promise((resolve, reject) => {
      if (!window.Worker) {
        reject(new Error("Worker not supported"));
        return;
      }
      const worker = new Worker("assets/js/event-csv-worker.js?v=4");
      const requestId = buildWorkerId();

      const cleanup = () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        worker.removeEventListener("messageerror", handleError);
        worker.terminate();
      };

      const handleMessage = event => {
        const data = event.data || {};
        if (data.id !== requestId) {
          return;
        }
        cleanup();
        if (data.ok) {
          resolve(data.payload);
        } else {
          reject(new Error(data.error || "Worker failed"));
        }
      };

      const handleError = error => {
        cleanup();
        reject(error);
      };

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.addEventListener("messageerror", handleError);
      worker.postMessage({ id: requestId, url, encoding });
    });

  const fetchAndParseEvents = async (source, forceRefresh = false) => {
    const url = forceRefresh && source.refresh
      ? buildFreshCsvUrl(source.url)
      : source.url;
    const encoding = source.encoding || "utf-8";
    if (window.Worker) {
      try {
        return await fetchCSVViaWorker(url, encoding);
      } catch (error) {
        console.warn("CSV worker failed. Falling back to main thread.", error);
      }
    }
    const csvText = await fetchCSV(url, encoding);
    return { ...parseCSV(csvText), fingerprint: hashText(csvText) };
  };

  const getEventKey = fields => {
    const id = String(fields.NO || "").trim();
    if (id) return `id:${id}`;
    return [
      fields["イベント名"],
      fields["開始日"],
      fields["終了日"],
      fields["場所名称"],
      fields["緯度"],
      fields["経度"],
    ].map(value => String(value || "").trim()).join("|");
  };

  const mergeEventPayloads = payloads => {
    const mergedHeaders = [];
    const headerSet = new Set();
    payloads.forEach(({ payload }) => {
      payload.headers.forEach(header => {
        if (headerSet.has(header)) return;
        headerSet.add(header);
        mergedHeaders.push(header);
      });
    });

    const eventsByKey = new Map();
    payloads.forEach(({ payload }) => {
      payload.rows.forEach(row => {
        const fields = {};
        payload.headers.forEach((header, index) => {
          fields[header] = row[index] == null ? "" : row[index];
        });
        const key = getEventKey(fields);
        if (!eventsByKey.has(key)) {
          eventsByKey.set(key, fields);
          return;
        }
        const existing = eventsByKey.get(key);
        mergedHeaders.forEach(header => {
          if (!existing[header] && fields[header]) {
            existing[header] = fields[header];
          }
        });
      });
    });

    const rows = Array.from(eventsByKey.values()).map(fields =>
      mergedHeaders.map(header => fields[header] || "")
    );
    const fingerprintSource = payloads
      .map(({ source, payload }) => `${source.id}:${payload.fingerprint || ""}`)
      .join("|");

    return {
      headers: mergedHeaders,
      rows,
      fingerprint: hashText(fingerprintSource),
    };
  };

  const loadEventSources = async (forceRefresh = false) => {
    const results = await Promise.allSettled(
      EVENT_CSV_SOURCES.map(source =>
        fetchAndParseEvents(source, forceRefresh).then(payload => ({ source, payload }))
      )
    );
    const loaded = results
      .filter(result => result.status === "fulfilled")
      .map(result => result.value);
    const failedSources = results
      .map((result, index) => ({ result, source: EVENT_CSV_SOURCES[index] }))
      .filter(item => item.result.status === "rejected");

    failedSources.forEach(({ result, source }) => {
      console.warn(`Event CSV load failed: ${source.id}`, result.reason);
    });
    if (loaded.length === 0) {
      throw new Error("すべてのイベントCSVを読み込めませんでした。");
    }

    return {
      ...mergeEventPayloads(loaded),
      failedSources,
    };
  };

  const setupMenuControls = () => {
    menuToggle = document.getElementById("menu-toggle");
    const menuBackdrop = document.getElementById("menu-backdrop");
    const menuHandle = document.getElementById("menu-handle");
    const sideMenu = document.getElementById("side-menu");
    const menuClose = document.getElementById("menu-close");

    const setMenuOpen = isOpen => {
      const activeElement = document.activeElement;
      if (!isOpen && sideMenu.contains(activeElement)) {
        if (menuHandle) {
          menuHandle.classList.remove("hidden");
          menuHandle.focus();
        } else if (menuToggle) {
          menuToggle.focus();
        } else if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
      }

      sideMenu.classList.toggle("open", isOpen);
      menuBackdrop.classList.toggle("open", isOpen);
      sideMenu.setAttribute("aria-hidden", String(!isOpen));
      sideMenu.inert = !isOpen;
      if (menuToggle) {
        menuToggle.setAttribute("aria-expanded", String(isOpen));
      }
      if (menuHandle) {
        menuHandle.classList.toggle("hidden", isOpen);
      }
    };

    if (menuToggle) {
      menuToggle.addEventListener("click", () => {
        if (!sideMenu.classList.contains("open")) {
          setMenuOpen(true);
        }
      });
    }
    if (menuClose) {
      menuClose.addEventListener("click", () => setMenuOpen(false));
    }
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        setDetailsOpen(false);
        setAboutOpen(false);
      }
    });
    if (detailsClose) {
      detailsClose.addEventListener("click", () => setDetailsOpen(false));
    }
    if (detailsModal) {
      detailsModal.addEventListener("click", event => {
        if (event.target === detailsModal) {
          setDetailsOpen(false);
        }
      });
    }
    if (aboutButton) {
      aboutButton.addEventListener("click", () => setAboutOpen(true));
    }
    if (aboutClose) {
      aboutClose.addEventListener("click", () => setAboutOpen(false));
    }
    if (aboutStart) {
      aboutStart.addEventListener("click", () => setAboutOpen(false));
    }
    if (aboutModal) {
      aboutModal.addEventListener("click", event => {
        if (event.target === aboutModal) {
          setAboutOpen(false);
        }
      });
    }
  };

  const buildCategoryFilters = categories => {
    if (!categoryFilters) {
      return;
    }
    categoryFilters.innerHTML = "";
    categories.forEach(({ name, count }) => {
      const label = document.createElement("label");
      label.className = "menu-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = name;
      input.checked = true;
      input.setAttribute("aria-label", `${name}（${count}件）`);

      const swatch = document.createElement("span");
      swatch.className = "category-icon";
      swatch.textContent = getCategoryIcon(name);
      swatch.setAttribute("aria-hidden", "true");
      const baseColor = getCategoryColor(name);
      swatch.style.backgroundColor = adjustColor(baseColor, 60);
      swatch.style.borderColor = adjustColor(baseColor, -24);

      const span = document.createElement("span");
      span.className = "menu-tag";
      span.textContent = name;

      const countSpan = document.createElement("span");
      countSpan.className = "category-count";
      countSpan.textContent = `${count}件`;
      countSpan.setAttribute("aria-hidden", "true");

      label.appendChild(input);
      label.appendChild(swatch);
      label.appendChild(span);
      label.appendChild(countSpan);
      categoryFilters.appendChild(label);
    });
  };

  const getSelectedCategories = () => {
    if (!categoryFilters) {
      return new Set();
    }
    const selected = new Set();
    const inputs = categoryFilters.querySelectorAll("input[type='checkbox']");
    inputs.forEach(input => {
      if (input.checked) {
        selected.add(input.value);
      }
    });
    return selected;
  };

  const setAllCategories = checked => {
    if (!categoryFilters) {
      return;
    }
    const inputs = categoryFilters.querySelectorAll("input[type='checkbox']");
    inputs.forEach(input => {
      input.checked = checked;
    });
  };

  async function main() {
    setupMenuControls();
    try {
      if (!sessionStorage.getItem("event-map-welcome-shown")) {
        sessionStorage.setItem("event-map-welcome-shown", "1");
        setAboutOpen(true);
      }
    } catch (error) {
      setAboutOpen(true);
    }
    if (dateRangeHint) {
      dateRangeHint.textContent = "データを読み込み中...";
    }
    setLoading(true);

    const map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    }).setView([34.7108, 137.7266], 12);

    map.createPane("overviewMapPane");
    const overviewMapPane = map.getPane("overviewMapPane");
    overviewMapPane.style.zIndex = "150";
    overviewMapPane.style.pointerEvents = "none";

    map.createPane("eventMarkerPane");
    const eventMarkerPane = map.getPane("eventMarkerPane");
    eventMarkerPane.style.zIndex = "675";

    L.imageOverlay(OVERVIEW_MAP.url, OVERVIEW_MAP.bounds, {
      pane: "overviewMapPane",
      interactive: false,
      alt: "浜松市ローカル概要地図",
    }).addTo(map);

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
      updateWhenIdle: false,
      updateWhenZooming: false,
      updateInterval: 200,
      keepBuffer: 2,
      detectRetina: false,
    }).addTo(map);

    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a> (MIT)'
    );
    map.attributionControl.setPosition("topright");

    const controlPosition = window.innerWidth <= 768 ? "topleft" : "bottomright";
    L.control.zoom({ position: controlPosition }).addTo(map);

    const locateControl = L.control({ position: controlPosition });
    locateControl.onAdd = () => {
      const container = L.DomUtil.create("div", "leaflet-control leaflet-control-locate");
      const button = L.DomUtil.create("button", "locate-button", container);
      button.type = "button";
      button.title = "現在地を表示";
      button.setAttribute("aria-label", "現在地を表示");
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4"></circle>
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
        </svg>
      `;

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, "click", event => {
        L.DomEvent.stop(event);
        map.locate({ setView: true, maxZoom: 16 });
      });
      return container;
    };
    locateControl.addTo(map);

    let locationMarker = null;
    let locationCircle = null;
    map.on("locationfound", event => {
      const { latlng, accuracy } = event;
      if (!locationMarker) {
        locationMarker = L.circleMarker(latlng, {
          radius: 8,
          color: "#2563eb",
          fillColor: "#60a5fa",
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map);
      } else {
        locationMarker.setLatLng(latlng);
      }

      if (!locationCircle) {
        locationCircle = L.circle(latlng, {
          radius: accuracy || 0,
          color: "#1d4ed8",
          fillColor: "#93c5fd",
          fillOpacity: 0.2,
          weight: 1,
        }).addTo(map);
      } else {
        locationCircle.setLatLng(latlng);
        locationCircle.setRadius(accuracy || 0);
      }
    });

    map.on("locationerror", event => {
      console.warn("位置情報の取得に失敗しました。", event.message);
      alert("位置情報の取得に失敗しました。ブラウザの許可設定をご確認ください。");
    });

    const isMobileViewport = window.innerWidth <= 768;
    const LABEL_MIN_ZOOM = isMobileViewport ? 14 : 12;
    const LABEL_FADE_MAX_ZOOM = isMobileViewport ? 16 : 15;
    const MARKER_VIEW_PADDING = isMobileViewport ? 0.2 : 0.35;
    let headers = [];
    let events = [];
    let markers = [];
    let activeEventGroup = null;
    let currentFingerprint = "";

    const buildEventData = (nextHeaders, rows) => {
      const events = [];
      const categoryCounts = new Map();
      let minDateValue = null;
      let maxDateValue = null;

      rows.forEach((row, rowIndex) => {
        const fields = {};
        nextHeaders.forEach((header, index) => {
          fields[header] = row[index] ? String(row[index]).trim() : "";
        });

        const name = fields["イベント名"] || "イベント";
        const startDate = fields["開始日"] || "";
        const endDate = fields["終了日"] || "";
        const startTime = fields["開始時間"] || "";
        const endTime = fields["終了時間"] || "";
        const place = fields["場所名称"] || "";
        const lat = parseFloat(fields["緯度"]);
        const lon = parseFloat(fields["経度"]);

        const categories = normalizeCategories(fields["カテゴリー"]);
        const primaryCategory = categories[0] || "未分類";
        const baseColor = getCategoryColor(primaryCategory);
        const startValue = parseDateValue(startDate);
        const endValue = parseDateValue(endDate || startDate);

        [startValue, endValue].forEach(value => {
          if (value == null) return;
          if (minDateValue == null || value < minDateValue) minDateValue = value;
          if (maxDateValue == null || value > maxDateValue) maxDateValue = value;
        });

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        categories.forEach(category => {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        });

        events.push({
          id: fields["NO"] || `event-${rowIndex}`,
          name,
          startDate,
          endDate,
          startTime,
          endTime,
          place,
          lat,
          lon,
          categories,
          primaryCategory,
          categoryIcon: getCategoryIcon(primaryCategory),
          strokeColor: adjustColor(baseColor, -24),
          fillColor: adjustColor(baseColor, 60),
          searchText: buildSearchText(fields),
          startValue,
          endValue: endValue || startValue,
          fields,
        });
      });

      return {
        events,
        categories: Array.from(categoryCounts, ([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja")),
        minDateValue,
        maxDateValue,
      };
    };

    const openEventGroup = groupEvents => {
      activeEventGroup = groupEvents;
      const place = getEventGroupPlace(groupEvents);
      setDetailsOpen(
        true,
        buildEventGroupListHtml(groupEvents),
        `${place}のイベント`
      );
    };

    const openLocationEvents = groupEvents => {
      if (groupEvents.length > 1) {
        openEventGroup(groupEvents);
        return;
      }
      const event = groupEvents[0];
      if (!event) return;
      activeEventGroup = null;
      setDetailsOpen(
        true,
        buildDetailsHtml(event, headers),
        event.name
      );
    };

    if (detailsBody) {
      detailsBody.addEventListener("click", event => {
        const eventButton = event.target.closest("[data-group-event-index]");
        if (eventButton && activeEventGroup) {
          const index = Number(eventButton.dataset.groupEventIndex);
          const selectedEvent = activeEventGroup[index];
          if (!selectedEvent) return;
          const backButton = `
            <button class="event-group-back" type="button" data-event-group-back>
              ← この場所のイベント一覧に戻る
            </button>
          `;
          setDetailsOpen(
            true,
            `${backButton}${buildDetailsHtml(selectedEvent, headers)}`,
            selectedEvent.name
          );
          return;
        }

        const backButton = event.target.closest("[data-event-group-back]");
        if (backButton && activeEventGroup) {
          openEventGroup(activeEventGroup);
        }
      });
    }

    const getLocationKey = event =>
      `${event.lat.toFixed(6)}|${event.lon.toFixed(6)}`;

    const buildLocationGroups = visibleEvents => {
      const groupsByLocation = new Map();
      visibleEvents.forEach(event => {
        const key = getLocationKey(event);
        if (!groupsByLocation.has(key)) {
          groupsByLocation.set(key, {
            key,
            lat: event.lat,
            lon: event.lon,
            events: [],
            marker: null,
            labels: [],
          });
        }
        groupsByLocation.get(key).events.push(event);
      });
      return Array.from(groupsByLocation.values()).map(group => {
        group.events.sort(compareEventsForDisplay);
        return group;
      });
    };

    const createMarkerForGroup = group => {
      const groupEvents = group.events;
      const firstEvent = groupEvents[0];
      if (groupEvents.length === 1) {
        const icon = L.divIcon({
          className: "event-marker-wrapper",
          html: `<span class="event-marker" style="--marker-color: ${escapeValue(
            firstEvent.fillColor
          )}; --marker-border: ${escapeValue(firstEvent.strokeColor)}" aria-hidden="true"><span class="event-marker-emoji">${escapeValue(
            firstEvent.categoryIcon
          )}</span></span>`,
          iconSize: [30, 32],
          iconAnchor: [15, 30],
          tooltipAnchor: [0, -25],
        });
        const marker = L.marker([group.lat, group.lon], {
          icon,
          pane: "eventMarkerPane",
          title: `${firstEvent.primaryCategory}: ${firstEvent.name}`,
          alt: `${firstEvent.primaryCategory}のイベント: ${firstEvent.name}`,
          keyboard: true,
        });
        marker.on("click", () => {
          openLocationEvents(groupEvents);
        });
        return marker;
      }

      const categoryIcons = Array.from(
        new Set(groupEvents.map(event => event.categoryIcon))
      );
      const visibleIcons = categoryIcons.slice(0, 3);
      const extraCategoryCount = categoryIcons.length - visibleIcons.length;
      const categoryNames = new Set(groupEvents.map(event => event.primaryCategory));
      const categoryNameList = Array.from(categoryNames);
      const usesSingleCategory = categoryNames.size === 1;
      const fillColor = usesSingleCategory ? firstEvent.fillColor : "#dbeafe";
      const strokeColor = usesSingleCategory ? firstEvent.strokeColor : "#2563eb";
      const displayCount = groupEvents.length > 99 ? "99+" : String(groupEvents.length);
      const place = getEventGroupPlace(groupEvents);

      const icon = L.divIcon({
        className: "event-marker-group-wrapper",
        html: `
          <span class="event-marker-group-shell">
            <span class="event-marker-group" style="--marker-color: ${escapeValue(
              fillColor
            )}; --marker-border: ${escapeValue(strokeColor)}" aria-hidden="true">
              <span class="event-marker-group-icons">${visibleIcons
                .map(iconText => `<span>${escapeValue(iconText)}</span>`)
                .join("")}${extraCategoryCount > 0 ? `<small>＋${extraCategoryCount}</small>` : ""}</span>
              <span class="event-marker-count">${displayCount}</span>
            </span>
          </span>
        `,
        iconSize: [48, 36],
        iconAnchor: [24, 30],
      });
      const marker = L.marker([group.lat, group.lon], {
        icon,
        pane: "eventMarkerPane",
        title: `${place}: ${categoryNameList.join("・")}のイベント${groupEvents.length}件。押すと一覧を表示します。`,
        alt: `${place}に${categoryNameList.join("、")}のイベント${groupEvents.length}件`,
        keyboard: true,
        zIndexOffset: 200,
      });

      marker.on("click", () => {
        openLocationEvents(groupEvents);
      });
      marker.on("mouseover", () => marker.setZIndexOffset(1000));
      marker.on("mouseout", () => marker.setZIndexOffset(200));
      return marker;
    };

    const getLabelOpacity = () => {
      const zoom = map.getZoom();
      if (zoom <= LABEL_MIN_ZOOM) {
        return 0;
      }
      if (zoom >= LABEL_FADE_MAX_ZOOM) {
        return 1;
      }
      return (zoom - LABEL_MIN_ZOOM) / (LABEL_FADE_MAX_ZOOM - LABEL_MIN_ZOOM);
    };

    const LABEL_STACK_X_STEP = 8;
    const LABEL_STACK_LINE_PEEK = 19;
    const getStackedLabelOffset = () => [0, -25];

    const buildMarkerLabelHtml = event => {
      const dateRange = formatDateRange(event.startDate, event.endDate);
      return `
        <span class="label-title">${escapeValue(event.name)}</span>
        <span class="label-meta">${escapeValue(event.categoryIcon)} ${escapeValue(
          event.primaryCategory
        )}・${escapeValue(dateRange)}</span>
      `;
    };

    const getDisplayLabelItems = item => {
      const visibleEvents = item.events.length > 4
        ? item.events.slice(0, 3)
        : item.events;
      const labelItems = visibleEvents.map(event => ({
        html: buildMarkerLabelHtml(event),
        ariaLabel: `${event.name}。クリックすると${item.events.length > 1 ? "この場所のイベント一覧" : "詳細"}を表示します。`,
        isSummary: false,
      }));
      if (item.events.length > 4) {
        const remainingCount = item.events.length - visibleEvents.length;
        labelItems.push({
          html: `
            <span class="label-title">ほか${remainingCount}件</span>
            <span class="label-meta">クリックして一覧を表示</span>
          `,
          ariaLabel: `ほか${remainingCount}件。クリックするとこの場所のイベント一覧を表示します。`,
          isSummary: true,
        });
      }
      return labelItems;
    };

    const createEventLabel = (item, labelItem) => {
      const label = L.tooltip({
        permanent: true,
        direction: "top",
        offset: getStackedLabelOffset(),
        className: `marker-label marker-label-event marker-label-stacked${labelItem.isSummary ? " marker-label-more" : ""}`,
        interactive: true,
      })
        .setLatLng([item.lat, item.lon])
        .setContent(labelItem.html);

      label.on("click", leafletEvent => {
        if (leafletEvent.originalEvent) {
          L.DomEvent.stop(leafletEvent.originalEvent);
        }
        openLocationEvents(item.events);
      });
      label.on("add", () => {
        const element = label.getElement();
        if (!element) return;
        element.setAttribute("aria-label", labelItem.ariaLabel);
      });
      return label;
    };

    const alignMarkerLabelStack = item => {
      const elements = item.labels
        .map(label => label.getElement())
        .filter(Boolean);
      if (elements.length === 0) return;

      elements.forEach(element => {
        element.style.translate = "";
      });

      const lastIndex = elements.length - 1;
      const referenceRect = elements[lastIndex].getBoundingClientRect();
      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const distanceFromFront = lastIndex - index;
        const targetLeft = referenceRect.left - distanceFromFront * LABEL_STACK_X_STEP;
        const targetTop = referenceRect.top - distanceFromFront * LABEL_STACK_LINE_PEEK;
        element.style.translate = `${Math.round(targetLeft - rect.left)}px ${Math.round(
          targetTop - rect.top
        )}px`;
        element.style.zIndex = String(index + 1);
      });
    };

    const removeMarkerLabels = item => {
      item.labels.forEach(label => {
        if (map.hasLayer(label)) map.removeLayer(label);
      });
    };

    const syncMarkerLabels = () => {
      const opacity = getLabelOpacity();
      markers.forEach(item => {
        const markerIsVisible = item.marker && map.hasLayer(item.marker);
        if (!markerIsVisible || opacity <= 0) {
          removeMarkerLabels(item);
          return;
        }
        if (item.labels.length === 0) {
          const labelItems = getDisplayLabelItems(item);
          item.labels = labelItems.map(labelItem => createEventLabel(item, labelItem));
        }
        item.labels.forEach(label => {
          if (!map.hasLayer(label)) label.addTo(map);
          const element = label.getElement();
          if (!element) return;
          element.style.opacity = String(opacity);
          element.style.pointerEvents = opacity < 0.2 ? "none" : "auto";
        });
        alignMarkerLabelStack(item);
      });
    };

    const syncMarkersToViewport = () => {
      const paddedBounds = map.getBounds().pad(MARKER_VIEW_PADDING);
      markers.forEach(item => {
        const shouldRender = paddedBounds.contains([item.lat, item.lon]);
        if (shouldRender) {
          if (!item.marker) {
            item.marker = createMarkerForGroup(item);
          }
          if (!map.hasLayer(item.marker)) {
            item.marker.addTo(map);
          }
        } else if (item.marker && map.hasLayer(item.marker)) {
          removeMarkerLabels(item);
          map.removeLayer(item.marker);
        }
      });
      syncMarkerLabels();
    };

    const rebuildLocationMarkers = visibleEvents => {
      markers.forEach(item => {
        removeMarkerLabels(item);
        if (item.marker && map.hasLayer(item.marker)) map.removeLayer(item.marker);
      });
      markers = buildLocationGroups(visibleEvents);
      syncMarkersToViewport();
    };

    map.on("moveend", syncMarkersToViewport);

    const matchesDateRange = (event, startFilter, endFilter) => {
      const eventStart = event.startValue;
      const eventEnd = event.endValue || eventStart;

      if (startFilter != null && eventEnd != null && eventEnd < startFilter) {
        return false;
      }
      if (endFilter != null && eventStart != null && eventStart > endFilter) {
        return false;
      }
      return true;
    };

    const applyFilters = () => {
      const selectedCategories = getSelectedCategories();
      let startFilter = parseDateValue(dateStart ? dateStart.value : "");
      let endFilter = parseDateValue(dateEnd ? dateEnd.value : "");
      if (startFilter != null && endFilter != null && startFilter > endFilter) {
        const temp = startFilter;
        startFilter = endFilter;
        endFilter = temp;
      }
      const hasDateFilter = Boolean(
        (dateStart && dateStart.value) || (dateEnd && dateEnd.value)
      );
      const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
      const keywordParts = keyword ? keyword.split(/\s+/).filter(Boolean) : [];
      const visibleEvents = [];

      if (!hasDateFilter) {
        rebuildLocationMarkers([]);
        if (visibleCount) {
          visibleCount.textContent = "0";
        }
        if (dateInfo) {
          dateInfo.textContent = "期間を選択すると表示されます";
        }
        return;
      }

      events.forEach(event => {
        const categoryMatch = selectedCategories.size === 0
          ? false
          : event.categories.some(cat => selectedCategories.has(cat));
        const dateMatch = matchesDateRange(event, startFilter, endFilter);
        const keywordMatch = keywordParts.length === 0
          ? true
          : keywordParts.every(part => event.searchText.includes(part));
        const shouldShow = categoryMatch && dateMatch && keywordMatch;
        if (shouldShow) visibleEvents.push(event);
      });
      rebuildLocationMarkers(visibleEvents);
      const visible = visibleEvents.length;

      if (visibleCount) {
        visibleCount.textContent = `${visible}`;
      }

      const startText = dateStart && dateStart.value ? dateStart.value : "";
      const endText = dateEnd && dateEnd.value ? dateEnd.value : "";
      if (dateInfo) {
        if (startText || endText) {
          if (startText && endText) {
            dateInfo.textContent = `選択期間: ${startText} ～ ${endText} / 表示中: ${visible}件`;
          } else if (startText) {
            dateInfo.textContent = `開始日以降: ${startText} / 表示中: ${visible}件`;
          } else {
            dateInfo.textContent = `終了日以前: ${endText} / 表示中: ${visible}件`;
          }
        } else {
          dateInfo.textContent = `未選択 / 全日表示 / 表示中: ${visible}件`;
        }
      }
    };

    const updateDateBounds = (minDateValue, maxDateValue, initializeDates) => {
      if (!dateStart || !dateEnd) return;
      if (minDateValue == null || maxDateValue == null) {
        dateStart.removeAttribute("min");
        dateStart.removeAttribute("max");
        dateEnd.removeAttribute("min");
        dateEnd.removeAttribute("max");
        if (dateRangeHint) dateRangeHint.textContent = "日付データがありません。";
        return;
      }

      const pad = value => String(value).padStart(2, "0");
      const formatDate = date =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      dateStart.min = formatDate(new Date(minDateValue));
      dateEnd.min = dateStart.min;
      dateStart.max = formatDate(new Date(maxDateValue));
      dateEnd.max = dateStart.max;
      if (dateRangeHint) {
        dateRangeHint.textContent = `確認可能期間: ${dateStart.min} ～ ${dateEnd.max}`;
      }

      if (!initializeDates || dateStart.value || dateEnd.value) return;
      const today = new Date();
      const todayText = formatDate(today);
      const todayValue = parseDateValue(todayText);
      if (
        todayValue == null ||
        todayValue < minDateValue ||
        todayValue > maxDateValue
      ) {
        return;
      }
      const oneWeekLater = new Date(today);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      const endText = formatDate(oneWeekLater);
      const endValue = parseDateValue(endText);
      dateStart.value = todayText;
      dateEnd.value = endValue != null && endValue <= maxDateValue
        ? endText
        : dateEnd.max;
    };

    const replaceEventData = (payload, initializeDates = false) => {
      const previousInputs = categoryFilters
        ? Array.from(categoryFilters.querySelectorAll("input[type='checkbox']"))
        : [];
      const previousSelected = new Set(
        previousInputs.filter(input => input.checked).map(input => input.value)
      );
      const allWereSelected =
        previousInputs.length > 0 && previousSelected.size === previousInputs.length;

      rebuildLocationMarkers([]);

      const next = buildEventData(payload.headers, payload.rows);
      headers = payload.headers;
      events = next.events;
      currentFingerprint = payload.fingerprint || "";
      buildCategoryFilters(next.categories);

      if (!initializeDates && previousInputs.length > 0 && categoryFilters) {
        categoryFilters
          .querySelectorAll("input[type='checkbox']")
          .forEach(input => {
            input.checked = allWereSelected || previousSelected.has(input.value);
          });
      }

      updateDateBounds(next.minDateValue, next.maxDateValue, initializeDates);
      if (totalCount) totalCount.textContent = `${events.length}`;
      if (filterSummary) filterSummary.classList.remove("hidden");
      applyFilters();
    };

    if (dateStart) {
      dateStart.addEventListener("change", applyFilters);
    }
    if (dateEnd) {
      dateEnd.addEventListener("change", applyFilters);
    }
    if (dateClear) {
      dateClear.addEventListener("click", () => {
        if (dateStart) dateStart.value = "";
        if (dateEnd) dateEnd.value = "";
        applyFilters();
      });
    }
    if (categoryFilters) {
      categoryFilters.addEventListener("change", applyFilters);
    }
    if (searchInput) {
      const debouncedApply = debounce(applyFilters, 250);
      searchInput.addEventListener("input", debouncedApply);
    }
    if (categoryAll) {
      categoryAll.addEventListener("click", () => {
        setAllCategories(true);
        applyFilters();
      });
    }
    if (categoryNone) {
      categoryNone.addEventListener("click", () => {
        setAllCategories(false);
        applyFilters();
      });
    }

    setDataRefreshStatus("イベント情報を自動で読み込んでいます...");

    let initialPayload;
    try {
      initialPayload = await loadEventSources(false);
      replaceEventData(initialPayload, true);
    } finally {
      setLoading(false);
    }

    if (initialPayload.failedSources.length > 0) {
      setDataRefreshStatus(
        "一部のデータを取得できませんでした。読み込めたイベントを表示しています。",
        "warning"
      );
    } else {
      setDataRefreshStatus("イベント情報を表示中・最新情報を確認しています...");
    }

    void (async () => {
      try {
        const freshPayload = await loadEventSources(true);
        if (freshPayload.failedSources.length > 0) {
          setDataRefreshStatus(
            "通信できないデータがあるため、取得済みのイベント情報を表示しています。",
            "warning"
          );
          return;
        }
        if (freshPayload.fingerprint !== currentFingerprint) {
          replaceEventData(freshPayload, false);
          setDataRefreshStatus(
            `最新情報に更新しました（${formatCheckedTime(new Date())}）`,
            "success"
          );
        } else {
          setDataRefreshStatus(
            `最新情報を確認しました（${formatCheckedTime(new Date())}）`,
            "success"
          );
        }
      } catch (error) {
        console.warn("Fresh event data fetch failed. Using cached data.", error);
        setDataRefreshStatus(
          "通信できないため、保存済みのイベント情報を表示しています。",
          "warning"
        );
      }
    })();
  }

  main().catch(error => {
    console.error(error);
    alert("イベントデータの読み込みに失敗しました。");
  });
})();
