    const metricLabels = ["FOCAL RANGE", "PRIMARY SUBJECT", "BASE AIRPORT", "LAST UPDATE"];
    const homeImageDefs = [
      { label: "精选大图", tags: ["Airlift", "Final Approach"], title: true, description: true },
      { label: "竖向卡片", tags: ["SR-71", "Blackbird"], title: true, description: true },
      { label: "小卡片 1", tags: ["Haneda T3", "Observation"], title: true, description: false },
      { label: "小卡片 2", tags: ["KLM", "Final Approach"], title: true, description: false },
      { label: "小卡片 3", tags: ["Dreamliner", "At The Gate"], title: true, description: false },
      { label: "航迹图片", tags: ["Flight Path"], title: false, description: false },
      { label: "手记图片 1", tags: ["Journal"], title: false, description: false },
      { label: "手记图片 2", tags: ["Journal"], title: false, description: false },
      { label: "手记图片 3", tags: ["Journal"], title: false, description: false },
      { label: "地图总览封面", tags: ["全部机场", "3:2", "Fixed"], title: false, description: false, fixed: true },
    ];
    const HOME_PICKER_PAGE_SIZE = 48;
    const defaultSite = {
      updatedAt: "2026-07-03T00:00:00.000Z",
      home: {
        hero: {
          eyebrow: "Aviation Photography Blog",
          greeting: "你好",
          welcome: "欢迎来到 Hugo.aviation",
          primaryButton: "查看航空作品",
          secondaryButton: "浏览航迹故事",
        },
        metrics: [
          { label: "FOCAL RANGE", value: "50-400mm" },
          { label: "PRIMARY SUBJECT", value: "Airliners" },
          { label: "BASE AIRPORT", value: "ZGGG / CAN" },
          { label: "LAST UPDATE", value: "2026.07" },
        ],
        images: [
          { src: "/media/uploads/demo/example.jpg", alt: "卡塔尔埃米尔空军重型运输机进近", title: "重型运输机的最后进近", description: "卡塔尔埃米尔空军运输机放下起落架，四台发动机与宽厚机翼在暗色天空下完整展开。" },
          { src: "/media/uploads/demo/example.jpg", alt: "SR-71 黑鸟侦察机黑白俯视", title: "黑鸟掠过机库中轴", description: "从 SR-71 机身上方望向机首，双发短舱、双垂尾与机库结构在黑白画面中收束成锐利的速度感。" },
          { src: "/media/uploads/demo/example.jpg", alt: "羽田机场 T3 观景台", title: "羽田 T3 的观景边界", description: "" },
          { src: "/media/uploads/demo/example.jpg", alt: "KLM 客机橙色涂装进近", title: "橙色机身穿过蓝天", description: "" },
          { src: "/media/uploads/demo/example.jpg", alt: "新西兰航空 787 停靠廊桥", title: "廊桥旁的黑白 787", description: "" },
          { src: "/media/uploads/demo/example.jpg", alt: "羽田机场机坪与 KLM 客机", title: "", description: "" },
          { src: "/media/uploads/demo/example.jpg", alt: "雪绒花航空 A350 进近", title: "雪绒花 A350 划过晴空", description: "起落架放下后，细长机翼、两台发动机和红色机首在蓝天里一目了然；干净侧面让涂装成为画面焦点。" },
          { src: "/media/uploads/demo/example.jpg", alt: "中华航空彩绘客机夜间滑行", title: "华航彩绘机穿过夜色", description: "滑行灯、航灯与跑道反光围住机身，彩绘在低照度中仍保留清楚层次。" },
          { src: "/media/uploads/demo/example.jpg", alt: "日本货物航空与 Air ACT 747 货机", title: "两架 747 的货运机坪", description: "日本货物航空与 Air ACT 的 747 前后错落，滑行线、机位和不同距离把繁忙机坪整理出清楚层次。" },
          { src: "/media/uploads/demo/example.jpg", alt: "航空摄影机场地图封面", title: "", description: "" },
        ],
        airportCovers: {},
        story: {
          blocks: [
            { title: "从观景台读懂机坪", body: "航站楼、滑行线、廊桥和地勤车辆不断改变画面；飞机停靠的位置，也在讲述机场的运行节奏。" },
            { title: "等飞机，也等画面归位", body: "从推出到滑行，每一步都只有短暂窗口。我会等机身、前景和跑道线条落在最清楚的位置。" },
            { title: "把机场的秩序留在照片里", body: "塔台、机位与远处起降的飞机共同构成层次，让照片不只记录某一架飞机，也保留当时的现场。" },
          ],
        },
        journal: {
          title: "机场边的拍摄手记",
          intro: "从晴空进近、夜间滑行到繁忙货运机坪，用三组画面记录不同光线下的机身姿态与机场秩序。",
          posts: [
            { date: "DAYLIGHT / APPROACH", title: "雪绒花 A350 划过晴空", body: "起落架放下后，细长机翼、两台发动机和红色机首在蓝天里一目了然；干净侧面让涂装成为画面焦点。" },
            { date: "NIGHT / TAXI", title: "华航彩绘机穿过夜色", body: "滑行灯、航灯与跑道反光围住机身，彩绘在低照度中仍保留清楚层次。" },
            { date: "CARGO / GROUND OPS", title: "两架 747 的货运机坪", body: "日本货物航空与 Air ACT 的 747 前后错落，滑行线、机位和不同距离把繁忙机坪整理出清楚层次。" },
          ],
        },
        about: {
          title: "你好，我是 Hugo.aviation。",
          body: "我长期拍摄民航客机、机场运行与飞行途中的天空景观。这个 blog 会持续整理我喜欢的飞机、光线和机位。",
          stats: [
            { value: "433", label: "收录航空作品" },
            { value: "12", label: "拍摄机场" },
            { value: "27", label: "记录机型" },
          ],
        },
        contact: {
          emailLabel: "电子邮件",
          emailHref: "mailto:hello@example.com",
          douyinLabel: "抖音",
          douyinHref: "https://example.com/",
          instagramLabel: "Instagram",
          instagramHref: "https://example.com/",
          jetphotosLabel: "JetPhotos",
          jetphotosHref: "https://example.com/",
        },
      },
    };

    const elements = {
      token: document.querySelector("#adminToken"),
      saveToken: document.querySelector("#saveToken"),
      status: document.querySelector("#status"),
      photoCount: document.querySelector("#photoCount"),
      needsReviewCount: document.querySelector("#needsReviewCount"),
      metricList: document.querySelector("#metricList"),
      homeImageList: document.querySelector("#homeImageList"),
      airportCoverList: document.querySelector("#airportCoverList"),
      homeTextSections: document.querySelector("#homeTextSections"),
      homePhotoPicker: document.querySelector("#homePhotoPicker"),
      homePickerSlotLabel: document.querySelector("#homePickerSlotLabel"),
      homePickerClose: document.querySelector("#homePickerClose"),
      homePickerSearch: document.querySelector("#homePickerSearch"),
      homePickerTime: document.querySelector("#homePickerTime"),
      homePickerAirline: document.querySelector("#homePickerAirline"),
      homePickerAircraft: document.querySelector("#homePickerAircraft"),
      homePickerAirport: document.querySelector("#homePickerAirport"),
      homePickerCount: document.querySelector("#homePickerCount"),
      homePickerSort: document.querySelector("#homePickerSort"),
      homePickerReset: document.querySelector("#homePickerReset"),
      homePickerScroll: document.querySelector("#homePickerScroll"),
      homePickerGallery: document.querySelector("#homePickerGallery"),
      homePickerMore: document.querySelector("#homePickerMore"),
      homePickerInspector: document.querySelector("#homePickerInspector"),
      uploadForm: document.querySelector("#uploadForm"),
      fileInput: document.querySelector("#fileInput"),
      folderInput: document.querySelector("#folderInput"),
      dropZone: document.querySelector("#dropZone"),
      dropCopy: document.querySelector("#dropCopy"),
      preview: document.querySelector("#preview"),
      queueSummary: document.querySelector("#queueSummary"),
      chooseFiles: document.querySelector("#chooseFiles"),
      chooseFolder: document.querySelector("#chooseFolder"),
      title: document.querySelector("#title"),
      categoryGrid: document.querySelector("#categoryGrid"),
      airline: document.querySelector("#airline"),
      aircraft: document.querySelector("#aircraft"),
      registration: document.querySelector("#registration"),
      airport: document.querySelector("#airport"),
      capturedAt: document.querySelector("#capturedAt"),
      phase: document.querySelector("#phase"),
      airlineOptions: document.querySelector("#airlineOptions"),
      aircraftOptions: document.querySelector("#aircraftOptions"),
      airportOptions: document.querySelector("#airportOptions"),
      spot: document.querySelector("#spot"),
      notes: document.querySelector("#notes"),
      uploadButton: document.querySelector("#uploadButton"),
      clearForm: document.querySelector("#clearForm"),
      editPanel: document.querySelector("#editPanel"),
      editPreview: document.querySelector("#editPreview"),
      editTitle: document.querySelector("#editTitle"),
      editCategory: document.querySelector("#editCategory"),
      editAirline: document.querySelector("#editAirline"),
      editAircraft: document.querySelector("#editAircraft"),
      editRegistration: document.querySelector("#editRegistration"),
      editAirport: document.querySelector("#editAirport"),
      editCapturedAt: document.querySelector("#editCapturedAt"),
      editPhase: document.querySelector("#editPhase"),
      editSpot: document.querySelector("#editSpot"),
      editNotes: document.querySelector("#editNotes"),
      editCompleteness: document.querySelector("#editCompleteness"),
      saveEdit: document.querySelector("#saveEdit"),
      saveAndNext: document.querySelector("#saveAndNext"),
      deletePhoto: document.querySelector("#deletePhoto"),
      cancelEdit: document.querySelector("#cancelEdit"),
      photoList: document.querySelector("#photoList"),
      countText: document.querySelector("#countText"),
      searchInput: document.querySelector("#searchInput"),
      filterSelect: document.querySelector("#filterSelect"),
      sortSelect: document.querySelector("#sortSelect"),
      catalogFilter: document.querySelector("#catalogFilter"),
      airlineFilter: document.querySelector("#airlineFilter"),
      aircraftFilter: document.querySelector("#aircraftFilter"),
      airportFilter: document.querySelector("#airportFilter"),
      phaseFilter: document.querySelector("#phaseFilter"),
      completionStrip: document.querySelector("#completionStrip"),
      emptyAuditCount: document.querySelector("#emptyAuditCount"),
      readyAuditCount: document.querySelector("#readyAuditCount"),
      thumbnailAuditCount: document.querySelector("#thumbnailAuditCount"),
      thumbnailJobPanel: document.querySelector("#thumbnailJobPanel"),
      thumbnailJobTitle: document.querySelector("#thumbnailJobTitle"),
      thumbnailJobDetail: document.querySelector("#thumbnailJobDetail"),
      thumbnailJobPercent: document.querySelector("#thumbnailJobPercent"),
      thumbnailJobBar: document.querySelector("#thumbnailJobBar"),
      thumbnailJobMeta: document.querySelector("#thumbnailJobMeta"),
      retryThumbnailFailures: document.querySelector("#retryThumbnailFailures"),
      toggleBatch: document.querySelector("#toggleBatch"),
      batchPanel: document.querySelector("#batchPanel"),
      selectedCount: document.querySelector("#selectedCount"),
      selectVisible: document.querySelector("#selectVisible"),
      clearSelection: document.querySelector("#clearSelection"),
      exitBatch: document.querySelector("#exitBatch"),
      batchCategory: document.querySelector("#batchCategory"),
      batchAirline: document.querySelector("#batchAirline"),
      batchAircraft: document.querySelector("#batchAircraft"),
      batchRegistration: document.querySelector("#batchRegistration"),
      batchAirport: document.querySelector("#batchAirport"),
      batchCapturedAt: document.querySelector("#batchCapturedAt"),
      batchPhase: document.querySelector("#batchPhase"),
      batchSpot: document.querySelector("#batchSpot"),
      batchOnlyEmpty: document.querySelector("#batchOnlyEmpty"),
      applyBatch: document.querySelector("#applyBatch"),
      optimizeThumbnails: document.querySelector("#optimizeThumbnails"),
      clearLibrary: document.querySelector("#clearLibrary"),
      createBackup: document.querySelector("#createBackup"),
      chooseBackup: document.querySelector("#chooseBackup"),
      backupFile: document.querySelector("#backupFile"),
      backupList: document.querySelector("#backupList"),
      scanStorage: document.querySelector("#scanStorage"),
      cleanupStorage: document.querySelector("#cleanupStorage"),
      storageTotal: document.querySelector("#storageTotal"),
      storageObjects: document.querySelector("#storageObjects"),
      storageReferenced: document.querySelector("#storageReferenced"),
      storageEligible: document.querySelector("#storageEligible"),
      storageMeterLabel: document.querySelector("#storageMeterLabel"),
      storageMeterBar: document.querySelector("#storageMeterBar"),
      storageCheckedAt: document.querySelector("#storageCheckedAt"),
      storageSummary: document.querySelector("#storageSummary"),
      storageList: document.querySelector("#storageList"),
    };

    const THUMBNAIL_PROGRESS_KEY = "hugo-thumbnail-migration-v2";
    const hasOptimizedThumbnail = (photo) => /\.webp(?:\?|$)/i.test(String(photo?.thumbSrc || ""));
    const readThumbnailProgress = () => {
      try {
        const value = JSON.parse(localStorage.getItem(THUMBNAIL_PROGRESS_KEY) || "null");
        return value && typeof value === "object" ? value : null;
      } catch {
        return null;
      }
    };

    const state = {
      token: sessionStorage.getItem("hugo-admin-token") || "",
      activeView: "home",
      site: structuredClone(defaultSite),
      photos: [],
      airports: [],
      airportCodes: new Set(),
      files: [],
      previewUrl: "",
      selectedId: "",
      query: "",
      backups: [],
      storageAudit: null,
      thumbnailJob: null,
      thumbnailProgress: readThumbnailProgress(),
      batchMode: false,
      selectedIds: new Set(),
      batchSaving: false,
      worksRenderFrame: 0,
      homePicker: {
        targetType: "home",
        slotIndex: -1,
        airportCode: "",
        selectedId: "",
        query: "",
        time: "",
        airline: "",
        aircraft: "",
        airport: "",
        sort: "newest",
        visibleCount: HOME_PICKER_PAGE_SIZE,
        returnFocus: null,
        renderFrame: 0,
      },
    };
    const contentChannel = typeof window.BroadcastChannel === "function"
      ? new BroadcastChannel("hugo-aviation-content")
      : null;
    let adminThumbObserver = null;
    let adminDataPromise = null;

    elements.token.value = state.token;

    const escapeHtml = (value = "") => String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

    const setStatus = (title, detail = "", tone = "") => {
      elements.status.className = `status ${tone}`.trim();
      elements.status.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ""}`;
    };

    const api = async (path, options = {}, needsAuth = false) => {
      const headers = new Headers(options.headers || {});
      const method = String(options.method || "GET").toUpperCase();
      if (needsAuth) headers.set("Authorization", `Bearer ${state.token}`);
      if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      const response = await fetch(path, { ...options, headers, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = { 429: "请求过于频繁，请一分钟后再试。", 401: "后台密钥不正确。",
          403: data.detail || "请求来源未通过安全校验，请刷新后台后重试。",
          409: data.detail || "数据刚刚发生变化，请刷新后重试。" };
        throw Object.assign(new Error(messages[response.status] || data.detail || data.error || "请求失败"), { status: response.status });
      }
      if (method !== "GET" && method !== "HEAD") {
        const scope = path.startsWith("/api/photos")
          ? "photos"
          : path.startsWith("/api/site")
            ? "site"
            : (/\/api\/backups\/(?:import|[^/]+\/restore)(?:\?|$)/.test(path) ? "all" : "");
        if (scope) {
          state.storageAudit = null;
          contentChannel?.postMessage({ type: "content-updated", scope });
        }
      }
      return data;
    };

    const normalizeAirportCode = (value) => {
      const codes = String(value || "").trim().toUpperCase().match(/\b[A-Z]{3}\b/g);
      return codes?.at(-1) || "";
    };

    const normalizePhotos = (data) => {
      const list = Array.isArray(data) ? data : data?.photos;
      return Array.isArray(list)
        ? list.filter((photo) => photo && photo.src && photo.id).map((photo) => ({
          ...photo,
          airport: normalizeAirportCode(photo.airport),
        }))
        : [];
    };

    const airportFieldValue = (element) => {
      const raw = String(element?.value || "").trim();
      if (!raw) {
        element?.setCustomValidity("");
        element?.removeAttribute("aria-invalid");
        return "";
      }
      const code = normalizeAirportCode(raw);
      const known = code && (!state.airportCodes.size || state.airportCodes.has(code));
      if (!known) {
        const message = code
          ? `机场目录中没有 ${code}，暂时无法在前台地图定位。`
          : "机场需要填写三位 IATA 代码，例如 CAN。";
        element?.setCustomValidity(message);
        element?.setAttribute("aria-invalid", "true");
        throw new Error(message);
      }
      element.value = code;
      element.setCustomValidity("");
      element.removeAttribute("aria-invalid");
      return code;
    };

    const sourceFilename = (photo) => {
      try {
        const pathname = new URL(photo?.src || "", window.location.href).pathname;
        return decodeURIComponent(pathname.split("/").pop() || "")
          .replace(/\.[^.]+$/, "")
          .replace(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-/i, "");
      } catch {
        return "";
      }
    };
    const photoLabel = (photo) => photo.title || sourceFilename(photo) || photo.id || "未命名文件";
    const isNightPhoto = (photo) => Array.isArray(photo.categories) && photo.categories.includes("night");
    const cloneDefaultSite = () => structuredClone(defaultSite);
    const cloneSiteForEdit = (site) => {
      const fallback = cloneDefaultSite();
      if (!site || typeof site !== "object") return fallback;
      const source = structuredClone(site);
      const home = source.home && typeof source.home === "object" ? source.home : {};
      return {
        ...fallback,
        ...source,
        home: {
          ...fallback.home,
          ...home,
          hero: { ...fallback.home.hero, ...(home.hero || {}) },
          story: { ...fallback.home.story, ...(home.story || {}) },
          journal: { ...fallback.home.journal, ...(home.journal || {}) },
          about: { ...fallback.home.about, ...(home.about || {}) },
          contact: { ...fallback.home.contact, ...(home.contact || {}) },
        },
      };
    };
    const tagLabels = {
      day: "日间",
      night: "夜间",
      standard: "标准",
      featured: "横向大图",
      vertical: "纵向大图",
      ground: "地面停场",
      taxi: "滑行",
      takeoff: "起飞",
      landing: "进近 / 降落",
      cruise: "空中 / 巡航",
      other: "其他",
    };
    const tagLabel = (tag) => tagLabels[tag] || tag;

    const photoSummary = (photo) => [
      photo.airline,
      photo.aircraft,
      photo.registration,
      photo.airport,
    ].filter(Boolean).join(" · ") || photo.alt || "";

    const hasFilename = (photo) => Boolean(String(photo?.title || "").trim());
    const BASIC_COMPLETE_MIN_FIELDS = 3;

    const photoAudit = (photo) => {
      const fields = [
        ["文件名", hasFilename(photo)],
        ["航司", Boolean(photo.airline)],
        ["机型", Boolean(photo.aircraft)],
        ["机场", Boolean(photo.airport)],
        ["阶段", Boolean(photo.phase)],
      ];
      const filled = fields.filter(([, value]) => value).length;
      return {
        filled,
        total: fields.length,
        percent: Math.round((filled / fields.length) * 100),
        status: filled >= BASIC_COMPLETE_MIN_FIELDS ? "ready" : "empty",
        missing: fields.filter(([, value]) => !value).map(([label]) => label),
      };
    };

    const auditLabel = (audit) => audit.status === "ready" ? "基本完成" : "待整理";

    const setCatalogFilterOptions = (element, label, field) => {
      const selected = element.value;
      const values = [...new Set(state.photos.map((photo) => String(photo[field] || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true, sensitivity: "base" }));
      element.innerHTML = [
        `<option value="">${escapeHtml(label)}：全部</option>`,
        ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
      ].join("");
      if (values.includes(selected)) element.value = selected;
      return values;
    };

    const renderCatalogFilters = () => {
      const airlineValues = setCatalogFilterOptions(elements.airlineFilter, "航空公司", "airline");
      const aircraftValues = setCatalogFilterOptions(elements.aircraftFilter, "机型", "aircraft");
      const airportValues = setCatalogFilterOptions(elements.airportFilter, "机场", "airport");
      elements.airlineOptions.innerHTML = airlineValues.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
      elements.aircraftOptions.innerHTML = aircraftValues.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
      const knownCodes = new Set(state.airports.map((airport) => airport.iata));
      const catalogOptions = state.airports.map((airport) => {
        const label = [airport.nameZh || airport.nameEn, airport.city].filter(Boolean).join(" · ");
        return `<option value="${escapeHtml(airport.iata)}" label="${escapeHtml(label)}"></option>`;
      });
      const legacyOptions = airportValues
        .filter((code) => !knownCodes.has(code))
        .map((code) => `<option value="${escapeHtml(code)}"></option>`);
      elements.airportOptions.innerHTML = [...catalogOptions, ...legacyOptions].join("");
    };

    const persistThumbnailProgress = (patch) => {
      state.thumbnailProgress = {
        ...(state.thumbnailProgress || {}),
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(THUMBNAIL_PROGRESS_KEY, JSON.stringify(state.thumbnailProgress));
      } catch {
        // The server manifest remains the source of truth when storage is unavailable.
      }
      updateThumbnailJobUi();
    };

    const updateThumbnailJobUi = () => {
      const total = state.photos.length;
      const pendingIds = new Set(state.photos.filter((photo) => !hasOptimizedThumbnail(photo)).map((photo) => photo.id));
      const pending = pendingIds.size;
      const completed = Math.max(0, total - pending);
      const percent = total ? Math.round((completed / total) * 100) : 0;
      const progressState = state.thumbnailProgress || {};
      const failedIds = Array.isArray(progressState.failedIds)
        ? progressState.failedIds.filter((id) => pendingIds.has(id))
        : [];
      const job = state.thumbnailJob;
      const showPanel = Boolean(job || state.thumbnailProgress);

      elements.thumbnailJobPanel.hidden = !showPanel;
      elements.thumbnailJobPanel.classList.toggle("is-running", Boolean(job));
      elements.optimizeThumbnails.disabled = !job && pending === 0 && total > 0;
      elements.thumbnailJobPercent.textContent = `${percent}%`;
      elements.thumbnailJobBar.style.transform = `scaleX(${percent / 100})`;
      elements.thumbnailJobMeta.textContent = `已完成 ${completed} · 剩余 ${pending} · 失败 ${failedIds.length}`;
      elements.retryThumbnailFailures.hidden = Boolean(job) || failedIds.length === 0;

      if (job) {
        elements.thumbnailJobTitle.textContent = "正在优化缩略图";
        elements.thumbnailJobDetail.textContent = job.currentLabel || `每批 ${job.batchSize} 张，失败项自动重试`;
        elements.optimizeThumbnails.textContent = "停止优化";
      } else if (pending === 0 && total) {
        elements.thumbnailJobTitle.textContent = "缩略图优化完成";
        elements.thumbnailJobDetail.textContent = `${total} 张作品均已切换为轻量缩略图`;
        elements.optimizeThumbnails.textContent = "缩略图已完成";
      } else if (state.thumbnailProgress) {
        const failedState = progressState.status === "failed";
        elements.thumbnailJobTitle.textContent = failedIds.length || failedState ? "缩略图优化需要重试" : "缩略图优化已暂停";
        elements.thumbnailJobDetail.textContent = failedIds.length
          ? `${failedIds.length} 张处理失败，可继续重试`
          : failedState
            ? (progressState.lastError || "任务意外中断，可继续处理剩余作品")
          : `剩余 ${pending} 张，可从当前位置继续`;
        elements.optimizeThumbnails.textContent = "继续优化缩略图";
      } else {
        elements.optimizeThumbnails.textContent = completed ? "继续优化缩略图" : "优化缩略图";
      }
    };

    const updateStats = () => {
      const audits = state.photos.map(photoAudit);
      const empty = audits.filter((audit) => audit.status === "empty").length;
      const ready = audits.filter((audit) => audit.status === "ready").length;
      const noThumbnail = state.photos.filter((photo) => !hasOptimizedThumbnail(photo)).length;
      elements.photoCount.textContent = String(state.photos.length);
      elements.needsReviewCount.textContent = String(empty);
      elements.emptyAuditCount.textContent = String(empty);
      elements.readyAuditCount.textContent = String(ready);
      elements.thumbnailAuditCount.textContent = String(noThumbnail);
      elements.countText.textContent = `${state.photos.length} 张照片`;
      elements.completionStrip.querySelectorAll("[data-audit-shortcut]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.auditShortcut === elements.catalogFilter.value);
      });
      updateThumbnailJobUi();
    };

    const canonicalMediaSrc = (src = "") => {
      try {
        return new URL(src, location.href).pathname;
      } catch {
        return String(src).split("?")[0];
      }
    };

    const findPhotoBySrc = (src = "") => {
      if (!src) return null;
      const path = canonicalMediaSrc(src);
      return state.photos.find((photo) => photo.src === src)
        || state.photos.find((photo) => canonicalMediaSrc(photo.src) === path)
        || null;
    };

    const homeSlotFallbackPhoto = (index) => state.photos.length
      ? state.photos[(index + 1) % state.photos.length]
      : null;

    const staticPreviews = {};
    const previewFallbacks = new Map();
    const photoPreviewSource = (photo) => staticPreviews[photo?.thumbSrc] || photo?.thumbSrc || photo?.src || "";
    const loadStaticPreviews = async () => {
      const indexUrl = document.querySelector('meta[name="photo-preview-index"]')?.content;
      if (!indexUrl) return;
      try {
        const response = await fetch(indexUrl, { cache: "force-cache", priority: "low" });
        if (!response.ok) return;
        const mapping = await response.json();
        if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) return;
        for (const [original, preview] of Object.entries(mapping)) {
          if (!original.startsWith("/media/") || typeof preview !== "string" || !preview.startsWith("/assets/previews/")) continue;
          staticPreviews[original] = preview;
          previewFallbacks.set(preview, original);
        }
      } catch (error) {
        console.warn("Static previews unavailable; using original thumbnails", error);
      }
    };

    const homeSlotPreviewSrc = (index, src = "") => {
      if (src) return photoPreviewSource(findPhotoBySrc(src)) || src;
      if (homeImageDefs[index]?.fixed) return "";
      if (!state.photos.length) return "";
      const photo = homeSlotFallbackPhoto(index);
      return photoPreviewSource(photo);
    };

    const homePickerCardMeta = (photo) => [
      tagLabel(isNightPhoto(photo) ? "night" : "day"),
      photo.aircraft,
      photo.airline,
      photo.airport,
    ].filter(Boolean).join(" · ");

    const homeSlotDisplay = (index, src = "") => {
      if (!src && homeImageDefs[index]?.fixed) {
        return { name: "未指定图片", meta: "等待选择" };
      }
      const photo = src ? findPhotoBySrc(src) : homeSlotFallbackPhoto(index);
      if (src) {
        return {
          name: photo ? photoLabel(photo) : "已指定图片",
          meta: photo ? homePickerCardMeta(photo) : "作品库外图片",
        };
      }
      return {
        name: "自动选择",
        meta: photo ? `自动 · ${photoLabel(photo)}` : "暂无作品",
      };
    };

    const airportCoverFallbackPhoto = (code) => state.photos
      .find((photo) => normalizeAirportCode(photo.airport) === code) || null;

    const airportCoverEntries = () => {
      const groups = new Map();
      state.photos.forEach((photo) => {
        const code = normalizeAirportCode(photo.airport);
        if (!code) return;
        const group = groups.get(code) || [];
        group.push(photo);
        groups.set(code, group);
      });
      return [...groups.entries()]
        .map(([code, photos]) => ({
          code,
          photos,
          airport: state.airports.find((item) => item.iata === code) || null,
        }))
        .sort((left, right) => right.photos.length - left.photos.length || left.code.localeCompare(right.code));
    };

    const airportCoverName = (code) => {
      const airport = state.airports.find((item) => item.iata === code);
      return airport?.nameZh || airport?.nameEn || `${code} 机场`;
    };

    const airportCoverPreviewSrc = (code, src = "") => {
      if (src) return photoPreviewSource(findPhotoBySrc(src)) || src;
      const fallback = airportCoverFallbackPhoto(code);
      return photoPreviewSource(fallback);
    };

    const airportCoverDisplay = (code, src = "") => {
      const photo = src ? findPhotoBySrc(src) : airportCoverFallbackPhoto(code);
      return {
        name: photo ? photoLabel(photo) : "暂无对应作品",
        meta: src ? "固定代表图" : "自动使用该机场首张作品",
      };
    };

    const setHomePickerFilterOptions = (element, label, field) => {
      const values = [...new Set(state.photos
        .map((photo) => String(photo[field] || "").trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true, sensitivity: "base" }));
      element.innerHTML = [
        `<option value="">${escapeHtml(label)}：全部</option>`,
        ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
      ].join("");
    };

    const populateHomePickerFilters = () => {
      setHomePickerFilterOptions(elements.homePickerAirline, "航空公司", "airline");
      setHomePickerFilterOptions(elements.homePickerAircraft, "机型", "aircraft");
      setHomePickerFilterOptions(elements.homePickerAirport, "机场", "airport");
    };

    const filteredHomePickerPhotos = () => {
      const picker = state.homePicker;
      const query = picker.query.toLowerCase().trim();
      let list = state.photos.filter((photo) => {
        if (picker.time === "night" && !isNightPhoto(photo)) return false;
        if (picker.time === "day" && isNightPhoto(photo)) return false;
        if (picker.airline && photo.airline !== picker.airline) return false;
        if (picker.aircraft && photo.aircraft !== picker.aircraft) return false;
        if (picker.airport && photo.airport !== picker.airport) return false;
        if (!query) return true;
        const haystack = [
          photoLabel(photo),
          photo.alt,
          photo.airline,
          photo.aircraft,
          photo.registration,
          photo.airport,
          photo.capturedAt,
          tagLabel(photo.phase),
          photo.spot,
          photo.notes,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(query);
      });
      if (picker.sort === "newest") {
        list = [...list].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      } else if (picker.sort === "capture-newest") {
        list = [...list].sort((a, b) => String(b.capturedAt || b.createdAt || "")
          .localeCompare(String(a.capturedAt || a.createdAt || "")));
      } else if (picker.sort === "title") {
        list = [...list].sort((a, b) => photoLabel(a).localeCompare(photoLabel(b), "zh-CN", {
          numeric: true,
          sensitivity: "base",
        }));
      }
      const selectedIndex = list.findIndex((photo) => photo.id === picker.selectedId);
      if (selectedIndex > 0) {
        const ordered = [...list];
        const [selected] = ordered.splice(selectedIndex, 1);
        ordered.unshift(selected);
        return ordered;
      }
      return list;
    };

    const revealLoadedHomePickerImages = (root) => {
      requestAnimationFrame(() => {
        root.querySelectorAll("img").forEach((image) => {
          if (image.complete && image.naturalWidth) image.classList.add("is-loaded");
        });
      });
    };

    const renderHomePickerInspector = () => {
      const picker = state.homePicker;
      const photo = state.photos.find((item) => item.id === picker.selectedId);
      if (!photo) {
        elements.homePickerInspector.innerHTML = '<div class="home-picker-inspector-empty">选择一张照片</div>';
        return;
      }
      const details = [
        ["时间", tagLabel(isNightPhoto(photo) ? "night" : "day")],
        ["航空公司", photo.airline],
        ["机型", photo.aircraft],
        ["注册号", photo.registration],
        ["机场", photo.airport],
        ["飞行阶段", tagLabel(photo.phase || "")],
        ["拍摄日期", photo.capturedAt],
      ].filter(([, value]) => value);
      const slotLabel = picker.targetType === "airport"
        ? `${picker.airportCode} 代表图`
        : (homeImageDefs[picker.slotIndex]?.label || "首页图片");
      elements.homePickerInspector.innerHTML = `
        <div class="home-picker-inspector-preview">
          <img src="${escapeHtml(photo.thumbSrc || photo.src)}" alt="" decoding="async">
        </div>
        <div class="home-picker-selection-copy">
          <h3>${escapeHtml(photoLabel(photo))}</h3>
          <span>${escapeHtml(homePickerCardMeta(photo) || "航空摄影作品")}</span>
          ${details.length ? `<dl class="home-picker-details">${details.map(([label, value]) => `
            <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
          `).join("")}</dl>` : ""}
        </div>
        <button class="button primary home-picker-apply" type="button" data-home-picker-apply>应用到${escapeHtml(slotLabel)}</button>
      `;
      revealLoadedHomePickerImages(elements.homePickerInspector);
    };

    const renderHomePicker = ({ resetScroll = false } = {}) => {
      const picker = state.homePicker;
      const list = filteredHomePickerPhotos();
      const visible = list.slice(0, picker.visibleCount);
      elements.homePickerCount.textContent = list.length === state.photos.length
        ? `${state.photos.length} 张照片`
        : `${list.length} / ${state.photos.length} 张照片`;
      elements.homePickerGallery.innerHTML = visible.length ? visible.map((photo) => {
        const selected = photo.id === picker.selectedId;
        return `
          <button class="home-picker-photo ${selected ? "is-selected" : ""}" type="button" data-home-picker-photo="${escapeHtml(photo.id)}" aria-pressed="${selected}" aria-label="选择作品：${escapeHtml(photoLabel(photo))}">
            <span class="home-picker-thumb">
              <img src="${escapeHtml(photoPreviewSource(photo))}" alt="" loading="lazy" decoding="async" fetchpriority="low">
              <span class="home-picker-check" aria-hidden="true">✓</span>
            </span>
            <span class="home-picker-photo-copy">
              <strong>${escapeHtml(photoLabel(photo))}</strong>
              <span>${escapeHtml(homePickerCardMeta(photo) || "航空摄影作品")}</span>
            </span>
          </button>
        `;
      }).join("") : '<div class="home-picker-empty">没有匹配的照片</div>';
      revealLoadedHomePickerImages(elements.homePickerGallery);
      const remaining = Math.max(0, list.length - visible.length);
      elements.homePickerMore.hidden = remaining === 0;
      elements.homePickerMore.textContent = remaining ? `显示更多 · 剩余 ${remaining} 张` : "显示更多";
      renderHomePickerInspector();
      if (resetScroll) elements.homePickerScroll.scrollTop = 0;
    };

    const scheduleHomePickerRender = () => {
      cancelAnimationFrame(state.homePicker.renderFrame);
      state.homePicker.renderFrame = requestAnimationFrame(() => {
        state.homePicker.renderFrame = 0;
        state.homePicker.visibleCount = HOME_PICKER_PAGE_SIZE;
        renderHomePicker({ resetScroll: true });
      });
    };

    const resetHomePickerFilters = () => {
      cancelAnimationFrame(state.homePicker.renderFrame);
      state.homePicker.renderFrame = 0;
      const lockedAirport = state.homePicker.targetType === "airport"
        ? state.homePicker.airportCode
        : "";
      Object.assign(state.homePicker, {
        query: "",
        time: "",
        airline: "",
        aircraft: "",
        airport: lockedAirport,
        sort: "newest",
        visibleCount: HOME_PICKER_PAGE_SIZE,
      });
      elements.homePickerSearch.value = "";
      elements.homePickerTime.value = "";
      elements.homePickerAirline.value = "";
      elements.homePickerAircraft.value = "";
      elements.homePickerAirport.value = lockedAirport;
      elements.homePickerAirport.disabled = Boolean(lockedAirport);
      elements.homePickerSort.value = "newest";
      renderHomePicker({ resetScroll: true });
    };

    const openHomePicker = (index, trigger) => {
      const card = elements.homeImageList.querySelector(`[data-slot-index="${index}"]`);
      if (!card) return;
      const src = card.querySelector('[data-slot-field="src"]')?.value.trim() || "";
      const selected = findPhotoBySrc(src);
      const picker = state.homePicker;
      picker.targetType = "home";
      picker.slotIndex = index;
      picker.airportCode = "";
      picker.selectedId = selected?.id || "";
      picker.returnFocus = trigger || document.activeElement;
      elements.homePickerSlotLabel.textContent = homeImageDefs[index]?.label || "首页图片";
      populateHomePickerFilters();
      resetHomePickerFilters();
      elements.homePhotoPicker.inert = false;
      elements.homePhotoPicker.setAttribute("aria-hidden", "false");
      elements.homePhotoPicker.classList.add("is-open");
      document.querySelector(".topbar").inert = true;
      document.querySelector("main").inert = true;
      document.body.classList.add("is-picker-open");
      requestAnimationFrame(() => elements.homePickerSearch.focus({ preventScroll: true }));
    };

    const openAirportCoverPicker = (code, trigger) => {
      const card = elements.airportCoverList.querySelector(`[data-airport-cover="${code}"]`);
      if (!card) return;
      const src = card.querySelector('[data-airport-cover-field="src"]')?.value.trim() || "";
      const selected = findPhotoBySrc(src);
      const picker = state.homePicker;
      picker.targetType = "airport";
      picker.slotIndex = -1;
      picker.airportCode = code;
      picker.selectedId = selected?.id || "";
      picker.returnFocus = trigger || document.activeElement;
      elements.homePickerSlotLabel.textContent = `${code} · ${airportCoverName(code)}`;
      populateHomePickerFilters();
      resetHomePickerFilters();
      elements.homePhotoPicker.inert = false;
      elements.homePhotoPicker.setAttribute("aria-hidden", "false");
      elements.homePhotoPicker.classList.add("is-open");
      document.querySelector(".topbar").inert = true;
      document.querySelector("main").inert = true;
      document.body.classList.add("is-picker-open");
      requestAnimationFrame(() => elements.homePickerSearch.focus({ preventScroll: true }));
    };

    const closeHomePicker = (focusTarget = state.homePicker.returnFocus) => {
      cancelAnimationFrame(state.homePicker.renderFrame);
      state.homePicker.renderFrame = 0;
      elements.homePhotoPicker.classList.remove("is-open");
      elements.homePhotoPicker.setAttribute("aria-hidden", "true");
      elements.homePhotoPicker.inert = true;
      document.querySelector(".topbar").inert = false;
      document.querySelector("main").inert = false;
      document.body.classList.remove("is-picker-open");
      state.homePicker.targetType = "home";
      state.homePicker.slotIndex = -1;
      state.homePicker.airportCode = "";
      state.homePicker.returnFocus = null;
      requestAnimationFrame(() => {
        if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) {
          focusTarget.focus({ preventScroll: true });
        }
      });
    };

    const updateHomeSlotPhoto = (index, photo) => {
      const card = elements.homeImageList.querySelector(`[data-slot-index="${index}"]`);
      if (!card) return;
      const srcInput = card.querySelector('[data-slot-field="src"]');
      const altInput = card.querySelector('[data-slot-field="alt"]');
      const titleInput = card.querySelector('[data-slot-field="title"]');
      const preview = card.querySelector("[data-slot-preview]");
      const src = photo?.src || "";
      srcInput.value = src;
      altInput.value = photo?.alt || (photo ? photoLabel(photo) : "航空摄影作品");
      if (photo && titleInput && !titleInput.value.trim()) titleInput.value = photo.title || photoLabel(photo);
      const previewSrc = homeSlotPreviewSrc(index, src);
      preview.classList.toggle("is-empty", !previewSrc);
      preview.innerHTML = previewSrc
        ? `<img src="${escapeHtml(previewSrc)}" alt="" loading="lazy" decoding="async">`
        : "未指定图片";
      const display = homeSlotDisplay(index, src);
      card.querySelector("[data-slot-photo-name]").textContent = display.name;
      card.querySelector("[data-slot-photo-meta]").textContent = display.meta;
      card.querySelector("[data-open-home-picker]").textContent = src ? "更换图片" : "选择图片";
      card.querySelector("[data-slot-auto]").hidden = homeImageDefs[index]?.fixed || !src;
    };

    const updateAirportCoverPhoto = (code, photo) => {
      const card = elements.airportCoverList.querySelector(`[data-airport-cover="${code}"]`);
      if (!card) return;
      const src = photo?.src || "";
      const alt = photo?.alt || (photo ? `${photoLabel(photo)} 航空摄影作品` : `${code} 机场代表作品`);
      card.querySelector('[data-airport-cover-field="src"]').value = src;
      card.querySelector('[data-airport-cover-field="alt"]').value = alt;
      const previewSrc = airportCoverPreviewSrc(code, src);
      const preview = card.querySelector("[data-airport-cover-preview]");
      preview.classList.toggle("is-empty", !previewSrc);
      preview.innerHTML = previewSrc
        ? `<img src="${escapeHtml(previewSrc)}" alt="" loading="lazy" decoding="async">`
        : "暂无对应作品";
      const display = airportCoverDisplay(code, src);
      card.querySelector("[data-airport-cover-name]").textContent = display.name;
      card.querySelector("[data-airport-cover-meta]").textContent = display.meta;
      card.querySelector("[data-airport-cover-mode]").textContent = src ? "Fixed" : "Auto";
      card.querySelector("[data-open-airport-cover-picker]").textContent = src ? "更换图片" : "选择图片";
      card.querySelector("[data-airport-cover-auto]").hidden = !src;
    };

    const applyHomePickerSelection = () => {
      const picker = state.homePicker;
      const photo = state.photos.find((item) => item.id === picker.selectedId);
      if (!photo) return;
      if (picker.targetType === "airport" && picker.airportCode) {
        const code = picker.airportCode;
        updateAirportCoverPhoto(code, photo);
        const focusTarget = elements.airportCoverList
          .querySelector(`[data-airport-cover="${code}"] [data-open-airport-cover-picker]`);
        closeHomePicker(focusTarget);
        return;
      }
      if (picker.slotIndex < 0) return;
      const index = picker.slotIndex;
      updateHomeSlotPhoto(index, photo);
      const focusTarget = elements.homeImageList.querySelector(`[data-slot-index="${index}"] [data-open-home-picker]`);
      closeHomePicker(focusTarget);
    };

    const renderMetrics = () => {
      const metrics = state.site.home.metrics || [];
      elements.metricList.innerHTML = metricLabels.map((label, index) => `
        <div class="metric-row">
          <span class="locked">${escapeHtml(label)}</span>
          <input type="text" data-metric-index="${index}" value="${escapeHtml(metrics[index]?.value || "")}" aria-label="${escapeHtml(label)} value">
        </div>
      `).join("");
    };

    const renderHomeImages = () => {
      const images = state.site.home.images || [];
      elements.homeImageList.innerHTML = homeImageDefs.map((def, index) => {
        const image = images[index] || {};
        const src = image.src || "";
        const previewSrc = homeSlotPreviewSrc(index, src);
        const display = homeSlotDisplay(index, src);
        return `
          <article class="slot-card" data-slot-index="${index}">
            <div class="slot-head">
              <div>
                <h3>${escapeHtml(def.label)}</h3>
              </div>
              <div class="slot-tools">
                <div class="locked-tags">${def.tags.map((tag) => `<span class="locked-tag">${escapeHtml(tag)}</span>`).join("")}</div>
              </div>
            </div>
            <div class="slot-preview ${previewSrc ? "" : "is-empty"}" data-slot-preview>
              ${previewSrc ? `<img src="${escapeHtml(previewSrc)}" alt="" loading="lazy" decoding="async">` : "未指定图片"}
            </div>
            <div class="slot-body">
              <div class="slot-photo-control">
                <div class="slot-photo-copy">
                  <span class="locked-label">当前图片</span>
                  <strong data-slot-photo-name>${escapeHtml(display.name)}</strong>
                  <span data-slot-photo-meta>${escapeHtml(display.meta)}</span>
                </div>
                <div class="slot-photo-actions">
                  <button class="button slim" type="button" data-open-home-picker>${src ? "更换图片" : "选择图片"}</button>
                  <button class="button slim" type="button" data-slot-auto ${def.fixed || !src ? "hidden" : ""}>恢复自动</button>
                </div>
              </div>
              <input type="hidden" data-slot-field="src" value="${escapeHtml(src)}">
              <input type="hidden" data-slot-field="alt" value="${escapeHtml(image.alt || "航空摄影作品")}">
              ${def.title ? `
                <div class="field">
                  <label for="home-image-${index}-title">标题</label>
                  <input id="home-image-${index}-title" type="text" data-slot-field="title" value="${escapeHtml(image.title || "")}" aria-label="${escapeHtml(def.label)}标题">
                </div>
              ` : ""}
              ${def.description ? `
                <div class="field">
                  <label for="home-image-${index}-description">正文</label>
                  <textarea id="home-image-${index}-description" data-slot-field="description" aria-label="${escapeHtml(def.label)}正文">${escapeHtml(image.description || "")}</textarea>
                </div>
              ` : ""}
            </div>
          </article>
        `;
      }).join("");
    };

    const renderAirportCovers = () => {
      const covers = state.site.home.airportCovers || {};
      const entries = airportCoverEntries();
      elements.airportCoverList.innerHTML = entries.length ? entries.map(({ code, photos }) => {
        const cover = covers[code] || {};
        const src = cover.src || "";
        const previewSrc = airportCoverPreviewSrc(code, src);
        const display = airportCoverDisplay(code, src);
        return `
          <article class="slot-card" data-airport-cover="${escapeHtml(code)}">
            <div class="slot-head">
              <div>
                <h3>${escapeHtml(code)} · ${escapeHtml(airportCoverName(code))}</h3>
              </div>
              <div class="slot-tools">
                <div class="locked-tags">
                  <span class="locked-tag">${photos.length} 张</span>
                  <span class="locked-tag">3:2</span>
                  <span class="locked-tag" data-airport-cover-mode>${src ? "Fixed" : "Auto"}</span>
                </div>
              </div>
            </div>
            <div class="slot-preview ${previewSrc ? "" : "is-empty"}" data-airport-cover-preview>
              ${previewSrc ? `<img src="${escapeHtml(previewSrc)}" alt="" loading="lazy" decoding="async">` : "暂无对应作品"}
            </div>
            <div class="slot-body">
              <div class="slot-photo-control">
                <div class="slot-photo-copy">
                  <span class="locked-label">当前图片</span>
                  <strong data-airport-cover-name>${escapeHtml(display.name)}</strong>
                  <span data-airport-cover-meta>${escapeHtml(display.meta)}</span>
                </div>
                <div class="slot-photo-actions">
                  <button class="button slim" type="button" data-open-airport-cover-picker>${src ? "更换图片" : "选择图片"}</button>
                  <button class="button slim" type="button" data-airport-cover-auto ${src ? "" : "hidden"}>恢复自动</button>
                </div>
              </div>
              <input type="hidden" data-airport-cover-field="src" value="${escapeHtml(src)}">
              <input type="hidden" data-airport-cover-field="alt" value="${escapeHtml(cover.alt || `${code} 机场代表作品`)}">
            </div>
          </article>
        `;
      }).join("") : '<div class="home-picker-empty">作品加入机场三字码后将在这里显示</div>';
    };

    const renderHomeMedia = () => {
      renderHomeImages();
      renderAirportCovers();
    };

    const renderHomeTextSections = () => {
      const home = state.site.home;
      elements.homeTextSections.innerHTML = `
        <div class="section-title">
          <h2>航迹故事</h2>
        </div>
        <div class="grid-3">
          ${(home.story?.blocks || []).map((block, index) => `
            <article class="editor-card">
              <div class="editor-card-head">
                <h3>故事 ${index + 1}</h3>
              </div>
              <div class="field">
                <label for="story-${index}-title">标题</label>
                <input id="story-${index}-title" type="text" data-story-field="${index}.title" value="${escapeHtml(block.title || "")}" aria-label="故事 ${index + 1} 标题">
              </div>
              <div class="field">
                <label for="story-${index}-body">正文</label>
                <textarea id="story-${index}-body" data-story-field="${index}.body" aria-label="故事 ${index + 1} 正文">${escapeHtml(block.body || "")}</textarea>
              </div>
            </article>
          `).join("")}
        </div>

        <div class="section-title">
          <h2>航空拍摄手记</h2>
        </div>
        <div class="editor-card">
          <div class="editor-card-head">
            <h3>手记总览</h3>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="journal-title">区块标题</label>
              <input id="journal-title" type="text" data-journal-field="title" value="${escapeHtml(home.journal?.title || "")}" aria-label="手记区块标题">
            </div>
            <div class="field">
              <label for="journal-intro">区块简介</label>
              <textarea id="journal-intro" data-journal-field="intro" aria-label="手记区块简介">${escapeHtml(home.journal?.intro || "")}</textarea>
            </div>
          </div>
        </div>
        <div class="grid-3">
          ${(home.journal?.posts || []).map((post, index) => `
            <article class="editor-card">
              <div class="editor-card-head">
                <h3>手记 ${index + 1}</h3>
              </div>
              <div class="field">
                <label for="journal-${index}-date">日期</label>
                <input id="journal-${index}-date" type="text" data-journal-post="${index}.date" value="${escapeHtml(post.date || "")}" aria-label="手记 ${index + 1} 日期">
              </div>
              <div class="field">
                <label for="journal-${index}-title">标题</label>
                <input id="journal-${index}-title" type="text" data-journal-post="${index}.title" value="${escapeHtml(post.title || "")}" aria-label="手记 ${index + 1} 标题">
              </div>
              <div class="field">
                <label for="journal-${index}-body">正文</label>
                <textarea id="journal-${index}-body" data-journal-post="${index}.body" aria-label="手记 ${index + 1} 正文">${escapeHtml(post.body || "")}</textarea>
              </div>
            </article>
          `).join("")}
        </div>

        <div class="section-title">
          <h2>关于数据</h2>
        </div>
        <div class="grid-3">
          ${(home.about?.stats || []).map((stat, index) => `
            <article class="editor-card">
              <div class="editor-card-head">
                <h3>${escapeHtml(defaultSite.home.about.stats[index]?.label || `统计 ${index + 1}`)}</h3>
              </div>
              <div class="field">
                <label>数字</label>
                <input type="text" data-about-stat-value="${index}" value="${escapeHtml(stat.value || "")}" aria-label="${escapeHtml(defaultSite.home.about.stats[index]?.label || "统计数值")}">
              </div>
            </article>
          `).join("")}
        </div>
      `;
    };

    const renderHome = () => {
      renderMetrics();
      renderHomeMedia();
      renderHomeTextSections();
    };

    const collectHome = () => {
      const next = cloneSiteForEdit(state.site);
      next.home.metrics = metricLabels.map((label, index) => ({
        ...next.home.metrics[index],
        label,
        value: document.querySelector(`[data-metric-index="${index}"]`)?.value.trim() || "",
      }));
      next.home.images = homeImageDefs.map((def, index) => {
        const card = elements.homeImageList.querySelector(`[data-slot-index="${index}"]`);
        const field = (name) => card?.querySelector(`[data-slot-field="${name}"]`)?.value.trim() || "";
        return {
          ...next.home.images[index],
          src: field("src"),
          alt: field("alt") || "航空摄影作品",
          title: def.title ? field("title") : (next.home.images[index]?.title || ""),
          description: def.description ? field("description") : (next.home.images[index]?.description || ""),
        };
      });
      elements.airportCoverList.querySelectorAll("[data-airport-cover]").forEach((card) => {
        const code = normalizeAirportCode(card.dataset.airportCover);
        const src = card.querySelector('[data-airport-cover-field="src"]')?.value.trim() || "";
        if (!code) return;
        if (!src) {
          delete next.home.airportCovers[code];
          return;
        }
        next.home.airportCovers[code] = {
          ...next.home.airportCovers[code],
          src,
          alt: card.querySelector('[data-airport-cover-field="alt"]')?.value.trim()
            || `${code} 机场代表作品`,
        };
      });
      document.querySelectorAll("[data-story-field]").forEach((field) => {
        const [index, key] = field.dataset.storyField.split(".");
        next.home.story.blocks[Number(index)][key] = field.value.trim();
      });
      document.querySelectorAll("[data-journal-field]").forEach((field) => {
        next.home.journal[field.dataset.journalField] = field.value.trim();
      });
      document.querySelectorAll("[data-journal-post]").forEach((field) => {
        const [index, key] = field.dataset.journalPost.split(".");
        next.home.journal.posts[Number(index)][key] = field.value.trim();
      });
      document.querySelectorAll("[data-about-stat-value]").forEach((field) => {
        const index = Number(field.dataset.aboutStatValue);
        next.home.about.stats[index].value = field.value.trim();
        next.home.about.stats[index].label ||= defaultSite.home.about.stats[index]?.label || "统计";
      });
      return next;
    };

    const saveHome = async () => {
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      try {
        await loadAdminData();
        const payload = collectHome();
        setStatus("正在保存", "", "warn");
        state.site = await api("/api/site", { method: "PUT", body: JSON.stringify(payload) }, true);
        renderHome();
        await loadBackups({ quiet: true });
        setStatus("已保存", "", "good");
      } catch (error) {
        setStatus("首页保存失败", error.message, "bad");
      }
    };

    const confirmToken = async () => {
      const token = elements.token.value.trim();
      state.token = token;
      if (!token) {
        sessionStorage.removeItem("hugo-admin-token");
        setStatus("密钥错误", "", "bad");
        return;
      }
      elements.saveToken.disabled = true;
      try {
        await api("/api/auth/check", { method: "POST" }, true);
        sessionStorage.setItem("hugo-admin-token", token);
        await loadAdminData();
        await loadBackups({ quiet: true });
        setStatus("密钥正确", "", "good");
      } catch (error) {
        if (error.status === 401) {
          state.token = "";
          sessionStorage.removeItem("hugo-admin-token");
        }
        setStatus(error.status === 401 ? "密钥错误" : "管理数据加载失败", error.message, "bad");
      } finally {
        elements.saveToken.disabled = false;
      }
    };

    const backupDateFormatter = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const formatBackupDate = (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "未知时间" : backupDateFormatter.format(date);
    };

    const renderBackups = () => {
      if (!state.backups.length) {
        elements.backupList.innerHTML = '<div class="empty">暂无备份</div>';
        return;
      }

      elements.backupList.innerHTML = state.backups.map((backup) => `
        <article class="backup-card">
          <div>
            <h3>${escapeHtml(backup.reason || "手动备份")}</h3>
            <div class="backup-meta">
              <span>${escapeHtml(formatBackupDate(backup.createdAt))}</span>
              <span>${Number(backup.photoCount) || 0} 张作品</span>
              <span>${Number(backup.mediaCount) || 0} 个文件</span>
            </div>
          </div>
          <div class="backup-actions">
            <button class="button slim" type="button" data-backup-action="download" data-backup-id="${escapeHtml(backup.id)}">下载</button>
            <button class="button slim" type="button" data-backup-action="restore" data-backup-id="${escapeHtml(backup.id)}">恢复</button>
            <button class="button danger slim" type="button" data-backup-action="delete" data-backup-id="${escapeHtml(backup.id)}">删除</button>
          </div>
        </article>
      `).join("");
    };

    const loadBackups = async ({ quiet = false } = {}) => {
      if (!state.token) {
        state.backups = [];
        renderBackups();
        return;
      }

      try {
        const data = await api("/api/backups", {}, true);
        state.backups = Array.isArray(data.backups) ? data.backups : [];
        renderBackups();
      } catch (error) {
        state.backups = [];
        renderBackups();
        if (!quiet) setStatus("备份读取失败", error.message, "bad");
      }
    };

    const createManualBackup = async () => {
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }

      elements.createBackup.disabled = true;
      setStatus("正在创建备份", "", "warn");
      try {
        const data = await api("/api/backups", {
          method: "POST",
          body: JSON.stringify({ reason: "手动备份" }),
        }, true);
        await loadBackups({ quiet: true });
        setStatus("备份已创建", formatBackupDate(data.backup?.createdAt), "good");
      } catch (error) {
        setStatus("备份创建失败", error.message, "bad");
      } finally {
        elements.createBackup.disabled = false;
      }
    };

    const downloadBackup = async (id) => {
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }

      try {
        const backup = await api(`/api/backups/${encodeURIComponent(id)}`, {}, true);
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = String(backup.createdAt || new Date().toISOString()).replace(/[^0-9T-]/g, "-");
        link.href = url;
        link.download = `hugo-aviation-backup-${stamp}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus("备份已下载", formatBackupDate(backup.createdAt), "good");
      } catch (error) {
        setStatus("备份下载失败", error.message, "bad");
      }
    };

    const applyRestoredState = async (data) => {
      state.site = data.site || cloneDefaultSite();
      state.photos = normalizePhotos(data.manifest);
      state.selectedId = "";
      state.selectedIds.clear();
      state.batchMode = false;
      elements.editPanel.hidden = true;
      renderHome();
      renderWorks();
      updateStats();
      await loadBackups({ quiet: true });
    };

    const restoreBackupEntry = async (id) => {
      if (!state.token || !confirm("确定恢复这个备份吗？当前状态会先自动备份。")) return;

      setStatus("正在恢复备份", "", "warn");
      try {
        const data = await api(`/api/backups/${encodeURIComponent(id)}/restore`, { method: "POST" }, true);
        await applyRestoredState(data);
        setStatus("备份已恢复", `${state.photos.length} 张作品`, "good");
      } catch (error) {
        setStatus("备份恢复失败", error.message, "bad");
      }
    };

    const deleteBackupEntry = async (id) => {
      if (!state.token || !confirm("确定删除这个备份吗？")) return;

      try {
        const data = await api(`/api/backups/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
        state.backups = Array.isArray(data.backups) ? data.backups : [];
        renderBackups();
        setStatus("备份已删除", "", "good");
      } catch (error) {
        setStatus("备份删除失败", error.message, "bad");
      }
    };

    const importBackupFile = async () => {
      const file = elements.backupFile.files?.[0];
      if (!file) return;

      try {
        if (!state.token) throw new Error("请先确认 Admin Token。");
        if (file.size > 5 * 1024 * 1024) throw new Error("备份文件超过 5 MB。");
        const payload = JSON.parse(await file.text());
        if (!confirm("确定导入并恢复这个备份吗？当前状态会先自动备份。")) return;
        setStatus("正在导入备份", "", "warn");
        const data = await api("/api/backups/import", {
          method: "POST",
          body: JSON.stringify(payload),
        }, true);
        await applyRestoredState(data);
        setStatus("备份已导入", `${state.photos.length} 张作品`, "good");
      } catch (error) {
        setStatus("备份导入失败", error.message, "bad");
      } finally {
        elements.backupFile.value = "";
      }
    };

    const selectedCategories = () => [elements.categoryGrid.querySelector('input[name="photoCategory"]:checked')?.value || "day"];
    const photoAltFromTitle = (title) => title ? `${title} 航空摄影作品` : "航空摄影作品";
    const PHOTO_MAX_UPLOAD_BYTES = 32 * 1024 * 1024;
    const PHOTO_MASTER_MAX_SIDE = 5120;
    const PHOTO_MASTER_SOFT_LIMIT = 14 * 1024 * 1024;
    const PHOTO_THUMBNAIL_MAX_SIDE = 960;
    const MODERN_IMAGE_TYPES = new Set(["image/avif", "image/webp"]);
    const PASSTHROUGH_IMAGE_TYPES = new Set(["image/gif"]);
    const SAFE_IMAGE_TYPES = new Set([
      "image/avif",
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    const UNSUPPORTED_IMAGE_TYPES = new Set([
      "image/heic",
      "image/heif",
      "image/hif",
      "image/tiff",
    ]);
    const UNSUPPORTED_IMAGE_EXTENSIONS = /\.(?:heic|heif|hif|tiff?)$/i;
    const SUPPORTED_IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|webp)$/i;
    const formatBytes = (bytes) => {
      const value = Number(bytes) || 0;
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
      return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
    };
    const formatStorageBytes = (bytes) => {
      const value = Math.max(0, Number(bytes) || 0);
      if (value < 1024 * 1024) return formatBytes(value);
      if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(value >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
      return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
    };

    const renderStorage = () => {
      const audit = state.storageAudit;
      if (!audit) {
        elements.storageTotal.textContent = "--";
        elements.storageObjects.textContent = "--";
        elements.storageReferenced.textContent = "--";
        elements.storageEligible.textContent = "--";
        elements.storageMeterLabel.textContent = "Free 存储参考";
        elements.storageCheckedAt.textContent = "尚未扫描";
        elements.storageMeterBar.style.transform = "scaleX(0)";
        elements.storageSummary.textContent = "";
        elements.storageList.innerHTML = '<div class="empty">等待扫描</div>';
        elements.cleanupStorage.disabled = true;
        return;
      }

      const samples = Array.isArray(audit.orphanSamples) ? audit.orphanSamples : [];
      const ratio = Math.max(0, Math.min(1, Number(audit.freeTierUsageRatio) || 0));
      elements.storageTotal.textContent = formatStorageBytes(audit.totalBytes);
      elements.storageObjects.textContent = String(Number(audit.totalObjectCount) || 0);
      elements.storageReferenced.textContent = formatStorageBytes(audit.referencedBytes);
      elements.storageEligible.textContent = formatStorageBytes(audit.eligibleBytes);
      elements.storageMeterLabel.textContent = `${formatStorageBytes(audit.totalBytes)} / ${formatStorageBytes(audit.freeTierBytes)}`;
      elements.storageCheckedAt.textContent = formatBackupDate(audit.checkedAt);
      elements.storageMeterBar.style.transform = `scaleX(${ratio})`;
      const remaining = Number(audit.remainingEligibleCount) || 0;
      elements.storageSummary.textContent = `${Number(audit.orphanCount) || 0} 个未引用 · ${Number(audit.protectedOrphanCount) || 0} 个上传未满 ${Number(audit.graceDays) || 7} 天${remaining ? ` · ${remaining} 个留待下一批` : ""}`;
      elements.cleanupStorage.disabled = !(Number(audit.eligibleCount) > 0 && audit.auditToken);
      elements.storageList.innerHTML = samples.length ? samples.map((item) => `
        <div class="storage-row">
          <code title="${escapeHtml(item.key)}">${escapeHtml(item.key)}</code>
          <span>${escapeHtml(formatStorageBytes(item.size))}</span>
          <span class="storage-state">${item.eligible ? "可清理" : `上传未满 ${Number(audit.graceDays) || 7} 天`}</span>
        </div>
      `).join("") : '<div class="empty">没有未引用文件</div>';
    };

    const loadStorage = async ({ quiet = false } = {}) => {
      if (!state.token) {
        state.storageAudit = null;
        renderStorage();
        if (!quiet) setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      elements.scanStorage.disabled = true;
      try {
        state.storageAudit = await api("/api/storage", {}, true);
        renderStorage();
        if (!quiet) setStatus("存储扫描完成", `${state.storageAudit.totalObjectCount || 0} 个对象`, "good");
      } catch (error) {
        state.storageAudit = null;
        renderStorage();
        if (!quiet) setStatus("存储扫描失败", error.message, "bad");
      } finally {
        elements.scanStorage.disabled = false;
      }
    };

    const cleanupStorage = async () => {
      const audit = state.storageAudit;
      if (!state.token || !audit?.eligibleCount || !audit.auditToken) return;
      if (!confirm(`确定清理 ${audit.eligibleCount} 个未引用文件吗？`)) return;
      elements.cleanupStorage.disabled = true;
      setStatus("正在清理存储", "", "warn");
      try {
        const result = await api("/api/storage/orphans", {
          method: "DELETE",
          body: JSON.stringify({ auditToken: audit.auditToken }),
        }, true);
        state.storageAudit = null;
        await loadStorage({ quiet: true });
        setStatus("存储清理完成", `${result.deletedCount || 0} 个文件 · ${formatStorageBytes(result.deletedBytes)}`, "good");
      } catch (error) {
        setStatus("存储清理失败", error.message, "bad");
        await loadStorage({ quiet: true });
      }
    };

    const isUnsupportedImageFile = (file) => {
      if (!file) return false;
      const type = String(file.type || "").toLowerCase();
      return UNSUPPORTED_IMAGE_TYPES.has(type) || UNSUPPORTED_IMAGE_EXTENSIONS.test(file.name || "");
    };

    const isImageFile = (file) => {
      if (!file || isUnsupportedImageFile(file)) return false;
      const type = String(file.type || "").toLowerCase();
      if (type) return SAFE_IMAGE_TYPES.has(type);
      return SUPPORTED_IMAGE_EXTENSIONS.test(file.name || "");
    };

    const cleanFileTitle = (file, index) => {
      const fallback = `航空作品 ${String(index + 1).padStart(3, "0")}`;
      let title = String(file?.name || fallback).replace(/\.[a-z0-9]+$/i, "");
      title = title
        .replace(/[-_\s]*(已增强|降噪|nr|dxo|deepprime|xd\d*s?|拷贝|copy).*$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (/^img\s*(\d+)$/i.test(title)) title = title.replace(/^img\s*(\d+)$/i, "IMG $1");
      if (/^dsc\s*(\d+)$/i.test(title)) title = title.replace(/^dsc\s*(\d+)$/i, "DSC$1");
      return title || fallback;
    };

    const setFiles = (fileList) => {
      const selectedFiles = [...(fileList || [])];
      const unsupportedFiles = selectedFiles.filter(isUnsupportedImageFile);
      const files = selectedFiles.filter(isImageFile);
      if (!files.length) {
        clearUploadForm();
        setStatus(
          unsupportedFiles.length ? "图片格式不兼容" : "没有可上传的图片",
          unsupportedFiles.length
            ? `${unsupportedFiles.map((file) => file.name).join("、")} 无法由浏览器读取，请先转换为 JPEG 或 WebP。`
            : "请选择 JPEG、PNG、WebP、AVIF 或 GIF 图片。",
          "bad",
        );
        return;
      }
      state.files = files;
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = URL.createObjectURL(files[0]);
      elements.preview.innerHTML = `<img src="${state.previewUrl}" alt="">`;
      elements.preview.hidden = false;
      elements.dropCopy.hidden = true;
      elements.queueSummary.hidden = false;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      elements.queueSummary.innerHTML = files.length > 1
        ? `<strong>${files.length} 张照片 · ${formatBytes(totalSize)}</strong>，将生成高质量主图与轻量缩略图。`
        : `<strong>1 张照片 · ${formatBytes(totalSize)}</strong>，将进行质量优先压缩。`;
      if (files.length === 1) {
        const title = cleanFileTitle(files[0], 0);
        if (!elements.title.value) elements.title.value = title;
      } else {
        elements.title.value = "";
      }
      setStatus(
        unsupportedFiles.length ? "部分图片未加入" : "照片已准备",
        unsupportedFiles.length
          ? `${files.length} 张照片等待上传；已跳过 ${unsupportedFiles.map((file) => file.name).join("、")}。HEIC、HEIF、TIFF、HIF 请先转换为 JPEG 或 WebP。`
          : `${files.length} 张照片等待上传。`,
        unsupportedFiles.length ? "warn" : "good",
      );
    };

    const loadImage = (file) => new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片无法读取"));
      };
      image.src = url;
    });

    const inferLayout = (image, index = 0) => {
      const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
      if (ratio < 0.82) return "vertical";
      if (ratio > 1.55 && index % 6 === 0) return "featured";
      return "standard";
    };

    const renderImageBlob = async (image, maxSide, type, quality) => {
      const largest = Math.max(image.naturalWidth, image.naturalHeight);
      const scale = Math.min(1, maxSide / Math.max(1, largest));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      try {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("无法创建图片画布");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
      } finally {
        canvas.width = 1;
        canvas.height = 1;
      }
    };

    const renderPreferredBlob = async (image, maxSide, quality) => {
      const webp = await renderImageBlob(image, maxSide, "image/webp", quality);
      if (webp?.type === "image/webp") return webp;
      const jpeg = await renderImageBlob(image, maxSide, "image/jpeg", Math.min(0.98, quality + 0.01));
      return jpeg?.type === "image/jpeg" ? jpeg : null;
    };

    const fileFromImageBlob = (blob, fileName, suffix = "") => {
      const extension = blob.type === "image/webp" ? ".webp" : ".jpg";
      const baseName = String(fileName || "photo").replace(/\.[a-z0-9]+$/i, "");
      return new File([blob], `${baseName}${suffix}${extension}`, { type: blob.type });
    };

    const createThumbnailFromImage = async (image, fileName = "photo") => {
      const blob = await renderPreferredBlob(image, PHOTO_THUMBNAIL_MAX_SIDE, 0.8);
      if (!blob) return null;
      return fileFromImageBlob(blob, fileName, "-thumb");
    };

    const createPhotoMaster = async (image, file) => {
      const type = String(file.type || "").toLowerCase();
      const largest = Math.max(image.naturalWidth, image.naturalHeight);

      if (PASSTHROUGH_IMAGE_TYPES.has(type)) return file;
      if (MODERN_IMAGE_TYPES.has(type) && largest <= PHOTO_MASTER_MAX_SIDE && file.size <= PHOTO_MASTER_SOFT_LIMIT) {
        return file;
      }

      let blob = await renderPreferredBlob(image, PHOTO_MASTER_MAX_SIDE, 0.96);
      if (!blob) return file;

      if (blob.size > PHOTO_MASTER_SOFT_LIMIT) {
        const balanced = await renderPreferredBlob(image, PHOTO_MASTER_MAX_SIDE, 0.93);
        if (balanced && balanced.size < blob.size) blob = balanced;
      }

      if (blob.size > PHOTO_MAX_UPLOAD_BYTES) {
        const bounded = await renderPreferredBlob(image, 4608, 0.92);
        if (bounded && bounded.size < blob.size) blob = bounded;
      }

      const sourceCanBeUsedDirectly = /image\/(?:avif|gif|jpeg|png|svg\+xml|webp)/.test(type);
      if (sourceCanBeUsedDirectly && file.size <= PHOTO_MAX_UPLOAD_BYTES && blob.size >= file.size * 0.94) {
        return file;
      }
      return fileFromImageBlob(blob, file.name);
    };

    const preparePhotoAssets = async (file, index = 0) => {
      let image;
      try {
        image = await loadImage(file);
      } catch (error) {
        const fileName = String(file?.name || "该文件");
        throw new Error(`${fileName} 无法由浏览器读取，请转换为 JPEG 或 WebP 后重试。`);
      }

      try {
        const layout = inferLayout(image, index);
        const preparedFile = await createPhotoMaster(image, file);
        if (preparedFile.size > PHOTO_MAX_UPLOAD_BYTES) {
          throw new Error(`优化后的主图仍超过 ${formatBytes(PHOTO_MAX_UPLOAD_BYTES)}`);
        }
        const thumbnail = await createThumbnailFromImage(image, file.name);
        return {
          file: preparedFile,
          thumbnail,
          layout,
          originalSize: file.size,
          outputSize: preparedFile.size,
        };
      } finally {
        image.onload = null;
        image.onerror = null;
        image.src = "data:,";
      }
    };

    const createThumbnailFromFile = async (file) => {
      const image = await loadImage(file);
      try {
        return await createThumbnailFromImage(image, file.name);
      } finally {
        image.onload = null;
        image.onerror = null;
        image.src = "data:,";
      }
    };

    const clearUploadForm = () => {
      elements.uploadForm.reset();
      state.files = [];
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = "";
      elements.preview.hidden = true;
      elements.preview.innerHTML = "";
      elements.dropCopy.hidden = false;
      elements.queueSummary.hidden = true;
      elements.queueSummary.textContent = "";
      elements.airport.setCustomValidity("");
      elements.airport.removeAttribute("aria-invalid");
      const day = elements.categoryGrid.querySelector('input[value="day"]');
      if (day) day.checked = true;
    };

    const buildPhotoForm = async (file, index, total) => {
      const form = new FormData();
      const assets = file ? await preparePhotoAssets(file, index) : null;
      const autoTitle = file ? cleanFileTitle(file, index) : "";
      const title = total === 1 ? (elements.title.value.trim() || autoTitle) : autoTitle;
      if (assets?.file) form.set("file", assets.file);
      if (assets?.thumbnail) form.set("thumbnail", assets.thumbnail);
      form.set("title", title);
      form.set("alt", photoAltFromTitle(title));
      form.set("categories", selectedCategories().join(" "));
      form.set("layout", assets?.layout || "standard");
      form.set("airline", elements.airline.value.trim());
      form.set("aircraft", elements.aircraft.value.trim());
      form.set("registration", elements.registration.value.trim());
      form.set("airport", normalizeAirportCode(elements.airport.value));
      form.set("capturedAt", elements.capturedAt.value);
      form.set("phase", elements.phase.value);
      form.set("spot", elements.spot.value.trim());
      form.set("notes", elements.notes.value.trim());
      return { form, title, assets };
    };

    const uploadPhoto = async (event) => {
      event.preventDefault();
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      try {
        airportFieldValue(elements.airport);
      } catch (error) {
        setStatus("机场代码有误", error.message, "bad");
        elements.airport.focus();
        return;
      }
      elements.uploadButton.disabled = true;
      elements.optimizeThumbnails.disabled = true;
      elements.toggleBatch.disabled = true;
      try {
        const files = state.files.length ? state.files : [];
        const total = files.length;
        if (!total) {
          setStatus("没有照片", "请选择要上传的照片。", "bad");
          return;
        }
        const uploadItems = files;
        const failures = [];
        let originalBytes = 0;
        let uploadedBytes = 0;
        for (let index = 0; index < uploadItems.length; index += 1) {
          const file = uploadItems[index];
          try {
            setStatus("正在优化", `${index + 1}/${uploadItems.length}：${file.name || "照片"}`, "warn");
            await new Promise((resolve) => requestAnimationFrame(resolve));
            const { form, title, assets } = await buildPhotoForm(file, index, uploadItems.length);
            originalBytes += assets?.originalSize || file.size;
            uploadedBytes += assets?.outputSize || file.size;
            setStatus(
              "正在上传",
              `${index + 1}/${uploadItems.length}：${title || "照片"} · ${formatBytes(assets?.originalSize || file.size)} → ${formatBytes(assets?.outputSize || file.size)}`,
              "warn",
            );
            const data = await api("/api/photos", { method: "POST", body: form }, true);
            state.photos = normalizePhotos(data.manifest);
          } catch (error) {
            failures.push(`${file?.name || "照片"}：${error.message}`);
          }
        }
        renderWorks();
        renderHomeMedia();
        updateStats();
        if (failures.length) {
          setStatus("部分上传完成", `${uploadItems.length - failures.length} 张成功，${failures.length} 张失败。${failures[0]}`, "warn");
        } else {
          clearUploadForm();
          setStatus("上传完成", `${uploadItems.length} 张照片已发布，主图 ${formatBytes(originalBytes)} → ${formatBytes(uploadedBytes)}。`, "good");
        }
      } catch (error) {
        setStatus("上传失败", error.message, "bad");
      } finally {
        elements.uploadButton.disabled = false;
        elements.optimizeThumbnails.disabled = false;
        elements.toggleBatch.disabled = false;
      }
    };

    const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    const abortError = () => {
      const error = new Error("缩略图优化已停止");
      error.name = "AbortError";
      return error;
    };

    const prepareExistingThumbnail = async (photo, job) => {
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (job.cancelled) throw abortError();
        const controller = new AbortController();
        job.controllers.add(controller);
        try {
          const response = await fetch(photo.src, {
            cache: "force-cache",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`读取原图失败（${response.status}）`);
          const blob = await response.blob();
          if (job.cancelled) throw abortError();
          const sourceName = decodeURIComponent(String(photo.src).split("/").pop()?.split("?")[0] || `${photo.id}.jpg`);
          const sourceFile = new File([blob], sourceName, { type: blob.type || "image/jpeg" });
          const thumbnail = await createThumbnailFromFile(sourceFile);
          if (!thumbnail) throw new Error("无法生成缩略图");
          return { photo, thumbnail };
        } catch (error) {
          if (job.cancelled || error?.name === "AbortError") throw abortError();
          lastError = error;
          if (attempt < 2) await wait(450 * attempt);
        } finally {
          job.controllers.delete(controller);
        }
      }
      throw lastError || new Error("无法生成缩略图");
    };

    const uploadThumbnailBatch = async (items, job) => {
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        if (job.cancelled) throw abortError();
        const controller = new AbortController();
        job.controllers.add(controller);
        const form = new FormData();
        items.forEach(({ photo, thumbnail }) => {
          form.append("id", photo.id);
          form.append("thumbnail", thumbnail);
        });
        try {
          const data = await api("/api/photos/thumbnails", {
            method: "POST",
            body: form,
            signal: controller.signal,
          }, true);
          const updates = new Map((Array.isArray(data.photos) ? data.photos : []).map((photo) => [photo.id, photo]));
          state.photos = state.photos.map((photo) => updates.get(photo.id) || photo);
          return [...updates.keys()];
        } catch (error) {
          if (job.cancelled || error?.name === "AbortError") throw abortError();
          lastError = error;
          if (attempt < 2) await wait(650 * attempt);
        } finally {
          job.controllers.delete(controller);
        }
      }
      throw lastError || new Error("缩略图上传失败");
    };

    const optimizeExistingThumbnails = async () => {
      if (state.thumbnailJob) {
        state.thumbnailJob.cancelled = true;
        state.thumbnailJob.controllers.forEach((controller) => controller.abort());
        elements.optimizeThumbnails.textContent = "正在停止";
        setStatus("正在停止缩略图优化", "当前批次结束后暂停。", "warn");
        return;
      }
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }

      const failedOrder = new Map((state.thumbnailProgress?.failedIds || []).map((id, index) => [id, index]));
      const completedAtStart = state.photos.filter(hasOptimizedThumbnail).length;
      const pending = state.photos
        .filter((photo) => !hasOptimizedThumbnail(photo))
        .sort((left, right) => (failedOrder.get(left.id) ?? 999999) - (failedOrder.get(right.id) ?? 999999));
      if (!pending.length) {
        persistThumbnailProgress({ status: "complete", failedIds: [] });
        setStatus("缩略图已优化", `${state.photos.length} 张作品均已使用轻量缩略图。`, "good");
        return;
      }

      try {
        setStatus("正在创建恢复点", "缩略图优化开始前只备份一次。", "warn");
        await api("/api/backups", {
          method: "POST",
          body: JSON.stringify({ reason: "批量优化缩略图前自动备份" }),
        }, true);
        await loadBackups({ quiet: true });
      } catch (error) {
        setStatus("无法开始缩略图优化", `创建恢复点失败：${error.message}`, "bad");
        return;
      }

      const batchSize = window.matchMedia("(max-width: 900px)").matches ? 1 : 2;
      const job = {
        batchSize,
        cancelled: false,
        controllers: new Set(),
        currentLabel: "",
        wakeLock: null,
      };
      state.thumbnailJob = job;
      persistThumbnailProgress({
        status: "running",
        failedIds: [],
        lastError: "",
        startedAt: state.thumbnailProgress?.startedAt || new Date().toISOString(),
        totalAtStart: state.photos.length,
      });
      elements.uploadButton.disabled = true;
      elements.clearLibrary.disabled = true;
      elements.toggleBatch.disabled = true;
      elements.applyBatch.disabled = true;

      if (navigator.wakeLock?.request) {
        try {
          job.wakeLock = await navigator.wakeLock.request("screen");
        } catch {
          job.wakeLock = null;
        }
      }

      let completedThisRun = 0;
      const failures = new Map();
      let unexpectedError = null;

      try {
        for (let cursor = 0; cursor < pending.length; cursor += batchSize) {
          if (job.cancelled) break;
          const batch = pending.slice(cursor, cursor + batchSize);
          const rangeEnd = Math.min(cursor + batch.length, pending.length);
          job.currentLabel = `${cursor + 1}-${rangeEnd}/${pending.length}：${batch.map(photoLabel).join(" / ")}`;
          updateThumbnailJobUi();
          setStatus("正在优化缩略图", job.currentLabel, "warn");

          const prepared = await Promise.all(batch.map(async (photo) => {
            try {
              return await prepareExistingThumbnail(photo, job);
            } catch (error) {
              if (job.cancelled || error?.name === "AbortError") return null;
              failures.set(photo.id, `${photoLabel(photo)}：${error.message}`);
              return null;
            }
          }));
          if (job.cancelled) break;

          const ready = prepared.filter(Boolean);
          if (ready.length) {
            try {
              const updatedIds = await uploadThumbnailBatch(ready, job);
              updatedIds.forEach((id) => failures.delete(id));
              completedThisRun += updatedIds.length;
            } catch (error) {
              if (job.cancelled || error?.name === "AbortError") break;
              ready.forEach(({ photo }) => failures.set(photo.id, `${photoLabel(photo)}：${error.message}`));
            }
          }

          persistThumbnailProgress({ status: "running", failedIds: [...failures.keys()] });
          updateStats();
          if (completedThisRun && completedThisRun % 24 < batchSize) renderWorks();
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      } catch (error) {
        if (!job.cancelled && error?.name !== "AbortError") unexpectedError = error;
      } finally {
        job.controllers.forEach((controller) => controller.abort());
        try {
          const data = await api("/api/photos");
          state.photos = normalizePhotos(data);
        } catch {
          // Individual successful responses already updated local state.
        }

        const pendingIds = new Set(state.photos.filter((photo) => !hasOptimizedThumbnail(photo)).map((photo) => photo.id));
        const failedIds = [...failures.keys()].filter((id) => pendingIds.has(id));
        const remaining = pendingIds.size;
        const completedThisRunActual = Math.max(
          0,
          state.photos.filter(hasOptimizedThumbnail).length - completedAtStart,
        );
        state.thumbnailJob = null;
        if (job.wakeLock) await job.wakeLock.release().catch(() => {});
        elements.uploadButton.disabled = false;
        elements.clearLibrary.disabled = false;
        elements.toggleBatch.disabled = false;
        renderWorks();
        renderHomeMedia();
        updateStats();
        updateBatchUi();

        if (job.cancelled) {
          persistThumbnailProgress({ status: "paused", failedIds });
          setStatus("缩略图优化已暂停", `本次完成 ${completedThisRunActual} 张，剩余 ${remaining} 张。`, "warn");
        } else if (!remaining) {
          persistThumbnailProgress({ status: "complete", failedIds: [], completedAt: new Date().toISOString() });
          setStatus("缩略图优化完成", `${state.photos.length} 张作品已切换为轻量缩略图。`, "good");
        } else {
          persistThumbnailProgress({
            status: "failed",
            failedIds,
            lastError: unexpectedError?.message || "",
          });
          const firstFailure = [...failures.values()][0] || unexpectedError?.message || "可以继续重试剩余作品";
          setStatus("缩略图部分完成", `${completedThisRunActual} 张成功，剩余 ${remaining} 张。${firstFailure}`, "warn");
        }
      }
    };

    const visiblePhotos = () => {
      const query = state.query.toLowerCase().trim();
      let list = state.photos.filter((photo) => {
        if (elements.filterSelect.value === "night" && !isNightPhoto(photo)) return false;
        if (elements.filterSelect.value === "day" && isNightPhoto(photo)) return false;
        const audit = photoAudit(photo);
        if (["empty", "ready"].includes(elements.catalogFilter.value)
          && audit.status !== elements.catalogFilter.value) return false;
        if (elements.catalogFilter.value === "no-thumb" && hasOptimizedThumbnail(photo)) return false;
        if (elements.airlineFilter.value && photo.airline !== elements.airlineFilter.value) return false;
        if (elements.aircraftFilter.value && photo.aircraft !== elements.aircraftFilter.value) return false;
        if (elements.airportFilter.value && photo.airport !== elements.airportFilter.value) return false;
        if (elements.phaseFilter.value && photo.phase !== elements.phaseFilter.value) return false;
        const haystack = [
          photoLabel(photo),
          photo.airline,
          photo.aircraft,
          photo.registration,
          photo.airport,
          photo.capturedAt,
          tagLabel(photo.phase),
          photo.spot,
          photo.notes,
          photo.layout,
          ...(Array.isArray(photo.categories) ? photo.categories : []),
        ].filter(Boolean).join(" ").toLowerCase();
        return !query || haystack.includes(query);
      });
      if (elements.sortSelect.value === "newest") {
        list = [...list].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      } else if (elements.sortSelect.value === "oldest") {
        list = [...list].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
      } else if (elements.sortSelect.value === "capture-newest") {
        list = [...list].sort((a, b) => a.capturedAt && b.capturedAt
          ? String(b.capturedAt).localeCompare(String(a.capturedAt))
          : a.capturedAt ? -1 : b.capturedAt ? 1 : 0);
      } else if (elements.sortSelect.value === "capture-oldest") {
        list = [...list].sort((a, b) => a.capturedAt && b.capturedAt
          ? String(a.capturedAt).localeCompare(String(b.capturedAt))
          : a.capturedAt ? -1 : b.capturedAt ? 1 : 0);
      } else if (elements.sortSelect.value === "title") {
        list = [...list].sort((a, b) => photoLabel(a).localeCompare(photoLabel(b)));
      }
      return list;
    };

    const setupAdminPhotoImages = () => {
      adminThumbObserver?.disconnect();
      adminThumbObserver = null;
      const images = [...elements.photoList.querySelectorAll(".thumb img[data-src]")];
      if (!images.length) return;

      const loadImage = (image) => {
        if (!image.hasAttribute("src")) image.src = image.dataset.src;
        if (image.complete && image.naturalWidth) image.classList.add("is-loaded");
      };
      if (!("IntersectionObserver" in window)) {
        images.forEach(loadImage);
        return;
      }

      adminThumbObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const image = entry.target;
          if (entry.isIntersecting) {
            loadImage(image);
          } else if (image.hasAttribute("src")) {
            image.removeAttribute("src");
            image.classList.remove("is-loaded");
          }
        });
      }, { rootMargin: "900px 0px", threshold: 0.01 });
      images.forEach((image) => adminThumbObserver.observe(image));
    };

    const syncPhotoCardStates = () => {
      updateBatchUi();
      const photosById = new Map(state.photos.map((photo) => [photo.id, photo]));
      elements.photoList.querySelectorAll(".photo-card-admin").forEach((card) => {
        const id = card.dataset.id || "";
        const photo = photosById.get(id);
        const batchSelected = state.batchMode && state.selectedIds.has(id);
        const selected = !state.batchMode && state.selectedId === id;
        card.classList.toggle("is-batch-selected", batchSelected);
        card.classList.toggle("is-selected", selected);
        card.setAttribute("aria-pressed", String(batchSelected || selected));
        if (photo) card.setAttribute("aria-label", `${state.batchMode ? "选择" : "编辑"}作品：${photoLabel(photo)}`);
      });
    };

    const scheduleWorksRender = () => {
      cancelAnimationFrame(state.worksRenderFrame);
      state.worksRenderFrame = requestAnimationFrame(() => {
        state.worksRenderFrame = 0;
        renderWorks();
      });
    };

    const updateBatchUi = () => {
      const busy = state.batchSaving || Boolean(state.thumbnailJob);
      const validIds = new Set(state.photos.map((photo) => photo.id));
      state.selectedIds = new Set([...state.selectedIds].filter((id) => validIds.has(id)));
      elements.batchPanel.hidden = !state.batchMode;
      elements.photoList.classList.toggle("is-batch-mode", state.batchMode);
      elements.toggleBatch.textContent = state.batchMode ? "退出批量" : "批量选择";
      elements.toggleBatch.classList.toggle("primary", state.batchMode);
      elements.selectedCount.textContent = `已选 ${state.selectedIds.size} 张`;
      elements.applyBatch.disabled = busy || state.selectedIds.size === 0;
      elements.selectVisible.disabled = busy;
      elements.clearSelection.disabled = busy || state.selectedIds.size === 0;
      elements.exitBatch.disabled = busy;
    };

    const renderWorks = () => {
      updateStats();
      renderCatalogFilters();
      const list = visiblePhotos();
      elements.countText.textContent = list.length === state.photos.length
        ? `${state.photos.length} 张照片`
        : `${list.length} / ${state.photos.length} 张照片`;
      updateBatchUi();
      if (!list.length) {
        adminThumbObserver?.disconnect();
        adminThumbObserver = null;
        elements.photoList.innerHTML = '<div class="empty">没有匹配的照片</div>';
        return;
      }
      elements.photoList.innerHTML = list.map((photo) => {
        const audit = photoAudit(photo);
        const isBatchSelected = state.selectedIds.has(photo.id);
        const tags = [isNightPhoto(photo) ? "night" : "day", photo.phase, photo.registration].filter(Boolean);
        return `
          <button class="photo-card-admin ${photo.id === state.selectedId ? "is-selected" : ""} ${isBatchSelected ? "is-batch-selected" : ""}" type="button" data-id="${escapeHtml(photo.id)}" aria-label="${state.batchMode ? "选择" : "编辑"}作品：${escapeHtml(photoLabel(photo))}" aria-pressed="${state.batchMode ? isBatchSelected : photo.id === state.selectedId ? "true" : "false"}">
            <span class="selection-mark" aria-hidden="true">✓</span>
            <span class="thumb"><img data-src="${escapeHtml(photoPreviewSource(photo))}" alt="${escapeHtml(photo.alt || "")}" loading="lazy" decoding="async"></span>
            <span class="photo-card-body">
              <h3>${escapeHtml(photoLabel(photo))}</h3>
              <p>${escapeHtml(photoSummary(photo))}</p>
              <span class="completion-row"><span>${escapeHtml(auditLabel(audit))} ${audit.filled}/${audit.total}</span><span class="completion-track"><span style="width:${audit.percent}%"></span></span></span>
              <span class="tag-row">${tags.map((tag) => `<span class="tag">${escapeHtml(tagLabel(tag))}</span>`).join("")}</span>
            </span>
          </button>
        `;
      }).join("");
      setupAdminPhotoImages();
    };

    const setBatchMode = (enabled) => {
      if ((state.thumbnailJob || state.batchSaving) && enabled !== state.batchMode) {
        setStatus("当前任务正在运行", "任务结束后再切换批量模式。", "warn");
        return;
      }
      state.batchMode = Boolean(enabled);
      if (!state.batchMode) state.selectedIds.clear();
      if (state.batchMode) {
        state.selectedId = "";
        elements.editPanel.hidden = true;
      }
      syncPhotoCardStates();
    };

    const togglePhotoSelection = (id) => {
      if (state.selectedIds.has(id)) state.selectedIds.delete(id);
      else state.selectedIds.add(id);
      syncPhotoCardStates();
    };

    const selectVisiblePhotos = () => {
      visiblePhotos().slice(0, 500).forEach((photo) => state.selectedIds.add(photo.id));
      syncPhotoCardStates();
    };

    const clearBatchFields = () => {
      elements.batchCategory.value = "";
      elements.batchAirline.value = "";
      elements.batchAircraft.value = "";
      elements.batchRegistration.value = "";
      elements.batchAirport.value = "";
      elements.batchAirport.setCustomValidity("");
      elements.batchAirport.removeAttribute("aria-invalid");
      elements.batchCapturedAt.value = "";
      elements.batchPhase.value = "";
      elements.batchSpot.value = "";
      elements.batchOnlyEmpty.checked = true;
    };

    const collectBatchUpdates = () => {
      const updates = {};
      const values = [
        ["categories", elements.batchCategory.value],
        ["airline", elements.batchAirline.value.trim()],
        ["aircraft", elements.batchAircraft.value.trim()],
        ["registration", elements.batchRegistration.value.trim()],
        ["airport", elements.batchAirport.value.trim() ? airportFieldValue(elements.batchAirport) : ""],
        ["capturedAt", elements.batchCapturedAt.value],
        ["phase", elements.batchPhase.value],
        ["spot", elements.batchSpot.value.trim()],
      ];
      values.forEach(([field, value]) => {
        if (value) updates[field] = value;
      });
      return updates;
    };

    const applyBatchUpdates = async () => {
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      if (!state.selectedIds.size) {
        setStatus("没有选中作品", "请先选择需要整理的照片。", "bad");
        return;
      }
      let updates;
      try {
        updates = collectBatchUpdates();
      } catch (error) {
        setStatus("机场代码有误", error.message, "bad");
        elements.batchAirport.focus();
        return;
      }
      if (!Object.keys(updates).length) {
        setStatus("没有批量字段", "至少填写一个需要应用的字段。", "bad");
        return;
      }

      state.batchSaving = true;
      updateBatchUi();
      elements.toggleBatch.disabled = true;
      elements.optimizeThumbnails.disabled = true;
      try {
        const data = await api("/api/photos/batch", {
          method: "PATCH",
          body: JSON.stringify({
            ids: [...state.selectedIds],
            updates,
            onlyEmpty: elements.batchOnlyEmpty.checked,
          }),
        }, true);
        state.photos = normalizePhotos(data.manifest);
        state.selectedIds.clear();
        clearBatchFields();
        renderWorks();
        renderHomeMedia();
        await loadBackups({ quiet: true });
        setStatus("批量整理完成", `${data.updated || 0} 张作品已更新。`, "good");
      } catch (error) {
        setStatus("批量整理失败", error.message, "bad");
      } finally {
        state.batchSaving = false;
        elements.toggleBatch.disabled = false;
        elements.optimizeThumbnails.disabled = false;
        updateBatchUi();
      }
    };

    const selectPhoto = (id) => {
      const photo = state.photos.find((item) => item.id === id);
      if (!photo) return;
      state.selectedId = id;
      elements.editPreview.innerHTML = `<img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || "")}">`;
      elements.editTitle.value = photo.title || "";
      elements.editCategory.value = isNightPhoto(photo) ? "night" : "day";
      elements.editAirline.value = photo.airline || "";
      elements.editAircraft.value = photo.aircraft || "";
      elements.editRegistration.value = photo.registration || "";
      elements.editAirport.value = photo.airport || "";
      elements.editAirport.setCustomValidity("");
      elements.editAirport.removeAttribute("aria-invalid");
      elements.editCapturedAt.value = photo.capturedAt || "";
      elements.editPhase.value = photo.phase || "";
      elements.editSpot.value = photo.spot || "";
      elements.editNotes.value = photo.notes || "";
      const audit = photoAudit(photo);
      elements.editCompleteness.textContent = `资料 ${audit.filled}/${audit.total}`;
      elements.editCompleteness.title = audit.missing.length ? `缺少：${audit.missing.join("、")}` : "基础资料完整";
      elements.editPanel.hidden = false;
      setStatus("已选中作品", photoLabel(photo), "good");
      syncPhotoCardStates();
      elements.editPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const saveSelectedPhoto = async (move = "", goNext = false) => {
      if (!state.selectedId) return;
      if (state.thumbnailJob) {
        setStatus("正在优化缩略图", "停止优化后再编辑作品。", "warn");
        return;
      }
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      let airport;
      try {
        airport = airportFieldValue(elements.editAirport);
      } catch (error) {
        setStatus("机场代码有误", error.message, "bad");
        elements.editAirport.focus();
        return;
      }
      try {
        const currentIndex = state.photos.findIndex((photo) => photo.id === state.selectedId);
        const currentPhoto = state.photos.find((photo) => photo.id === state.selectedId);
        const data = await api(`/api/photos/${encodeURIComponent(state.selectedId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: elements.editTitle.value.trim(),
            alt: currentPhoto?.alt || photoAltFromTitle(elements.editTitle.value.trim()),
            categories: elements.editCategory.value,
            layout: currentPhoto?.layout || "standard",
            airline: elements.editAirline.value.trim(),
            aircraft: elements.editAircraft.value.trim(),
            registration: elements.editRegistration.value.trim(),
            airport,
            capturedAt: elements.editCapturedAt.value,
            phase: elements.editPhase.value,
            spot: elements.editSpot.value.trim(),
            notes: elements.editNotes.value.trim(),
            move,
          }),
        }, true);
        state.photos = normalizePhotos(data.manifest);
        state.selectedId = data.photo?.id || state.selectedId;
        renderWorks();
        renderHomeMedia();
        await loadBackups({ quiet: true });
        if (goNext) {
          const ordered = [
            ...state.photos.slice(Math.max(0, currentIndex + 1)),
            ...state.photos.slice(0, Math.max(0, currentIndex + 1)),
          ];
          const nextPhoto = ordered.find((photo) => photo.id !== state.selectedId && photoAudit(photo).status !== "ready");
          if (nextPhoto) {
            selectPhoto(nextPhoto.id);
            setStatus("作品已保存", "已切换到下一张待整理作品。", "good");
          } else {
            setStatus("作品已保存", "当前没有其他待整理作品。", "good");
          }
        } else {
          setStatus("作品已保存", move ? "顺序已更新。" : "作品信息已更新。", "good");
        }
      } catch (error) {
        setStatus("作品保存失败", error.message, "bad");
      }
    };

    const deleteSelectedPhoto = async () => {
      if (state.thumbnailJob) {
        setStatus("正在优化缩略图", "停止优化后再删除作品。", "warn");
        return;
      }
      if (!state.selectedId || !confirm("确定删除这张照片吗？")) return;
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      try {
        const data = await api(`/api/photos/${encodeURIComponent(state.selectedId)}`, { method: "DELETE" }, true);
        state.photos = normalizePhotos(data.manifest);
        state.selectedId = "";
        state.selectedIds.clear();
        elements.editPanel.hidden = true;
        renderWorks();
        renderHomeMedia();
        await loadBackups({ quiet: true });
        setStatus("照片已删除", "作品页和首页选择列表已同步。", "good");
      } catch (error) {
        setStatus("删除失败", error.message, "bad");
      }
    };

    const clearLibrary = async () => {
      if (!confirm("确定清空作品库里的所有照片吗？")) return;
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      elements.clearLibrary.disabled = true;
      try {
        const data = await api("/api/photos", { method: "DELETE" }, true);
        state.photos = normalizePhotos(data.manifest);
        state.selectedId = "";
        state.selectedIds.clear();
        state.batchMode = false;
        elements.editPanel.hidden = true;
        renderWorks();
        renderHomeMedia();
        await loadBackups({ quiet: true });
        setStatus("作品库已清空", `删除 ${data.deleted || 0} 张照片。`, "good");
      } catch (error) {
        setStatus("清空失败", error.message, "bad");
      } finally {
        elements.clearLibrary.disabled = false;
      }
    };

    const loadSite = async () => {
      const site = await api("/api/site");
      if (!site?.home || typeof site.home !== "object" || Array.isArray(site.home)) throw new Error("首页数据无效，请稍后重试。");
      state.site = site;
    };

    const loadAirportCatalog = async () => {
      try {
        const response = await fetch("/airports.json", { cache: "force-cache" });
        if (!response.ok) throw new Error("机场目录不可用");
        const data = await response.json();
        state.airports = (Array.isArray(data?.airports) ? data.airports : [])
          .map((airport) => ({ ...airport, iata: normalizeAirportCode(airport.iata) }))
          .filter((airport) => airport.iata)
          .sort((left, right) => left.iata.localeCompare(right.iata));
        state.airportCodes = new Set(state.airports.map((airport) => airport.iata));
        renderCatalogFilters();
      } catch (error) {
        state.airports = [];
        state.airportCodes = new Set();
        console.warn("Unable to load airport catalog", error);
      }
    };

    const loadPhotos = async () => {
      const data = await api("/api/photos");
      if (!Array.isArray(data) && !Array.isArray(data?.photos)) throw new Error("作品数据无效，请稍后重试。");
      state.photos = normalizePhotos(data);
      if (state.thumbnailProgress?.status === "running") {
        persistThumbnailProgress({ status: "paused" });
      }
      renderWorks();
      renderHomeMedia();
      updateStats();
    };

    const loadAdminData = () => {
      if (adminDataPromise) return adminDataPromise;
      adminDataPromise = (async () => {
        await Promise.all([loadSite(), loadAirportCatalog(), loadStaticPreviews()]);
        await loadPhotos();
        renderHome();
      })().catch((error) => {
        adminDataPromise = null;
        throw error;
      });
      return adminDataPromise;
    };

    const setActiveView = (view) => {
      state.activeView = view;
      document.querySelectorAll(".view-tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.view === view);
      });
      document.querySelectorAll("[data-view-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.viewPanel !== view;
      });
      if (view === "works") requestAnimationFrame(setupAdminPhotoImages);
      if (view === "backups") loadBackups();
      if (view === "storage") loadStorage();
    };

    elements.saveToken.addEventListener("click", confirmToken);
    elements.token.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      confirmToken();
    });
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.addEventListener("click", () => setActiveView(tab.dataset.view));
    });
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-save-home]")) saveHome();
    });
    elements.homeImageList.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest("[data-slot-index]");
      if (!card) return;
      const index = Number(card.dataset.slotIndex || 0);
      if (target.closest("[data-open-home-picker]")) openHomePicker(index, target.closest("button"));
      if (target.closest("[data-slot-auto]")) updateHomeSlotPhoto(index, null);
    });
    elements.airportCoverList.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest("[data-airport-cover]");
      const code = normalizeAirportCode(card?.dataset.airportCover);
      if (!card || !code) return;
      if (target.closest("[data-open-airport-cover-picker]")) {
        openAirportCoverPicker(code, target.closest("button"));
      }
      if (target.closest("[data-airport-cover-auto]")) updateAirportCoverPhoto(code, null);
    });
    elements.homePickerGallery.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-home-picker-photo]") : null;
      if (!button) return;
      state.homePicker.selectedId = button.dataset.homePickerPhoto || "";
      elements.homePickerGallery.querySelectorAll("[data-home-picker-photo]").forEach((item) => {
        const selected = item.dataset.homePickerPhoto === state.homePicker.selectedId;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      renderHomePickerInspector();
    });
    elements.homePhotoPicker.addEventListener("load", (event) => {
      if (event.target instanceof HTMLImageElement) event.target.classList.add("is-loaded");
    }, true);
    elements.homePickerInspector.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("[data-home-picker-apply]")) {
        applyHomePickerSelection();
      }
    });
    elements.homePickerClose.addEventListener("click", () => closeHomePicker());
    elements.homePhotoPicker.addEventListener("click", (event) => {
      if (event.target === elements.homePhotoPicker) closeHomePicker();
    });
    elements.homePickerReset.addEventListener("click", resetHomePickerFilters);
    elements.homePickerMore.addEventListener("click", () => {
      const hadPendingFilter = Boolean(state.homePicker.renderFrame);
      cancelAnimationFrame(state.homePicker.renderFrame);
      state.homePicker.renderFrame = 0;
      if (hadPendingFilter) state.homePicker.visibleCount = HOME_PICKER_PAGE_SIZE;
      state.homePicker.visibleCount += HOME_PICKER_PAGE_SIZE;
      renderHomePicker();
    });
    elements.homePickerSearch.addEventListener("input", () => {
      state.homePicker.query = elements.homePickerSearch.value;
      scheduleHomePickerRender();
    });
    [
      [elements.homePickerTime, "time"],
      [elements.homePickerAirline, "airline"],
      [elements.homePickerAircraft, "aircraft"],
      [elements.homePickerAirport, "airport"],
      [elements.homePickerSort, "sort"],
    ].forEach(([element, key]) => {
      element.addEventListener("change", () => {
        cancelAnimationFrame(state.homePicker.renderFrame);
        state.homePicker.renderFrame = 0;
        state.homePicker[key] = element.value;
        state.homePicker.visibleCount = HOME_PICKER_PAGE_SIZE;
        renderHomePicker({ resetScroll: true });
      });
    });
    document.addEventListener("keydown", (event) => {
      if (!elements.homePhotoPicker.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeHomePicker();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...elements.homePhotoPicker.querySelectorAll("button:not([disabled]):not([hidden]), input:not([disabled]), select:not([disabled])")]
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
    elements.chooseFiles.addEventListener("click", () => elements.fileInput.click());
    elements.chooseFolder.addEventListener("click", () => elements.folderInput.click());
    elements.dropZone.addEventListener("click", () => elements.fileInput.click());
    elements.fileInput.addEventListener("change", () => setFiles(elements.fileInput.files));
    elements.folderInput.addEventListener("change", () => setFiles(elements.folderInput.files));
    [elements.airport, elements.editAirport, elements.batchAirport].forEach((element) => {
      element.addEventListener("input", () => {
        element.value = element.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
        element.setCustomValidity("");
        element.removeAttribute("aria-invalid");
      });
      element.addEventListener("blur", () => {
        try {
          airportFieldValue(element);
        } catch {
          // The related save action reports the validation message in context.
        }
      });
    });
    elements.dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("is-over");
    });
    elements.dropZone.addEventListener("dragleave", () => elements.dropZone.classList.remove("is-over"));
    elements.dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("is-over");
      setFiles(event.dataTransfer.files);
    });
    elements.uploadForm.addEventListener("submit", uploadPhoto);
    elements.clearForm.addEventListener("click", clearUploadForm);
    elements.photoList.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const item = target?.closest(".photo-card-admin");
      if (!item) return;
      if (state.batchMode) togglePhotoSelection(item.dataset.id);
      else selectPhoto(item.dataset.id);
    });
    elements.photoList.addEventListener("load", (event) => {
      if (event.target instanceof HTMLImageElement && event.target.matches(".thumb img")) {
        event.target.classList.add("is-loaded");
      }
    }, true);
    document.addEventListener("error", (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      const fallback = previewFallbacks.get(image.getAttribute("src"));
      if (fallback) image.src = fallback;
    }, true);
    elements.searchInput.addEventListener("input", () => {
      state.query = elements.searchInput.value;
      scheduleWorksRender();
    });
    elements.filterSelect.addEventListener("change", renderWorks);
    elements.sortSelect.addEventListener("change", renderWorks);
    [elements.catalogFilter, elements.airlineFilter, elements.aircraftFilter, elements.airportFilter, elements.phaseFilter].forEach((filter) => {
      filter.addEventListener("change", renderWorks);
    });
    elements.completionStrip.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-audit-shortcut]") : null;
      if (!target) return;
      const shortcut = target.dataset.auditShortcut || "";
      elements.catalogFilter.value = elements.catalogFilter.value === shortcut ? "" : shortcut;
      renderWorks();
    });
    elements.toggleBatch.addEventListener("click", () => setBatchMode(!state.batchMode));
    elements.exitBatch.addEventListener("click", () => setBatchMode(false));
    elements.selectVisible.addEventListener("click", selectVisiblePhotos);
    elements.clearSelection.addEventListener("click", () => {
      state.selectedIds.clear();
      syncPhotoCardStates();
    });
    elements.applyBatch.addEventListener("click", applyBatchUpdates);
    elements.saveEdit.addEventListener("click", () => saveSelectedPhoto());
    elements.saveAndNext.addEventListener("click", () => saveSelectedPhoto("", true));
    document.querySelectorAll("[data-move]").forEach((button) => {
      button.addEventListener("click", () => saveSelectedPhoto(button.dataset.move));
    });
    elements.deletePhoto.addEventListener("click", deleteSelectedPhoto);
    elements.optimizeThumbnails.addEventListener("click", optimizeExistingThumbnails);
    elements.retryThumbnailFailures.addEventListener("click", optimizeExistingThumbnails);
    elements.clearLibrary.addEventListener("click", clearLibrary);
    elements.createBackup.addEventListener("click", createManualBackup);
    elements.scanStorage.addEventListener("click", () => loadStorage());
    elements.cleanupStorage.addEventListener("click", cleanupStorage);
    elements.chooseBackup.addEventListener("click", () => {
      if (!state.token) {
        setStatus("缺少后台密钥", "请先确认 Admin Token。", "bad");
        return;
      }
      elements.backupFile.click();
    });
    elements.backupFile.addEventListener("change", importBackupFile);
    elements.backupList.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-backup-action]") : null;
      if (!target) return;
      const id = target.dataset.backupId || "";
      if (target.dataset.backupAction === "download") downloadBackup(id);
      if (target.dataset.backupAction === "restore") restoreBackupEntry(id);
      if (target.dataset.backupAction === "delete") deleteBackupEntry(id);
    });
    elements.cancelEdit.addEventListener("click", () => {
      state.selectedId = "";
      elements.editPanel.hidden = true;
      syncPhotoCardStates();
    });

    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) {
        cancelAnimationFrame(state.worksRenderFrame);
        cancelAnimationFrame(state.homePicker.renderFrame);
        adminThumbObserver?.disconnect();
        contentChannel?.close();
        if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      }
      const job = state.thumbnailJob;
      if (!job) return;
      job.cancelled = true;
      job.controllers.forEach((controller) => controller.abort());
      try {
        localStorage.setItem(THUMBNAIL_PROGRESS_KEY, JSON.stringify({
          ...(state.thumbnailProgress || {}),
          status: "paused",
          updatedAt: new Date().toISOString(),
        }));
      } catch {
        // The remaining queue is derived from the server manifest on reload.
      }
    });

    const initializeAdmin = async () => {
      if (!state.token) {
        setStatus("请输入后台密钥", "验证后加载管理数据。", "warn");
        return;
      }
      try {
        await api("/api/auth/check", { method: "POST" }, true);
        await loadAdminData();
        await loadBackups({ quiet: true });
        setStatus("后台已同步", "", "good");
      } catch (error) {
        if (error.status === 401) {
          state.token = "";
          elements.token.value = "";
          sessionStorage.removeItem("hugo-admin-token");
        }
        setStatus(error.status === 401 ? "登录已失效" : "管理数据加载失败", error.message, "bad");
      }
    };

    initializeAdmin();
