    const progress = document.querySelector(".scroll-progress");
    const topControls = document.querySelector(".top-controls");
    const pageMain = document.querySelector("main");
    const filterTabs = document.querySelector(".filter-tabs");
    const tabs = document.querySelectorAll(".filter-tab");
    const grid = document.querySelector("#worksGrid");
    const worksEmpty = document.querySelector("#worksEmpty");
    const emptyReset = document.querySelector("#emptyReset");
    const sentinel = document.querySelector("#loadSentinel");
    const catalogPanel = document.querySelector("#catalogPanel");
    const catalogTitle = document.querySelector("#catalogTitle");
    const catalogOptions = document.querySelector("#catalogOptions");
    const catalogResult = document.querySelector("#catalogResult");
    const catalogClear = document.querySelector("#catalogClear");
    const catalogReset = document.querySelector("#catalogReset");
    const catalogMultiSelect = document.querySelector("#catalogMultiSelect");
    const searchControl = document.querySelector("#searchControl");
    const searchPanel = document.querySelector("#searchPanel");
    const searchInput = document.querySelector("#searchInput");
    const searchResult = document.querySelector("#searchResult");
    const searchClear = document.querySelector("#searchClear");
    const lightbox = document.querySelector("#lightbox");
    let lightboxImage = document.querySelector("#lightboxImage");
    let lightboxImageBuffer = document.querySelector("#lightboxImageBuffer");
    const lightboxInfo = document.querySelector("#lightboxInfo");
    const lightboxInfoTitle = document.querySelector("#lightboxInfoTitle");
    const lightboxInfoBasic = document.querySelector("#lightboxInfoBasic");
    const lightboxClose = document.querySelector(".lightbox-close");
    const lightboxPrev = document.querySelector(".lightbox-prev");
    const lightboxNext = document.querySelector(".lightbox-next");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compactViewport = window.matchMedia("(max-width: 640px)");
    let photos = [];
    let visiblePhotos = [];
    let renderedCount = 0;
    let activeCatalogKey = "";
    let activeLightboxIndex = 0;
    let scrollTicking = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchAxis = "";
    let touchTracking = false;
    let touchIdentifier = null;
    let lightboxSwitching = false;
    let lightboxCloseTimer = 0;
    let lightboxRequestId = 0;
    let lastLightboxTrigger = null;
    let filterTransition = null;
    let hasRendered = false;
    let catalogMultiSelectEnabled = false;
    let searchQuery = "";
    let searchTerms = [];
    let searchFrame = 0;
    let searchComposing = false;
    let revealObserver = null;
    let imageObserver = null;
    let loadObserver = null;
    let photosRevision = "";
    let photosReady = false;
    let photosRefreshTimer = 0;
    let photosRefreshPromise = null;
    let photosRefreshQueued = false;
    const previewSources = new Map();
    let previewIndexUrl = "";
    let previewIndexPromise = null;
    let previewIndexLoaded = false;
    const photoSearchCache = new WeakMap();
    const lightboxPreloads = new Map();
    const contentChannel = typeof window.BroadcastChannel === "function"
      ? new BroadcastChannel("hugo-aviation-content")
      : null;
    const catalogFilters = {
      time: new Set(),
      airline: new Set(),
      aircraft: new Set(),
      airport: new Set(),
      phase: new Set(),
    };
    const phaseLabels = {
      ground: "地面停场",
      taxi: "滑行",
      takeoff: "起飞",
      landing: "进近 / 降落",
      cruise: "空中 / 巡航",
      other: "其他",
    };
    const timeLabels = {
      day: "日间",
      night: "夜间",
    };
    const catalogConfig = [
      { key: "time", label: "拍摄时间", labels: timeLabels, tab: document.querySelector('[data-catalog-key="time"]') },
      { key: "airline", label: "航空公司", tab: document.querySelector('[data-catalog-key="airline"]') },
      { key: "aircraft", label: "机型", tab: document.querySelector('[data-catalog-key="aircraft"]') },
      { key: "airport", label: "机场", tab: document.querySelector('[data-catalog-key="airport"]') },
      { key: "phase", label: "飞行阶段", labels: phaseLabels, tab: document.querySelector('[data-catalog-key="phase"]') },
    ];

    const isCompactViewport = () => compactViewport.matches;
    const firstScreenPhotoCount = () => (isCompactViewport() ? 2 : 3);
    const initialBatchSize = () => (isCompactViewport() ? 14 : 30);
    const batchSize = () => (isCompactViewport() ? 10 : 24);

    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      progress.style.transform = `scaleX(${ratio})`;
      topControls.classList.toggle("is-scrolled", window.scrollY > 24);
    };

    const requestProgressUpdate = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        updateProgress();
        scrollTicking = false;
      });
    };

    const hasPhotoManifest = (data) => Array.isArray(data) || Array.isArray(data?.photos);

    const normalizePhotos = (data) => {
      const list = Array.isArray(data) ? data : data?.photos;
      return Array.isArray(list) ? list.filter((photo) => photo && photo.src) : [];
    };

    const readInitialWorksData = () => {
      const element = document.querySelector("#initialWorksData");
      if (!element?.textContent) return null;
      try {
        return JSON.parse(element.textContent);
      } catch (error) {
        console.warn("Unable to read embedded works data", error);
        return null;
      } finally {
        element.remove();
      }
    };

    const cleanText = (value) => String(value || "").trim();

    const applyPreviewSources = (sources) => {
      if (!sources || typeof sources !== "object" || Array.isArray(sources)) return false;
      let changed = false;
      Object.entries(sources).forEach(([original, preview]) => {
        if (!original || typeof preview !== "string" || !/^\/assets\/previews\/[a-zA-Z0-9._-]+\.webp$/.test(preview)) return;
        if (previewSources.get(original) === preview) return;
        previewSources.set(original, preview);
        changed = true;
      });
      return changed;
    };

    const photoPreviewSource = (photo) => {
      const original = photo?.thumbSrc || photo?.src || "";
      return previewSources.get(original) || original;
    };

    const loadPreviewIndex = () => {
      if (previewIndexLoaded || !/^\/assets\/generated\/previews\.[a-f0-9]+\.json$/.test(previewIndexUrl)) {
        return Promise.resolve(false);
      }
      if (previewIndexPromise) return previewIndexPromise;
      previewIndexPromise = fetch(previewIndexUrl, { cache: "force-cache", priority: "low" })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Preview index returned ${response.status}`);
          const sources = await response.json();
          if (!sources || typeof sources !== "object" || Array.isArray(sources)) throw new Error("Invalid preview index");
          const changed = applyPreviewSources(sources);
          previewIndexLoaded = true;
          return changed;
        })
        .catch((error) => {
          console.warn("Unable to load optimized previews", error);
          return false;
        })
        .finally(() => {
          previewIndexPromise = null;
        });
      return previewIndexPromise;
    };

    const recoverPhotoPreview = (image) => {
      image.classList.remove("is-loaded");
      const original = image.dataset.fallbackSrc;
      if (!original || image.dataset.src === original) return;
      if (previewSources.get(original) === image.dataset.src) previewSources.delete(original);
      image.dataset.src = original;
      image.src = original;
    };

    const normalizeAirportCode = (value) => {
      const codes = cleanText(value).toUpperCase().match(/\b[A-Z]{3}\b/g);
      return codes?.at(-1) || "";
    };

    const fileNameFromSource = (source = "") => {
      try {
        const pathname = new URL(source, window.location.href).pathname;
        const encodedName = pathname.split("/").pop() || "";
        return decodeURIComponent(encodedName)
          .replace(/\.[^.]+$/, "")
          .replace(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-/i, "");
      } catch {
        return "";
      }
    };

    const normalizeFilename = (value) => cleanText(value)
      .replace(/\.[^.]+$/, "")
      .replace(/\s+编辑$/u, "")
      .trim();

    const photoFilename = (photo) => normalizeFilename(photo?.title)
      || normalizeFilename(fileNameFromSource(photo?.src))
      || normalizeFilename(photo?.id);

    const photoPreviewTitle = (photo) => cleanText(photo?.aircraft)
      || cleanText(photo?.airport)
      || photoFilename(photo)
      || "航空摄影作品";

    const photoDescription = (photo) => {
      const subject = [photo?.airline, photo?.aircraft, photo?.registration].map(cleanText).filter(Boolean).join(" ");
      const airport = cleanText(photo?.airport);
      if (subject && airport) return `${subject} 于 ${airport} 的航空摄影作品`;
      if (subject) return `${subject} 航空摄影作品`;
      if (airport) return `${airport} 航空摄影作品`;
      return "航空摄影作品";
    };

    const normalizeSearchText = (value) => cleanText(value)
      .normalize("NFKC")
      .toLocaleLowerCase("zh-CN");

    const updateSearchTerms = () => {
      searchTerms = normalizeSearchText(searchQuery).split(/\s+/u).filter(Boolean);
    };

    const photoSearchText = (photo) => {
      const cached = photoSearchCache.get(photo);
      if (cached) return cached;
      const value = normalizeSearchText([
        photoFilename(photo),
        photo?.alt,
        photo?.airline,
        photo?.aircraft,
        photo?.registration,
        photo?.airport,
        phaseLabels[photo?.phase] || photo?.phase,
        photo?.capturedAt,
        photo?.spot,
        photo?.notes,
        ...(Array.isArray(photo?.categories) ? photo.categories : []),
      ].filter(Boolean).join(" "));
      photoSearchCache.set(photo, value);
      return value;
    };

    const matchesSearch = (photo) => {
      if (!searchTerms.length) return true;
      const searchable = photoSearchText(photo);
      return searchTerms.every((term) => searchable.includes(term));
    };

    const readFiltersFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      catalogMultiSelectEnabled = params.get("multi") === "1";
      searchQuery = cleanText(params.get("q"));
      updateSearchTerms();
      searchInput.value = searchQuery;
      catalogConfig.forEach(({ key }) => {
        catalogFilters[key].clear();
        params.getAll(key).forEach((entry) => {
          String(entry).split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => {
            catalogFilters[key].add(value);
          });
        });
        if (!catalogMultiSelectEnabled && catalogFilters[key].size > 1) {
          const firstValue = catalogFilters[key].values().next().value;
          catalogFilters[key].clear();
          if (firstValue) catalogFilters[key].add(firstValue);
        }
      });
    };

    const syncFilterUrl = () => {
      const url = new URL(window.location.href);
      if (catalogMultiSelectEnabled) url.searchParams.set("multi", "1");
      else url.searchParams.delete("multi");
      if (searchQuery) url.searchParams.set("q", searchQuery);
      else url.searchParams.delete("q");

      catalogConfig.forEach(({ key }) => {
        url.searchParams.delete(key);
        [...catalogFilters[key]]
          .sort((left, right) => left.localeCompare(right, "zh-CN", { numeric: true, sensitivity: "base" }))
          .forEach((value) => url.searchParams.append(key, value));
      });

      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    };

    const isNightPhoto = (photo) => {
      const categories = Array.isArray(photo.categories) ? photo.categories : [];
      if (categories.includes("night")) return true;
      if (categories.includes("day")) return false;

      const searchableText = [
        photo.title,
        photo.alt,
        photo.notes,
        photo.spot,
        photo.airline,
        photo.aircraft,
        photo.registration,
        photo.airport,
        photo.phase,
        ...categories,
      ].filter(Boolean).join(" ").toLowerCase();

      return /night|夜|夜间|夜航|夜景/.test(searchableText);
    };

    const photoFocus = (photo, layout) => {
      if (layout === "vertical") return "50% 50%";
      const text = [photo.title, photo.alt, photo.aircraft, photo.notes].filter(Boolean).join(" ").toLowerCase();
      if (/nose|front|机头|前段|前半|驾驶舱|cockpit/.test(text)) return "36% 50%";
      return layout === "featured" ? "38% 50%" : "40% 50%";
    };

    const catalogValue = (photo, key) => (
      key === "time"
        ? (isNightPhoto(photo) ? "night" : "day")
        : (key === "airport" ? normalizeAirportCode(photo[key]) : String(photo[key] || "").trim())
    );

    const matchesCatalogFilters = (photo, excludedKey = "") => catalogConfig.every(({ key }) => (
      key === excludedKey
        || catalogFilters[key].size === 0
        || catalogFilters[key].has(catalogValue(photo, key))
    ));

    const filteredPhotos = () => photos.filter((photo) => matchesCatalogFilters(photo) && matchesSearch(photo));

    const sortCatalogEntries = (key, entries) => {
      const orderedValues = key === "time"
        ? Object.keys(timeLabels)
        : (key === "phase" ? Object.keys(phaseLabels) : null);
      return [...entries].sort(([left], [right]) => {
        if (orderedValues) {
          const leftIndex = orderedValues.indexOf(left);
          const rightIndex = orderedValues.indexOf(right);
          return (leftIndex < 0 ? orderedValues.length : leftIndex)
            - (rightIndex < 0 ? orderedValues.length : rightIndex);
        }
        return left.localeCompare(right, "zh-CN", { numeric: true, sensitivity: "base" });
      });
    };

    const catalogValues = (key, scoped = true) => {
      const counts = new Map();
      photos.forEach((photo) => {
        if (!matchesSearch(photo)) return;
        if (scoped && !matchesCatalogFilters(photo, key)) return;
        const value = catalogValue(photo, key);
        if (value) counts.set(value, (counts.get(value) || 0) + 1);
      });
      return sortCatalogEntries(key, counts.entries());
    };

    const selectedCatalogCount = () => catalogConfig.reduce((count, { key }) => (
      count + catalogFilters[key].size
    ), 0);

    const updateCatalogMode = () => {
      catalogMultiSelect.checked = catalogMultiSelectEnabled;
      catalogPanel.classList.toggle("is-multi", catalogMultiSelectEnabled);
    };

    const closeCatalogPanel = () => {
      activeCatalogKey = "";
      catalogPanel.classList.remove("is-open");
      catalogPanel.setAttribute("aria-hidden", "true");
      catalogPanel.inert = true;
      catalogConfig.forEach(({ tab }) => {
        tab.classList.remove("is-open");
        tab.setAttribute("aria-expanded", "false");
      });
    };

    const updateSearchControls = () => {
      const hasSearch = Boolean(searchQuery);
      searchControl.classList.toggle("has-search", hasSearch);
      searchControl.classList.toggle("is-open", searchPanel.classList.contains("is-open"));
      searchControl.setAttribute("aria-expanded", String(searchPanel.classList.contains("is-open")));
      searchClear.disabled = !hasSearch;
      searchResult.textContent = `${filteredPhotos().length} 张`;
    };

    const closeSearchPanel = (restoreFocus = false) => {
      if (!searchPanel.classList.contains("is-open")) return;
      searchPanel.classList.remove("is-open");
      searchPanel.setAttribute("aria-hidden", "true");
      searchPanel.inert = true;
      updateSearchControls();
      if (restoreFocus) searchControl.focus({ preventScroll: true });
    };

    const openSearchPanel = () => {
      requestCompleteLibrary();
      closeCatalogPanel();
      searchPanel.classList.add("is-open");
      searchPanel.setAttribute("aria-hidden", "false");
      searchPanel.inert = false;
      updateFilterControls();
      updateSearchControls();
      requestAnimationFrame(() => searchInput.focus({ preventScroll: true }));
    };

    const commitSearch = (value, scroll = false) => {
      const nextQuery = cleanText(value);
      if (nextQuery === searchQuery) {
        updateSearchControls();
        return;
      }
      searchQuery = nextQuery;
      updateSearchTerms();
      searchInput.value = nextQuery;
      applyFilters({ scroll });
    };

    const scheduleSearch = () => {
      if (searchComposing) return;
      cancelAnimationFrame(searchFrame);
      searchFrame = requestAnimationFrame(() => commitSearch(searchInput.value));
    };

    const setupCatalogControls = () => {
      const globalValues = new Map(catalogConfig.map(({ key }) => [key, catalogValues(key, false)]));
      catalogConfig.forEach(({ key }) => {
        const values = new Set(globalValues.get(key).map(([value]) => value));
        catalogFilters[key].forEach((value) => {
          if (!values.has(value)) catalogFilters[key].delete(value);
        });
      });

      catalogConfig.forEach(({ key, tab }) => {
        tab.disabled = globalValues.get(key).length === 0;
      });

      const activeConfig = catalogConfig.find(({ key }) => key === activeCatalogKey);
      if (activeConfig?.tab.disabled) closeCatalogPanel();
    };

    const renderCatalogOptions = () => {
      const config = catalogConfig.find(({ key }) => key === activeCatalogKey);
      if (!config) return;

      const selectedValues = catalogFilters[config.key];
      const scopedValues = catalogValues(config.key);
      selectedValues.forEach((selectedValue) => {
        if (!scopedValues.some(([value]) => value === selectedValue)) scopedValues.push([selectedValue, 0]);
      });

      const totalWithoutCurrent = photos.filter((photo) => (
        matchesSearch(photo) && matchesCatalogFilters(photo, config.key)
      )).length;
      const entries = [["", totalWithoutCurrent], ...sortCatalogEntries(config.key, scopedValues)];
      const fragment = document.createDocumentFragment();

      entries.forEach(([value, count]) => {
        const button = document.createElement("button");
        const label = document.createElement("span");
        const number = document.createElement("small");
        const displayValue = value
          ? (config.labels?.[value] || value)
          : "全部";

        button.className = "catalog-option";
        button.type = "button";
        button.dataset.value = value;
        button.setAttribute("aria-pressed", String(value ? selectedValues.has(value) : selectedValues.size === 0));
        label.textContent = displayValue;
        number.textContent = String(count);
        button.append(label, number);
        fragment.append(button);
      });

      catalogTitle.textContent = config.label;
      catalogResult.textContent = `${filteredPhotos().length} 张作品`;
      catalogOptions.setAttribute("aria-label", `${config.label}选项`);
      catalogOptions.replaceChildren(fragment);
      catalogPanel.setAttribute("aria-label", `${config.label}筛选`);
      catalogClear.textContent = `清除${config.label}`;
      catalogClear.disabled = selectedValues.size === 0;
      updateCatalogMode();
    };

    const updateCatalogOptionState = () => {
      if (!activeCatalogKey) return;
      const selectedValues = catalogFilters[activeCatalogKey];
      catalogOptions.querySelectorAll(".catalog-option").forEach((button) => {
        const value = button.dataset.value || "";
        button.setAttribute("aria-pressed", String(value ? selectedValues.has(value) : selectedValues.size === 0));
      });
      catalogResult.textContent = `${filteredPhotos().length} 张作品`;
      catalogClear.disabled = selectedValues.size === 0;
      updateCatalogMode();
    };

    const toggleCatalogPanel = (key) => {
      requestCompleteLibrary();
      const config = catalogConfig.find((item) => item.key === key);
      if (!config || config.tab.disabled) return;
      if (activeCatalogKey === key && catalogPanel.classList.contains("is-open")) {
        closeCatalogPanel();
        updateFilterControls();
        return;
      }

      closeSearchPanel();
      activeCatalogKey = key;
      catalogPanel.classList.add("is-open");
      catalogPanel.setAttribute("aria-hidden", "false");
      catalogPanel.inert = false;
      updateFilterControls();
      renderCatalogOptions();
    };

    const createPhotosRevision = (data, loadedPhotos) => cleanText(data?.updatedAt)
      || JSON.stringify(loadedPhotos.map((photo) => [
        photo.id,
        photo.src,
        photo.thumbSrc,
        photo.title,
        photo.airline,
        photo.aircraft,
        photo.registration,
        photo.airport,
        photo.capturedAt,
        photo.phase,
        photo.spot,
        photo.notes,
        photo.categories,
      ]));

    const loadPhotos = async () => {
      const sources = ["/api/photos", "photos.json"];
      for (const source of sources) {
        try {
          const response = await fetch(source, {
            cache: source.startsWith("/api/") ? "no-cache" : "force-cache",
            priority: source.startsWith("/api/") ? "low" : "auto",
          });
          if (!response.ok) continue;
          const data = await response.json();
          if (!hasPhotoManifest(data)) continue;
          const loaded = normalizePhotos(data);
          return {
            photos: loaded,
            revision: createPhotosRevision(data, loaded),
          };
        } catch (error) {
          console.warn(`Unable to load ${source}`, error);
        }
      }
      return null;
    };

    const createPhotoButton = (photo, index) => {
      const categories = Array.isArray(photo.categories) ? photo.categories.join(" ") : "";
      const layout = photo.layout === "featured" || photo.layout === "vertical" ? photo.layout : "";
      const firstScreen = index < firstScreenPhotoCount();
      const button = document.createElement("button");
      const image = document.createElement("img");

      button.className = `photo ${layout} reveal${firstScreen ? " is-visible" : ""}`.trim();
      button.type = "button";
      button.dataset.index = String(index);
      button.dataset.photoId = String(photo.id || photo.src);
      button.dataset.category = categories;
      button.setAttribute("aria-label", `打开照片：${photoPreviewTitle(photo)}`);

      const previewSrc = photoPreviewSource(photo);
      image.dataset.src = previewSrc;
      image.dataset.fallbackSrc = photo.thumbSrc || photo.src;
      image.alt = photoDescription(photo);
      image.decoding = "async";
      image.loading = firstScreen ? "eager" : "lazy";
      image.sizes = "(max-width: 640px) 100vw, (max-width: 900px) 50vw, 34vw";
      image.style.objectPosition = photoFocus(photo, layout);
      image.addEventListener("load", () => image.classList.add("is-loaded"));
      image.addEventListener("error", () => recoverPhotoPreview(image));
      if (index === 0) image.fetchPriority = "high";
      if (firstScreen) {
        // Above-the-fold content paints as soon as decoded, without waiting for a reveal observer or fade.
        image.style.transition = "none";
        image.src = previewSrc;
      }

      button.append(image);
      return button;
    };

    const updatePhotoButton = (button, photo, index) => {
      const image = button.querySelector("img");
      const previewSrc = photoPreviewSource(photo);
      button.dataset.index = String(index);
      button.dataset.category = Array.isArray(photo.categories) ? photo.categories.join(" ") : "";
      button.setAttribute("aria-label", `打开照片：${photoPreviewTitle(photo)}`);
      button.classList.toggle("featured", photo.layout === "featured");
      button.classList.toggle("vertical", photo.layout === "vertical");
      if (!image) return;
      image.dataset.fallbackSrc = photo.thumbSrc || photo.src;
      image.alt = photoDescription(photo);
      image.style.objectPosition = photoFocus(photo, photo.layout);
      if (image.dataset.src === previewSrc) return;
      image.dataset.src = previewSrc;
      image.classList.remove("is-loaded");
      if (image.hasAttribute("src")) image.src = previewSrc;
    };

    const setupPhotoImages = (items) => {
      const images = items.map((item) => item.querySelector("img")).filter(Boolean);
      if (!images.length) return;
      if (!("IntersectionObserver" in window)) {
        images.forEach((image) => {
          if (!image.hasAttribute("src")) image.src = image.dataset.src;
        });
        return;
      }

      if (!imageObserver) {
        imageObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const image = entry.target;
            if (entry.isIntersecting) {
              if (!image.hasAttribute("src")) image.src = image.dataset.src;
            } else if (image.hasAttribute("src")) {
              image.removeAttribute("src");
              image.classList.remove("is-loaded");
            }
          });
        }, {
          rootMargin: isCompactViewport() ? "700px 0px" : "1200px 0px",
          threshold: 0.01,
        });
      }
      images.forEach((image) => imageObserver.observe(image));
    };

    const formatDate = (value) => {
      const date = String(value || "").slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replaceAll("-", ".") : "";
    };

    const renderLightboxInfo = (photo) => {
      const title = photoPreviewTitle(photo);
      const information = [
        isNightPhoto(photo) ? "夜间" : "日间",
        photo.airline,
        photo.aircraft,
        photo.registration,
        photo.airport && `机场 ${photo.airport}`,
        phaseLabels[photo.phase],
        formatDate(photo.capturedAt),
        photo.spot && `机位 / 参数 ${photo.spot}`,
        photo.notes && `备注 ${photo.notes}`,
      ].map(cleanText).filter((item) => item && item !== title);

      lightboxInfoTitle.textContent = title;
      lightboxInfoBasic.textContent = information.join(" · ") || "航空摄影作品";
      lightboxInfo.scrollLeft = 0;

      if (!reduceMotion && lightbox.classList.contains("is-open") && typeof lightboxInfoTitle.animate === "function") {
        [lightboxInfoTitle, lightboxInfoBasic].forEach((element) => {
          element.getAnimations().forEach((animation) => animation.cancel());
          element.animate([
            { opacity: 0.48 },
            { opacity: 1 },
          ], { duration: 150, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
        });
      }
    };

    const setupReveal = (items, filterUpdate = false) => {
      const pendingItems = items.filter((item) => !item.classList.contains("is-visible"));
      if (!pendingItems.length) return;

      if (filterUpdate) {
        requestAnimationFrame(() => pendingItems.forEach((item) => item.classList.add("is-visible")));
        return;
      }

      if ("IntersectionObserver" in window) {
        if (!revealObserver) {
          revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
              }
            });
          }, { threshold: reduceMotion ? 0.01 : 0.14, rootMargin: "0px 0px -8% 0px" });
        }

        pendingItems.forEach((item) => revealObserver.observe(item));
      } else {
        pendingItems.forEach((item) => item.classList.add("is-visible"));
      }
    };

    const appendPhotos = (count = batchSize(), filterUpdate = false) => {
      if (renderedCount >= visiblePhotos.length) {
        sentinel.hidden = true;
        return;
      }

      const fragment = document.createDocumentFragment();
      const items = [];
      const end = Math.min(visiblePhotos.length, renderedCount + count);

      for (let index = renderedCount; index < end; index += 1) {
        const item = createPhotoButton(visiblePhotos[index], index);
        if (filterUpdate) item.classList.add("is-filter-result");
        item.style.setProperty("--reveal-delay", `${Math.min(items.length * (filterUpdate ? 12 : 34), filterUpdate ? 72 : 170)}ms`);
        fragment.append(item);
        items.push(item);
      }

      renderedCount = end;
      grid.append(fragment);
      setupPhotoImages(items);
      setupReveal(items, filterUpdate);
      sentinel.hidden = renderedCount >= visiblePhotos.length;
      updateProgress();
    };

    const reconcilePhotoItems = (items) => {
      const retained = new Set(items);
      [...grid.children].forEach((item) => {
        if (retained.has(item)) return;
        revealObserver?.unobserve(item);
        const image = item.querySelector("img");
        if (image) imageObserver?.unobserve(image);
        item.remove();
      });
      let cursor = grid.firstElementChild;
      items.forEach((item) => {
        if (item === cursor) cursor = cursor.nextElementSibling;
        else grid.insertBefore(item, cursor);
      });
    };

    const renderPhotos = (filterUpdate = false, preserveRendered = false) => {
      const reusableItems = new Map([...grid.querySelectorAll(".photo")].map((item) => [item.dataset.photoId, item]));
      const previousCount = renderedCount;
      visiblePhotos = filteredPhotos();
      renderedCount = 0;
      grid.hidden = !visiblePhotos.length;
      worksEmpty.hidden = Boolean(visiblePhotos.length);
      sentinel.hidden = !visiblePhotos.length;
      catalogResult.textContent = `${visiblePhotos.length} 张作品`;
      if (!visiblePhotos.length) {
        reconcilePhotoItems([]);
        updateProgress();
        return;
      }

      const items = [];
      const newItems = [];
      const end = Math.min(visiblePhotos.length, preserveRendered ? Math.max(previousCount, initialBatchSize()) : initialBatchSize());
      for (let index = 0; index < end; index += 1) {
        const photo = visiblePhotos[index];
        const photoId = String(photo.id || photo.src);
        const item = reusableItems.get(photoId) || createPhotoButton(photo, index);
        updatePhotoButton(item, photo, index);

        if (reusableItems.has(photoId)) {
          if (filterUpdate) {
            item.classList.remove("is-filter-result");
            item.classList.add("is-visible");
            item.style.removeProperty("--reveal-delay");
          }
        } else {
          if (filterUpdate) item.classList.add("is-filter-result");
          item.style.setProperty("--reveal-delay", `${Math.min(newItems.length * (filterUpdate ? 12 : 34), filterUpdate ? 72 : 170)}ms`);
          newItems.push(item);
        }

        items.push(item);
      }

      renderedCount = end;
      // Unchanged first-screen nodes stay connected: background synchronization must not restart their paint.
      reconcilePhotoItems(items);
      setupPhotoImages(newItems);
      setupReveal(newItems, filterUpdate);
      sentinel.hidden = renderedCount >= visiblePhotos.length;
      updateProgress();
    };

    const updateFilterControls = () => {
      const activeCount = selectedCatalogCount();
      tabs.forEach((tab) => {
        const key = tab.dataset.catalogKey;
        if (key === "all") {
          const isActive = activeCount === 0
            && !searchQuery
            && !catalogPanel.classList.contains("is-open");
          tab.classList.toggle("is-active", isActive);
          tab.setAttribute("aria-pressed", String(isActive));
          return;
        }

        const hasFilter = catalogFilters[key].size > 0;
        const isOpen = key === activeCatalogKey && catalogPanel.classList.contains("is-open");
        tab.classList.toggle("has-filter", hasFilter);
        tab.classList.toggle("is-open", isOpen);
        tab.setAttribute("aria-pressed", String(hasFilter));
        tab.setAttribute("aria-expanded", String(isOpen));
      });

      catalogReset.disabled = activeCount === 0 && !searchQuery;
      updateCatalogMode();
      updateSearchControls();
    };

    const applyFilters = ({ updateUrl = true, scroll = false, refreshCatalogOptions = true, animate = true, preserveRendered = false } = {}) => {
      const filterUpdate = hasRendered && animate;
      if (filterUpdate) requestCompleteLibrary();
      const commit = () => {
        setupCatalogControls();
        renderPhotos(filterUpdate, preserveRendered);
        updateFilterControls();
        if (catalogPanel.classList.contains("is-open")) {
          if (refreshCatalogOptions) renderCatalogOptions();
          else updateCatalogOptionState();
        }
        if (updateUrl) syncFilterUrl();
      };
      const finishScroll = () => {
        if (scroll) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      };

      const shouldAnimate = !reduceMotion && filterUpdate && grid.childElementCount > 0 && typeof grid.animate === "function";
      hasRendered = true;
      filterTransition?.finish?.();
      filterTransition = null;
      commit();
      finishScroll();
      if (!shouldAnimate) return;

      const incoming = grid.animate([
        { opacity: 0.84, transform: "translate3d(0, 4px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ], { duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "none" });
      filterTransition = incoming;
      const clearTransition = () => {
        if (filterTransition === incoming) filterTransition = null;
      };
      incoming.finished.then(clearTransition, clearTransition);
    };

    const resetFilters = () => {
      catalogConfig.forEach(({ key }) => {
        catalogFilters[key].clear();
      });
      searchQuery = "";
      searchTerms = [];
      searchInput.value = "";
      closeCatalogPanel();
      closeSearchPanel();
      applyFilters({ scroll: true });
    };

    const clearActiveFilter = () => {
      if (!activeCatalogKey) return;
      catalogFilters[activeCatalogKey].clear();
      if (catalogMultiSelectEnabled) {
        updateCatalogOptionState();
        updateFilterControls();
        syncFilterUrl();
        applyFilters({ updateUrl: false, refreshCatalogOptions: false });
        return;
      }
      closeCatalogPanel();
      applyFilters({ scroll: true });
    };

    const setCatalogMultiSelect = (enabled) => {
      catalogMultiSelectEnabled = enabled;
      let filtersChanged = false;
      if (!enabled) {
        catalogConfig.forEach(({ key }) => {
          const selectedValues = catalogFilters[key];
          if (selectedValues.size < 2) return;
          const lastValue = [...selectedValues].at(-1);
          selectedValues.clear();
          if (lastValue) selectedValues.add(lastValue);
          filtersChanged = true;
        });
      }

      updateCatalogMode();
      updateCatalogOptionState();
      updateFilterControls();
      syncFilterUrl();
      if (filtersChanged) applyFilters({ updateUrl: false });
    };

    const setupLoadMore = () => {
      if (!("IntersectionObserver" in window)) return;
      if (loadObserver) loadObserver.disconnect();
      loadObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) appendPhotos();
        });
      }, { rootMargin: isCompactViewport() ? "520px 0px 760px 0px" : "900px 0px 1200px 0px", threshold: 0.01 });
      loadObserver.observe(sentinel);
    };

    const normalizeLightboxIndex = (index) => (
      (index + visiblePhotos.length) % visiblePhotos.length
    );

    const waitForImageReady = async (image, timeout = 6000) => {
      if (!image.getAttribute("src")) return false;

      if (!image.complete) {
        const loaded = await new Promise((resolve) => {
          let timer = 0;
          const done = (result) => {
            window.clearTimeout(timer);
            image.removeEventListener("load", onLoad);
            image.removeEventListener("error", onError);
            resolve(result);
          };
          const onLoad = () => done(true);
          const onError = () => done(false);
          image.addEventListener("load", onLoad, { once: true });
          image.addEventListener("error", onError, { once: true });
          timer = window.setTimeout(() => done(false), timeout);
          if (image.complete) done(image.naturalWidth > 0);
        });
        if (!loaded) return false;
      }

      if (!image.naturalWidth) return false;
      if (typeof image.decode === "function") await image.decode().catch(() => {});
      return image.naturalWidth > 0;
    };

    const preloadLightboxSource = (src) => {
      const existing = lightboxPreloads.get(src);
      if (existing) return existing.promise;

      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = src;
      const entry = { image, promise: null };
      entry.promise = waitForImageReady(image).then((loaded) => {
        if (!loaded && lightboxPreloads.get(src) === entry) {
          image.removeAttribute("src");
          lightboxPreloads.delete(src);
        }
        return loaded;
      });
      lightboxPreloads.set(src, entry);
      return entry.promise;
    };

    const warmLightboxNeighbors = (index) => {
      if (visiblePhotos.length < 2) {
        lightboxPreloads.forEach(({ image }) => image.removeAttribute("src"));
        lightboxPreloads.clear();
        return;
      }

      const sources = new Set([
        visiblePhotos[normalizeLightboxIndex(index - 1)]?.src,
        visiblePhotos[normalizeLightboxIndex(index + 1)]?.src,
      ].filter(Boolean));

      lightboxPreloads.forEach(({ image }, src) => {
        if (sources.has(src)) return;
        image.removeAttribute("src");
        lightboxPreloads.delete(src);
      });
      sources.forEach((src) => preloadLightboxSource(src));
    };

    const clearLightboxPreloads = () => {
      lightboxPreloads.forEach(({ image }) => image.removeAttribute("src"));
      lightboxPreloads.clear();
    };

    const nextCompositorFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

    const commitLightboxAnimationStyles = (...animations) => {
      let committed = false;
      animations.forEach((animation) => {
        if (typeof animation?.commitStyles !== "function") return;
        try {
          animation.commitStyles();
          committed = true;
        } catch {
          // The stable CSS state remains the fallback on older WebKit builds.
        }
      });
      return committed;
    };

    const clearLightboxAnimationStyles = (...images) => {
      images.forEach((image) => {
        image.style.removeProperty("opacity");
        image.style.removeProperty("transform");
      });
    };

    const resetLightboxTouchState = () => {
      touchTracking = false;
      touchIdentifier = null;
      touchAxis = "";
      touchStartX = 0;
      touchStartY = 0;
      touchStartTime = 0;
    };

    const cancelLightboxSwipe = () => {
      resetLightboxTouchState();
      lightbox.classList.remove("is-dragging");
      lightbox.style.setProperty("--swipe-x", "0px");
    };

    const findTrackedTouch = (touches) => {
      if (touchIdentifier === null) return null;
      return Array.from(touches || []).find((touch) => touch.identifier === touchIdentifier) || null;
    };

    const setLightboxPhoto = (index) => {
      if (!visiblePhotos.length) return;

      activeLightboxIndex = normalizeLightboxIndex(index);
      const photo = visiblePhotos[activeLightboxIndex];
      lightboxImage.getAnimations().forEach((animation) => animation.cancel());
      lightboxImageBuffer.getAnimations().forEach((animation) => animation.cancel());
      cancelLightboxSwipe();
      lightbox.classList.remove("is-switching");
      lightboxImage.classList.add("is-active");
      lightboxImage.removeAttribute("aria-hidden");
      lightboxImageBuffer.classList.remove("is-active");
      lightboxImageBuffer.setAttribute("aria-hidden", "true");
      lightboxImageBuffer.removeAttribute("src");
      lightboxImage.fetchPriority = "high";
      lightboxImage.src = photo.src;
      lightboxImage.alt = photoDescription(photo);
      lightbox.style.setProperty("--swipe-x", "0px");
      renderLightboxInfo(photo);
      waitForImageReady(lightboxImage).then((loaded) => {
        if (loaded && lightbox.classList.contains("is-open")) warmLightboxNeighbors(activeLightboxIndex);
      });
    };

    const openLightbox = (index) => {
      window.clearTimeout(lightboxCloseTimer);
      lightboxRequestId += 1;
      lightboxSwitching = false;
      setLightboxPhoto(index);
      lightbox.inert = false;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-lightbox-open");
      topControls.inert = true;
      pageMain.inert = true;
      lightboxClose.focus({ preventScroll: true });
    };

    const closeLightbox = () => {
      if (!lightbox.classList.contains("is-open")) return;
      lightboxRequestId += 1;
      lightboxSwitching = false;
      cancelLightboxSwipe();
      lightbox.classList.remove("is-open");
      lightbox.classList.remove("is-switching");
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.inert = true;
      lightbox.style.setProperty("--swipe-x", "0px");
      document.body.classList.remove("is-lightbox-open");
      topControls.inert = false;
      pageMain.inert = false;
      clearLightboxPreloads();
      lastLightboxTrigger?.focus({ preventScroll: true });
      lightboxCloseTimer = window.setTimeout(() => {
        if (lightbox.classList.contains("is-open")) return;
        lightboxImage.removeAttribute("src");
        lightboxImageBuffer.removeAttribute("src");
        lightboxInfoTitle.textContent = "";
        lightboxInfoBasic.textContent = "";
      }, 240);
    };

    const moveLightbox = async (step, startX = 0) => {
      if (!lightbox.classList.contains("is-open") || lightboxSwitching) return;
      lightboxSwitching = true;
      resetLightboxTouchState();
      lightbox.classList.remove("is-dragging");
      lightbox.classList.add("is-switching");
      lightbox.style.setProperty("--swipe-x", `${startX}px`);

      const requestId = ++lightboxRequestId;
      const targetIndex = normalizeLightboxIndex(activeLightboxIndex + step);
      const photo = visiblePhotos[targetIndex];
      const currentImage = lightboxImage;
      const incomingImage = lightboxImageBuffer;
      const outgoingDirection = step > 0 ? -1 : 1;
      const travel = Math.min(window.innerWidth * 0.24, 190);
      let outgoingAnimation = null;
      let incomingAnimation = null;
      let hasCommittedAnimationStyles = false;
      let committed = false;
      try {
        currentImage.getAnimations().forEach((animation) => animation.cancel());
        incomingImage.getAnimations().forEach((animation) => animation.cancel());
        incomingImage.classList.remove("is-active");
        incomingImage.setAttribute("aria-hidden", "true");
        incomingImage.alt = photoDescription(photo);
        incomingImage.fetchPriority = "high";
        incomingImage.src = photo.src;

        const [, loaded] = await Promise.all([
          preloadLightboxSource(photo.src),
          waitForImageReady(incomingImage),
        ]);
        if (!loaded || requestId !== lightboxRequestId || !lightbox.classList.contains("is-open")) return;

        // Keep a fully opaque underlying state beneath the Web Animation so
        // cancelling its fill cannot expose a transparent frame in Safari.
        incomingImage.classList.add("is-active");

        if (!reduceMotion && typeof currentImage.animate === "function") {
          outgoingAnimation = currentImage.animate([
            { transform: `translate3d(${startX}px, 0, 0) scale(1)`, opacity: 1 },
            { transform: `translate3d(${outgoingDirection * travel}px, 0, 0) scale(0.985)`, opacity: 0 },
          ], { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "both" });
          incomingAnimation = incomingImage.animate([
            { transform: `translate3d(${-outgoingDirection * Math.min(travel, 110)}px, 0, 0) scale(0.99)`, opacity: 0 },
            { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
          ], { duration: 240, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" });
          await Promise.all([outgoingAnimation.finished, incomingAnimation.finished]);
        }

        if (requestId !== lightboxRequestId || !lightbox.classList.contains("is-open")) return;
        hasCommittedAnimationStyles = commitLightboxAnimationStyles(outgoingAnimation, incomingAnimation);
        currentImage.classList.remove("is-active");
        currentImage.setAttribute("aria-hidden", "true");
        incomingImage.removeAttribute("aria-hidden");
        lightboxImage = incomingImage;
        lightboxImageBuffer = currentImage;
        activeLightboxIndex = targetIndex;
        lightbox.style.setProperty("--swipe-x", "0px");
        renderLightboxInfo(photo);
        committed = true;
        outgoingAnimation?.cancel();
        incomingAnimation?.cancel();
        await nextCompositorFrame();
        if (requestId !== lightboxRequestId || !lightbox.classList.contains("is-open")) return;
        if (hasCommittedAnimationStyles) {
          clearLightboxAnimationStyles(currentImage, incomingImage);
          hasCommittedAnimationStyles = false;
        }
        await nextCompositorFrame();
        if (requestId !== lightboxRequestId || !lightbox.classList.contains("is-open")) return;
        const retiredSource = currentImage.getAttribute("src");
        window.setTimeout(() => {
          const stillRetired = currentImage === lightboxImageBuffer
            && !lightbox.classList.contains("is-switching")
            && !currentImage.classList.contains("is-active")
            && currentImage.getAttribute("src") === retiredSource;
          if (!stillRetired) return;
          currentImage.removeAttribute("src");
          currentImage.alt = "";
        }, 96);
        warmLightboxNeighbors(activeLightboxIndex);
      } catch {
        // Keep the current image visible when the next asset cannot be decoded.
      } finally {
        if (hasCommittedAnimationStyles) clearLightboxAnimationStyles(currentImage, incomingImage);
        if (!committed) {
          outgoingAnimation?.cancel();
          incomingAnimation?.cancel();
          incomingImage.classList.remove("is-active");
          incomingImage.setAttribute("aria-hidden", "true");
          currentImage.classList.add("is-active");
          currentImage.removeAttribute("aria-hidden");
          if (requestId === lightboxRequestId) {
            if (incomingImage !== lightboxImage) incomingImage.removeAttribute("src");
            lightbox.style.setProperty("--swipe-x", "0px");
          }
        }
        if (requestId === lightboxRequestId) {
          lightbox.classList.remove("is-switching");
          lightboxSwitching = false;
        }
      }
    };

    const beginLightboxSwipe = (event) => {
      if (!lightbox.classList.contains("is-open") || lightboxSwitching || touchTracking) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(".lightbox-media")) return;
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      touchTracking = true;
      touchIdentifier = touch.identifier;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = performance.now();
      touchAxis = "";
    };

    const moveLightboxSwipe = (event) => {
      if (!touchTracking) return;
      const touch = findTrackedTouch(event.touches);
      if (!touch || event.touches.length !== 1 || lightboxSwitching) {
        cancelLightboxSwipe();
        return;
      }
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (!touchAxis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 7) {
        touchAxis = Math.abs(deltaX) > Math.abs(deltaY) * 1.12 ? "x" : "y";
      }
      if (touchAxis !== "x") return;

      event.preventDefault();
      lightbox.classList.add("is-dragging");
      lightbox.style.setProperty("--swipe-x", `${deltaX * 0.82}px`);
    };

    const endLightboxSwipe = (event) => {
      if (!touchTracking) return;
      const touch = findTrackedTouch(event.changedTouches);
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const elapsed = Math.max(1, performance.now() - touchStartTime);
      const velocity = deltaX / elapsed;
      const isHorizontalSwipe = touchAxis === "x"
        && (Math.abs(deltaX) > 52 || Math.abs(velocity) > 0.42)
        && Math.abs(deltaX) > Math.abs(deltaY) * 1.12
        && !lightboxSwitching;

      resetLightboxTouchState();
      if (isHorizontalSwipe) {
        moveLightbox(deltaX < 0 ? 1 : -1, deltaX * 0.82);
      } else {
        lightbox.classList.remove("is-dragging");
        lightbox.style.setProperty("--swipe-x", "0px");
      }
    };

    const syncPhotos = async () => {
      const [loaded, previewsChanged] = await Promise.all([loadPhotos(), loadPreviewIndex()]);
      if (!loaded) {
        if (previewsChanged) applyFilters({ updateUrl: false, animate: false, preserveRendered: true });
        return previewsChanged;
      }
      if (loaded.revision === photosRevision && !previewsChanged) return false;

      const activePhoto = lightbox.classList.contains("is-open")
        ? visiblePhotos[activeLightboxIndex]
        : null;
      const activePhotoId = String(activePhoto?.id || activePhoto?.src || "");
      photos = loaded.photos;
      photosRevision = loaded.revision;
      applyFilters({ updateUrl: false, animate: false, preserveRendered: true });

      if (!activePhotoId || !lightbox.classList.contains("is-open")) return true;
      const nextIndex = visiblePhotos.findIndex((photo) => String(photo.id || photo.src) === activePhotoId);
      if (nextIndex < 0) {
        closeLightbox();
        return true;
      }

      const nextPhoto = visiblePhotos[nextIndex];
      activeLightboxIndex = nextIndex;
      if (lightboxImage.getAttribute("src") !== nextPhoto.src) {
        setLightboxPhoto(nextIndex);
      } else {
        lightboxImage.alt = photoDescription(nextPhoto);
        renderLightboxInfo(nextPhoto);
        warmLightboxNeighbors(nextIndex);
      }
      return true;
    };

    const requestPhotosRefresh = (delay = 120, queueBeforeReady = false) => {
      if (!photosReady) {
        if (queueBeforeReady) photosRefreshQueued = true;
        return;
      }
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(photosRefreshTimer);
      photosRefreshTimer = window.setTimeout(() => {
        if (lightboxSwitching || touchTracking) {
          requestPhotosRefresh(220);
          return;
        }
        if (photosRefreshPromise) {
          photosRefreshQueued = true;
          return;
        }
        photosRefreshPromise = syncPhotos()
          .catch((error) => console.warn("Unable to refresh photos", error))
          .finally(() => {
            photosRefreshPromise = null;
            if (!photosRefreshQueued) return;
            photosRefreshQueued = false;
            requestPhotosRefresh(0);
          });
      }, delay);
    };

    const handlePageShow = (event) => {
      if (event.persisted) requestPhotosRefresh();
    };

    const requestCompleteLibrary = () => {
      if (photosRevision.startsWith("embedded-partial:") && !photosRefreshPromise) requestPhotosRefresh(0, true);
    };

    const refreshAfterFirstPhotosPaint = async () => {
      const images = [...grid.querySelectorAll(".photo img")].slice(0, firstScreenPhotoCount());
      await Promise.all(images.map((image) => waitForImageReady(image)));
      // The first frame commits decoded images; the next gives the browser a paint opportunity before background work.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const refresh = () => {
        if (photosRevision.startsWith("embedded-partial:") && !photosRefreshPromise) return requestPhotosRefresh(0);
      };
      if ("requestIdleCallback" in window) window.requestIdleCallback(refresh, { timeout: 1800 });
      else window.setTimeout(refresh, 0);
    };

    contentChannel?.addEventListener("message", (event) => {
      const scope = event.data?.scope;
      if (event.data?.type === "content-updated" && (scope === "photos" || scope === "all")) {
        requestPhotosRefresh(0, true);
      }
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const key = tab.dataset.catalogKey;
        if (key === "all") resetFilters();
        else toggleCatalogPanel(key);
      });
    });

    searchControl.addEventListener("click", () => {
      if (searchPanel.classList.contains("is-open")) closeSearchPanel();
      else openSearchPanel();
    });
    searchPanel.addEventListener("submit", (event) => {
      event.preventDefault();
      commitSearch(searchInput.value);
      searchInput.blur();
    });
    searchInput.addEventListener("input", scheduleSearch);
    searchInput.addEventListener("compositionstart", () => {
      searchComposing = true;
    });
    searchInput.addEventListener("compositionend", () => {
      searchComposing = false;
      scheduleSearch();
    });
    searchClear.addEventListener("click", () => {
      commitSearch("");
      searchInput.focus({ preventScroll: true });
    });

    catalogOptions.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const option = target?.closest(".catalog-option");
      if (!option || !activeCatalogKey) return;
      const selectedValues = catalogFilters[activeCatalogKey];
      const value = option.dataset.value || "";
      let changed = false;

      if (catalogMultiSelectEnabled) {
        if (!value) {
          changed = selectedValues.size > 0;
          selectedValues.clear();
        } else if (selectedValues.has(value)) {
          selectedValues.delete(value);
          changed = true;
        } else {
          selectedValues.add(value);
          changed = true;
        }

        if (!changed) return;
        updateCatalogOptionState();
        updateFilterControls();
        syncFilterUrl();
        applyFilters({ updateUrl: false, refreshCatalogOptions: false });
        return;
      }

      if (!value) {
        changed = selectedValues.size > 0;
        selectedValues.clear();
      } else if (selectedValues.size !== 1 || !selectedValues.has(value)) {
        selectedValues.clear();
        selectedValues.add(value);
        changed = true;
      }

      closeCatalogPanel();
      updateFilterControls();
      if (!changed) return;
      syncFilterUrl();
      applyFilters({ updateUrl: false });
    });

    catalogMultiSelect.addEventListener("change", () => setCatalogMultiSelect(catalogMultiSelect.checked));
    catalogClear.addEventListener("click", clearActiveFilter);
    catalogReset.addEventListener("click", resetFilters);
    emptyReset.addEventListener("click", resetFilters);

    document.addEventListener("pointerdown", (event) => {
      if (catalogPanel.classList.contains("is-open")
        && !catalogPanel.contains(event.target)
        && !filterTabs.contains(event.target)) {
        closeCatalogPanel();
        updateFilterControls();
      }
      if (searchPanel.classList.contains("is-open")
        && !searchPanel.contains(event.target)
        && !searchControl.contains(event.target)) {
        closeSearchPanel();
      }
    });

    grid.addEventListener("click", (event) => {
      const item = event.target.closest(".photo");
      if (item) {
        closeCatalogPanel();
        updateFilterControls();
        lastLightboxTrigger = item;
        openLightbox(Number(item.dataset.index || 0));
      }
    });

    lightbox.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(".lightbox-image, .lightbox-info, .lightbox-button")) closeLightbox();
    });
    lightboxClose.addEventListener("click", closeLightbox);
    lightboxPrev.addEventListener("click", () => moveLightbox(-1));
    lightboxNext.addEventListener("click", () => moveLightbox(1));
    lightbox.addEventListener("touchstart", beginLightboxSwipe, { passive: true });
    lightbox.addEventListener("touchmove", moveLightboxSwipe, { passive: false });
    lightbox.addEventListener("touchend", endLightboxSwipe, { passive: true });
    lightbox.addEventListener("touchcancel", () => {
      if (touchTracking) cancelLightboxSwipe();
    }, { passive: true });

    window.addEventListener("keydown", (event) => {
      if (lightbox.classList.contains("is-open")) {
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") moveLightbox(-1);
        if (event.key === "ArrowRight") moveLightbox(1);
        if (event.key === "Tab") {
          const focusable = [...lightbox.querySelectorAll("button:not([disabled]), [tabindex='0']")]
            .filter((element) => element.getClientRects().length > 0);
          const first = focusable[0];
          const last = focusable.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      } else if (event.key === "Escape" && searchPanel.classList.contains("is-open")) {
        closeSearchPanel(true);
      } else if (event.key === "Escape" && catalogPanel.classList.contains("is-open")) {
        const activeTab = catalogConfig.find(({ key }) => key === activeCatalogKey)?.tab;
        closeCatalogPanel();
        updateFilterControls();
        activeTab?.focus({ preventScroll: true });
      }
    });

    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("scroll", () => {
      if (window.scrollY > 0) requestCompleteLibrary();
    }, { passive: true });
    window.addEventListener("resize", requestProgressUpdate);
    window.addEventListener("focus", () => requestPhotosRefresh());
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestPhotosRefresh();
    });
    window.addEventListener("popstate", () => {
      closeCatalogPanel();
      closeSearchPanel();
      readFiltersFromUrl();
      applyFilters({ updateUrl: false });
    });

    const applyLoadedPhotos = (loaded) => {
      if (loaded) {
        photos = loaded.photos;
        photosRevision = loaded.revision;
        readFiltersFromUrl();
        setupLoadMore();
        applyFilters();
      }
      photosReady = true;
      if (photosRefreshQueued) {
        photosRefreshQueued = false;
        requestPhotosRefresh(0);
      }
    };

    const initialWorksData = readInitialWorksData();
    applyPreviewSources(initialWorksData?.previews);
    previewIndexUrl = initialWorksData?.previewIndexUrl || "";
    const initialPhotos = normalizePhotos(initialWorksData);
    if (hasPhotoManifest(initialWorksData)) {
      applyLoadedPhotos({
        photos: initialPhotos,
        revision: `embedded-partial:${createPhotosRevision(initialWorksData, initialPhotos)}:${initialPhotos.length}`,
      });
      if (document.readyState === "complete") refreshAfterFirstPhotosPaint();
      else window.addEventListener("load", refreshAfterFirstPhotosPaint, { once: true });
    } else {
      Promise.all([loadPhotos(), loadPreviewIndex()]).then(([loaded]) => applyLoadedPhotos(loaded));
    }
