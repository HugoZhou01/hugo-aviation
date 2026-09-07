import { HttpError } from "./http.js";

export const KEYS = {
  manifest: "photos/manifest.json",
  site: "site/config.json",
  backups: "backups/index.json",
  mutationLock: "maintenance/mutation-lock.json",
};

export const EMPTY_MANIFEST = Object.freeze({
  updatedAt: "1970-01-01T00:00:00.000Z",
  revision: 0,
  photos: [],
});

export const EMPTY_SITE = Object.freeze({
  updatedAt: "1970-01-01T00:00:00.000Z",
  home: {},
});

export const EMPTY_BACKUPS = Object.freeze({
  updatedAt: "1970-01-01T00:00:00.000Z",
  backups: [],
  mediaKeys: [],
});

const EMPTY_MUTATION_LOCK = Object.freeze({
  owner: "",
  purpose: "",
  acquiredAt: "1970-01-01T00:00:00.000Z",
  expiresAt: "1970-01-01T00:00:00.000Z",
});

const STORAGE_ETAG = Symbol("storageEtag");
const markStorageVersion = (value, etag) => {
  if (value && typeof value === "object") {
    Object.defineProperty(value, STORAGE_ETAG, {
      configurable: false,
      enumerable: false,
      value: etag ?? null,
      writable: false,
    });
  }
  return value;
};
export const storageEtag = (value) => value && typeof value === "object" && STORAGE_ETAG in value
  ? value[STORAGE_ETAG]
  : undefined;

export const getBucket = (env) => {
  if (!env.HUGO_PHOTOS) throw new HttpError(503, "Storage Unavailable", "Missing HUGO_PHOTOS binding");
  return env.HUGO_PHOTOS;
};

export const readJson = async (bucket, key, fallback) => {
  const object = await bucket.get(key);
  if (!object) return markStorageVersion(structuredClone(fallback), null);
  try {
    return markStorageVersion(JSON.parse(await object.text()), object.etag);
  } catch {
    throw new HttpError(500, "Storage Data Invalid", `${key} is not valid JSON`);
  }
};

const requireStoredRecord = (value, key) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(500, "Storage Data Invalid", `${key} does not contain the expected object`);
  }
  return value;
};

export const writeJson = async (bucket, key, value, { expectedEtag } = {}) => {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  const onlyIf = expectedEtag === undefined
    ? undefined
    : expectedEtag === null
      ? new Headers({ "if-none-match": "*" })
      : { etagMatches: expectedEtag };
  const stored = await bucket.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    ...(onlyIf ? { onlyIf } : {}),
  });
  if (stored === null) {
    throw new HttpError(409, "Conflict", "存储内容已被其他请求更新，请刷新后重试。");
  }
  return markStorageVersion(value, stored?.etag);
};

export const loadManifest = async (bucket) => {
  const manifest = requireStoredRecord(await readJson(bucket, KEYS.manifest, EMPTY_MANIFEST), KEYS.manifest);
  if (!Array.isArray(manifest.photos) || manifest.photos.length > 5000) {
    throw new HttpError(500, "Storage Data Invalid", `${KEYS.manifest} has an invalid photos array`);
  }
  return manifest;
};

export const loadSite = async (bucket) => {
  const site = requireStoredRecord(await readJson(bucket, KEYS.site, EMPTY_SITE), KEYS.site);
  if (!site.home || typeof site.home !== "object" || Array.isArray(site.home)) {
    throw new HttpError(500, "Storage Data Invalid", `${KEYS.site} has an invalid home object`);
  }
  return site;
};

export const loadBackupIndex = async (bucket) => {
  const index = requireStoredRecord(await readJson(bucket, KEYS.backups, EMPTY_BACKUPS), KEYS.backups);
  if (!Array.isArray(index.backups) || index.backups.length > 100 || !Array.isArray(index.mediaKeys)) {
    throw new HttpError(500, "Storage Data Invalid", `${KEYS.backups} has an invalid index structure`);
  }
  return index;
};

const loadMutationLock = async (bucket) => {
  const lock = requireStoredRecord(await readJson(bucket, KEYS.mutationLock, EMPTY_MUTATION_LOCK), KEYS.mutationLock);
  if (typeof lock.owner !== "string" || typeof lock.expiresAt !== "string") {
    throw new HttpError(500, "Storage Data Invalid", `${KEYS.mutationLock} has an invalid lock structure`);
  }
  return lock;
};

export const saveManifest = async (bucket, previous, photos) => writeJson(bucket, KEYS.manifest, {
  updatedAt: new Date().toISOString(),
  revision: Math.max(0, Number(previous?.revision) || 0) + 1,
  photos,
}, { expectedEtag: storageEtag(previous) });

