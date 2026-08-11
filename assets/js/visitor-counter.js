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

  const buildCounterUrl = (config, key, increment = false) => {
    const action = increment ? "hit" : "get";
    const counterKey = `${config.namespace}-${key}`;
    return `${config.apiBase}/${action}/${encodeURIComponent(counterKey)}`;
  };

  const requestCounter = async (config, key, increment = false) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      config.requestTimeoutMs
    );
    let response;
    try {
      response = await fetch(buildCounterUrl(config, key, increment), {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        keepalive: increment,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
    if (response.status === 404 && !increment) {
      return { count: 0, checked_at: new Date().toISOString() };
    }
    if (!response.ok) {
      throw new Error(`Counter request failed: ${response.status}`);
    }
    const payload = await response.json();
    const count = Number(payload.value ?? payload.count);
    if (!Number.isFinite(count)) {
      throw new Error("Counter response did not contain a numeric value");
    }
    return { count, checked_at: new Date().toISOString() };
  };

  const getStorage = () => {
    for (const storageName of ["localStorage", "sessionStorage"]) {
      try {
        const storage = window[storageName];
        const probeKey = "__event_map_counter_probe__";
        storage.setItem(probeKey, "1");
        storage.removeItem(probeKey);
        return storage;
      } catch (error) {
        // Try the next browser storage. Some privacy modes disable localStorage.
      }
    }
    return null;
  };

  const getCachedCount = (config, key, storage) => {
    if (!storage) return null;
    const cachedValue = storage.getItem(`${config.storagePrefix}:cache:${key}`);
    if (cachedValue === null) return null;
    const value = Number(cachedValue);
    return Number.isFinite(value) ? value : null;
  };

  const setCachedCount = (config, key, storage, count) => {
    if (!storage || !Number.isFinite(Number(count))) return;
    storage.setItem(`${config.storagePrefix}:cache:${key}`, String(count));
  };

  const loadCounter = async (
    config,
    key,
    storage,
    storageKey,
    incrementAllowed
  ) => {
    const shouldIncrement =
      incrementAllowed && (!storage || !storage.getItem(storageKey));
    if (shouldIncrement && storage) {
      storage.setItem(storageKey, "pending");
    }
    try {
      const result = await requestCounter(config, key, shouldIncrement);
      if (shouldIncrement && storage) {
        storage.setItem(storageKey, "counted");
      }
      return result;
    } catch (error) {
      if (
        shouldIncrement &&
        storage &&
        storage.getItem(storageKey) === "pending"
      ) {
        storage.removeItem(storageKey);
      }
      if (shouldIncrement) {
        try {
          const current = await requestCounter(config, key, false);
          return { ...current, incrementFailed: true };
        } catch (readError) {
          console.warn("Visitor counter fallback read failed.", readError);
          throw error;
        }
      }
      throw error;
    }
  };

  const resolveCounterResult = (result, config, key, storage) => {
    if (result.status === "fulfilled") {
      setCachedCount(config, key, storage, result.value.count);
      return { ...result.value, available: true, live: true };
    }
    console.warn("Visitor counter request failed.", result.reason);
    const cachedCount = getCachedCount(config, key, storage);
    return {
      count: cachedCount,
      available: cachedCount !== null,
      live: false,
    };
  };

  const renderCount = (element, result) => {
    if (!element || !result.available) return;
    element.textContent = formatCount(result.count);
    element.dataset.value = "number";
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
    const isReadOnly = !isProduction || navigator.webdriver;
    const storage = getStorage();
    const dateKeys = getRecentDateKeys(config.historyDays, config.timeZone);
    const todayKey = dateKeys[0];
    const totalStorageKey = `${config.storagePrefix}:visitor`;
    const todayStorageKey = `${config.storagePrefix}:day:${todayKey}`;

    const totalKey = config.totalKey;
    const dailyKey = `${config.dailyKeyPrefix}-${todayKey}`;
    const [totalSettled, todaySettled] = await Promise.allSettled([
      loadCounter(
        config,
        totalKey,
        storage,
        totalStorageKey,
        !isReadOnly
      ),
      loadCounter(
        config,
        dailyKey,
        storage,
        todayStorageKey,
        !isReadOnly
      ),
    ]);

    const totalResult = resolveCounterResult(
      totalSettled,
      config,
      totalKey,
      storage
    );
    const todayResult = resolveCounterResult(
      todaySettled,
      config,
      dailyKey,
      storage
    );
    renderCount(elements.total, totalResult);
    renderCount(elements.today, todayResult);

    const historyStates = await Promise.all(
      dateKeys.slice(1).map(async dateKey => {
        const key = `${config.dailyKeyPrefix}-${dateKey}`;
        try {
          const result = await requestCounter(config, key);
          setCachedCount(config, key, storage, result.count);
          return { dateKey, count: result.count, live: true };
        } catch (error) {
          const cachedCount = getCachedCount(config, key, storage);
          return {
            dateKey,
            count: cachedCount ?? 0,
            live: false,
          };
        }
      })
    );
    renderHistory(elements, [
      { dateKey: todayKey, count: todayResult.count ?? 0 },
      ...historyStates,
    ]);
    if (elements.historyDetails) {
      elements.historyDetails.hidden = false;
    }

    const primaryUnavailable = !totalResult.live || !todayResult.live;
    const incrementFailed =
      totalResult.incrementFailed || todayResult.incrementFailed;
    const historyUnavailable = historyStates.some(result => !result.live);

    if (isReadOnly && totalResult.available && todayResult.available) {
      setStatus(
        elements,
        "preview",
        "プレビュー表示（このアクセスは集計されません）"
      );
    } else if (!totalResult.available && !todayResult.available) {
      setStatus(
        elements,
        "warning",
        "現在、アクセス状況を取得できません"
      );
    } else if (incrementFailed) {
      setStatus(elements, "warning", "今回の訪問は次回アクセス時に再集計します");
    } else if (primaryUnavailable || historyUnavailable) {
      setStatus(elements, "warning", "一部は直近に取得できた集計値です");
    } else {
      const checkedAt = todayResult.checked_at || totalResult.checked_at;
      const checkedDate = checkedAt ? new Date(checkedAt) : new Date();
      setStatus(
        elements,
        "success",
        `最終確認 ${dateTimeFormatter.format(checkedDate)}`
      );
    }
  };

  window.App.visitorCounter = { init };
})();
