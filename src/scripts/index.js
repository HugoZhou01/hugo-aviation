    const progress = document.querySelector(".scroll-progress");
    const siteHeader = document.querySelector(".site-header");
    const heroSection = document.querySelector(".hero");
    const pageMain = document.querySelector("main");
    const parallaxItems = document.querySelectorAll("[data-parallax]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktopViewport = window.matchMedia("(min-width: 901px)");
    const revealItems = document.querySelectorAll(".reveal");
    const lightbox = document.querySelector("#lightbox");
    const lightboxImage = document.querySelector("#lightboxImage");
    const lightboxInfo = document.querySelector("#lightboxInfo");
    const lightboxInfoTitle = document.querySelector("#lightboxInfoTitle");
    const lightboxInfoBasic = document.querySelector("#lightboxInfoBasic");
    const lightboxClose = document.querySelector(".lightbox-close");
    const lightboxItems = [...document.querySelectorAll(".photo-card img, .story-media img, .post-image img")];
    const homepagePhotoSlots = [...document.querySelectorAll("[data-photo-slot]")];
    const homepagePhotoData = new WeakMap();
    const homepageFocus = ["36% 50%", "42% 50%", "40% 50%", "38% 50%", "40% 50%", "40% 50%", "38% 50%", "42% 50%", "40% 50%"];
    const airportMapShell = document.querySelector("#airportMapShell");
    const airportMapContainer = document.querySelector("#airportMap");
    const airportMapLoader = document.querySelector("#airportMapLoader");
    const airportSelector = document.querySelector("#airportSelector");
    const airportLogSummary = document.querySelector("#airportLogSummary");
    const airportDetail = document.querySelector("#airportDetail");
    const airportDetailImage = document.querySelector("#airportDetailImage");
    const airportDetailCode = document.querySelector("#airportDetailCode");
    const airportDetailName = document.querySelector("#airportDetailName");
    const airportDetailMeta = document.querySelector("#airportDetailMeta");
    const airportDetailLink = document.querySelector("#airportDetailLink");
    const mapStyleUrl = "/airport-map-style.json";
    const mapLibreAssetRoot = "/assets/vendor/maplibre-6.7.0";
    let activeLightboxIndex = 0;
    let scrollTicking = false;
    let parallaxEnabled = null;
    let parallaxInView = true;
    let lightboxCloseTimer = 0;
    let lastLightboxTrigger = null;
    let homepageSiteRevision = "";
    let homepagePhotosRevision = "";
    let homepageContentReady = false;
    let homepageRefreshTimer = 0;
    let homepageRefreshPromise = null;
    let homepageRefreshQueued = false;
    let homepagePhotos = [];
    let homepageHasFullManifest = false;
    const staticPreviews = {};
    const photoPreviewSource = (photo) => staticPreviews[photo?.thumbSrc] || photo?.thumbSrc || photo?.src || "";
    let airportMapCover = { src: "", alt: "机场地图封面" };
    let airportMapCovers = {};
    let airportCatalog = [];
    let airportEntries = [];
    let selectedAirportCode = "";
    let airportMap = null;
    let mapLibre = null;
    let airportMapReady = false;
    let airportMapFramed = false;
    let airportMapInteractionsReady = false;
    let airportCatalogPromise = null;
    let mapLibrePromise = null;
    let airportMapInitPromise = null;
    let airportDetailRenderToken = 0;
    const airportMapTap = {
      identifier: null,
      startX: 0,
      startY: 0,
      moved: false,
    };
    const airportDetailSwipe = {
      tracking: false,
      identifier: null,
      axis: "",
      startX: 0,
      startY: 0,
      startTime: 0,
      animating: false,
      exitTimer: 0,
      settleTimer: 0,
      suppressClickUntil: 0,
    };
    const contentChannel = typeof window.BroadcastChannel === "function"
      ? new BroadcastChannel("hugo-aviation-content")
      : null;

    const readInitialHomepageData = () => {
      const element = document.querySelector("#initialHomepageData");
      if (!element?.textContent) return null;
      try {
        return JSON.parse(element.textContent);
      } catch (error) {
        console.warn("Unable to read embedded homepage data", error);
        return null;
      } finally {
        element.remove();
      }
    };

    const normalizePhotos = (data) => {
      const list = Array.isArray(data) ? data : data?.photos;
      return Array.isArray(list) ? list.filter((photo) => photo && photo.src) : [];
    };

    const cleanText = (value) => String(value || "").trim();

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

    const photoFilename = (photo, source = "") => normalizeFilename(photo?.title)
      || normalizeFilename(fileNameFromSource(photo?.src || source))
      || normalizeFilename(photo?.id);

    const photoPreviewTitle = (photo, source = "") => cleanText(photo?.aircraft)
      || cleanText(photo?.airport)
      || photoFilename(photo, source)
      || "航空摄影作品";

    const photoDescription = (photo) => {
      const subject = [photo?.airline, photo?.aircraft, photo?.registration].map(cleanText).filter(Boolean).join(" ");
      const airport = cleanText(photo?.airport);
      if (subject && airport) return `${subject} 于 ${airport} 的航空摄影作品`;
      if (subject) return `${subject} 航空摄影作品`;
      if (airport) return `${airport} 航空摄影作品`;
      return "航空摄影作品";
    };

    const formatPhotoDate = (value) => cleanText(value).slice(0, 10).replaceAll("-", ".");
    const phaseLabels = {
      ground: "地面停场",
      taxi: "滑行",
      takeoff: "起飞",
      landing: "进近 / 降落",
      cruise: "巡航",
    };

    const normalizeAirportCode = (value) => {
      const codes = cleanText(value).toUpperCase().match(/\b[A-Z]{3}\b/g);
      return codes?.at(-1) || "";
    };
    const normalizeIcaoCode = (value) => {
      const code = cleanText(value).toUpperCase();
      return /^[A-Z0-9]{4}$/.test(code) ? code : "";
    };
    const canonicalMediaPath = (value) => {
      try {
        return new URL(cleanText(value), window.location.href).pathname;
      } catch {
        return cleanText(value).split("?")[0];
      }
    };
    const findPhotoForSource = (source) => {
      const path = canonicalMediaPath(source);
      if (!path) return null;
      return homepagePhotos.find((photo) => photo.src === source)
        || homepagePhotos.find((photo) => canonicalMediaPath(photo.src) === path)
        || null;
    };
    const regionNames = typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames(["zh-CN"], { type: "region" })
      : null;
    const airportDisplayName = (airport) => cleanText(airport?.nameZh)
      || cleanText(airport?.nameEn)
      || normalizeAirportCode(airport?.iata)
      || "机场";
    const airportCountryName = (airport) => {
      const countryCode = cleanText(airport?.countryCode).toUpperCase();
      const regionLabel = { HK: "中国", MO: "中国", TW: "台湾" }[countryCode];
      return regionLabel
        || cleanText(airport?.country)
        || regionNames?.of(countryCode)
        || countryCode;
    };
    const uniqueTextParts = (...values) => [...new Set(values.map(cleanText).filter(Boolean))];
    const emptyAirportGeoJson = () => ({ type: "FeatureCollection", features: [] });

    const airportGeoJson = () => ({
      type: "FeatureCollection",
      features: airportEntries.map((entry) => ({
        type: "Feature",
        id: entry.iata,
        geometry: { type: "Point", coordinates: entry.coordinates },
        properties: {
          iata: entry.iata,
          icao: entry.icao,
          name: airportDisplayName(entry),
          city: cleanText(entry.city) || entry.iata,
          photoCount: entry.photos.length,
        },
      })),
    });

    const selectedAirportGeoJson = () => {
      const entry = airportEntries.find((item) => item.iata === selectedAirportCode);
      if (!entry) return emptyAirportGeoJson();
      return {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          geometry: { type: "Point", coordinates: entry.coordinates },
          properties: { iata: entry.iata },
        }],
      };
    };

    const loadAirportCatalog = () => {
      if (airportCatalogPromise) return airportCatalogPromise;
      airportCatalogPromise = fetch("/airports.json", { cache: "force-cache" })
        .then((response) => {
          if (!response.ok) throw new Error("Airport catalog unavailable");
          return response.json();
        })
        .then((data) => {
          const list = Array.isArray(data?.airports) ? data.airports : [];
          airportCatalog = list.filter((airport) => {
            const coordinates = airport?.coordinates;
            return /^[A-Z]{3}$/.test(normalizeAirportCode(airport?.iata))
              && Array.isArray(coordinates)
              && coordinates.length === 2
              && coordinates.every((value) => Number.isFinite(Number(value)));
          }).map((airport) => ({
            ...airport,
            iata: normalizeAirportCode(airport.iata),
            icao: normalizeIcaoCode(airport.icao),
            coordinates: airport.coordinates.map(Number),
          }));
          updateAirportLog(homepagePhotos);
          return airportCatalog;
        })
        .catch((error) => {
          console.warn("Unable to load airport catalog", error);
          airportLogSummary.textContent = "机场目录暂时不可用";
          airportMapLoader.textContent = "机场目录暂时不可用";
          return [];
        });
      return airportCatalogPromise;
    };

    const airportDetailMediaFor = (entry) => {
      const lead = entry || airportEntries[0];
      const cover = entry ? airportMapCovers[entry.iata] : airportMapCover;
      const configuredCover = findPhotoForSource(cover?.src);
      const fallbackCover = lead?.photos[0];
      return {
        source: photoPreviewSource(configuredCover) || cover?.src || photoPreviewSource(fallbackCover),
        alt: cleanText(cover?.alt)
          || (fallbackCover ? photoDescription(fallbackCover) : "机场地图封面"),
      };
    };

    const renderAirportDetail = () => {
      const selected = airportEntries.find((entry) => entry.iata === selectedAirportCode);
      const totalPhotos = airportEntries.reduce((total, entry) => total + entry.photos.length, 0);
      const renderToken = ++airportDetailRenderToken;
      airportDetail.classList.add("is-updating");

      if (selected) {
        airportDetailCode.textContent = `${selected.iata} / ${selected.icao}`;
        airportDetailName.textContent = airportDisplayName(selected);
        airportDetailMeta.textContent = uniqueTextParts(
          selected.city,
          airportCountryName(selected),
          `${selected.photos.length} 张作品`,
        ).join(" · ");
        airportDetailLink.href = `/works?airport=${encodeURIComponent(selected.iata)}`;
        airportDetailLink.querySelector("span").textContent = `查看 ${selected.iata} 作品`;
        airportDetail.setAttribute("aria-label", `${airportDisplayName(selected)}，${selected.photos.length} 张作品`);
      } else {
        airportDetailCode.textContent = `${airportEntries.length} Airports`;
        airportDetailName.textContent = "机场拍摄记录";
        airportDetailMeta.textContent = `${totalPhotos} 张已定位作品`;
        airportDetailLink.href = "/works";
        airportDetailLink.querySelector("span").textContent = "查看全部作品";
        airportDetail.setAttribute("aria-label", `机场拍摄记录，${totalPhotos} 张已定位作品`);
      }

      const { source, alt } = airportDetailMediaFor(selected);
      const finish = () => requestAnimationFrame(() => requestAnimationFrame(() => {
        if (renderToken === airportDetailRenderToken) airportDetail.classList.remove("is-updating");
      }));

      if (!source) {
        airportDetailImage.removeAttribute("src");
        airportDetailImage.alt = "";
        finish();
      } else if (airportDetailImage.getAttribute("src") === source) {
        airportDetailImage.alt = alt;
        finish();
      } else {
        const preload = new Image();
        preload.decoding = "async";
        preload.onload = () => {
          if (renderToken !== airportDetailRenderToken) return;
          airportDetailImage.src = source;
          airportDetailImage.alt = alt;
          finish();
        };
        preload.onerror = finish;
        preload.src = source;
      }
    };

    const updateAirportSelectorState = () => {
      airportSelector.querySelectorAll("button").forEach((button) => {
        const active = button.dataset.airportCode === selectedAirportCode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    };

    const renderAirportSelector = () => {
      const fragment = document.createDocumentFragment();
      const options = [
        { code: "", label: "全部", title: "显示全部拍摄机场" },
        ...airportEntries.map((entry) => ({
          code: entry.iata,
          label: entry.iata,
          title: `${airportDisplayName(entry)}，${entry.photos.length} 张作品`,
        })),
      ];

      options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.airportCode = option.code;
        button.textContent = option.label;
        button.title = option.title;
        button.addEventListener("click", () => selectAirport(option.code));
        fragment.append(button);
      });
      airportSelector.replaceChildren(fragment);
      updateAirportSelectorState();
    };

    const fitAirportMap = () => {
      if (!airportMapReady || !airportEntries.length || !mapLibre) return;
      const bounds = new mapLibre.LngLatBounds();
      airportEntries.forEach((entry) => bounds.extend(entry.coordinates));
      const compact = window.matchMedia("(max-width: 600px)").matches;
      airportMap.fitBounds(bounds, {
        padding: compact
          ? { top: 96, right: 34, bottom: 156, left: 34 }
          : { top: 100, right: 70, bottom: 138, left: 70 },
        maxZoom: 2.25,
        duration: reduceMotion ? 0 : 900,
        essential: false,
      });
    };

    const syncAirportMapData = () => {
      if (!airportMapReady || !airportMap) return;
      airportMap.getSource("hugo-airports")?.setData(airportGeoJson());
      airportMap.getSource("hugo-airport-selected")?.setData(selectedAirportGeoJson());
    };

    const selectAirport = (code, moveMap = true) => {
      const normalized = normalizeAirportCode(code);
      selectedAirportCode = airportEntries.some((entry) => entry.iata === normalized) ? normalized : "";
      updateAirportSelectorState();
      renderAirportDetail();
      syncAirportMapData();
      const activeButton = airportSelector.querySelector(`[data-airport-code="${selectedAirportCode}"]`);
      if (activeButton) {
        const visibleLeft = airportSelector.scrollLeft + 6;
        const visibleRight = airportSelector.scrollLeft + airportSelector.clientWidth - 6;
        const buttonLeft = activeButton.offsetLeft;
        const buttonRight = buttonLeft + activeButton.offsetWidth;
        if (buttonLeft < visibleLeft || buttonRight > visibleRight) {
          const left = buttonLeft - (airportSelector.clientWidth - activeButton.offsetWidth) / 2;
          airportSelector.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
        }
      }

      if (!moveMap || !airportMapReady) return;
      airportMap.stop();
      const selected = airportEntries.find((entry) => entry.iata === selectedAirportCode);
      if (!selected) {
        airportMap.resize();
        requestAnimationFrame(() => {
          if (!selectedAirportCode) fitAirportMap();
        });
        return;
      }
      const compact = window.matchMedia("(max-width: 600px)").matches;
      airportMap.flyTo({
        center: selected.coordinates,
        zoom: compact ? 11.2 : 10.4,
        padding: compact ? { top: 82, bottom: 152, left: 20, right: 20 } : { top: 78, bottom: 118, left: 28, right: 28 },
        duration: reduceMotion ? 0 : 820,
        essential: false,
      });
    };

    const airportEntryInDirection = (direction) => {
      if (!airportEntries.length) return null;
      const currentIndex = airportEntries.findIndex((entry) => entry.iata === selectedAirportCode);
      if (currentIndex < 0) return direction > 0 ? airportEntries[0] : airportEntries.at(-1);
      return airportEntries[(currentIndex + direction + airportEntries.length) % airportEntries.length];
    };

    const warmAirportDetailNeighbors = () => {
      const entries = [airportEntryInDirection(-1), airportEntryInDirection(1)].filter(Boolean);
      new Set(entries.map((entry) => airportDetailMediaFor(entry).source).filter(Boolean)).forEach((source) => {
        const image = new Image();
        image.decoding = "async";
        image.src = source;
      });
    };

    const resetAirportDetailTouchState = () => {
      airportDetailSwipe.tracking = false;
      airportDetailSwipe.identifier = null;
      airportDetailSwipe.axis = "";
      airportDetailSwipe.startX = 0;
      airportDetailSwipe.startY = 0;
      airportDetailSwipe.startTime = 0;
    };

    const findAirportDetailTouch = (touches) => {
      if (airportDetailSwipe.identifier === null) return null;
      return Array.from(touches || [])
        .find((touch) => touch.identifier === airportDetailSwipe.identifier) || null;
    };

    const setAirportDetailSwipePosition = (offset, opacity = 1) => {
      airportDetail.style.setProperty("--airport-swipe-x", `${offset}px`);
      airportDetail.style.setProperty("--airport-swipe-opacity", String(opacity));
    };

    const finishAirportDetailSwipe = () => {
      window.clearTimeout(airportDetailSwipe.exitTimer);
      window.clearTimeout(airportDetailSwipe.settleTimer);
      airportDetailSwipe.exitTimer = 0;
      airportDetailSwipe.settleTimer = 0;
      airportDetailSwipe.animating = false;
      airportDetail.classList.remove("is-dragging", "is-swipe-animating", "is-swipe-reset");
      setAirportDetailSwipePosition(0);
      resetAirportDetailTouchState();
    };

    const switchAirportFromDetail = (direction) => {
      const target = airportEntryInDirection(direction);
      if (!target || airportDetailSwipe.animating) return;
      airportDetailSwipe.suppressClickUntil = performance.now() + 520;

      if (reduceMotion) {
        selectAirport(target.iata);
        finishAirportDetailSwipe();
        return;
      }

      const exitDistance = Math.min(108, airportDetail.clientWidth * 0.32);
      const enterDistance = Math.min(68, airportDetail.clientWidth * 0.2);
      airportDetailSwipe.animating = true;
      airportDetail.classList.remove("is-dragging");
      airportDetail.classList.add("is-swipe-animating");
      setAirportDetailSwipePosition(direction > 0 ? -exitDistance : exitDistance, 0.18);

      airportDetailSwipe.exitTimer = window.setTimeout(() => {
        selectAirport(target.iata);
        airportDetail.classList.add("is-swipe-reset");
        setAirportDetailSwipePosition(direction > 0 ? enterDistance : -enterDistance, 0.36);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          airportDetail.classList.remove("is-swipe-reset");
          setAirportDetailSwipePosition(0);
          airportDetailSwipe.settleTimer = window.setTimeout(finishAirportDetailSwipe, 380);
        }));
      }, 170);
    };

    const beginAirportDetailSwipe = (event) => {
      if (!window.matchMedia("(max-width: 600px)").matches
        || airportEntries.length < 2
        || airportDetailSwipe.animating
        || airportDetailSwipe.tracking
        || event.touches.length !== 1) return;
      const touch = event.touches[0];
      airportDetailSwipe.tracking = true;
      airportDetailSwipe.identifier = touch.identifier;
      airportDetailSwipe.startX = touch.clientX;
      airportDetailSwipe.startY = touch.clientY;
      airportDetailSwipe.startTime = performance.now();
      airportDetailSwipe.axis = "";
      warmAirportDetailNeighbors();
    };

    const moveAirportDetailSwipe = (event) => {
      if (!airportDetailSwipe.tracking) return;
      const touch = findAirportDetailTouch(event.touches);
      if (!touch || event.touches.length !== 1 || airportDetailSwipe.animating) {
        finishAirportDetailSwipe();
        return;
      }
      const deltaX = touch.clientX - airportDetailSwipe.startX;
      const deltaY = touch.clientY - airportDetailSwipe.startY;
      if (!airportDetailSwipe.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 7) {
        airportDetailSwipe.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? "x" : "y";
      }
      if (airportDetailSwipe.axis !== "x") return;

      event.preventDefault();
      const maxOffset = airportDetail.clientWidth * 0.38;
      const offset = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * 0.84, maxOffset);
      const opacity = 1 - Math.min(0.22, Math.abs(offset) / Math.max(1, airportDetail.clientWidth) * 0.45);
      airportDetail.classList.add("is-dragging");
      setAirportDetailSwipePosition(offset, opacity);
    };

    const endAirportDetailSwipe = (event) => {
      if (!airportDetailSwipe.tracking) return;
      const touch = findAirportDetailTouch(event.changedTouches);
      if (!touch) return;
      const deltaX = touch.clientX - airportDetailSwipe.startX;
      const deltaY = touch.clientY - airportDetailSwipe.startY;
      const elapsed = Math.max(1, performance.now() - airportDetailSwipe.startTime);
      const velocity = deltaX / elapsed;
      const shouldSwitch = airportDetailSwipe.axis === "x"
        && Math.abs(deltaX) > Math.abs(deltaY) * 1.15
        && (Math.abs(deltaX) > 52 || (Math.abs(deltaX) > 24 && Math.abs(velocity) > 0.4));

      resetAirportDetailTouchState();
      if (shouldSwitch) {
        switchAirportFromDetail(deltaX < 0 ? 1 : -1);
      } else {
        airportDetail.classList.remove("is-dragging");
        setAirportDetailSwipePosition(0);
      }
    };

    const updateAirportLog = (photos) => {
      homepagePhotos = Array.isArray(photos) ? photos : [];
      if (!airportCatalog.length) return;
      const groups = new Map();
      homepagePhotos.forEach((photo) => {
        const code = normalizeAirportCode(photo?.airport);
        if (!code) return;
        const group = groups.get(code) || [];
        group.push(photo);
        groups.set(code, group);
      });

      airportEntries = airportCatalog
        .map((airport) => ({ ...airport, photos: groups.get(airport.iata) || [] }))
        .filter((airport) => airport.photos.length)
        .sort((left, right) => right.photos.length - left.photos.length || left.iata.localeCompare(right.iata));
      const totalPhotos = airportEntries.reduce((total, entry) => total + entry.photos.length, 0);
      if (!airportEntries.some((entry) => entry.iata === selectedAirportCode)) selectedAirportCode = "";
      airportLogSummary.textContent = `${airportEntries.length} 个拍摄城市 · ${totalPhotos} 张已定位作品`;
      renderAirportSelector();
      renderAirportDetail();
      syncAirportMapData();
      if (airportMapReady && !airportMapFramed) {
        airportMapFramed = true;
        fitAirportMap();
      }
    };

    const loadMapLibre = () => {
      if (mapLibre) return Promise.resolve(mapLibre);
      if (mapLibrePromise) return mapLibrePromise;
      const stylesheetReady = new Promise((resolve, reject) => {
        const existing = document.querySelector('link[data-maplibre-styles]');
        const stylesheet = existing || document.createElement("link");
        if (stylesheet.sheet) {
          resolve();
          return;
        }
        stylesheet.addEventListener("load", resolve, { once: true });
        stylesheet.addEventListener("error", () => reject(new Error("MapLibre styles failed to load")), { once: true });
        if (!existing) {
          stylesheet.rel = "stylesheet";
          stylesheet.href = `${mapLibreAssetRoot}/maplibre-gl.css`;
          stylesheet.dataset.maplibreStyles = "";
          document.head.append(stylesheet);
        }
      });
      const moduleReady = import(`${mapLibreAssetRoot}/maplibre-gl.mjs`).then((module) => {
        mapLibre = module;
        return module;
      });
      mapLibrePromise = Promise.all([stylesheetReady, moduleReady]).then(([, module]) => module);
      return mapLibrePromise;
    };

    const addAirportMapLayers = () => {
      if (!airportMap || !airportMap.getStyle()?.layers) return;
      if (!airportMap.getSource("hugo-airports")) {
        airportMap.addSource("hugo-airports", {
          type: "geojson",
          data: airportGeoJson(),
        });
      }
      if (!airportMap.getSource("hugo-airport-selected")) {
        airportMap.addSource("hugo-airport-selected", {
          type: "geojson",
          data: selectedAirportGeoJson(),
        });
      }

      if (!airportMap.getLayer("airport-city-points")) {
        airportMap.addLayer({
          id: "airport-city-points",
          type: "circle",
          source: "hugo-airports",
          paint: {
            "circle-color": ["interpolate", ["linear"], ["get", "photoCount"], 1, "#a6a7a9", 60, "#ececed"],
            "circle-radius": ["interpolate", ["linear"], ["get", "photoCount"], 1, 4, 60, 7.8],
            "circle-stroke-color": "rgba(10, 11, 12, 0.82)",
            "circle-stroke-width": ["interpolate", ["linear"], ["get", "photoCount"], 1, 1, 60, 1.6],
          },
        });
      }
      if (!airportMap.getLayer("airport-city-hit-area")) {
        airportMap.addLayer({
          id: "airport-city-hit-area",
          type: "circle",
          source: "hugo-airports",
          paint: {
            "circle-radius": 18,
            "circle-color": "#ffffff",
            "circle-opacity": 0.01,
          },
        });
      }
      if (!airportMap.getLayer("airport-selected")) {
        airportMap.addLayer({
          id: "airport-selected",
          type: "circle",
          source: "hugo-airport-selected",
          paint: {
            "circle-color": "#ffffff",
            "circle-radius": 8,
            "circle-stroke-color": "#7d7f82",
            "circle-stroke-width": 2.5,
          },
        });
      }

      if (airportMap.getStyle().glyphs && !airportMap.getLayer("airport-city-labels")) {
          airportMap.addLayer({
            id: "airport-city-labels",
            type: "symbol",
            source: "hugo-airports",
            layout: {
              "text-field": [
                "format",
                ["get", "city"], { "font-scale": 1 },
                "  ", {},
                ["get", "iata"], { "font-scale": 0.82 }
              ],
              "text-font": ["Noto Sans Regular"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 1, 10, 7, 12],
              "text-offset": [0, 1.5],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-optional": true,
              "symbol-sort-key": ["*", -1, ["get", "photoCount"]],
            },
            paint: {
              "text-color": "rgba(239, 240, 242, 0.92)",
              "text-halo-color": "rgba(10, 11, 12, 0.96)",
              "text-halo-width": 1.25,
            },
          });
      }

      if (!airportMapInteractionsReady) {
        airportMapInteractionsReady = true;
        airportMap.on("click", "airport-city-hit-area", (event) => {
          selectAirport(event.features?.[0]?.properties?.iata);
        });
        airportMap.on("mouseenter", "airport-city-hit-area", () => {
          airportMap.getCanvas().style.cursor = "pointer";
        });
        airportMap.on("mouseleave", "airport-city-hit-area", () => {
          airportMap.getCanvas().style.cursor = "";
        });
        airportMap.on("click", (event) => {
          if (!airportMap.queryRenderedFeatures(event.point, { layers: ["airport-city-hit-area"] }).length) {
            selectAirport("");
          }
        });
        airportMapContainer.addEventListener("touchstart", (event) => {
          if (event.touches.length !== 1) {
            airportMapTap.identifier = null;
            return;
          }
          const touch = event.touches[0];
          airportMapTap.identifier = touch.identifier;
          airportMapTap.startX = touch.clientX;
          airportMapTap.startY = touch.clientY;
          airportMapTap.moved = false;
        }, { passive: true });
        airportMapContainer.addEventListener("touchmove", (event) => {
          if (airportMapTap.identifier === null) return;
          const touch = Array.from(event.touches)
            .find((item) => item.identifier === airportMapTap.identifier);
          if (!touch || event.touches.length !== 1) {
            airportMapTap.identifier = null;
            return;
          }
          if (Math.hypot(touch.clientX - airportMapTap.startX, touch.clientY - airportMapTap.startY) > 9) {
            airportMapTap.moved = true;
          }
        }, { passive: true });
        airportMapContainer.addEventListener("touchend", (event) => {
          if (airportMapTap.identifier === null || airportMapTap.moved) {
            airportMapTap.identifier = null;
            return;
          }
          const touch = Array.from(event.changedTouches)
            .find((item) => item.identifier === airportMapTap.identifier);
          airportMapTap.identifier = null;
          if (!touch || !airportMapReady) return;
          const rect = airportMapContainer.getBoundingClientRect();
          const point = [touch.clientX - rect.left, touch.clientY - rect.top];
          const feature = airportMap.queryRenderedFeatures(point, { layers: ["airport-city-hit-area"] })[0];
          selectAirport(feature?.properties?.iata || "");
        }, { passive: true });
        airportMapContainer.addEventListener("touchcancel", () => {
          airportMapTap.identifier = null;
        }, { passive: true });
      }

      airportMapReady = true;
      airportMapShell.dataset.mapStatus = "ready";
      syncAirportMapData();
      if (!airportMapFramed && airportEntries.length) {
        airportMapFramed = true;
        fitAirportMap();
      }
    };

    const initializeAirportMap = () => {
      if (airportMap || !airportMapContainer) return Promise.resolve(airportMap);
      if (airportMapInitPromise) return airportMapInitPromise;
      airportMapInitPromise = (async () => {
        airportMapShell.dataset.mapStatus = "loading";
        try {
          const [, maplibregl] = await Promise.all([loadAirportCatalog(), loadMapLibre(), loadHomepagePhotos()]);
          if (typeof maplibregl?.Map !== "function") throw new Error("MapLibre is unavailable");
          maplibregl.setWorkerUrl(`${mapLibreAssetRoot}/maplibre-gl-worker.mjs`);
          airportMap = new maplibregl.Map({
            container: airportMapContainer,
            style: mapStyleUrl,
            center: [40, 33],
            zoom: 1.15,
            minZoom: -0.75,
            maxZoom: 14,
            pitch: 0,
            maxPitch: 0,
            attributionControl: false,
            renderWorldCopies: false,
            cooperativeGestures: false,
            dragPan: {
              linearity: 0.3,
              maxSpeed: 1400,
              deceleration: 2500,
            },
            dragRotate: false,
            touchZoomRotate: true,
            touchPitch: false,
            scrollZoom: true,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            fadeDuration: reduceMotion ? 0 : 140,
          });
          airportMap.scrollZoom.setZoomRate(1 / 160);
          airportMap.scrollZoom.setWheelZoomRate(1 / 650);
          airportMap.touchZoomRotate.setZoomRate(0.72);
          airportMap.touchZoomRotate.disableRotation();
          airportMap.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
          airportMap.on("style.load", addAirportMapLayers);
          airportMap.on("error", (event) => console.warn("Airport map resource error", event.error));
          window.setTimeout(() => {
            if (airportMapReady || !airportMap) return;
            airportMapLoader.textContent = "底图暂时不可用";
            airportMap.setStyle({
              version: 8,
              sources: {},
              layers: [{ id: "fallback-background", type: "background", paint: { "background-color": "#101113" } }],
            });
          }, 7000);
        } catch (error) {
          console.warn("Unable to initialize airport map", error);
          airportMapShell.dataset.mapStatus = "error";
          airportMapLoader.textContent = "地图暂时不可用";
          airportMapInitPromise = null;
        }
        return airportMap;
      })();
      return airportMapInitPromise;
    };

    const attachHomepagePhoto = (slot, photo) => {
      homepagePhotoData.set(slot, photo);
      slot.alt = photoDescription(photo);
      const trigger = slot.closest(".photo-card, .story-media, .post-image")?.querySelector(".photo-view-button");
      trigger?.setAttribute("aria-label", `打开照片：${photoPreviewTitle(photo)}`);
    };

    const getPath = (object, path) => path.split(".").reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, object);

    const applySiteConfig = (config) => {
      const home = config?.home;
      if (!home) return;

      document.querySelectorAll("[data-site-text]").forEach((element) => {
        const path = element.dataset.siteText;
        const value = getPath(home, path);
        if (value == null) return;
        const text = String(value);
        element.textContent = text;
        if (element.matches("p")) element.hidden = !text.trim();
      });

      document.querySelectorAll("[data-site-link]").forEach((element) => {
        const href = getPath(home, element.dataset.siteLink);
        if (href) element.href = String(href);
      });

      const configuredHomeImages = Array.isArray(home.images) ? home.images : [];
      homepagePhotoSlots.forEach((slot, index) => {
        const image = configuredHomeImages[index];
        slot.style.objectPosition = homepageFocus[index] || "40% 50%";
        if (!image?.src) return;
        const configuredPhoto = findPhotoForSource(image.src);
        const currentPreview = slot.dataset.fullSrc === image.src ? slot.getAttribute("src") : "";
        const previewSrc = photoPreviewSource(configuredPhoto) || currentPreview || image.src;
        if (slot.dataset.fullSrc !== image.src) {
          homepagePhotoData.delete(slot);
          slot.dataset.fullSrc = image.src;
          slot.src = previewSrc;
        }
        slot.alt = image.alt || slot.alt || "航空摄影作品";
        if (configuredPhoto) attachHomepagePhoto(slot, configuredPhoto);
      });

      const configuredMapCover = configuredHomeImages[homepagePhotoSlots.length] || {};
      const nextMapCover = {
        src: cleanText(configuredMapCover.src),
        alt: cleanText(configuredMapCover.alt) || "机场地图封面",
      };
      airportMapCover = nextMapCover;
      airportMapCovers = Object.fromEntries(Object.entries(home.airportCovers || {})
        .map(([rawCode, image]) => {
          const code = normalizeAirportCode(rawCode);
          const src = cleanText(image?.src);
          return code && src ? [code, {
            src,
            alt: cleanText(image?.alt) || `${code} 机场代表作品`,
          }] : null;
        })
        .filter(Boolean));
      renderAirportDetail();
    };

    const loadSiteConfig = async () => {
      try {
        const response = await fetch("/api/site", { cache: "no-cache", priority: "low" });
        if (!response.ok) return false;
        const config = await response.json();
        const revision = cleanText(config?.updatedAt) || JSON.stringify(config?.home || {});
        if (revision === homepageSiteRevision) return false;
        homepageSiteRevision = revision;
        applySiteConfig(config);
        return true;
      } catch (error) {
        console.warn("Unable to load site config", error);
        return false;
      }
    };

    const createPhotosRevision = (data, photos) => cleanText(data?.updatedAt)
      || JSON.stringify(photos.map((photo) => [
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

    const applyHomepagePhotoManifest = (data, force = false, isFull = true) => {
      const photos = normalizePhotos(data);
      const revision = `${isFull ? "" : "summary:"}${createPhotosRevision(data, photos)}`;
      if (!force && revision === homepagePhotosRevision) return false;
      homepagePhotosRevision = revision;
      homepageHasFullManifest = isFull;
      updateAirportLog(photos);
      homepagePhotoSlots.forEach((slot) => homepagePhotoData.delete(slot));
      if (!photos.length) return true;

      homepagePhotoSlots.forEach((slot, index) => {
        const fullSrc = slot.dataset.fullSrc || slot.getAttribute("src") || "";
        if (fullSrc) {
          const configuredPhoto = photos.find((photo) => photo.src === fullSrc);
          if (configuredPhoto) {
            slot.dataset.fullSrc = configuredPhoto.src;
            slot.src = photoPreviewSource(configuredPhoto);
            attachHomepagePhoto(slot, configuredPhoto);
          }
          return;
        }
        const photo = photos[(index + 1) % photos.length];
        slot.dataset.fullSrc = photo.src;
        slot.src = photoPreviewSource(photo);
        attachHomepagePhoto(slot, photo);
        slot.style.objectPosition = homepageFocus[index] || "40% 50%";
      });
      if (lightbox.classList.contains("is-open")) setLightboxImage(activeLightboxIndex);
      return true;
    };

    const loadHomepagePhotos = async (force = false) => {
      const sources = ["/api/photos", "photos.json"];
      for (const source of sources) {
        try {
          const response = await fetch(source, {
            cache: source.startsWith("/api/") ? "no-cache" : "force-cache",
            priority: "low",
          });
          if (!response.ok) continue;
          const data = await response.json();
          if (!Array.isArray(data) && !Array.isArray(data?.photos)) continue;
          return applyHomepagePhotoManifest(data, force);
        } catch (error) {
          console.warn(`Unable to load ${source}`, error);
        }
      }
      return false;
    };

    const loadHomepageContent = async () => {
      try {
        const response = await fetch("/api/home", { cache: "no-cache", priority: "low" });
        if (!response.ok) throw new Error(`Homepage request failed (${response.status})`);
        const data = await response.json();
        if (!data?.site?.home || !Array.isArray(data?.manifest?.photos)) throw new Error("Invalid homepage response");
        if (homepageHasFullManifest) await loadHomepagePhotos();
        else applyHomepagePhotoManifest(data.manifest, false, false);
        const revision = cleanText(data.site.updatedAt) || JSON.stringify(data.site.home);
        if (revision !== homepageSiteRevision) {
          homepageSiteRevision = revision;
          applySiteConfig(data.site);
        }
      } catch (error) {
        console.warn("Unable to refresh homepage summary", error);
        await Promise.all([loadSiteConfig(), (!homepagePhotos.length || homepageHasFullManifest) && loadHomepagePhotos()]);
      }
    };

    const requestHomepageRefresh = (delay = 120, queueBeforeReady = false) => {
      if (!homepageContentReady) {
        if (queueBeforeReady) homepageRefreshQueued = true;
        return;
      }
      if (document.visibilityState === "hidden") return;
      window.clearTimeout(homepageRefreshTimer);
      homepageRefreshTimer = window.setTimeout(() => {
        if (homepageRefreshPromise) {
          homepageRefreshQueued = true;
          return;
        }
        homepageRefreshPromise = loadHomepageContent()
          .catch((error) => console.warn("Unable to refresh homepage content", error))
          .finally(() => {
            homepageRefreshPromise = null;
            if (!homepageRefreshQueued) return;
            homepageRefreshQueued = false;
            requestHomepageRefresh(0);
          });
      }, delay);
    };

    contentChannel?.addEventListener("message", (event) => {
      if (event.data?.type === "content-updated") requestHomepageRefresh(0, true);
    });

    const updateScrollEffects = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      progress.style.transform = `scaleX(${ratio})`;
      siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);

      const enableParallax = !reduceMotion && desktopViewport.matches && parallaxInView;
      parallaxItems.forEach((item) => item.classList.toggle("is-parallax-active", enableParallax));
      if (enableParallax) {
        parallaxItems.forEach((item) => {
          const speed = Number(item.dataset.parallax || 0);
          const offset = -Math.min(64, window.scrollY * speed * 0.5);
          item.style.setProperty("--parallax-y", `${offset}px`);
        });
      } else if (parallaxEnabled !== false) {
        parallaxItems.forEach((item) => item.style.setProperty("--parallax-y", "0px"));
      }
      parallaxEnabled = enableParallax;
    };

    const requestScrollUpdate = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        updateScrollEffects();
        scrollTicking = false;
      });
    };

    document.querySelectorAll(".gallery, .story-copy, .posts").forEach((group) => {
      [...group.children].filter((item) => item.classList.contains("reveal")).forEach((item, index) => {
        item.style.setProperty("--reveal-delay", `${Math.min(index * 55, 165)}ms`);
      });
    });

    document.documentElement.classList.add("reveal-enabled");

    if ("IntersectionObserver" in window) {
      const parallaxObserver = new IntersectionObserver((entries) => {
        parallaxInView = entries.some((entry) => entry.isIntersecting);
        requestScrollUpdate();
      }, { rootMargin: "120px 0px", threshold: 0.01 });
      parallaxObserver.observe(heroSection);

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

      revealItems.forEach((item) => observer.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    if ("IntersectionObserver" in window) {
      const mapObserver = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        mapObserver.disconnect();
        initializeAirportMap();
      }, { rootMargin: "320px 0px", threshold: 0.01 });
      mapObserver.observe(airportMapShell);
    } else {
      initializeAirportMap();
    }

    document.querySelector('.nav a[href="#airports"]')?.addEventListener("click", (event) => {
      const target = document.querySelector("#airports");
      if (!target) return;
      event.preventDefault();
      if (location.hash !== "#airports") history.pushState(null, "", "#airports");
      initializeAirportMap();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => {
        const headerBottom = siteHeader.getBoundingClientRect().bottom;
        const targetTop = target.getBoundingClientRect().top;
        if (targetTop < headerBottom - 8 || targetTop > headerBottom + 48) {
          target.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }, reduceMotion ? 0 : 760);
    });

    const setLightboxImage = (index) => {
      if (!lightboxItems.length) return;
      activeLightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
      const source = lightboxItems[activeLightboxIndex];
      const fullSrc = source.dataset.fullSrc || source.currentSrc || source.src;
      if (!fullSrc) return;
      const photo = homepagePhotoData.get(source);
      lightboxImage.src = fullSrc;
      lightboxImage.alt = photo ? photoDescription(photo) : (source.alt || "航空摄影作品");
      const card = source.closest(".photo-card, .story-media, .post");
      const title = photoPreviewTitle(photo, fullSrc);
      const fallbackTags = [...(card?.querySelectorAll(".caption-top span, .date") || [])]
        .map((item) => item.textContent.trim())
        .filter(Boolean);
      const tags = photo ? [
        Array.isArray(photo.categories) && photo.categories.includes("night") ? "夜间" : "日间",
        photo.airline,
        photo.aircraft,
        photo.registration,
        photo.airport && `机场 ${photo.airport}`,
        phaseLabels[photo.phase] || photo.phase,
        formatPhotoDate(photo.capturedAt),
        photo.spot && `机位 / 参数 ${photo.spot}`,
        photo.notes && `备注 ${photo.notes}`,
      ].map(cleanText).filter(Boolean) : fallbackTags;
      const basicTags = tags.filter((item) => cleanText(item) !== title);
      lightboxInfoTitle.textContent = title;
      lightboxInfoBasic.textContent = basicTags.join(" · ") || "航空摄影作品";
      lightboxInfo.scrollLeft = 0;
    };

    const openLightbox = (index) => {
      const source = lightboxItems[index];
      if (!(source?.dataset.fullSrc || source?.src)) return;
      window.clearTimeout(lightboxCloseTimer);
      setLightboxImage(index);
      lightbox.inert = false;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-lightbox-open");
      siteHeader.inert = true;
      pageMain.inert = true;
      lightboxClose.focus({ preventScroll: true });
    };

    const closeLightbox = () => {
      if (!lightbox.classList.contains("is-open")) return;
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.inert = true;
      document.body.classList.remove("is-lightbox-open");
      siteHeader.inert = false;
      pageMain.inert = false;
      lastLightboxTrigger?.focus({ preventScroll: true });
      lightboxCloseTimer = window.setTimeout(() => {
        if (lightbox.classList.contains("is-open")) return;
        lightboxImage.removeAttribute("src");
        lightboxInfoTitle.textContent = "";
        lightboxInfoBasic.textContent = "";
      }, 240);
    };

    lightboxItems.forEach((item, index) => {
      const surface = item.closest(".photo-card, .story-media, .post-image");
      if (!surface) return;
      const trigger = document.createElement("button");
      trigger.className = "photo-view-button";
      trigger.type = "button";
      trigger.setAttribute("aria-label", `打开照片：${item.alt || "航空摄影作品"}`);
      surface.append(trigger);
      trigger.addEventListener("click", () => {
        lastLightboxTrigger = trigger;
        openLightbox(index);
      });
    });

    airportDetail.addEventListener("touchstart", beginAirportDetailSwipe, { passive: true });
    airportDetail.addEventListener("touchmove", moveAirportDetailSwipe, { passive: false });
    airportDetail.addEventListener("touchend", endAirportDetailSwipe, { passive: true });
    airportDetail.addEventListener("touchcancel", () => {
      if (airportDetailSwipe.tracking) finishAirportDetailSwipe();
    }, { passive: true });
    airportDetail.addEventListener("click", (event) => {
      if (performance.now() >= airportDetailSwipe.suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    lightbox.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("#lightboxImage, .lightbox-info, .lightbox-button")) closeLightbox();
    });
    lightboxClose.addEventListener("click", closeLightbox);

    window.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key !== "Tab") return;
      const focusable = [...lightbox.querySelectorAll("button:not([disabled]), [tabindex='0']")]
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate);
    window.addEventListener("focus", () => requestHomepageRefresh());
    window.addEventListener("pageshow", (event) => { if (event.persisted) requestHomepageRefresh(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestHomepageRefresh();
    });
    const initialHomepageData = readInitialHomepageData();
    Object.assign(staticPreviews, initialHomepageData?.previews || {});
    homepagePhotoSlots.forEach((slot) => slot.addEventListener("error", () => {
      const photo = findPhotoForSource(slot.dataset.fullSrc);
      const fallback = photo?.thumbSrc || photo?.src;
      if (fallback && slot.getAttribute("src") !== fallback) slot.src = fallback;
    }));
    if (initialHomepageData?.manifest) {
      applyHomepagePhotoManifest(initialHomepageData.manifest, true, false);
    }
    if (initialHomepageData?.site) {
      homepageSiteRevision = cleanText(initialHomepageData.site.updatedAt);
      applySiteConfig(initialHomepageData.site);
    }

    const refreshHomepageAfterPaint = () => {
      const refresh = () => loadHomepageContent().finally(() => {
        homepageContentReady = true;
        if (homepageRefreshQueued) {
          homepageRefreshQueued = false;
          requestHomepageRefresh(0);
        }
      });
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(refresh, { timeout: 2400 });
      } else {
        window.setTimeout(refresh, 900);
      }
    };

    if (initialHomepageData) {
      if (document.readyState === "complete") refreshHomepageAfterPaint();
      else window.addEventListener("load", refreshHomepageAfterPaint, { once: true });
    } else {
      loadHomepageContent().finally(() => {
        homepageContentReady = true;
      });
    }
    updateScrollEffects();