export const saveSite = async (bucket, previous, site) => writeJson(bucket, KEYS.site, {
  ...site,
  updatedAt: new Date().toISOString(),
}, { expectedEtag: storageEtag(previous) });

const MUTATION_LEASE_MS = 10 * 60 * 1000;

const acquireMutationLease = async (bucket, purpose) => {
  const owner = crypto.randomUUID();
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await loadMutationLock(bucket);
    const now = Date.now();
    const held = current.owner && Number.isFinite(Date.parse(current.expiresAt))
      && Date.parse(current.expiresAt) > now;
    if (held) {
      throw new HttpError(409, "Conflict", "另一个管理操作正在执行，请稍后重试。");
    }
    try {
      await writeJson(bucket, KEYS.mutationLock, {
        owner,
        purpose,
        acquiredAt: new Date(now).toISOString(),
        expiresAt: new Date(now + MUTATION_LEASE_MS).toISOString(),
      }, { expectedEtag: storageEtag(current) });
      return owner;
    } catch (error) {
      lastError = error;
      if (!(error instanceof HttpError) || error.status !== 409) break;
    }
  }
  throw lastError || new HttpError(409, "Conflict", "无法获取管理操作锁，请重试。");
};

const releaseMutationLease = async (bucket, owner) => {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await loadMutationLock(bucket);
    if (current.owner !== owner) return;
    try {
      await writeJson(bucket, KEYS.mutationLock, {
        owner: "",
        purpose: "",
        acquiredAt: current.acquiredAt,
        expiresAt: new Date(0).toISOString(),
      }, { expectedEtag: storageEtag(current) });
      return;
    } catch (error) {
      lastError = error;
      if (!(error instanceof HttpError) || error.status !== 409) break;
    }
  }
  throw lastError || new HttpError(409, "Conflict", "无法释放管理操作锁。");
};

export const withMutationLease = async (bucket, purpose, operation) => {
  const owner = await acquireMutationLease(bucket, purpose);
  try {
    return await operation();
  } finally {
    await releaseMutationLease(bucket, owner).catch((error) => {
      console.error(JSON.stringify({
        message: "Could not release mutation lease",
        error: error instanceof Error ? error.message : String(error),
      }));
    });
  }
};

const unique = (values) => [...new Set(values.filter(Boolean))];
export const manifestMediaKeys = (manifest) => unique((manifest?.photos || []).flatMap((photo) => [
  photo && typeof photo === "object" ? photo.storageKey : "",
  photo && typeof photo === "object" ? photo.thumbnailKey : "",
]));

export const siteMediaKeys = (site) => {
  const keys = [];
  const visited = new WeakSet();
  const visit = (value) => {
    if (typeof value === "string") {
      const pathname = value.split("?")[0];
      const match = pathname.match(/^\/media\/((?:uploads|thumbnails)\/[A-Za-z0-9_./-]+)$/);
      if (match && !match[1].includes("..")) keys.push(match[1]);
      return;
    }
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(site);
  return unique(keys);
};

export const backupMediaKeys = (backup) => unique([
  ...(Array.isArray(backup?.mediaKeys) ? backup.mediaKeys : []),
  ...manifestMediaKeys(backup?.manifest),
  ...siteMediaKeys(backup?.site),
]);

export const protectedBackupMediaKeys = async (bucket, index) => {
  const keys = new Set(Array.isArray(index?.mediaKeys) ? index.mediaKeys : []);
  const entries = (Array.isArray(index?.backups) ? index.backups : [])
    .filter((entry) => /^[A-Za-z0-9-]{8,80}$/.test(String(entry?.id || "")));
  const backups = await Promise.all(entries.map((entry) => readJson(
    bucket,
    backupObjectKey(entry.id),
    null,
  )));
  backups.forEach((backup) => backupMediaKeys(backup).forEach((key) => keys.add(key)));
  return [...keys];
};

const backupObjectKey = (id) => `backups/${id}.json`;
const MAX_BACKUPS = 20;

export const createBackup = async (bucket, reason = "自动备份") => {
  const [site, manifest] = await Promise.all([
    loadSite(bucket),
    loadManifest(bucket),
  ]);
  const createdAt = new Date().toISOString();
  const id = `${createdAt.replace(/[^0-9]/g, "").slice(0, 17)}-${crypto.randomUUID().slice(0, 8)}`;
  const mediaKeys = unique([
    ...manifestMediaKeys(manifest),
    ...siteMediaKeys(site),
  ]);
  const backup = { id, createdAt, reason, site, manifest, mediaKeys };
  await writeJson(bucket, backupObjectKey(id), backup);

  const entry = {
    id,
    createdAt,
    reason,
    photoCount: Array.isArray(manifest.photos) ? manifest.photos.length : 0,
    mediaCount: mediaKeys.length,
  };
  let removed = [];
  let indexed = false;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const index = await loadBackupIndex(bucket);
    const previousEntries = Array.isArray(index.backups) ? index.backups : [];
    if (previousEntries.some((item) => item.id === id)) {
      indexed = true;
      break;
    }
    const backups = [entry, ...previousEntries];
    const attemptRemoved = backups.splice(MAX_BACKUPS);
    const retainedMediaKeys = new Set(mediaKeys);
    for (const retained of backups.slice(1)) {
      const item = await readJson(bucket, backupObjectKey(retained.id), null);
      backupMediaKeys(item).forEach((key) => retainedMediaKeys.add(key));
    }
    try {
      await writeJson(bucket, KEYS.backups, {
        updatedAt: createdAt,
        backups,
        mediaKeys: [...retainedMediaKeys].sort(),
      }, { expectedEtag: storageEtag(index) });
      removed = attemptRemoved;
      indexed = true;
      break;
    } catch (error) {
      lastError = error;
      if (!(error instanceof HttpError) || error.status !== 409) break;
    }
  }
  if (!indexed) {
    await bucket.delete(backupObjectKey(id)).catch(() => {});
    throw lastError || new HttpError(409, "Conflict", "无法在并发更新后创建备份，请重试。");
  }
  if (removed.length) {
    await bucket.delete(removed.map((item) => backupObjectKey(item.id))).catch((error) => {
      console.error(JSON.stringify({
        message: "Could not remove evicted backup objects",
        error: error instanceof Error ? error.message : String(error),
      }));
    });
  }
  return backup;
};

