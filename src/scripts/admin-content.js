/* Content drafts stay in memory; production content is never copied to browser storage. */
(() => {
  const fields = {
    "hero.eyebrow": "首屏 · 顶部说明", "hero.greeting": "首屏 · 问候语",
    "hero.welcome": "首屏 · 欢迎语", "hero.primaryButton": "首屏 · 主按钮",
    "hero.secondaryButton": "首屏 · 次按钮", "about.title": "关于 · 标题",
    "about.body": "关于 · 正文", "contact.emailLabel": "邮箱 · 显示文字",
    "contact.emailHref": "邮箱 · mailto 链接", "contact.douyinLabel": "抖音 · 显示文字",
    "contact.douyinHref": "抖音 · HTTPS 链接", "contact.instagramLabel": "Instagram · 显示文字",
    "contact.instagramHref": "Instagram · HTTPS 链接", "contact.jetphotosLabel": "JetPhotos · 显示文字",
    "contact.jetphotosHref": "JetPhotos · HTTPS 链接",
  };
  const catalog = (site, photos, defaults) => {
    const rows = new Map();
    const add = (source, group) => {
      if (typeof source !== "string" || !source.trim()) return;
      source = source.trim();
      if (!rows.has(source)) rows.set(source, { source, group });
    };
    const walk = (value, path) => {
      if (typeof value === "string") add(value, path);
      else if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => {
        if (!/^(src|slot|.*Href|updatedAt)$/.test(key)) walk(child, `${path} / ${fields[key] || key}`);
      });
    };
    walk(site.home, "首页");
    Object.keys(defaults.entries || {}).forEach(source => add(source, "公共界面 / 内置文案"));
    (window.HugoStaticContent || []).forEach(source => add(source, "公共界面 / 静态文字"));
    photos.forEach(photo => ["title", "alt", "notes", "spot"].forEach(key => add(photo[key], `作品 / ${key}`)));
    Object.values(site.localization?.entries || {}).forEach(entry => add(entry.source, "已保存文案"));
    return [...rows.values()];
  };
  const serialize = drafts => ({ version: 1, entries: Object.fromEntries([...drafts.values()]
    .filter(entry => typeof entry.zh === "string" || typeof entry.en === "string")
    .map((entry, index) => [`entry_${index}`, { ...entry }])) });
  window.HugoContentModel = { catalog, serialize };
  let dirty = false;
  let drafts = new Map();
  let busy = false;
  let root;
  const markDirty = () => { dirty = true; };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const button = (text, action) => {
    const node = element("button", text, "button"); node.type = "button";
    node.addEventListener("click", action); return node;
  };
  window.HugoContentEditor = {
    markDirty,
    collect(site) {
      document.querySelectorAll("[data-general-path]").forEach(input => {
        const parts = input.dataset.generalPath.split(".");
        let target = site.home;
        parts.slice(0, -1).forEach(key => { target = target[key]; });
        target[parts.at(-1)] = input.value.trim();
      });
      site.localization = serialize(drafts);
      return site;
    },
    setBusy(value) {
      busy = value;
      document.querySelectorAll('[data-view-panel="home"], [data-view-panel="content"]').forEach(panel => { panel.inert = value; });
      document.querySelectorAll("[data-save-home]").forEach(node => { node.disabled = value; });
    },
    render(site, photos, save) {
      dirty = false;
      drafts = new Map(Object.values(site.localization?.entries || {}).map(entry => [entry.source, { ...entry }]));
      const general = document.getElementById("homeGeneralFields");
      general.replaceChildren(element("h2", "首屏、关于与联系信息"));
      const grid = element("div", undefined, "content-general-grid");
      const allFields = { ...fields };
      site.home.metrics.forEach((_, index) => { allFields[`metrics.${index}.label`] = `首屏指标 ${index + 1} · 标签`; });
      site.home.about.stats.forEach((_, index) => { allFields[`about.stats.${index}.label`] = `关于统计 ${index + 1} · 标签`; });
      Object.entries(allFields).forEach(([path, label]) => {
        const wrapper = element("label", label, "content-field");
        const input = element(path.endsWith(".body") ? "textarea" : "input");
        input.dataset.generalPath = path;
        input.value = path.split(".").reduce((value, key) => value?.[key], site.home) || "";
        input.maxLength = path.endsWith(".body") ? 4000 : path.endsWith("Href") ? 2000 : 300;
        if (path.endsWith(".body")) input.rows = 5;
        input.addEventListener("input", markDirty); wrapper.append(input); grid.append(wrapper);
      });
      general.append(grid);
      root = document.getElementById("bilingualEditor");
      root.replaceChildren();
      root.append(element("p", "中文和英文分别保存，保存后公开显示，请勿填写密钥或私人信息。相同原文共用一组文案；修改首页原始内容后请先保存，再编辑对应译文。清空输入恢复默认文字。链接、照片与结构在原有管理页面编辑。", "muted"));
      const toolbar = element("div", undefined, "content-toolbar");
      const search = element("input"); search.type = "search"; search.placeholder = "搜索原文、译文或位置";
      search.setAttribute("aria-label", "搜索中英文文案");
      const filter = element("select"); filter.setAttribute("aria-label", "文案状态筛选");
      [["all", "全部文案"], ["custom", "已自定义"], ["pending", "未自定义英文"]].forEach(([value, text]) => {
        const option = element("option", text); option.value = value; filter.append(option);
      });
      const saveButton = button("保存全部内容", () => { if (!busy) save(); });
      saveButton.classList.add("primary");
      const exportButton = button("导出双语草稿", () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(serialize(drafts), null, 2)], { type: "application/json" }));
        const link = element("a"); link.href = url; link.download = "hugo-content-draft.json";
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      toolbar.append(search, filter, saveButton, exportButton);
      const status = element("p", "", "muted"); status.setAttribute("role", "status");
      const list = element("div", undefined, "content-rows");
      const pager = element("div", undefined, "content-toolbar");
      root.append(toolbar, status, list, pager);
      const defaults = window.HugoTranslationDefaults || { entries: {}, english: text => text };
      const rows = catalog(site, photos, defaults);
      let page = 0;
      const renderRows = () => {
        const query = search.value.trim().toLocaleLowerCase();
        const matching = rows.filter(row => {
          const draft = drafts.get(row.source);
          return (filter.value !== "custom" || draft) && (filter.value !== "pending" || draft?.en === undefined)
            && [row.source, row.group, draft?.zh, draft?.en, defaults.english(row.source)].some(text => text?.toLocaleLowerCase().includes(query));
        });
        const pages = Math.max(1, Math.ceil(matching.length / 30)); page = Math.min(page, pages - 1);
        status.textContent = `${matching.length} 条文案 · 第 ${page + 1} / ${pages} 页 · ${dirty ? "有未保存修改" : "已载入保存版本"}`;
        list.replaceChildren();
        matching.slice(page * 30, page * 30 + 30).forEach(row => {
          const card = element("section", undefined, "content-row");
          card.append(element("p", row.group, "muted"), element("p", row.source, "content-source"));
          const columns = element("div", undefined, "content-general-grid");
          ["zh", "en"].forEach(locale => {
            const label = element("label", locale === "zh" ? "中文" : "English", "content-field");
            const input = element("textarea"); input.rows = row.source.length > 100 ? 5 : 2; input.maxLength = 16000;
            input.lang = locale === "zh" ? "zh-CN" : "en";
            const fallback = locale === "zh" ? row.source : defaults.english(row.source);
            input.value = drafts.get(row.source)?.[locale] ?? fallback;
            input.placeholder = fallback;
            input.addEventListener("input", () => {
              const draft = { ...(drafts.get(row.source) || { source: row.source }) };
              if (input.value.trim() && input.value.trim() !== fallback) draft[locale] = input.value.trim(); else delete draft[locale];
              if (draft.zh === undefined && draft.en === undefined) drafts.delete(row.source); else drafts.set(row.source, draft);
              markDirty(); status.textContent = `${matching.length} 条文案 · 有未保存修改`;
            });
            label.append(input); columns.append(label);
          });
          card.append(columns); list.append(card);
        });
        const previous = button("上一页", () => { page--; renderRows(); }); previous.disabled = page === 0;
        const next = button("下一页", () => { page++; renderRows(); }); next.disabled = page + 1 >= pages;
        pager.replaceChildren(previous, element("span", `${page + 1} / ${pages}`), next);
      };
      [search, filter].forEach(control => control.addEventListener("input", () => { page = 0; renderRows(); }));
      renderRows();
    },
  };
  window.addEventListener("beforeunload", event => {
    if (!dirty && !busy) return;
    event.preventDefault(); event.returnValue = "";
  });
  document.addEventListener("input", event => {
    if (event.target.closest?.('[data-view-panel="home"]')) markDirty();
  });
})();
