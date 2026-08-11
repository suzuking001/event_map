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
  const policyModal = document.getElementById("policy-modal");
  const policyClose = document.getElementById("policy-close");
  const policyScroll = document.getElementById("policy-scroll");
  const policyLinks = document.querySelectorAll("[data-policy-target]");
  const loading = document.getElementById("loading");
  let policyReturnFocus = null;

  const dateStart = document.getElementById("date-start");
  const dateEnd = document.getElementById("date-end");
  const dateClear = document.getElementById("date-clear");
  const dateRangeHint = document.getElementById("date-range-hint");
  const dateInfo = document.getElementById("date-info");
  const datePickerToggle = document.getElementById("date-picker-toggle");
  const datePicker = document.getElementById("date-picker");
  const dateStartDisplay = document.getElementById("date-start-display");
  const dateEndDisplay = document.getElementById("date-end-display");
  const datePickerTitle = document.getElementById("date-picker-title");
  const datePickerGuide = document.getElementById("date-picker-guide");
  const datePickerClose = document.getElementById("date-picker-close");
  const calendarMonths = document.getElementById("calendar-months");
  const calendarPrev = document.getElementById("calendar-prev");
  const calendarNext = document.getElementById("calendar-next");
  const searchInput = document.getElementById("search-input");
  const categoryFilters = document.getElementById("category-filters");
  const categoryAll = document.getElementById("category-all");
  const categoryNone = document.getElementById("category-none");
  const filterSummary = document.getElementById("filter-summary");
  const visibleCount = document.getElementById("visible-count");
  const totalCount = document.getElementById("total-count");
  const dataRefreshStatus = document.getElementById("data-refresh-status");
  const floatingVisibleCount = document.getElementById("floating-visible-count");
  const shareMapButton = document.getElementById("share-map");
  const shareToast = document.getElementById("share-toast");
  const shareSheet = document.getElementById("share-sheet");
  const shareSheetClose = document.getElementById("share-sheet-close");
  const shareSheetDescription = document.getElementById("share-sheet-description");
  const shareToX = document.getElementById("share-to-x");
  const shareToFacebook = document.getElementById("share-to-facebook");
  const shareToInstagram = document.getElementById("share-to-instagram");
  const shareCopyLink = document.getElementById("share-copy-link");
  const shareNative = document.getElementById("share-native");

  const SHARE_PARAM_KEYS = ["from", "to", "q", "cat", "event"];
  let shareToastTimer = null;
  let activeSharePayload = null;
  let shareReturnFocus = null;

  const replaceLocationUrl = update => {
    if (location.protocol === "file:") return;
    const url = new URL(window.location.href);
    update(url);
    window.history.replaceState(null, "", url);
  };

  const setEventUrl = eventId => {
    replaceLocationUrl(url => {
      url.searchParams.delete("event");
      if (eventId) url.searchParams.set("event", eventId);
    });
  };

  const showShareToast = message => {
    if (!shareToast) return;
    if (shareToastTimer) window.clearTimeout(shareToastTimer);
    shareToast.textContent = message;
    shareToast.setAttribute("aria-hidden", "false");
    shareToast.classList.add("open");
    shareToastTimer = window.setTimeout(() => {
      shareToast.classList.remove("open");
      shareToast.setAttribute("aria-hidden", "true");
    }, 2800);
  };

  const copyShareUrl = async url => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return;
    }
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Copy command failed");
  };

  const loadCanvasImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  const roundedRectPath = (context, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  };

  const drawWrappedCanvasText = (
    context,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    maxLines
  ) => {
    const characters = Array.from(String(text || ""));
    const lines = [];
    let line = "";
    characters.forEach(character => {
      const candidate = `${line}${character}`;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    const visibleLines = lines.slice(0, maxLines);
    if (lines.length > maxLines && visibleLines.length > 0) {
      let lastLine = visibleLines[visibleLines.length - 1];
      while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
        lastLine = lastLine.slice(0, -1);
      }
      visibleLines[visibleLines.length - 1] = `${lastLine}…`;
    }
    visibleLines.forEach((value, index) => {
      context.fillText(value, x, y + index * lineHeight);
    });
    return y + visibleLines.length * lineHeight;
  };

  const buildInstagramStoryBlob = async payload => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not supported");

    context.fillStyle = "#fff8e8";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffd33d";
    context.beginPath();
    context.arc(945, 55, 235, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#20c7b5";
    context.beginPath();
    context.arc(90, 1840, 260, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#39a8ff";
    context.beginPath();
    context.arc(1040, 1740, 290, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ff5a36";
    context.font = "900 27px sans-serif";
    context.letterSpacing = "2px";
    context.fillText("WEEKEND EVENT MAP", 76, 104);
    context.letterSpacing = "0px";

    try {
      const mascot = await loadCanvasImage("assets/icons/icon-512.png");
      context.save();
      context.translate(740, 105);
      context.rotate(0.045);
      context.drawImage(mascot, 0, 0, 270, 270);
      context.restore();
    } catch (error) {
      console.warn("Instagram story mascot could not be loaded.", error);
    }

    context.fillStyle = "#18314f";
    context.font = "900 61px sans-serif";
    context.fillText("今日は何する？", 76, 245);

    const visual = payload.visual || {};
    const category = visual.category || "イベント";
    roundedRectPath(context, 76, 360, Math.min(760, 110 + category.length * 38), 70, 35);
    context.fillStyle = "#ffd33d";
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = "#18314f";
    context.stroke();
    context.fillStyle = "#18314f";
    context.font = "900 31px sans-serif";
    context.fillText(`${visual.icon || "📍"} ${category}`, 106, 407);

    context.save();
    context.shadowColor = "rgba(24, 49, 79, 0.18)";
    context.shadowOffsetY = 16;
    context.shadowBlur = 0;
    roundedRectPath(context, 62, 478, 956, 990, 48);
    context.fillStyle = "#fffdf7";
    context.fill();
    context.lineWidth = 6;
    context.strokeStyle = "#18314f";
    context.stroke();
    context.restore();

    const title = visual.title || payload.title || "イベントを探そう";
    const titleFontSize = title.length > 40 ? 49 : title.length > 24 ? 57 : 68;
    context.fillStyle = "#18314f";
    context.font = `900 ${titleFontSize}px sans-serif`;
    let contentY = drawWrappedCanvasText(
      context,
      title,
      112,
      590,
      850,
      titleFontSize * 1.35,
      6
    );
    contentY += 38;

    const infoRows = [
      ["開催日", visual.date || "イベント情報を地図でチェック"],
      ["会場", visual.place || "開催地を地図でチェック"],
    ];
    infoRows.forEach(([label, value]) => {
      roundedRectPath(context, 112, contentY, 856, 142, 28);
      context.fillStyle = "#fff8e8";
      context.fill();
      context.fillStyle = "#66798b";
      context.font = "800 24px sans-serif";
      context.fillText(label, 146, contentY + 43);
      context.fillStyle = "#18314f";
      context.font = "900 35px sans-serif";
      drawWrappedCanvasText(context, value, 146, contentY + 93, 785, 44, 2);
      contentY += 164;
    });

    roundedRectPath(context, 62, 1540, 956, 252, 48);
    context.fillStyle = "#ff5a36";
    context.fill();
    context.lineWidth = 6;
    context.strokeStyle = "#18314f";
    context.stroke();
    context.fillStyle = "#fff";
    context.font = "900 43px sans-serif";
    context.fillText("イベントマップ", 112, 1630);
    context.font = "800 29px sans-serif";
    context.fillText("リンクはコピー済み。ストーリーズで", 112, 1692);
    context.fillText("リンクスタンプに貼り付けてね！", 112, 1737);

    let displayUrl = "suzuking001.github.io/event_map/";
    try {
      const url = new URL(payload.url);
      displayUrl = `${url.host}${url.pathname}`;
    } catch (error) {
      displayUrl = payload.url;
    }
    context.fillStyle = "#18314f";
    context.font = "800 22px sans-serif";
    context.fillText(displayUrl.slice(0, 64), 292, 1865);
    context.font = "900 32px sans-serif";
    context.fillText("📍", 245, 1867);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Instagram story image could not be created"));
      }, "image/png");
    });
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const setShareSheetOpen = (isOpen, payload = null, trigger = null) => {
    if (!shareSheet) return;
    const sideMenu = document.getElementById("side-menu");
    if (isOpen) {
      activeSharePayload = payload;
      shareReturnFocus = trigger;
      if (shareSheetDescription) {
        shareSheetDescription.textContent = payload ? payload.title : "";
      }
      if (shareNative) shareNative.hidden = typeof navigator.share !== "function";
      if (sideMenu) sideMenu.inert = true;
      if (detailsModal) detailsModal.inert = true;
      shareSheet.inert = false;
      shareSheet.setAttribute("aria-hidden", "false");
      shareSheet.classList.add("open");
      if (shareToX) shareToX.focus();
      return;
    }
    shareSheet.classList.remove("open");
    shareSheet.setAttribute("aria-hidden", "true");
    shareSheet.inert = true;
    if (sideMenu) sideMenu.inert = !sideMenu.classList.contains("open");
    if (detailsModal) detailsModal.inert = !detailsModal.classList.contains("open");
    const focusTarget = shareReturnFocus;
    activeSharePayload = null;
    shareReturnFocus = null;
    if (focusTarget && document.contains(focusTarget)) focusTarget.focus();
  };

  const copyActiveShareUrl = async () => {
    if (!activeSharePayload) return;
    try {
      await copyShareUrl(activeSharePayload.url);
      setShareSheetOpen(false);
      showShareToast("リンクをコピーしました！");
    } catch (error) {
      console.warn("Share URL copy failed.", error);
      showShareToast("コピーできませんでした。URL欄から共有してください。");
    }
  };

  if (shareToX) {
    shareToX.addEventListener("click", () => {
      if (!activeSharePayload) return;
      const postText = `${activeSharePayload.text}\n${activeSharePayload.url}`;
      window.open(
        `https://x.com/intent/post?text=${encodeURIComponent(postText)}`,
        "_blank",
        "noopener,noreferrer,width=680,height=640"
      );
      setShareSheetOpen(false);
    });
  }
  if (shareToFacebook) {
    shareToFacebook.addEventListener("click", () => {
      if (!activeSharePayload) return;
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activeSharePayload.url)}`,
        "_blank",
        "noopener,noreferrer,width=680,height=720"
      );
      setShareSheetOpen(false);
    });
  }
  if (shareToInstagram) {
    shareToInstagram.addEventListener("click", async () => {
      if (!activeSharePayload || shareToInstagram.disabled) return;
      const payload = activeSharePayload;
      const label = shareToInstagram.querySelector("strong");
      const previousLabel = label ? label.textContent : "";
      shareToInstagram.disabled = true;
      shareToInstagram.setAttribute("aria-busy", "true");
      if (label) label.textContent = "画像を作成しています…";
      let linkCopied = false;
      try {
        try {
          await copyShareUrl(payload.url);
          linkCopied = true;
        } catch (error) {
          console.warn("Instagram share URL copy failed.", error);
        }
        const blob = await buildInstagramStoryBlob(payload);
        const rawId = payload.visual && payload.visual.id
          ? String(payload.visual.id)
          : "map";
        const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 36) || "map";
        downloadBlob(blob, `event-map-${safeId}-story.png`);
        setShareSheetOpen(false);
        showShareToast(
          linkCopied
            ? "ストーリーズ画像を保存し、リンクをコピーしました！"
            : "ストーリーズ画像を保存しました。リンクは別途コピーしてください。"
        );
      } catch (error) {
        console.error("Instagram story image generation failed.", error);
        showShareToast("Instagram用画像を作成できませんでした。");
      } finally {
        shareToInstagram.disabled = false;
        shareToInstagram.removeAttribute("aria-busy");
        if (label) label.textContent = previousLabel;
      }
    });
  }
  if (shareCopyLink) {
    shareCopyLink.addEventListener("click", () => {
      void copyActiveShareUrl();
    });
  }
  if (shareNative) {
    shareNative.addEventListener("click", async () => {
      if (!activeSharePayload || !navigator.share) return;
      try {
        await navigator.share(activeSharePayload);
        setShareSheetOpen(false);
      } catch (error) {
        if (!error || error.name !== "AbortError") {
          console.warn("Native share failed.", error);
          showShareToast("端末の共有メニューを開けませんでした。");
        }
      }
    });
  }
  if (shareSheetClose) {
    shareSheetClose.addEventListener("click", () => setShareSheetOpen(false));
  }
  if (shareSheet) {
    shareSheet.addEventListener("click", event => {
      if (event.target === shareSheet) setShareSheetOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && shareSheet.classList.contains("open")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setShareSheetOpen(false);
      }
    });
  }

  const CATEGORY_PALETTE = [
    "#ff5a36",
    "#20c7b5",
    "#39a8ff",
    "#f59e0b",
    "#ef476f",
    "#8b5cf6",
    "#16a34a",
    "#e879f9",
    "#f97316",
    "#06b6d4",
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
    const dateParts = trimmed.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if (dateParts) {
      const year = Number(dateParts[1]);
      const month = Number(dateParts[2]);
      const day = Number(dateParts[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null;
      }
      return date.getTime();
    }
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  };

  const formatInputDate = date => {
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const formatFilterDate = value => {
    const time = parseDateValue(value);
    if (time == null) return "選択";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).format(new Date(time));
  };

  const formatCalendarDateLabel = value => {
    const time = parseDateValue(value);
    if (time == null) return "";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date(time));
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

  const parseOccurrenceDates = value => Array.from(new Set(
    String(value || "")
      .split(/[;；\r\n]+/)
      .map(date => date.trim())
      .filter(date => parseDateValue(date) != null)
  )).sort((left, right) => parseDateValue(left) - parseDateValue(right));

  const formatEventDate = event => {
    const occurrenceDates = event.occurrenceDates || [];
    if (occurrenceDates.length === 0) {
      return formatDateRange(event.startDate, event.endDate);
    }
    const visibleDates = occurrenceDates.slice(0, 4);
    const remaining = occurrenceDates.length - visibleDates.length;
    return `${visibleDates.join("、")}${remaining > 0 ? ` ほか${remaining}日` : ""}`;
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
    const parts = raw.split(/[;；、/／]/).map(item => item.trim()).filter(Boolean);
    return parts.length ? parts : [raw];
  };

  const SOURCE_DETAIL_FIELDS = new Set([
    "_sourceId",
    "_sourceType",
    "_sourceName",
    "_sourceAreaName",
    "_sourceUrl",
    "_sourceLicenseName",
    "_sourceLicenseUrl",
  ]);

  const PRIMARY_DETAIL_FIELDS = new Set([
    "NO",
    "イベント名",
    "開始日",
    "終了日",
    "開催日一覧",
    "開始時間",
    "終了時間",
    "説明",
    "場所名称",
    "地方公共団体名",
    "カテゴリー",
    "緯度",
    "経度",
    "URL",
    ...SOURCE_DETAIL_FIELDS,
  ]);

  const buildSearchText = fields => {
    const parts = [
      fields["イベント名"],
      fields["イベント名_カナ"],
      fields["イベント名_英語"],
      fields["場所名称"],
      fields["説明"],
      fields["住所"],
      fields["所在地_連結表記"],
      fields["所在地_都道府県"],
      fields["所在地_市区町村"],
      fields["地方公共団体名"],
      fields["主催者"],
      fields["カテゴリー"],
      fields["タグ"],
      fields["イベント種類"],
      fields["開催区"],
      fields["対象者"],
      fields._sourceName,
      fields._sourceAreaName,
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
    const faviconUrl = getFaviconUrl(rawUrl);
    const faviconHtml = faviconUrl
      ? `<img class="details-favicon" src="${escapeValue(faviconUrl)}" alt="WEBサイトのアイコン" loading="lazy" referrerpolicy="no-referrer">`
      : "";
    const urlButton = normalizedUrl
      ? `<a class="details-link-button" href="${escapeValue(normalizedUrl)}" target="_blank" rel="noopener">${faviconHtml}<span>参照元ページを開く</span></a>`
      : `<button class="details-link-button" type="button" disabled>参照元ページなし</button>`;
    const eventArea = event.fields["地方公共団体名"] ||
      event.fields["所在地_市区町村"] ||
      event.fields["所在地_都道府県"] ||
      event.fields._sourceName ||
      "浜松市";
    const searchQuery = `${eventArea} ${event.name || "イベント"}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    const searchButton = `<a class="details-link-button details-link-button-secondary" href="${searchUrl}" target="_blank" rel="noopener">Googleで検索</a>`;
    const dateRange = formatEventDate(event);
    const timeRange = formatTimeRange(event.startTime, event.endTime);
    const description = String(event.fields["説明"] || "").trim();
    const isWebReferenced = event.fields._sourceType === "web" ||
      /^WEB/i.test(String(event.fields.NO || "").trim())
      || /^Web収集:/i.test(String(event.fields["備考"] || "").trim());
    let sourceHost = "";
    if (isWebReferenced && normalizedUrl) {
      try {
        sourceHost = new URL(normalizedUrl).hostname;
      } catch (error) {
        sourceHost = "";
      }
    }
    const sourceName = event.fields._sourceName || "浜松市オープンデータ「イベント」";
    const sourceUrl = normalizeUrl(event.fields._sourceUrl || "");
    const sourceLicenseName = event.fields._sourceLicenseName || "";
    const sourceLicenseUrl = normalizeUrl(event.fields._sourceLicenseUrl || "");
    const sourceNameHtml = sourceUrl
      ? `<a href="${escapeValue(sourceUrl)}" target="_blank" rel="noopener">${escapeValue(sourceName)}</a>`
      : escapeValue(sourceName);
    const sourceLicenseHtml = sourceLicenseName
      ? sourceLicenseUrl
        ? `<a href="${escapeValue(sourceLicenseUrl)}" target="_blank" rel="noopener">${escapeValue(sourceLicenseName)}</a>`
        : escapeValue(sourceLicenseName)
      : "各提供元の利用条件をご確認ください";
    const sourceNoticeHtml = isWebReferenced
      ? `
        <div class="details-source-notice details-source-notice-web">
          <strong>情報源：ウェブ参照情報${sourceHost ? `（${escapeValue(sourceHost)}）` : ""}</strong>
          <span>このイベントは自治体等のオープンデータではなく、各オープンデータライセンスの対象外です。参照元の権利・利用条件をご確認ください。</span>
        </div>
      `
      : `
        <div class="details-source-notice details-source-notice-open-data">
          <strong>情報源：${sourceNameHtml}</strong>
          <span>${sourceLicenseHtml}（本アプリ向けに抽出・整形）</span>
        </div>
      `;

    const categoryChips = event.categories
      .map(category => `<span class="event-category-chip">${escapeValue(getCategoryIcon(category))} ${escapeValue(category)}</span>`)
      .join("");
    const metaItems = [
      ["地域", eventArea],
      ["開催日", dateRange],
      ["時間", timeRange],
      ["会場", event.place],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `
        <div class="event-meta-item">
          <dt>${escapeValue(label)}</dt>
          <dd>${escapeValue(value)}</dd>
        </div>
      `)
      .join("");

    const rowsHtml = headers
      .filter(header => !PRIMARY_DETAIL_FIELDS.has(header))
      .map(header => {
        const rawValue = event.fields[header] || "";
        if (!String(rawValue).trim()) return "";
        let valueHtml = escapeValue(rawValue).replace(/\r?\n/g, "<br>");
        return `
          <div class="detail-row">
            <div class="detail-label">${escapeValue(header)}</div>
            <div class="detail-value">${valueHtml}</div>
          </div>
        `;
      })
      .join("");

    return `
      <article class="event-detail-card" style="--event-color: ${escapeValue(event.strokeColor)}; --event-soft-color: ${escapeValue(event.fillColor)}">
        <div class="event-detail-hero" data-icon="${escapeValue(event.categoryIcon)}">
          <div class="event-category-chips">${categoryChips}</div>
          ${description ? `<p class="event-description">${escapeValue(description).replace(/\r?\n/g, "<br>")}</p>` : ""}
          <dl class="event-meta-grid">${metaItems}</dl>
        </div>
        <div class="details-actions">
          <button class="event-share-button" type="button" data-share-event="${escapeValue(event.id)}">
            <span aria-hidden="true">↗</span> このイベントをシェア
          </button>
          ${urlButton}
          ${searchButton}
        </div>
        <details class="event-more">
          <summary>詳しい情報・情報源</summary>
          <div class="event-more-content">
            ${sourceNoticeHtml}
            ${rowsHtml ? `<div class="details-grid">${rowsHtml}</div>` : ""}
          </div>
        </details>
      </article>
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
        <button class="event-group-list-item" type="button" data-group-event-index="${index}" style="--event-color: ${escapeValue(event.strokeColor)}; --event-soft-color: ${escapeValue(event.fillColor)}">
          <span class="event-group-list-icon" aria-hidden="true">${escapeValue(event.categoryIcon)}</span>
          <span class="event-group-list-copy">
            <strong>${escapeValue(event.name)}</strong>
            <span>${escapeValue(formatEventDate(event))}・${escapeValue(
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

  const OUTPUT_MANIFEST_URL = "data/outputs/manifest.json";
  const OUTPUT_SOURCE_ID_PREFIX = "bundled-event-data";

  const resolveOutputEventUrl = rawPath => {
    const path = String(rawPath || "").trim();
    if (!path || !path.toLowerCase().endsWith(".csv") || path.includes("\\")) {
      return "";
    }
    const dataRoot = new URL("data/", document.baseURI);
    const resolved = new URL(path, dataRoot);
    if (
      resolved.origin !== dataRoot.origin ||
      !resolved.pathname.startsWith(dataRoot.pathname)
    ) {
      return "";
    }
    return resolved.toString();
  };

  const registerOutputEventSources = async () => {
    const response = await fetch(OUTPUT_MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Event output manifest fetch failed: ${response.status}`);
    }
    const manifest = await response.json();
    if (!Array.isArray(manifest.cities)) {
      throw new Error("Event output manifest has no cities array");
    }

    const knownSourceIds = new Set(EVENT_CSV_SOURCES.map(source => source.id));
    let registeredCount = 0;
    manifest.cities.forEach(city => {
      const regionId = String(city && city.region_id || "").trim();
      const eventUrl = resolveOutputEventUrl(city && city.events && city.events.path);
      if (!regionId || !eventUrl) {
        console.warn("Invalid event output manifest entry was skipped.", city);
        return;
      }

      let sourceId = `${OUTPUT_SOURCE_ID_PREFIX}-${regionId}`;
      let suffix = 2;
      while (knownSourceIds.has(sourceId)) {
        sourceId = `${OUTPUT_SOURCE_ID_PREFIX}-${regionId}-${suffix}`;
        suffix += 1;
      }
      knownSourceIds.add(sourceId);
      EVENT_CSV_SOURCES.push({
        id: sourceId,
        url: eventUrl,
        encoding: "utf-8",
        refresh: true,
        sourceType: "bundled-event-data",
        sourceName: `公開用イベントデータ（${regionId}）`,
        sourceUrl: "",
        defaultCategory: "未分類",
        searchKeywords: [regionId],
      });
      registeredCount += 1;
    });
    return registeredCount;
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

  const setDetailsOpen = (isOpen, htmlContent = "", titleText = "", eventId = "") => {
    if (!detailsModal || !detailsBody) {
      return;
    }
    if (isOpen) {
      if (detailsTitle) {
        detailsTitle.textContent = titleText || "イベント詳細";
      }
      detailsBody.innerHTML = htmlContent;
      detailsModal.dataset.eventId = eventId;
      setEventUrl(eventId);
      detailsModal.inert = false;
      detailsModal.setAttribute("aria-hidden", "false");
      detailsModal.classList.toggle("open", true);
      if (detailsClose) {
        detailsClose.focus();
      }
      return;
    }
    if (detailsModal.contains(document.activeElement) && menuToggle) {
      menuToggle.focus();
    }
    detailsModal.classList.toggle("open", false);
    detailsModal.setAttribute("aria-hidden", "true");
    detailsModal.inert = true;
    detailsModal.dataset.eventId = "";
    setEventUrl("");
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

  const setPolicyOpen = (isOpen, targetId = "data-policy") => {
    if (!policyModal) {
      return;
    }
    if (isOpen) {
      setDetailsOpen(false);
      setAboutOpen(false);
      policyModal.inert = false;
      policyModal.setAttribute("aria-hidden", "false");
      policyModal.classList.add("open");
      const target = document.getElementById(targetId) ||
        document.getElementById("data-policy");
      window.requestAnimationFrame(() => {
        if (target) {
          target.scrollIntoView({ block: "start" });
          target.focus({ preventScroll: true });
        } else if (policyClose) {
          policyClose.focus();
        }
      });
      return;
    }
    const shouldRestoreFocus = policyModal.contains(document.activeElement);
    policyModal.classList.remove("open");
    policyModal.setAttribute("aria-hidden", "true");
    policyModal.inert = true;
    if (policyScroll) {
      policyScroll.scrollTop = 0;
    }
    if (shouldRestoreFocus && policyReturnFocus) {
      policyReturnFocus.focus();
    }
    policyReturnFocus = null;
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


  const stringifyApiValue = value => {
    if (value == null) return "";
    if (Array.isArray(value)) return value.filter(Boolean).join(";");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getTokyoTodayValue = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return parseDateValue(`${values.year}-${values.month}-${values.day}`);
  };

  const getTokyoTodayString = (separator = "-") => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return [values.year, values.month, values.day].join(separator);
  };

  const fetchJsonp = (requestUrl, callbackParameter = "callback") =>
    new Promise((resolve, reject) => {
      const callbackName = `__eventMapJsonp_${buildWorkerId().replace(/[^a-zA-Z0-9_]/g, "")}`;
      const url = new URL(requestUrl, window.location.href);
      url.searchParams.set(callbackParameter, callbackName);
      const script = document.createElement("script");
      let timeoutId = null;

      const cleanup = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        script.remove();
        try {
          delete window[callbackName];
        } catch (error) {
          window[callbackName] = undefined;
        }
      };

      window[callbackName] = data => {
        cleanup();
        resolve(data);
      };
      script.async = true;
      script.src = url.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error("CKAN JSONP request failed."));
      };
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("CKAN JSONP request timed out."));
      }, 20000);
      document.head.appendChild(script);
    });

  const fetchCkanEventPage = async url => {
    const data = await fetchJsonp(url);
    const result = data && data.success && data.result;
    if (!result || !Array.isArray(result.records) || !Array.isArray(result.fields)) {
      throw new Error("CKAN API returned an unexpected response.");
    }
    return {
      headers: result.fields.map(field => field.id).filter(header => header !== "_id"),
      records: result.records,
      totalCount: Number(result.total) || result.records.length,
    };
  };

  const applySourceFieldMap = (fields, source) => {
    const mapped = { ...fields };
    if (source.lineBreakToken) {
      Object.keys(mapped).forEach(key => {
        if (typeof mapped[key] === "string") {
          mapped[key] = mapped[key].split(source.lineBreakToken).join("\n");
        }
      });
    }
    Object.entries(source.fieldMap || {}).forEach(([target, candidates]) => {
      if (mapped[target] != null && String(mapped[target]).trim()) return;
      const sourceFields = Array.isArray(candidates) ? candidates : [candidates];
      const matchedField = sourceFields.find(candidate =>
        mapped[candidate] != null && String(mapped[candidate]).trim()
      );
      if (matchedField) mapped[target] = mapped[matchedField];
    });
    return mapped;
  };

  const buildCkanEventPayload = (source, headers, records) => {
    const mappedRecords = records.map(record => applySourceFieldMap(record, source));
    const todayValue = getTokyoTodayValue();
    const filteredRecords = source.currentAndFutureOnly
      ? mappedRecords.filter(record => {
          const eventEndValue = parseDateValue(record["終了日"] || record["開始日"] || "");
          return eventEndValue != null && eventEndValue >= todayValue;
        })
      : mappedRecords;
    const minimumRows = Number(source.minimumRows) || 1;
    if (filteredRecords.length < minimumRows) {
      throw new Error(
        `${source.sourceName || source.id}: only ${filteredRecords.length} events were returned.`
      );
    }

    const outputHeaders = Array.isArray(source.outputFields) && source.outputFields.length
      ? [...source.outputFields]
      : [...headers];
    Object.keys(source.fieldMap || {}).forEach(header => {
      if (!outputHeaders.includes(header)) outputHeaders.push(header);
    });

    return {
      headers: outputHeaders,
      rows: filteredRecords.map(record =>
        outputHeaders.map(header => stringifyApiValue(record[header]))
      ),
      fingerprint: hashText(JSON.stringify(filteredRecords)),
    };
  };

  const fetchCkanEventPayload = async (source, initialUrl) => {
    const pageSize = 1000;
    const firstPage = await fetchCkanEventPage(initialUrl);
    const records = [...firstPage.records];
    for (let offset = records.length; offset < firstPage.totalCount; offset += pageSize) {
      const nextUrl = new URL(initialUrl, window.location.href);
      nextUrl.searchParams.set("limit", String(pageSize));
      nextUrl.searchParams.set("offset", String(offset));
      const nextPage = await fetchCkanEventPage(nextUrl.toString());
      records.push(...nextPage.records);
      if (nextPage.records.length === 0) break;
    }

    return buildCkanEventPayload(source, firstPage.headers, records);
  };

  const quoteSqlIdentifier = value => `"${String(value).replace(/"/g, '""')}"`;

  const buildCkanSqlEventUrl = (source, limit, offset) => {
    const resource = quoteSqlIdentifier(source.resourceId);
    const startField = quoteSqlIdentifier(source.dateFields.start);
    const endField = quoteSqlIdentifier(source.dateFields.end);
    const today = getTokyoTodayString(source.dateSeparator || "-");
    const sql = [
      `SELECT * FROM ${resource}`,
      `WHERE (${endField} >= '${today}'`,
      `OR ((${endField} = '' OR ${endField} = '0000/00/00')`,
      `AND ${startField} >= '${today}'))`,
      `ORDER BY ${startField}`,
      `LIMIT ${limit} OFFSET ${offset}`,
    ].join(" ");
    const url = new URL(source.url, window.location.href);
    url.searchParams.set("sql", sql);
    return url.toString();
  };

  const fetchCkanSqlEventPayload = async source => {
    const pageSize = 1000;
    const records = [];
    let headers = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await fetchCkanEventPage(buildCkanSqlEventUrl(source, pageSize, offset));
      if (!headers.length) headers = page.headers;
      records.push(...page.records);
      if (page.records.length < pageSize) break;
    }
    return buildCkanEventPayload(source, headers, records);
  };

  const fetchAndParseEvents = async (source, forceRefresh = false) => {
    const url = forceRefresh && source.refresh
      ? buildFreshCsvUrl(source.url)
      : source.url;
    if (source.format === "ckan-jsonp") {
      return fetchCkanEventPayload(source, url);
    }
    if (source.format === "ckan-sql-jsonp") {
      return fetchCkanSqlEventPayload(source);
    }
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

  const normalizeSourceFields = (fields, source) => {
    const normalized = applySourceFieldMap(fields, source);
    normalized.NO = normalized.NO || normalized.ID || "";
    normalized["カテゴリー"] = normalized["カテゴリー"] ||
      normalized["キーワード"] ||
      normalized["タグ"] ||
      normalized["イベント種類"] ||
      source.defaultCategory ||
      "未分類";
    normalized.URL = normalized.URL ||
      normalized["コンテンツURL"] ||
      normalized["申込URL"] ||
      "";
    normalized["住所"] = normalized["住所"] || normalized["所在地_連結表記"] || "";
    normalized["説明"] = normalized["説明"] || normalized["概要"] || "";
    const municipalityName = [normalized["都道府県名"], normalized["市区町村名"]]
      .map(value => String(value || "").trim())
      .filter(Boolean)
      .join("");
    normalized["地方公共団体名"] = normalized["地方公共団体名"] ||
      municipalityName ||
      source.areaName ||
      "";
    normalized._sourceId = source.id || "";
    normalized._sourceType = source.sourceType || "open-data";
    normalized._sourceName = source.sourceName || "";
    normalized._sourceAreaName = source.areaName || "";
    normalized._sourceUrl = source.sourceUrl || "";
    normalized._sourceLicenseName = source.licenseName || "";
    normalized._sourceLicenseUrl = source.licenseUrl || "";
    return normalized;
  };

  const getEventKey = fields => {
    const sourceId = String(fields._sourceId || "unknown").trim();
    const id = String(fields.NO || fields.ID || "").trim();
    if (id) return `${sourceId}:id:${id}`;
    return [
      sourceId,
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
    SOURCE_DETAIL_FIELDS.forEach(header => {
      if (headerSet.has(header)) return;
      headerSet.add(header);
      mergedHeaders.push(header);
    });
    ["NO", "カテゴリー", "URL", "住所", "説明"].forEach(header => {
      if (headerSet.has(header)) return;
      headerSet.add(header);
      mergedHeaders.push(header);
    });

    const eventsByKey = new Map();
    payloads.forEach(({ source, payload }) => {
      payload.rows.forEach(row => {
        const fields = {};
        payload.headers.forEach((header, index) => {
          fields[header] = row[index] == null ? "" : row[index];
        });
        const normalizedFields = normalizeSourceFields(fields, source);
        const key = getEventKey(normalizedFields);
        if (!eventsByKey.has(key)) {
          eventsByKey.set(key, normalizedFields);
          return;
        }
        const existing = eventsByKey.get(key);
        mergedHeaders.forEach(header => {
          if (!existing[header] && normalizedFields[header]) {
            existing[header] = normalizedFields[header];
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
        setPolicyOpen(false);
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
    policyLinks.forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        if (!policyModal || !policyModal.classList.contains("open")) {
          policyReturnFocus = link;
        }
        setPolicyOpen(true, link.dataset.policyTarget || "data-policy");
      });
    });
    if (policyClose) {
      policyClose.addEventListener("click", () => setPolicyOpen(false));
    }
    if (policyModal) {
      policyModal.addEventListener("click", event => {
        if (event.target === policyModal) {
          setPolicyOpen(false);
        }
      });
    }
    const initialPolicyTarget = window.location.hash.slice(1);
    if (["data-policy", "privacy", "correction-request"].includes(initialPolicyTarget)) {
      setPolicyOpen(true, initialPolicyTarget);
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
      label.style.setProperty("--chip-color", adjustColor(baseColor, -24));
      label.style.setProperty("--chip-background", adjustColor(baseColor, 70));

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
    const initialParams = new URLSearchParams(window.location.search);
    const initialEventId = initialParams.get("event") || "";
    const hasInitialFilterState = ["from", "to", "q", "cat"]
      .some(key => initialParams.has(key));
    const hasEntryUrlState = Boolean(initialEventId || hasInitialFilterState);
    if (window.App.visitorCounter) {
      void window.App.visitorCounter.init();
    }
    try {
      if (!hasEntryUrlState && !sessionStorage.getItem("event-map-welcome-shown")) {
        sessionStorage.setItem("event-map-welcome-shown", "1");
        setAboutOpen(true);
      }
    } catch (error) {
      if (!hasEntryUrlState) setAboutOpen(true);
    }
    if (dateRangeHint) {
      dateRangeHint.textContent = "データを読み込み中...";
    }
    setLoading(true);
    let outputManifestLoadFailed = false;
    try {
      await registerOutputEventSources();
    } catch (error) {
      outputManifestLoadFailed = true;
      console.warn("Bundled event output manifest could not be loaded.", error);
    }

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

    map.createPane("eventHoverLabelPane");
    const eventHoverLabelPane = map.getPane("eventHoverLabelPane");
    eventHoverLabelPane.style.zIndex = "700";

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
    const LABEL_MIN_ZOOM = isMobileViewport ? 14 : 13;
    const LABEL_FADE_MAX_ZOOM = 16;
    const MARKER_VIEW_PADDING = isMobileViewport ? 0.2 : 0.35;
    const SOURCE_LOAD_VIEW_PADDING = 0.15;
    const SOURCE_LOAD_MIN_VIEW_OVERLAP = 0.08;
    let headers = [];
    let events = [];
    let markers = [];
    let activeEventGroup = null;
    let currentFingerprint = "";
    let initialUrlApplied = false;
    let initialDataReady = false;
    let sourceViewGeneration = 0;
    let syncEventSourcesToViewport = null;
    const loadedSourcePayloads = new Map();
    const sourceLoadRequests = new Map();

    const getSourceBounds = source =>
      Array.isArray(source.loadBounds) && source.loadBounds.length === 2
        ? L.latLngBounds(source.loadBounds)
        : null;

    const getSourcesForViewport = () => {
      const visibleBounds = map.getBounds().pad(SOURCE_LOAD_VIEW_PADDING);
      return EVENT_CSV_SOURCES.filter(source => {
        const sourceBounds = getSourceBounds(source);
        if (!sourceBounds) return true;
        if (visibleBounds.contains(sourceBounds.getCenter())) return true;
        if (!visibleBounds.intersects(sourceBounds)) return false;
        const south = Math.max(visibleBounds.getSouth(), sourceBounds.getSouth());
        const west = Math.max(visibleBounds.getWest(), sourceBounds.getWest());
        const north = Math.min(visibleBounds.getNorth(), sourceBounds.getNorth());
        const east = Math.min(visibleBounds.getEast(), sourceBounds.getEast());
        const visibleArea = Math.max(
          (visibleBounds.getNorth() - visibleBounds.getSouth()) *
            (visibleBounds.getEast() - visibleBounds.getWest()),
          Number.EPSILON
        );
        const overlapArea = Math.max(north - south, 0) * Math.max(east - west, 0);
        return overlapArea / visibleArea >= SOURCE_LOAD_MIN_VIEW_OVERLAP;
      });
    };

    const findSourceForSearch = query => {
      const normalizedQuery = String(query || "").trim().toLowerCase();
      if (!normalizedQuery) return null;
      return EVENT_CSV_SOURCES.find(source =>
        (source.searchKeywords || []).some(keyword =>
          normalizedQuery.includes(String(keyword).toLowerCase())
        )
      ) || null;
    };

    const findSourceForEventId = eventId => {
      const normalizedId = String(eventId || "");
      if (!normalizedId) return null;
      const matchedSource = EVENT_CSV_SOURCES.find(source =>
        normalizedId.startsWith(`${source.id}:`)
      );
      if (matchedSource) return matchedSource;
      return normalizedId.startsWith("event-")
        ? EVENT_CSV_SOURCES.find(source => source.id === "hamamatsu-open-data") || null
        : null;
    };

    const focusSourceArea = (source, animate = true) => {
      const sourceBounds = getSourceBounds(source);
      if (!sourceBounds) return false;
      map.fitBounds(sourceBounds, {
        animate,
        padding: [40, 40],
        maxZoom: 10,
      });
      return true;
    };

    const addFilterStateToUrl = url => {
      if (dateStart && dateStart.value) url.searchParams.set("from", dateStart.value);
      if (dateEnd && dateEnd.value) url.searchParams.set("to", dateEnd.value);
      const query = searchInput ? searchInput.value.trim() : "";
      if (query) url.searchParams.set("q", query);

      if (categoryFilters) {
        const inputs = Array.from(
          categoryFilters.querySelectorAll("input[type='checkbox']")
        );
        const selected = inputs.filter(input => input.checked);
        if (selected.length !== inputs.length) {
          if (selected.length === 0) {
            url.searchParams.append("cat", "");
          } else {
            selected.forEach(input => url.searchParams.append("cat", input.value));
          }
        }
      }
    };

    const buildFilterShareUrl = () => {
      const url = new URL(window.location.href);
      SHARE_PARAM_KEYS.forEach(key => url.searchParams.delete(key));
      addFilterStateToUrl(url);
      url.hash = "";
      return url.toString();
    };

    const buildEventShareUrl = eventId => {
      const url = new URL(window.location.href);
      SHARE_PARAM_KEYS.forEach(key => url.searchParams.delete(key));
      url.searchParams.set("event", eventId);
      url.hash = "";
      return url.toString();
    };

    const syncFilterUrl = () => {
      if (location.protocol === "file:") return;
      replaceLocationUrl(url => {
        const activeEventId = detailsModal ? detailsModal.dataset.eventId : "";
        ["from", "to", "q", "cat"].forEach(key => url.searchParams.delete(key));
        addFilterStateToUrl(url);
        if (activeEventId) url.searchParams.set("event", activeEventId);
      });
    };

    const shareEvent = (eventId, trigger) => {
      const selectedEvent = events.find(event => event.id === eventId);
      if (!selectedEvent) {
        showShareToast("イベント情報を確認できませんでした。");
        return;
      }
      const details = [
        formatEventDate(selectedEvent),
        selectedEvent.place,
      ].filter(Boolean).join("・");
      const selectedArea = selectedEvent.fields["地方公共団体名"] ||
        selectedEvent.fields["所在地_市区町村"] ||
        selectedEvent.fields["所在地_都道府県"] ||
        "開催地域";
      setShareSheetOpen(true, {
        title: `${selectedEvent.name}｜イベントマップ`,
        text: `${selectedEvent.categoryIcon} ${selectedEvent.name}${details ? `\n${details}` : ""}`,
        url: buildEventShareUrl(selectedEvent.id),
        visual: {
          id: selectedEvent.id,
          title: selectedEvent.name,
          date: formatEventDate(selectedEvent),
          place: selectedEvent.place || selectedArea,
          category: selectedEvent.primaryCategory,
          icon: selectedEvent.categoryIcon,
        },
      }, trigger);
    };

    if (shareMapButton) {
      shareMapButton.addEventListener("click", () => {
        const range = dateStart && dateEnd && (dateStart.value || dateEnd.value)
          ? `${formatDateRange(dateStart.value, dateEnd.value)}のイベント`
          : "イベント";
        setShareSheetOpen(true, {
          title: "今日は何する？｜イベントマップ",
          text: `${range}を地図でチェック！`,
          url: buildFilterShareUrl(),
          visual: {
            id: "map",
            title: "今日は何する？",
            date: range.replace(/のイベント$/, ""),
            place: `${visibleCount ? visibleCount.textContent : "0"}件のイベントを地図でチェック`,
            category: "イベント",
            icon: "🎪",
          },
        }, shareMapButton);
      });
    }

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
        const place = fields["場所名称"] || fields["集合（受付）場所"] || "";
        const lat = parseFloat(fields["緯度"]);
        const lon = parseFloat(fields["経度"]);

        const categories = normalizeCategories(fields["カテゴリー"]);
        const primaryCategory = categories[0] || "未分類";
        const baseColor = getCategoryColor(primaryCategory);
        const occurrenceDates = parseOccurrenceDates(fields["開催日一覧"]);
        const occurrenceValues = occurrenceDates
          .map(date => parseDateValue(date))
          .filter(value => value != null);
        const startValue = occurrenceValues[0] ?? parseDateValue(startDate);
        const endValue = occurrenceValues.at(-1) ?? parseDateValue(endDate || startDate);

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
          id: fields["NO"]
            ? ["hamamatsu-open-data", "bundled-event-data"].includes(fields._sourceId)
              ? fields["NO"]
              : `${fields._sourceId || "event"}:${fields["NO"]}`
            : `${fields._sourceId || "event"}:event-${rowIndex}`,
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
          occurrenceDates,
          occurrenceValues,
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
        event.name,
        event.id
      );
    };

    if (detailsBody) {
      detailsBody.addEventListener("click", event => {
        const shareButton = event.target.closest("[data-share-event]");
        if (shareButton) {
          shareEvent(shareButton.dataset.shareEvent || "", shareButton);
          return;
        }

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
            selectedEvent.name,
            selectedEvent.id
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
            isMarkerHovered: false,
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
        marker.on("mouseover", () => {
          group.isMarkerHovered = true;
          marker.setZIndexOffset(1000);
          syncMarkerLabels();
        });
        marker.on("mouseout", () => {
          group.isMarkerHovered = false;
          marker.setZIndexOffset(0);
          syncMarkerLabels();
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
      const fillColor = usesSingleCategory ? firstEvent.fillColor : "#fff0bd";
      const strokeColor = usesSingleCategory ? firstEvent.strokeColor : "#ff5a36";
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
      marker.on("mouseover", () => {
        group.isMarkerHovered = true;
        marker.setZIndexOffset(1000);
        syncMarkerLabels();
      });
      marker.on("mouseout", () => {
        group.isMarkerHovered = false;
        marker.setZIndexOffset(200);
        syncMarkerLabels();
      });
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
      const dateRange = formatEventDate(event);
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
        pane: "tooltipPane",
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
        const effectiveOpacity = item.isMarkerHovered ? 1 : opacity;
        if (!markerIsVisible || effectiveOpacity <= 0) {
          removeMarkerLabels(item);
          return;
        }
        if (item.labels.length === 0) {
          const labelItems = getDisplayLabelItems(item);
          item.labels = labelItems.map(labelItem => createEventLabel(item, labelItem));
        }
        const targetPane = item.isMarkerHovered
          ? "eventHoverLabelPane"
          : "tooltipPane";
        item.labels.forEach(label => {
          if (label.options.pane !== targetPane) {
            if (map.hasLayer(label)) map.removeLayer(label);
            label.options.pane = targetPane;
          }
          if (!map.hasLayer(label)) label.addTo(map);
          const element = label.getElement();
          if (!element) return;
          element.style.opacity = String(effectiveOpacity);
          element.style.pointerEvents = item.isMarkerHovered || opacity < 0.2
            ? "none"
            : "auto";
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
          item.isMarkerHovered = false;
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

    map.on("moveend", () => {
      syncMarkersToViewport();
      if (initialDataReady && syncEventSourcesToViewport) {
        void syncEventSourcesToViewport();
      }
    });

    let calendarViewDate = new Date();
    calendarViewDate = new Date(
      calendarViewDate.getFullYear(),
      calendarViewDate.getMonth(),
      1
    );
    let selectingRangeEnd = Boolean(
      dateStart && dateStart.value && dateEnd && !dateEnd.value
    );
    let calendarHoverValue = null;

    const getMonthIndex = date => date.getFullYear() * 12 + date.getMonth();

    const getDateFromMonthIndex = monthIndex =>
      new Date(Math.floor(monthIndex / 12), monthIndex % 12, 1);

    const syncDateTrigger = () => {
      const startText = dateStart ? dateStart.value : "";
      const endText = dateEnd ? dateEnd.value : "";
      if (dateStartDisplay) {
        dateStartDisplay.textContent = formatFilterDate(startText);
        dateStartDisplay.classList.toggle("is-placeholder", !startText);
      }
      if (dateEndDisplay) {
        dateEndDisplay.textContent = formatFilterDate(endText);
        dateEndDisplay.classList.toggle("is-placeholder", !endText);
      }
      if (datePickerGuide) {
        datePickerGuide.textContent = selectingRangeEnd && startText && !endText
          ? "続けて終了日を選択してください"
          : "1回目で開始日、2回目で終了日を選択";
      }
      if (datePickerToggle) {
        const label = startText || endText
          ? `期間 ${formatFilterDate(startText)}から${formatFilterDate(endText)}`
          : "期間を選択";
        datePickerToggle.setAttribute("aria-label", label);
      }
    };

    const normalizeCalendarView = () => {
      const minValue = parseDateValue(dateStart ? dateStart.min : "");
      const maxValue = parseDateValue(dateStart ? dateStart.max : "");
      let viewIndex = getMonthIndex(calendarViewDate);
      if (minValue != null) {
        viewIndex = Math.max(viewIndex, getMonthIndex(new Date(minValue)));
      }
      if (maxValue != null) {
        const maxMonthIndex = getMonthIndex(new Date(maxValue));
        const minMonthIndex = minValue != null
          ? getMonthIndex(new Date(minValue))
          : Number.NEGATIVE_INFINITY;
        viewIndex = Math.min(viewIndex, Math.max(minMonthIndex, maxMonthIndex - 1));
      }
      calendarViewDate = getDateFromMonthIndex(viewIndex);
    };

    const renderCalendar = () => {
      if (!calendarMonths || !datePickerTitle) return;
      normalizeCalendarView();

      const viewMonthIndex = getMonthIndex(calendarViewDate);
      const minValue = parseDateValue(dateStart ? dateStart.min : "");
      const maxValue = parseDateValue(dateStart ? dateStart.max : "");
      const startValue = parseDateValue(dateStart ? dateStart.value : "");
      const endValue = parseDateValue(dateEnd ? dateEnd.value : "");
      const todayValue = parseDateValue(formatInputDate(new Date()));
      let rangeStart = startValue;
      let rangeEnd = endValue;

      if (selectingRangeEnd && startValue != null && calendarHoverValue != null) {
        rangeStart = Math.min(startValue, calendarHoverValue);
        rangeEnd = Math.max(startValue, calendarHoverValue);
      } else if (startValue != null && endValue == null) {
        rangeEnd = startValue;
      }

      const displayStartValue = parseDateValue(formatInputDate(calendarViewDate));
      const displayEndDate = new Date(
        calendarViewDate.getFullYear(),
        calendarViewDate.getMonth() + 2,
        0
      );
      const displayEndValue = parseDateValue(formatInputDate(displayEndDate));
      const firstEnabledValue = Math.max(
        displayStartValue == null ? Number.NEGATIVE_INFINITY : displayStartValue,
        minValue == null ? Number.NEGATIVE_INFINITY : minValue
      );
      const preferredValue = startValue != null &&
        startValue >= displayStartValue && startValue <= displayEndValue
        ? startValue
        : todayValue != null && todayValue >= displayStartValue && todayValue <= displayEndValue &&
          (minValue == null || todayValue >= minValue) &&
          (maxValue == null || todayValue <= maxValue)
          ? todayValue
          : firstEnabledValue;

      calendarMonths.replaceChildren();
      for (let monthOffset = 0; monthOffset < 2; monthOffset += 1) {
        const monthDate = new Date(
          calendarViewDate.getFullYear(),
          calendarViewDate.getMonth() + monthOffset,
          1
        );
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const leadingDays = monthDate.getDay();
        const panel = document.createElement("section");
        panel.className = "calendar-month";

        const monthTitle = document.createElement("h3");
        monthTitle.className = "calendar-month-title";
        monthTitle.id = `calendar-month-title-${monthOffset}`;
        monthTitle.textContent = `${year}年 ${month + 1}月`;
        panel.appendChild(monthTitle);

        const weekdays = document.createElement("div");
        weekdays.className = "calendar-weekdays";
        weekdays.setAttribute("aria-hidden", "true");
        ["日", "月", "火", "水", "木", "金", "土"].forEach(label => {
          const weekday = document.createElement("span");
          weekday.textContent = label;
          weekdays.appendChild(weekday);
        });
        panel.appendChild(weekdays);

        const grid = document.createElement("div");
        grid.className = "calendar-grid";
        grid.setAttribute("role", "group");
        grid.setAttribute("aria-labelledby", monthTitle.id);
        for (let index = 0; index < leadingDays; index += 1) {
          const spacer = document.createElement("span");
          spacer.className = "calendar-day-spacer";
          spacer.setAttribute("role", "presentation");
          grid.appendChild(spacer);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
          const dateValue = formatInputDate(new Date(year, month, day));
          const timeValue = parseDateValue(dateValue);
          const isDisabled = timeValue == null ||
            (minValue != null && timeValue < minValue) ||
            (maxValue != null && timeValue > maxValue);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "calendar-day";
          button.textContent = String(day);
          button.dataset.date = dateValue;
          button.disabled = isDisabled;
          button.setAttribute("aria-label", formatCalendarDateLabel(dateValue));
          button.tabIndex = !isDisabled && timeValue === preferredValue ? 0 : -1;

          if (timeValue === todayValue) button.classList.add("is-today");
          if (rangeStart != null && rangeEnd != null && timeValue >= rangeStart && timeValue <= rangeEnd) {
            button.classList.add("is-in-range");
          }
          if (rangeStart != null && timeValue === rangeStart) {
            button.classList.add("is-range-start");
            button.setAttribute("aria-selected", "true");
          }
          if (rangeEnd != null && timeValue === rangeEnd) {
            button.classList.add("is-range-end");
            button.setAttribute("aria-selected", "true");
          }
          grid.appendChild(button);
        }
        panel.appendChild(grid);
        calendarMonths.appendChild(panel);
      }

      if (calendarPrev) {
        calendarPrev.disabled = minValue != null &&
          viewMonthIndex <= getMonthIndex(new Date(minValue));
      }
      if (calendarNext) {
        calendarNext.disabled = maxValue != null &&
          viewMonthIndex + 1 >= getMonthIndex(new Date(maxValue));
      }
      syncDateTrigger();
    };

    const positionDatePicker = () => {
      if (!datePicker || !datePickerToggle || datePicker.hidden) return;
      if (window.matchMedia("(max-width: 768px)").matches) {
        datePicker.style.removeProperty("top");
        datePicker.style.removeProperty("left");
        datePicker.style.removeProperty("width");
        return;
      }

      const triggerRect = datePickerToggle.getBoundingClientRect();
      const gap = 12;
      const left = triggerRect.right + gap;
      const availableWidth = Math.max(420, window.innerWidth - left - gap);
      datePicker.style.left = `${left}px`;
      datePicker.style.width = `${Math.min(680, availableWidth)}px`;
      const top = Math.max(
        gap,
        Math.min(triggerRect.top, window.innerHeight - datePicker.offsetHeight - gap)
      );
      datePicker.style.top = `${top}px`;
    };

    const setDatePickerOpen = (isOpen, restoreFocus = false) => {
      if (!datePicker || !datePickerToggle) return;
      datePicker.hidden = !isOpen;
      datePickerToggle.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        const referenceValue = dateStart && dateStart.value
          ? parseDateValue(dateStart.value)
          : parseDateValue(formatInputDate(new Date()));
        if (referenceValue != null) {
          const referenceDate = new Date(referenceValue);
          calendarViewDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        }
        selectingRangeEnd = Boolean(dateStart && dateStart.value && dateEnd && !dateEnd.value);
        renderCalendar();
        positionDatePicker();
        setTimeout(() => {
          const selected = calendarMonths && calendarMonths.querySelector(".calendar-day[tabindex='0']");
          if (selected) selected.focus();
        }, 0);
      } else {
        calendarHoverValue = null;
        if (restoreFocus) datePickerToggle.focus();
      }
    };

    const selectCalendarDate = dateValue => {
      if (!dateStart || !dateEnd) return;
      const selectedValue = parseDateValue(dateValue);
      if (selectedValue == null) return;

      const currentStart = parseDateValue(dateStart.value);
      if (!selectingRangeEnd || currentStart == null || dateEnd.value) {
        dateStart.value = dateValue;
        dateEnd.value = "";
        selectingRangeEnd = true;
        calendarHoverValue = null;
        syncDateTrigger();
        focusCalendarDate(dateValue);
        applyFilters();
        return;
      }

      if (selectedValue < currentStart) {
        dateEnd.value = dateStart.value;
        dateStart.value = dateValue;
      } else {
        dateEnd.value = dateValue;
      }
      selectingRangeEnd = false;
      calendarHoverValue = null;
      syncDateTrigger();
      renderCalendar();
      applyFilters();
      setDatePickerOpen(false, true);
    };

    const focusCalendarDate = dateValue => {
      const value = parseDateValue(dateValue);
      if (value == null) return;
      const targetDate = new Date(value);
      const targetMonthIndex = getMonthIndex(targetDate);
      const currentMonthIndex = getMonthIndex(calendarViewDate);
      if (targetMonthIndex < currentMonthIndex) {
        calendarViewDate = getDateFromMonthIndex(targetMonthIndex);
      } else if (targetMonthIndex > currentMonthIndex + 1) {
        calendarViewDate = getDateFromMonthIndex(targetMonthIndex - 1);
      }
      renderCalendar();
      setTimeout(() => {
        const target = calendarMonths && calendarMonths.querySelector(`[data-date="${dateValue}"]`);
        if (target && !target.disabled) {
          calendarMonths.querySelectorAll(".calendar-day").forEach(day => {
            day.tabIndex = day === target ? 0 : -1;
          });
          target.focus();
        }
      }, 0);
    };

    const restoreInitialUrlState = () => {
      if (initialUrlApplied) return null;
      initialUrlApplied = true;

      const linkedEvent = initialEventId
        ? events.find(event => event.id === initialEventId)
        : null;
      if (linkedEvent) {
        if (dateStart) dateStart.value = linkedEvent.startDate || linkedEvent.endDate || "";
        if (dateEnd) dateEnd.value = linkedEvent.endDate || linkedEvent.startDate || "";
        if (searchInput) searchInput.value = "";
        if (categoryFilters) {
          categoryFilters
            .querySelectorAll("input[type='checkbox']")
            .forEach(input => {
              input.checked = linkedEvent.categories.includes(input.value);
            });
        }
        selectingRangeEnd = false;
        syncDateTrigger();
        return linkedEvent;
      }

      if (initialEventId) {
        setEventUrl("");
        showShareToast("共有されたイベントは現在のデータに見つかりませんでした。");
      }

      const from = initialParams.get("from") || "";
      const to = initialParams.get("to") || "";
      if (dateStart && parseDateValue(from) != null) dateStart.value = from;
      if (dateEnd && parseDateValue(to) != null) dateEnd.value = to;
      if (searchInput) searchInput.value = initialParams.get("q") || "";

      if (initialParams.has("cat") && categoryFilters) {
        const requestedCategories = new Set(
          initialParams.getAll("cat").filter(Boolean)
        );
        categoryFilters
          .querySelectorAll("input[type='checkbox']")
          .forEach(input => {
            input.checked = requestedCategories.has(input.value);
          });
      }
      selectingRangeEnd = Boolean(dateStart && dateStart.value && dateEnd && !dateEnd.value);
      syncDateTrigger();
      return null;
    };

    const matchesDateRange = (event, startFilter, endFilter) => {
      if (event.occurrenceValues && event.occurrenceValues.length > 0) {
        return event.occurrenceValues.some(value =>
          (startFilter == null || value >= startFilter) &&
          (endFilter == null || value <= endFilter)
        );
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

    const focusVisibleEvents = visibleEvents => {
      if (visibleEvents.length === 0) return;
      if (visibleEvents.length === 1) {
        map.setView([visibleEvents[0].lat, visibleEvents[0].lon], 14);
        return;
      }
      const bounds = L.latLngBounds(
        visibleEvents.map(event => [event.lat, event.lon])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 13,
        });
      }
    };

    const applyFilters = (fitMap = false) => {
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
        if (floatingVisibleCount) floatingVisibleCount.textContent = "0";
        if (dateInfo) {
          dateInfo.textContent = "期間を選択すると表示されます";
        }
        syncFilterUrl();
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
      if (fitMap) focusVisibleEvents(visibleEvents);
      const visible = visibleEvents.length;

      if (visibleCount) {
        visibleCount.textContent = `${visible}`;
      }
      if (floatingVisibleCount) floatingVisibleCount.textContent = `${visible}`;

      const startText = dateStart && dateStart.value ? dateStart.value : "";
      const endText = dateEnd && dateEnd.value ? dateEnd.value : "";
      if (dateInfo) {
        if (startText || endText) {
          if (startText && endText) {
            dateInfo.textContent = `${formatFilterDate(startText)} → ${formatFilterDate(endText)}・${visible}件表示`;
          } else if (startText) {
            dateInfo.textContent = `${formatFilterDate(startText)}以降・終了日を選択中`;
          } else {
            dateInfo.textContent = `${formatFilterDate(endText)}以前・${visible}件表示`;
          }
        } else {
          dateInfo.textContent = "期間を選択すると表示されます";
        }
      }
      syncFilterUrl();
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

      dateStart.min = formatInputDate(new Date(minDateValue));
      dateEnd.min = dateStart.min;
      dateStart.max = formatInputDate(new Date(maxDateValue));
      dateEnd.max = dateStart.max;
      if (dateRangeHint) {
        dateRangeHint.textContent = `選択可能: ${formatFilterDate(dateStart.min)}〜${formatFilterDate(dateEnd.max)}`;
      }

      if (initializeDates && !dateStart.value && !dateEnd.value) {
        const today = new Date();
        const todayText = formatInputDate(today);
        const todayValue = parseDateValue(todayText);
        if (
          todayValue != null &&
          todayValue >= minDateValue &&
          todayValue <= maxDateValue
        ) {
          const oneWeekLater = new Date(today);
          oneWeekLater.setDate(oneWeekLater.getDate() + 7);
          const endText = formatInputDate(oneWeekLater);
          const endValue = parseDateValue(endText);
          dateStart.value = todayText;
          dateEnd.value = endValue != null && endValue <= maxDateValue
            ? endText
            : dateEnd.max;
        }
      }
      selectingRangeEnd = Boolean(dateStart.value && !dateEnd.value);
      syncDateTrigger();
      if (datePicker && !datePicker.hidden) renderCalendar();
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

      let linkedEvent = null;
      updateDateBounds(next.minDateValue, next.maxDateValue, false);
      if (initializeDates) {
        linkedEvent = restoreInitialUrlState();
        if (!hasInitialFilterState && !linkedEvent) {
          updateDateBounds(next.minDateValue, next.maxDateValue, true);
        }
      }
      if (totalCount) totalCount.textContent = `${events.length}`;
      if (filterSummary) filterSummary.classList.remove("hidden");
      applyFilters(Boolean(searchInput && searchInput.value.trim()));
      if (linkedEvent) {
        window.requestAnimationFrame(() => {
          map.setView([linkedEvent.lat, linkedEvent.lon], 15, { animate: false });
          openLocationEvents([linkedEvent]);
        });
      }
    };

    const renderLoadedSources = (initializeDates = false) => {
      const loaded = EVENT_CSV_SOURCES
        .filter(source => loadedSourcePayloads.has(source.id))
        .map(source => ({ source, payload: loadedSourcePayloads.get(source.id) }));
      if (loaded.length === 0) {
        throw new Error("表示範囲のイベント情報を読み込めませんでした。");
      }
      const mergedPayload = mergeEventPayloads(loaded);
      const changed = initializeDates || mergedPayload.fingerprint !== currentFingerprint;
      if (changed) replaceEventData(mergedPayload, initializeDates);
      return changed;
    };

    const loadSourcePayload = (source, forceRefresh = false) => {
      if (!forceRefresh && loadedSourcePayloads.has(source.id)) {
        return Promise.resolve({ source, payload: loadedSourcePayloads.get(source.id) });
      }
      if (sourceLoadRequests.has(source.id)) {
        return sourceLoadRequests.get(source.id);
      }
      const request = fetchAndParseEvents(source, forceRefresh)
        .then(payload => {
          loadedSourcePayloads.set(source.id, payload);
          return { source, payload };
        })
        .finally(() => {
          sourceLoadRequests.delete(source.id);
        });
      sourceLoadRequests.set(source.id, request);
      return request;
    };

    syncEventSourcesToViewport = async ({
      initializeDates = false,
      forceRefresh = false,
      announce = true,
    } = {}) => {
      const generation = ++sourceViewGeneration;
      const viewportSources = getSourcesForViewport();
      const sourcesToLoad = forceRefresh
        ? viewportSources.filter(source => !String(source.format || "").startsWith("ckan-"))
        : viewportSources.filter(source => !loadedSourcePayloads.has(source.id));

      if (announce && sourcesToLoad.length > 0) {
        const areaNames = sourcesToLoad
          .map(source => source.areaName || source.sourceName)
          .filter(Boolean)
          .join("・");
        setDataRefreshStatus(`${areaNames}のイベント情報を読み込んでいます...`);
      }

      const results = await Promise.allSettled(
        sourcesToLoad.map(source =>
          loadSourcePayload(source, forceRefresh || Boolean(source.refreshOnLoad))
        )
      );
      const failedSources = results
        .map((result, index) => ({ result, source: sourcesToLoad[index] }))
        .filter(item => item.result.status === "rejected");
      failedSources.forEach(({ result, source }) => {
        console.warn(`Event source load failed: ${source.id}`, result.reason);
      });

      if (generation !== sourceViewGeneration && !initializeDates) {
        return { changed: false, failedSources, stale: true, viewportSources };
      }
      if (loadedSourcePayloads.size === 0) {
        throw new Error("表示範囲のイベント情報を読み込めませんでした。");
      }

      const changed = renderLoadedSources(initializeDates);
      if (announce) {
        if (failedSources.length > 0) {
          setDataRefreshStatus(
            "一部の地域データを取得できませんでした。取得済みの情報を表示しています。",
            "warning"
          );
        } else if (sourcesToLoad.length > 0) {
          setDataRefreshStatus(
            `表示範囲のイベント情報を読み込みました（${formatCheckedTime(new Date())}）`,
            "success"
          );
        }
      }
      return { changed, failedSources, stale: false, viewportSources };
    };

    if (dateStart) {
      dateStart.addEventListener("change", () => {
        selectingRangeEnd = Boolean(dateStart.value && dateEnd && !dateEnd.value);
        syncDateTrigger();
        applyFilters();
      });
    }
    if (dateEnd) {
      dateEnd.addEventListener("change", () => {
        selectingRangeEnd = Boolean(dateStart && dateStart.value && !dateEnd.value);
        syncDateTrigger();
        applyFilters();
      });
    }
    if (dateClear) {
      dateClear.addEventListener("click", () => {
        if (dateStart) dateStart.value = "";
        if (dateEnd) dateEnd.value = "";
        selectingRangeEnd = false;
        calendarHoverValue = null;
        syncDateTrigger();
        setDatePickerOpen(false);
        applyFilters();
      });
    }
    if (datePickerToggle && datePicker) {
      datePickerToggle.addEventListener("click", () => {
        setDatePickerOpen(datePicker.hidden);
      });
    }
    if (datePickerClose) {
      datePickerClose.addEventListener("click", () => {
        setDatePickerOpen(false, true);
      });
    }
    if (calendarPrev) {
      calendarPrev.addEventListener("click", () => {
        calendarViewDate = new Date(
          calendarViewDate.getFullYear(),
          calendarViewDate.getMonth() - 1,
          1
        );
        renderCalendar();
      });
    }
    if (calendarNext) {
      calendarNext.addEventListener("click", () => {
        calendarViewDate = new Date(
          calendarViewDate.getFullYear(),
          calendarViewDate.getMonth() + 1,
          1
        );
        renderCalendar();
      });
    }
    if (calendarMonths) {
      calendarMonths.addEventListener("click", event => {
        // The calendar is redrawn after choosing the start date. Keep this
        // click from reaching the outside-click handler with a detached target.
        event.stopPropagation();
        const day = event.target.closest(".calendar-day");
        if (!day || day.disabled) return;
        selectCalendarDate(day.dataset.date || "");
      });
      calendarMonths.addEventListener("pointerover", event => {
        const day = event.target.closest(".calendar-day");
        if (!day || day.disabled || !selectingRangeEnd) return;
        const value = parseDateValue(day.dataset.date || "");
        if (value === calendarHoverValue) return;
        calendarHoverValue = value;
        renderCalendar();
      });
      calendarMonths.addEventListener("pointerleave", () => {
        if (calendarHoverValue == null) return;
        calendarHoverValue = null;
        renderCalendar();
      });
      calendarMonths.addEventListener("keydown", event => {
        const day = event.target.closest(".calendar-day");
        if (!day) return;
        const currentValue = parseDateValue(day.dataset.date || "");
        if (currentValue == null) return;

        const dayOffsets = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -7,
          ArrowDown: 7,
        };
        let nextDate = null;
        if (Object.prototype.hasOwnProperty.call(dayOffsets, event.key)) {
          nextDate = new Date(currentValue);
          nextDate.setDate(nextDate.getDate() + dayOffsets[event.key]);
        } else if (event.key === "PageUp" || event.key === "PageDown") {
          const currentDate = new Date(currentValue);
          const monthOffset = event.key === "PageUp" ? -1 : 1;
          const targetMonthEnd = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + monthOffset + 1,
            0
          ).getDate();
          nextDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + monthOffset,
            Math.min(currentDate.getDate(), targetMonthEnd)
          );
        }
        if (!nextDate) return;

        const nextValue = parseDateValue(formatInputDate(nextDate));
        const minValue = parseDateValue(dateStart ? dateStart.min : "");
        const maxValue = parseDateValue(dateStart ? dateStart.max : "");
        if (nextValue == null ||
          (minValue != null && nextValue < minValue) ||
          (maxValue != null && nextValue > maxValue)) return;
        event.preventDefault();
        focusCalendarDate(formatInputDate(nextDate));
      });
    }
    document.addEventListener("click", event => {
      if (!datePicker || datePicker.hidden) return;
      const eventPath = typeof event.composedPath === "function"
        ? event.composedPath()
        : [];
      const clickedInsidePicker = eventPath.includes(datePicker) ||
        datePicker.contains(event.target);
      const clickedToggle = datePickerToggle &&
        (eventPath.includes(datePickerToggle) || datePickerToggle.contains(event.target));
      if (!clickedInsidePicker && !clickedToggle) {
        setDatePickerOpen(false);
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && datePicker && !datePicker.hidden) {
        event.preventDefault();
        setDatePickerOpen(false, true);
      }
    });
    window.addEventListener("resize", () => {
      if (datePicker && !datePicker.hidden) positionDatePicker();
    });
    if (categoryFilters) {
      categoryFilters.addEventListener("change", () => applyFilters());
    }
    if (searchInput) {
      const debouncedApply = debounce(() => {
        const targetSource = findSourceForSearch(searchInput.value);
        if (targetSource && !loadedSourcePayloads.has(targetSource.id)) {
          focusSourceArea(targetSource, false);
          if (syncEventSourcesToViewport) void syncEventSourcesToViewport();
          return;
        }
        applyFilters(true);
      }, 250);
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

    const entrySource = findSourceForEventId(initialEventId) ||
      findSourceForSearch(initialParams.get("q"));
    if (entrySource) focusSourceArea(entrySource, false);

    setDataRefreshStatus("表示範囲のイベント情報を読み込んでいます...");

    let initialLoadResult;
    try {
      initialLoadResult = await syncEventSourcesToViewport({
        initializeDates: true,
        announce: false,
      });
      initialDataReady = true;
    } finally {
      setLoading(false);
    }

    if (outputManifestLoadFailed || initialLoadResult.failedSources.length > 0) {
      setDataRefreshStatus(
        "一部のイベント情報を取得できませんでした。読み込めた情報を表示しています。",
        "warning"
      );
    } else {
      setDataRefreshStatus("表示範囲のイベント情報を表示中・最新情報を確認しています...");
    }

    void (async () => {
      try {
        const freshResult = await syncEventSourcesToViewport({
          forceRefresh: true,
          announce: false,
        });
        if (freshResult.stale) return;
        if (outputManifestLoadFailed) {
          setDataRefreshStatus(
            "追加イベントの一覧を取得できませんでした。読み込めた情報を表示しています。",
            "warning"
          );
          return;
        }
        if (freshResult.failedSources.length > 0) {
          setDataRefreshStatus(
            "表示範囲の一部データと通信できないため、取得済みの情報を表示しています。",
            "warning"
          );
          return;
        }
        if (freshResult.changed) {
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
