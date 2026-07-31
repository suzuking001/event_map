(() => {
  window.App = window.App || {};

  const numberFormatter = new Intl.NumberFormat("ja-JP");
  const dateLabelFormatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getDateKey = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const getRecentDateKeys = (days, timeZone) => {
    const todayKey = getDateKey(new Date(), timeZone);
    const today = new Date(`${todayKey}T00:00:00+09:00`);
    return Array.from({ length: days }, (_, index) =>
      getDateKey(new Date(today.getTime() - index * 86400000), timeZone)
    );
  };

  const getElements = () => ({
    root: document.getElementById("visitor-counter"),
    total: document.getElementById("visitor-total"),
    today: document.getElementById("visitor-today"),
    updated: document.getElementById("visitor-last-updated"),
    historyDetails: document.getElementById("visitor-history-details"),
    historyList: document.getElementById("visitor-history-list"),
  });

  const setStatus = (elements, state, message) => {
    if (elements.root) {
      elements.root.dataset.state = state;
    }
    if (elements.updated) {
      elements.updated.textContent = message;
    }
  };

  const formatCount = value =>
    Number.isFinite(Number(value)) ? numberFormatter.format(Number(value)) : "—";

  const buildCounterUrl = (config, key, action = "") => {
    const suffix = action ? `/${action}` : "/";
    return `${config.apiBase}/${encodeURIComponent(config.namespace)}/${encodeURIComponent(
      key
    )}${suffix}`;
  };

  const requestCounter = async (config, key, increment = false) => {
    const response = await fetch(
      buildCounterUrl(config, key, increment ? "up" : ""),
      {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    );
    if (response.status === 404 && !increment) {
      return { count: 0, updated_at: "" };
    }
    if (!response.ok) {
      throw new Error(`Counter request failed: ${response.status}`);
    }
    return response.json();
  };

  const getStorage = () => {
    try {
      const probeKey = "__event_map_counter_probe__";
      localStorage.setItem(probeKey, "1");
      localStorage.removeItem(probeKey);
      return localStorage;
    } catch (error) {
      return null;
    }
  };

  const loadCounter = async (config, key, storage, storageKey) => {
    const shouldIncrement = Boolean(storage && !storage.getItem(storageKey));
    if (shouldIncrement) {
      storage.setItem(storageKey, "pending");
    }
    try {
      const result = await requestCounter(config, key, shouldIncrement);
      if (shouldIncrement) {
        storage.setItem(storageKey, "counted");
      }
      return result;
    } catch (error) {
      if (shouldIncrement && storage.getItem(storageKey) === "pending") {
        storage.removeItem(storageKey);
      }
      throw error;
    }
  };

  const renderHistory = (elements, rows) => {
    if (!elements.historyList) return;
    elements.historyList.textContent = "";
    const maxCount = Math.max(1, ...rows.map(row => Number(row.count) || 0));
    rows.forEach(row => {
      const item = document.createElement("li");
      const date = new Date(`${row.dateKey}T12:00:00+09:00`);
      const label = document.createElement("span");
      label.className = "visitor-history-date";
      label.textContent = dateLabelFormatter.format(date);

      const bar = document.createElement("span");
      bar.className = "visitor-history-bar";
      const fill = document.createElement("span");
      fill.style.width = `${Math.max(4, ((Number(row.count) || 0) / maxCount) * 100)}%`;
      bar.appendChild(fill);

      const count = document.createElement("strong");
      count.textContent = `${formatCount(row.count)}人`;
      item.append(label, bar, count);
      elements.historyList.appendChild(item);
    });
  };

  const init = async () => {
    const elements = getElements();
    const config = window.App.config && window.App.config.VISITOR_COUNTER;
    if (!elements.root || !config) return;

    const isProduction = config.productionHosts.includes(location.hostname);
    if (!isProduction || navigator.webdriver) {
      setStatus(
        elements,
        "preview",
        "公開版へのアクセス時に人数を集計します"
      );
      if (elements.historyDetails) {
        elements.historyDetails.hidden = true;
      }
      return;
    }

    const storage = getStorage();
    const dateKeys = getRecentDateKeys(config.historyDays, config.timeZone);
    const todayKey = dateKeys[0];
    const totalStorageKey = `${config.storagePrefix}:visitor`;
    const todayStorageKey = `${config.storagePrefix}:day:${todayKey}`;

    try {
      const [totalResult, todayResult] = await Promise.all([
        loadCounter(
          config,
          config.totalKey,
          storage,
          totalStorageKey
        ),
        loadCounter(
          config,
          `${config.dailyKeyPrefix}-${todayKey}`,
          storage,
          todayStorageKey
        ),
      ]);

      if (elements.total) {
        elements.total.textContent = formatCount(totalResult.count);
        elements.total.dataset.value = "number";
      }
      if (elements.today) {
        elements.today.textContent = formatCount(todayResult.count);
        elements.today.dataset.value = "number";
      }

      const pastResults = await Promise.all(
        dateKeys.slice(1).map(async dateKey => {
          try {
            const result = await requestCounter(
              config,
              `${config.dailyKeyPrefix}-${dateKey}`
            );
            return { dateKey, count: result.count };
          } catch (error) {
            return { dateKey, count: 0 };
          }
        })
      );
      renderHistory(elements, [
        { dateKey: todayKey, count: todayResult.count },
        ...pastResults,
      ]);

      const updatedAt = todayResult.updated_at || totalResult.updated_at;
      const updatedDate = updatedAt ? new Date(updatedAt) : null;
      const updatedLabel =
        updatedDate && !Number.isNaN(updatedDate.getTime())
          ? `最終集計 ${dateTimeFormatter.format(updatedDate)}`
          : "集計を開始しました";
      setStatus(elements, "success", updatedLabel);
    } catch (error) {
      console.warn("Visitor counter unavailable.", error);
      setStatus(
        elements,
        "warning",
        "現在、アクセス状況を取得できません"
      );
      if (elements.historyDetails) {
        elements.historyDetails.hidden = true;
      }
    }
  };

  window.App.visitorCounter = { init };
})();
