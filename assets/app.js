(() => {
  const {
    EVENT_CSV_URL,
    TILE_URL,
    TILE_ATTRIBUTION,
    DATASET_ATTRIBUTION,
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

  const dateStart = document.getElementById("date-start");
  const dateEnd = document.getElementById("date-end");
  const dateClear = document.getElementById("date-clear");
  const dateRangeHint = document.getElementById("date-range-hint");
  const dateInfo = document.getElementById("date-info");
  const categoryFilters = document.getElementById("category-filters");
  const categoryAll = document.getElementById("category-all");
  const categoryNone = document.getElementById("category-none");
  const filterSummary = document.getElementById("filter-summary");
  const visibleCount = document.getElementById("visible-count");
  const totalCount = document.getElementById("total-count");

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

  const normalizeCategories = value => {
    const raw = value ? String(value).trim() : "";
    if (!raw) return ["未分類"];
    const parts = raw.split(/[、/／・]/).map(item => item.trim()).filter(Boolean);
    return parts.length ? parts : [raw];
  };

  const buildDetailsHtml = (event, headers) => {
    const url = event.fields.URL || "";
    const urlButton = url
      ? `<a class="details-link-button" href="${escapeValue(url)}" target="_blank" rel="noopener">WEBページを開く</a>`
      : `<button class="details-link-button" type="button" disabled>WEBページなし</button>`;
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
          valueHtml = rawValue
            ? `<a href="${escapeValue(rawValue)}" target="_blank" rel="noopener">${escapeValue(rawValue)}</a>`
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
      <div class="details-actions">${urlButton}</div>
      ${summaryHtml}
      <div class="details-grid">${rowsHtml}</div>
    `;
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
      if (aboutClose) {
        aboutClose.focus();
      }
      aboutModal.classList.toggle("open", true);
      return;
    }
    if (aboutModal.contains(document.activeElement) && aboutButton) {
      aboutButton.focus();
    }
    aboutModal.classList.toggle("open", false);
    aboutModal.setAttribute("aria-hidden", "true");
    aboutModal.inert = true;
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
    categories.forEach(category => {
      const label = document.createElement("label");
      label.className = "menu-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = category;
      input.checked = true;

      const swatch = document.createElement("span");
      swatch.className = "category-swatch";
      const baseColor = getCategoryColor(category);
      swatch.style.backgroundColor = baseColor;
      swatch.style.borderColor = adjustColor(baseColor, -24);

      const span = document.createElement("span");
      span.className = "menu-tag";
      span.textContent = category;

      label.appendChild(input);
      label.appendChild(swatch);
      label.appendChild(span);
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

    const csvText = await fetchCSV(EVENT_CSV_URL);
    const { headers, rows } = parseCSV(csvText);

    const events = [];
    const categorySet = new Set();
    let minDateValue = null;
    let maxDateValue = null;

    rows.forEach((row, rowIndex) => {
      const fields = {};
      headers.forEach((header, index) => {
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
      categories.forEach(cat => categorySet.add(cat));
      const primaryCategory = categories[0] || "未分類";
      const baseColor = getCategoryColor(primaryCategory);
      const strokeColor = adjustColor(baseColor, -24);
      const fillColor = adjustColor(baseColor, 60);

      const startValue = parseDateValue(startDate);
      const endValue = parseDateValue(endDate || startDate);
      [startValue, endValue].forEach(value => {
        if (value == null) return;
        if (minDateValue == null || value < minDateValue) {
          minDateValue = value;
        }
        if (maxDateValue == null || value > maxDateValue) {
          maxDateValue = value;
        }
      });

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return;
      }

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
        strokeColor,
        fillColor,
        startValue,
        endValue: endValue || startValue,
        fields,
      });
    });

    const sortedCategories = Array.from(categorySet).sort((a, b) =>
      a.localeCompare(b, "ja")
    );
    buildCategoryFilters(sortedCategories);

    if (dateStart && dateEnd) {
      if (minDateValue != null && maxDateValue != null) {
        const minDate = new Date(minDateValue);
        const maxDate = new Date(maxDateValue);
        const pad = value => String(value).padStart(2, "0");
        const formatDate = date =>
          `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        dateStart.min = formatDate(minDate);
        dateEnd.min = formatDate(minDate);
        dateStart.max = formatDate(maxDate);
        dateEnd.max = formatDate(maxDate);
        if (dateRangeHint) {
          dateRangeHint.textContent = `確認可能期間: ${dateStart.min} ～ ${dateEnd.max}`;
        }
      } else if (dateRangeHint) {
        dateRangeHint.textContent = "日付データがありません。";
      }
    }

    const map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    }).setView([34.7108, 137.7266], 12);

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
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

    map.on("locationerror", event => {
      console.warn("位置情報の取得に失敗しました。", event.message);
      alert("位置情報の取得に失敗しました。ブラウザの許可設定をご確認ください。");
    });

    const markerRenderer = L.canvas({ padding: 0.5 });
    const LABEL_MIN_ZOOM = 11;
    const LABEL_FADE_MAX_ZOOM = 13;
    const markers = events.map(event => {
      const dateRange = formatDateRange(event.startDate, event.endDate);
      const labelHtml = `
        <span class="label-title">${escapeValue(event.name)}</span>
        <span class="label-meta">${escapeValue(dateRange)}</span>
      `;
      const marker = L.circleMarker([event.lat, event.lon], {
        radius: 8,
        color: event.strokeColor,
        fillColor: event.fillColor,
        fillOpacity: 0.9,
        weight: 2,
        renderer: markerRenderer,
      }).addTo(map);

      marker.bindTooltip(labelHtml, {
        permanent: true,
        direction: "top",
        offset: [0, -10],
        className: "marker-label marker-label-event",
        interactive: true,
      });

      marker.on("click", () => {
        const detailsHtml = buildDetailsHtml(event, headers);
        setDetailsOpen(true, detailsHtml, event.name);
      });

      return { marker, event };
    });

    const updateLabelOpacity = () => {
      const zoom = map.getZoom();
      let opacity = 1;
      if (zoom <= LABEL_MIN_ZOOM) {
        opacity = 0;
      } else if (zoom >= LABEL_FADE_MAX_ZOOM) {
        opacity = 1;
      } else {
        opacity = (zoom - LABEL_MIN_ZOOM) / (LABEL_FADE_MAX_ZOOM - LABEL_MIN_ZOOM);
      }
      markers.forEach(item => {
        if (!map.hasLayer(item.marker)) {
          return;
        }
        const tooltip = item.marker.getTooltip();
        const el = tooltip ? tooltip.getElement() : null;
        if (!el) {
          return;
        }
        el.style.opacity = String(opacity);
        el.style.pointerEvents = opacity < 0.2 ? "none" : "auto";
      });
    };

    map.on("zoomend", updateLabelOpacity);
    map.whenReady(updateLabelOpacity);

    if (totalCount) {
      totalCount.textContent = `${markers.length}`;
    }
    if (filterSummary) {
      filterSummary.classList.toggle("hidden", false);
    }

    const matchesDateRange = event => {
      let startFilter = parseDateValue(dateStart ? dateStart.value : "");
      let endFilter = parseDateValue(dateEnd ? dateEnd.value : "");
      if (startFilter != null && endFilter != null && startFilter > endFilter) {
        const temp = startFilter;
        startFilter = endFilter;
        endFilter = temp;
      }

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
      let visible = 0;
      markers.forEach(item => {
        const categoryMatch = selectedCategories.size === 0
          ? false
          : item.event.categories.some(cat => selectedCategories.has(cat));
        const dateMatch = matchesDateRange(item.event);
        const shouldShow = categoryMatch && dateMatch;
        if (shouldShow) {
          if (!map.hasLayer(item.marker)) {
            item.marker.addTo(map);
          }
          visible += 1;
        } else if (map.hasLayer(item.marker)) {
          map.removeLayer(item.marker);
        }
      });

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

    applyFilters();
    updateLabelOpacity();
  }

  main().catch(error => {
    console.error(error);
    alert("イベントデータの読み込みに失敗しました。");
  });
})();