export const getBackup = async (bucket, id) => {
  if (!/^[A-Za-z0-9-]{8,80}$/.test(id)) throw new HttpError(400, "Bad Request", "Invalid backup id");
  const index = await loadBackupIndex(bucket);
  if (!Array.isArray(index.backups) || !index.backups.some((backup) => backup.id === id)) {
    throw new HttpError(404, "Not Found", "Backup not found");
  }
  const backup = await readJson(bucket, backupObjectKey(id), null);
  if (!backup) throw new HttpError(404, "Not Found", "Backup not found");
  return backup;
};

export const removeBackup = async (bucket, id) => {
  let updated;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const index = await loadBackupIndex(bucket);
    const entries = Array.isArray(index.backups) ? index.backups : [];
    const backups = entries.filter((backup) => backup.id !== id);
    if (backups.length === entries.length) throw new HttpError(404, "Not Found", "Backup not found");

    const mediaKeys = new Set();
    for (const entry of backups) {
      const backup = await readJson(bucket, backupObjectKey(entry.id), null);
      backupMediaKeys(backup).forEach((key) => mediaKeys.add(key));
    }
    const candidate = {
      updatedAt: new Date().toISOString(),
      backups,
      mediaKeys: [...mediaKeys].sort(),
    };
    try {
      updated = await writeJson(bucket, KEYS.backups, candidate, {
        expectedEtag: storageEtag(index),
      });
      break;
    } catch (error) {
      lastError = error;
      if (!(error instanceof HttpError) || error.status !== 409) break;
    }
  }
  if (!updated) throw lastError || new HttpError(409, "Conflict", "无法在并发更新后删除备份，请重试。");
  await bucket.delete(backupObjectKey(id)).catch((error) => {
    console.error(JSON.stringify({
      message: "Could not remove unlisted backup object",
      error: error instanceof Error ? error.message : String(error),
    }));
  });
  return updated;
};

export const listAllObjects = async (bucket, maximumObjects = 100_000) => {
  const objects = [];
  let cursor;
  do {
    const page = await bucket.list({ cursor, limit: 1000 });
    objects.push(...page.objects);
    if (objects.length > maximumObjects) {
      throw new HttpError(503, "Storage Audit Too Large", `Object count exceeds the ${maximumObjects} item safety limit`);
    }
    if (page.truncated && (!page.cursor || page.cursor === cursor)) {
      throw new HttpError(503, "Storage Unavailable", "R2 returned an invalid pagination cursor");
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects;
};

export const etagFor = (scope, version) => {
  const source = version && typeof version === "object"
    ? storageEtag(version) || `${version.updatedAt || "0"}-${Number(version.revision) || 0}`
    : version;
  const token = String(source || "0").replace(/[^A-Za-z0-9._~-]/g, "") || "0";
  return `W/"${scope}-${token}"`;
};

export const jsonCacheHeaders = (scope, version) => {
  const headers = {
    "cache-control": "public, max-age=0, must-revalidate",
    etag: etagFor(scope, version),
  };
  const updatedAt = version && typeof version === "object" ? version.updatedAt : version;
  const timestamp = Date.parse(updatedAt || "");
  if (Number.isFinite(timestamp)) headers["last-modified"] = new Date(timestamp).toUTCString();
  return headers;
};
