import {
  HttpError,
  empty,
  handleError,
  ifNoneMatchMatches,
  json,
  methodNotAllowed,
  notFound,
  parseJsonBody,
  requireAdmin,
  requireSameOrigin,
} from "../_shared/http.js";
import {
  KEYS,
  createBackup,
  etagFor,
  getBackup,
  getBucket,
  jsonCacheHeaders,
  listAllObjects,
  loadBackupIndex,
  loadManifest,
  loadSite,
  manifestMediaKeys,
  protectedBackupMediaKeys,
  removeBackup,
  saveManifest,
  saveSite,
  siteMediaKeys,
  storageEtag,
  withMutationLease,
  writeJson,
} from "../_shared/storage.js";

const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 4 * 1024 * 1024;
const MAX_UPLOAD_FORM_BYTES = MAX_IMAGE_BYTES + MAX_THUMBNAIL_BYTES + 1024 * 1024;
const MAX_THUMBNAIL_FORM_BYTES = 12 * MAX_THUMBNAIL_BYTES + 1024 * 1024;
const MAX_SITE_JSON_BYTES = 1024 * 1024;
const MAX_PHOTO_PATCH_BYTES = 64 * 1024;
const MAX_BATCH_PATCH_BYTES = 256 * 1024;
const MAX_BACKUP_REASON_BYTES = 16 * 1024;
const MAX_AUDIT_REQUEST_BYTES = 16 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
]);
const IMAGE_TYPE_EXTENSIONS = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/tiff": ".tiff",
  "image/webp": ".webp",
};
const PHOTO_TEXT_FIELDS = [
  "title",
  "alt",
  "airline",
  "aircraft",
  "registration",
  "airport",
  "capturedAt",
  "phase",
  "spot",
  "notes",
];

const cleanText = (value, maximum = 500) => String(value ?? "").trim().slice(0, maximum);
const normalizeCategories = (value) => {
  const values = Array.isArray(value) ? value : String(value || "").split(/[\s,]+/);
  const selected = [...new Set(values
    .filter((item) => ["string", "number"].includes(typeof item))
    .map((item) => cleanText(item, 24).toLowerCase().replace(/[^a-z0-9_-]/g, ""))
    .filter(Boolean))].slice(0, 12);
  return selected.length ? selected : ["day"];
};
const normalizeLayout = (value) => ["standard", "featured", "vertical"].includes(value) ? value : "standard";
const normalizeAirport = (value) => {
  const code = cleanText(value, 8).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
};
const randomSuffix = () => crypto.randomUUID().slice(0, 8);
const imageExtension = (contentType) => IMAGE_TYPE_EXTENSIONS[contentType] || ".jpg";

const safeFilename = (filename, contentType) => {
  const normalized = cleanText(filename, 180).normalize("NFKD").toLowerCase();
  const stem = normalized
    .replace(/\.[a-z0-9]{2,8}$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "aviation-photo";
  return `${stem}${imageExtension(contentType)}`;
};

const routePath = (params) => {
  const value = params?.path;
  return (Array.isArray(value) ? value.join("/") : String(value || ""))
    .split("/")
    .filter(Boolean);
};

const decodePathSegment = (value, label) => {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpError(400, "Bad Request", `Invalid ${label}`);
  }
};

const versionedJson = (request, scope, data, headers = jsonCacheHeaders(scope, data)) => {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatchMatches(ifNoneMatch, headers.etag)) return empty(304, headers);
  if (!ifNoneMatch) {
    const ifModifiedSince = Date.parse(request.headers.get("if-modified-since") || "");
    const lastModified = Date.parse(headers["last-modified"] || "");
    if (Number.isFinite(ifModifiedSince)
      && Number.isFinite(lastModified)
      && Math.floor(lastModified / 1000) <= Math.floor(ifModifiedSince / 1000)) {
      return empty(304, headers);
    }
  }
  return json(data, { headers });
};

const requireWritableDeployment = (env) => {
  const explicitlyReadOnly = String(env.HUGO_READ_ONLY ?? "").trim().toLowerCase();
  if (explicitlyReadOnly === "false") return;
  if (explicitlyReadOnly === "true") {
    throw new HttpError(403, "Preview Is Read-Only", "Mutations are disabled in this deployment");
  }
  const branch = String(env.CF_PAGES_BRANCH || "").trim();
  if (branch && branch !== "main") {
    throw new HttpError(403, "Preview Is Read-Only", `Mutations are disabled on the ${branch} preview branch`);
  }
};

const requireMutationAccess = async (request, env) => {
  await requireAdmin(request, env);
  requireSameOrigin(request);
  requireWritableDeployment(env);
};

const parseMultipartBody = async (request, maximumBytes) => {
  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data\s*;/i.test(contentType) || !/\bboundary=/i.test(contentType)) {
    throw new HttpError(415, "Unsupported Media Type", "Expected a multipart/form-data request body");
  }
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader != null && !/^\d+$/.test(lengthHeader.trim())) {
    throw new HttpError(400, "Bad Request", "Invalid Content-Length header");
  }
  const declaredLength = lengthHeader == null ? null : Number(lengthHeader);
  if (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength > maximumBytes)) {
    throw new HttpError(413, "Payload Too Large");
  }
  let form;
  let receivedBytes = 0;
  try {
    if (!request.body) throw new HttpError(400, "Bad Request", "Missing multipart form body");
    // Bound the wire bytes before the multipart parser buffers files. A chunked
    // request can omit Content-Length, so validating parsed fields alone is late.
    const boundedBody = request.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        receivedBytes += chunk.byteLength;
        if (receivedBytes > maximumBytes) {
          controller.error(new HttpError(413, "Payload Too Large"));
          return;
        }
        controller.enqueue(chunk);
      },
    }));
    form = await new Response(boundedBody, { headers: { "content-type": contentType } }).formData();
  } catch {
    if (receivedBytes > maximumBytes) throw new HttpError(413, "Payload Too Large");
    throw new HttpError(400, "Bad Request", "Expected a valid multipart form body");
  }
  let measuredBytes = 0;
  for (const [name, value] of form.entries()) {
    measuredBytes += new TextEncoder().encode(name).byteLength;
    measuredBytes += typeof value === "string"
      ? new TextEncoder().encode(value).byteLength
      : Number(value.size || 0);
    if (measuredBytes > maximumBytes) throw new HttpError(413, "Payload Too Large");
  }
  return form;
};

const bytesMatch = (bytes, expected, offset = 0) => expected.every((byte, index) => bytes[offset + index] === byte);
const ascii = (bytes, offset, length) => String.fromCharCode(...bytes.slice(offset, offset + length));
const isoBmffBrands = (bytes) => {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return [];
  const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (boxSize < 16 || boxSize % 4 !== 0) return [];
  const brands = [ascii(bytes, 8, 4)];
  for (let offset = 16; offset + 4 <= Math.min(bytes.length, boxSize); offset += 4) brands.push(ascii(bytes, offset, 4));
  return brands;
};

const sniffImageType = (bytes) => {
  if (bytesMatch(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytesMatch(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytesMatch(bytes, [0x49, 0x49, 0x2a, 0x00]) || bytesMatch(bytes, [0x4d, 0x4d, 0x00, 0x2a])) {
    return "image/tiff";
  }
  const brands = isoBmffBrands(bytes);
  if (brands.some((brand) => brand === "avif" || brand === "avis")) return "image/avif";
  if (brands.some((brand) => ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"].includes(brand))) {
    return "image/heic";
  }
  if (brands.some((brand) => brand === "mif1" || brand === "msf1")) return "image/heif";
  return "";
};

const validateImage = async (file, label = "file", maximumBytes = MAX_IMAGE_BYTES) => {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
    throw new HttpError(400, "Bad Request", `Missing ${label}`);
  }
  const contentType = cleanText(file.type, 80).toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new HttpError(415, "Unsupported Media Type", `${label} must be a supported image`);
  }
  if (file.size > maximumBytes) {
    throw new HttpError(413, "Payload Too Large", `${label} exceeds ${Math.floor(maximumBytes / 1024 / 1024)} MB`);
  }
  const signature = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const detectedType = sniffImageType(signature);
  const compatibleHeif = contentType === "image/heif" && detectedType === "image/heic";
  if (detectedType !== contentType && !compatibleHeif) {
    throw new HttpError(415, "Unsupported Media Type", `${label} contents do not match its declared image type`);
  }
  return contentType;
};

const photoFieldsFromForm = (form) => {
  const photo = {};
  for (const field of PHOTO_TEXT_FIELDS) {
    const maximum = field === "notes" ? 2000 : field === "alt" ? 700 : 300;
    const value = form.get(field);
    if (value != null && typeof value !== "string") {
      throw new HttpError(400, "Bad Request", `${field} must be text`);
    }
    photo[field] = cleanText(value, maximum);
  }
  const suppliedAirport = photo.airport;
  photo.airport = normalizeAirport(suppliedAirport);
  if (suppliedAirport && !photo.airport) {
    throw new HttpError(400, "Bad Request", "airport must be a three-letter IATA code");
  }
  const categoryValue = form.get("categories");
  if (categoryValue != null && typeof categoryValue !== "string") {
    throw new HttpError(400, "Bad Request", "categories must be text");
  }
  photo.categories = normalizeCategories(categoryValue);
  const layoutValue = form.get("layout");
  if (layoutValue != null && typeof layoutValue !== "string") {
    throw new HttpError(400, "Bad Request", "layout must be text");
  }
  const suppliedLayout = cleanText(layoutValue, 24);
  if (suppliedLayout && !["standard", "featured", "vertical"].includes(suppliedLayout)) {
    throw new HttpError(400, "Bad Request", "layout is invalid");
  }
  photo.layout = normalizeLayout(suppliedLayout);
  photo.featured = photo.layout === "featured";
  return photo;
};

const handlePhotoUpload = async (request, bucket) => {
  const form = await parseMultipartBody(request, MAX_UPLOAD_FORM_BYTES);
  const file = form.get("file");
  const thumbnail = form.get("thumbnail");
  const contentType = await validateImage(file);
  const thumbnailType = thumbnail && typeof thumbnail.arrayBuffer === "function" && thumbnail.size
    ? await validateImage(thumbnail, "thumbnail", MAX_THUMBNAIL_BYTES)
    : "";
  const fields = photoFieldsFromForm(form);
  const manifest = await loadManifest(bucket);
  if (manifest.photos.length >= 5000) {
    throw new HttpError(409, "Photo Limit Reached", "The photo library already contains 5000 items");
  }
  const now = new Date();
  const timestamp = now.getTime();
  const id = `photo-${timestamp}-${randomSuffix()}`;
  const filename = safeFilename(file.name, contentType);
  const storageKey = `uploads/${now.getUTCFullYear()}/${crypto.randomUUID()}-${filename}`;
  const thumbnailKey = thumbnailType ? `thumbnails/${id}${imageExtension(thumbnailType)}` : "";

  await bucket.put(storageKey, file, { httpMetadata: { contentType } });
  try {
    if (thumbnailKey) {
      await bucket.put(thumbnailKey, thumbnail, { httpMetadata: { contentType: thumbnailType } });
    }
    const photo = {
      id,
      src: `/media/${storageKey}`,
      storageKey,
      thumbSrc: thumbnailKey ? `/media/${thumbnailKey}?v=${timestamp}` : "",
      thumbnailKey,
      ...fields,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const updatedManifest = await saveManifest(bucket, manifest, [photo, ...(manifest.photos || [])]);
    return json({ photo, manifest: updatedManifest });
  } catch (error) {
    await bucket.delete([storageKey, thumbnailKey].filter(Boolean)).catch(() => {});
    throw error;
  }
};

const normalizePhotoTextUpdate = (value, field) => {
  if (value != null && !["string", "number"].includes(typeof value)) {
    throw new HttpError(400, "Bad Request", `${field} must be text`);
  }
  const maximum = field === "notes" ? 2000 : field === "alt" ? 700 : 300;
  return cleanText(value, maximum);
};

const patchPhotoFields = (photo, updates) => {
  const next = { ...photo };
  let changed = false;
  for (const field of PHOTO_TEXT_FIELDS) {
    if (field === "airport") continue;
    if (!(field in updates)) continue;
    const value = normalizePhotoTextUpdate(updates[field], field);
    if (next[field] !== value) changed = true;
    next[field] = value;
  }
  if ("airport" in updates) {
    const suppliedAirport = normalizePhotoTextUpdate(updates.airport, "airport");
    const airport = normalizeAirport(suppliedAirport);
    if (suppliedAirport && !airport) throw new HttpError(400, "Bad Request", "airport must be a three-letter IATA code");
    if (next.airport !== airport) changed = true;
    next.airport = airport;
  }
  if ("categories" in updates) {
    if (!Array.isArray(updates.categories) && typeof updates.categories !== "string") {
      throw new HttpError(400, "Bad Request", "categories must be text or an array");
    }
    const categories = normalizeCategories(updates.categories);
    if (JSON.stringify(next.categories || []) !== JSON.stringify(categories)) changed = true;
    next.categories = categories;
  }
  if ("layout" in updates) {
    const suppliedLayout = cleanText(updates.layout, 24);
    if (!["standard", "featured", "vertical"].includes(suppliedLayout)) {
      throw new HttpError(400, "Bad Request", "layout is invalid");
    }
    if (next.layout !== suppliedLayout) changed = true;
    next.layout = suppliedLayout;
  }
  const featured = next.layout === "featured";
  if (next.featured !== featured) changed = true;
  next.featured = featured;
  if (changed) next.updatedAt = new Date().toISOString();
  return { changed, photo: next };
};

const handlePhotoPatch = async (request, bucket, id) => {
  const updates = await parseJsonBody(request, MAX_PHOTO_PATCH_BYTES);
  const allowedFields = new Set([...PHOTO_TEXT_FIELDS, "categories", "layout", "move"]);
  const unknownFields = Object.keys(updates).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) {
    throw new HttpError(400, "Bad Request", `Unsupported photo fields: ${unknownFields.slice(0, 5).join(", ")}`);
  }
  if (!Object.keys(updates).length) throw new HttpError(400, "Bad Request", "No photo updates supplied");
  const move = cleanText(updates.move, 12);
  if (move && !["front", "up", "down"].includes(move)) {
    throw new HttpError(400, "Bad Request", "move is invalid");
  }
  const manifest = await loadManifest(bucket);
  const index = (manifest.photos || []).findIndex((photo) => photo.id === id);
  if (index < 0) return notFound("Photo not found");

  const photos = [...manifest.photos];
  const patched = patchPhotoFields(photos[index], updates);
  const photo = patched.photo;
  photos[index] = photo;
  let moved = false;
  if (move === "front" && index > 0) {
    photos.unshift(...photos.splice(index, 1));
    moved = true;
  }
  if (move === "up" && index > 0) {
    [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
    moved = true;
  }
  if (move === "down" && index < photos.length - 1) {
    [photos[index + 1], photos[index]] = [photos[index], photos[index + 1]];
    moved = true;
  }
  if (!patched.changed && !moved) return json({ photo, manifest });

  await createBackup(bucket, `编辑作品前自动备份：${manifest.photos[index].title || id}`);
  const updatedManifest = await saveManifest(bucket, manifest, photos);
  return json({ photo, manifest: updatedManifest });
};

const handlePhotoDelete = async (bucket, id) => {
  const manifest = await loadManifest(bucket);
  const photo = (manifest.photos || []).find((item) => item.id === id);
  if (!photo) return notFound("Photo not found");
  await createBackup(bucket, `删除作品前自动备份：${photo.title || id}`);
  const updatedManifest = await saveManifest(
    bucket,
    manifest,
    manifest.photos.filter((item) => item.id !== id),
  );
  return json({ deleted: 1, manifest: updatedManifest });
};

const handlePhotoBatch = async (request, bucket) => {
  const body = await parseJsonBody(request, MAX_BATCH_PATCH_BYTES);
  if (!Array.isArray(body.ids) || body.ids.length > 500 || body.ids.some((id) => typeof id !== "string")) {
    throw new HttpError(400, "Bad Request", "ids must be an array of at most 500 photo ids");
  }
  if (!body.updates || typeof body.updates !== "object" || Array.isArray(body.updates)) {
    throw new HttpError(400, "Bad Request", "updates must be an object");
  }
  if ("onlyEmpty" in body && typeof body.onlyEmpty !== "boolean") {
    throw new HttpError(400, "Bad Request", "onlyEmpty must be a boolean");
  }
  const selectedIds = new Set(body.ids);
  const updates = body.updates;
  if (!selectedIds.size) throw new HttpError(400, "Bad Request", "No photo ids supplied");
  const allowedFields = new Set([...PHOTO_TEXT_FIELDS, "categories", "layout"]);
  const unknownFields = Object.keys(updates).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) {
    throw new HttpError(400, "Bad Request", `Unsupported batch fields: ${unknownFields.slice(0, 5).join(", ")}`);
  }
  if (!Object.keys(updates).length) throw new HttpError(400, "Bad Request", "No batch updates supplied");
  const manifest = await loadManifest(bucket);
  let updated = 0;
  const photos = manifest.photos.map((photo) => {
    if (!selectedIds.has(photo.id)) return photo;
    const applicable = {};
    for (const [field, value] of Object.entries(updates)) {
      if (!PHOTO_TEXT_FIELDS.includes(field) && !["categories", "layout"].includes(field)) continue;
      const empty = field === "categories"
        ? !Array.isArray(photo.categories) || !photo.categories.length
        : !photo[field];
      if (!body.onlyEmpty || empty) applicable[field] = value;
    }
    if (!Object.keys(applicable).length) return photo;
    const patched = patchPhotoFields(photo, applicable);
    if (!patched.changed) return photo;
    updated += 1;
    return patched.photo;
  });
  if (!updated) return json({ updated: 0, manifest });
  await createBackup(bucket, "批量整理作品前自动备份");
  const updatedManifest = await saveManifest(bucket, manifest, photos);
  return json({ updated, manifest: updatedManifest });
};

const handleThumbnailUpload = async (request, bucket) => {
  const form = await parseMultipartBody(request, MAX_THUMBNAIL_FORM_BYTES);
  const ids = form.getAll("id").map(String);
  const thumbnails = form.getAll("thumbnail");
  if (!ids.length || ids.length !== thumbnails.length || ids.length > 12) {
    throw new HttpError(400, "Bad Request", "Thumbnail ids and files must be paired");
  }
  if (new Set(ids).size !== ids.length) {
    throw new HttpError(400, "Bad Request", "Thumbnail ids must be unique");
  }
  const manifest = await loadManifest(bucket);
  const photosById = new Map(manifest.photos.map((photo) => [photo.id, photo]));
  const timestamp = Date.now();
  const updatedAt = new Date(timestamp).toISOString();
  const prepared = await Promise.all(ids.map(async (id, index) => {
    const file = thumbnails[index];
    const contentType = await validateImage(file, "thumbnail", MAX_THUMBNAIL_BYTES);
    const current = photosById.get(id);
    if (!current) throw new HttpError(404, "Not Found", `Photo not found: ${id}`);
    const thumbnailKey = `thumbnails/${id}-${timestamp}-${randomSuffix()}${imageExtension(contentType)}`;
    return { id, file, contentType, current, thumbnailKey };
  }));

  if (prepared.some((item) => item.current.thumbnailKey)) {
    await createBackup(bucket, "更新已有缩略图前自动备份");
  }
  const writtenKeys = [];
  try {
    for (const item of prepared) {
      await bucket.put(item.thumbnailKey, item.file, {
        httpMetadata: { contentType: item.contentType },
      });
      writtenKeys.push(item.thumbnailKey);
    }
    const updates = new Map(prepared.map((item) => [item.id, {
      ...item.current,
      thumbnailKey: item.thumbnailKey,
      thumbSrc: `/media/${item.thumbnailKey}?v=${timestamp}`,
      updatedAt,
    }]));
    const photos = manifest.photos.map((photo) => updates.get(photo.id) || photo);
    const updatedManifest = await saveManifest(bucket, manifest, photos);
    return json({ photos: [...updates.values()], manifest: updatedManifest });
  } catch (error) {
    if (writtenKeys.length) await bucket.delete(writtenKeys).catch(() => {});
    throw error;
  }
};

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const requireRecord = (value, label) => {
  if (!isRecord(value)) throw new HttpError(400, "Bad Request", `${label} must be an object`);
  return value;
};
const requireRecordArray = (value, label, maximum) => {
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => !isRecord(item))) {
    throw new HttpError(400, "Bad Request", `${label} must be an array of objects`);
  }
  return value;
};

const requireTextField = (record, field, label, maximum) => {
  if (typeof record[field] !== "string") {
    throw new HttpError(400, "Bad Request", `${label}.${field} must be text`);
  }
  return cleanText(record[field], maximum);
};

const validateJsonTree = (root) => {
  const seen = new WeakSet();
  let nodes = 0;
  const visit = (value, depth) => {
    nodes += 1;
    if (nodes > 10_000 || depth > 12) {
      throw new HttpError(400, "Bad Request", "Site payload is too deeply nested or complex");
    }
    if (value == null || typeof value === "boolean") return;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new HttpError(400, "Bad Request", "Site payload contains a non-finite number");
      return;
    }
    if (typeof value === "string") {
      if (value.length > 16_000) throw new HttpError(400, "Bad Request", "Site payload contains an oversized text value");
      return;
    }
    if (typeof value !== "object" || seen.has(value)) {
      throw new HttpError(400, "Bad Request", "Site payload contains an unsupported value");
    }
    seen.add(value);
    if (Array.isArray(value)) {
      if (value.length > 500) throw new HttpError(400, "Bad Request", "Site payload contains an oversized array");
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key.length > 120) throw new HttpError(400, "Bad Request", "Site payload contains an oversized field name");
      visit(child, depth + 1);
    }
  };
  visit(root, 0);
};

const validMediaKey = (key, prefix) => {
  if (typeof key !== "string" || key.length > 512 || !key.startsWith(`${prefix}/`)) return false;
  if (!/^[A-Za-z0-9_./-]+$/.test(key)) return false;
  return !key.split("/").some((segment) => !segment || segment === "." || segment === "..");
};

const normalizeMediaSource = (value, label, { required = false } = {}) => {
  if (typeof value !== "string") throw new HttpError(400, "Bad Request", `${label} must be text`);
  const source = value.trim();
  if (!source && !required) return "";
  const match = source.match(/^\/media\/((?:uploads|thumbnails)\/[A-Za-z0-9_./-]+)(\?v=[A-Za-z0-9._~-]{1,80})?$/);
  if (!match || (!validMediaKey(match[1], "uploads") && !validMediaKey(match[1], "thumbnails"))) {
    throw new HttpError(400, "Bad Request", `${label} must reference a valid /media/uploads or /media/thumbnails object`);
  }
  return source;
};

const normalizeContactHref = (value, label) => {
  if (typeof value !== "string") throw new HttpError(400, "Bad Request", `${label} must be text`);
  const href = value.trim();
  if (!href) return "";
  if (href.length > 2048 || /[\u0000-\u001f\u007f]/.test(href)) {
    throw new HttpError(400, "Bad Request", `${label} is invalid`);
  }
  let parsed;
  try {
    parsed = new URL(href);
  } catch {
    throw new HttpError(400, "Bad Request", `${label} is not a valid URL`);
  }
  if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return href;
  if (parsed.protocol === "mailto:" && parsed.pathname.includes("@")) return href;
  throw new HttpError(400, "Bad Request", `${label} must use https: or mailto:`);
};

const validateSite = (value) => {
  requireRecord(value, "Site payload");
  validateJsonTree(value);
  if (value.localization !== undefined) {
    const localization = requireRecord(value.localization, "Site localization");
    if (localization.version !== 1) throw new HttpError(400, "Bad Request", "Unsupported localization version");
    const entries = requireRecord(localization.entries, "Site localization.entries");
    if (Object.keys(entries).length > 1500) throw new HttpError(400, "Bad Request", "Too many translations (maximum 1500)");
    const sources = new Set();
    for (const [key, entry] of Object.entries(entries)) {
      if (!/^entry_[0-9]+$/.test(key)) throw new HttpError(400, "Bad Request", "Invalid translation entry key");
      requireRecord(entry, "Translation entry");
      if (Object.keys(entry).some(field => !["source", "zh", "en"].includes(field))
        || typeof entry.source !== "string" || !entry.source.trim() || entry.source !== entry.source.trim()
        || sources.has(entry.source)) throw new HttpError(400, "Bad Request", "Invalid or duplicate translation source");
      sources.add(entry.source);
      for (const locale of ["zh", "en"]) {
        if (entry[locale] !== undefined && (typeof entry[locale] !== "string" || !entry[locale].trim())) {
          throw new HttpError(400, "Bad Request", "Translations must be non-empty text");
        }
      }
      if (entry.zh === undefined && entry.en === undefined) throw new HttpError(400, "Bad Request", "Translation entry is empty");
    }
  }
  const home = requireRecord(value.home, "Site home");
  const hero = requireRecord(home.hero, "Site home.hero");
  const metrics = requireRecordArray(home.metrics, "Site home.metrics", 50);
  const images = requireRecordArray(home.images, "Site home.images", 100);
  const airportCovers = requireRecord(home.airportCovers, "Site home.airportCovers");
  const story = requireRecord(home.story, "Site home.story");
  const storyBlocks = requireRecordArray(story.blocks, "Site home.story.blocks", 100);
  const journal = requireRecord(home.journal, "Site home.journal");
  const journalPosts = requireRecordArray(journal.posts, "Site home.journal.posts", 100);
  const about = requireRecord(home.about, "Site home.about");
  const aboutStats = requireRecordArray(about.stats, "Site home.about.stats", 100);
  const contact = requireRecord(home.contact, "Site home.contact");

  const normalizedCovers = {};
  const coverEntries = Object.entries(airportCovers);
  if (coverEntries.length > 100) throw new HttpError(400, "Bad Request", "Site home.airportCovers has too many entries");
  for (const [code, source] of coverEntries) {
    if (!/^[A-Z]{3}$/.test(code)) throw new HttpError(400, "Bad Request", `Invalid airport cover code: ${code}`);
    const cover = requireRecord(source, `Site home.airportCovers.${code}`);
    normalizedCovers[code] = {
      ...cover,
      src: normalizeMediaSource(cover.src, `Site home.airportCovers.${code}.src`, { required: true }),
      alt: requireTextField(cover, "alt", `Site home.airportCovers.${code}`, 700),
    };
  }

  const normalizedContact = { ...contact };
  for (const field of ["emailLabel", "douyinLabel", "instagramLabel", "jetphotosLabel"]) {
    normalizedContact[field] = requireTextField(contact, field, "Site home.contact", 200);
  }
  for (const field of ["emailHref", "douyinHref", "instagramHref", "jetphotosHref"]) {
    normalizedContact[field] = normalizeContactHref(contact[field], `Site home.contact.${field}`);
  }

  const normalized = {
    ...value,
    home: {
      ...home,
      hero: {
        ...hero,
        eyebrow: requireTextField(hero, "eyebrow", "Site home.hero", 300),
        greeting: requireTextField(hero, "greeting", "Site home.hero", 300),
        welcome: requireTextField(hero, "welcome", "Site home.hero", 500),
        primaryButton: requireTextField(hero, "primaryButton", "Site home.hero", 200),
        secondaryButton: requireTextField(hero, "secondaryButton", "Site home.hero", 200),
      },
      metrics: metrics.map((metric, index) => ({
        ...metric,
        label: requireTextField(metric, "label", `Site home.metrics.${index}`, 120),
        value: requireTextField(metric, "value", `Site home.metrics.${index}`, 300),
      })),
      images: images.map((image, index) => ({
        ...image,
        ...(image.slot == null ? {} : { slot: requireTextField(image, "slot", `Site home.images.${index}`, 120) }),
        src: normalizeMediaSource(image.src, `Site home.images.${index}.src`),
        alt: requireTextField(image, "alt", `Site home.images.${index}`, 700),
        title: requireTextField(image, "title", `Site home.images.${index}`, 300),
        description: requireTextField(image, "description", `Site home.images.${index}`, 2000),
      })),
      airportCovers: normalizedCovers,
      story: {
        ...story,
        blocks: storyBlocks.map((block, index) => ({
          ...block,
          title: requireTextField(block, "title", `Site home.story.blocks.${index}`, 300),
          body: requireTextField(block, "body", `Site home.story.blocks.${index}`, 4000),
        })),
      },
      journal: {
        ...journal,
        title: requireTextField(journal, "title", "Site home.journal", 300),
        intro: requireTextField(journal, "intro", "Site home.journal", 2000),
        posts: journalPosts.map((post, index) => ({
          ...post,
          date: requireTextField(post, "date", `Site home.journal.posts.${index}`, 160),
          title: requireTextField(post, "title", `Site home.journal.posts.${index}`, 300),
          body: requireTextField(post, "body", `Site home.journal.posts.${index}`, 4000),
        })),
      },
      about: {
        ...about,
        title: requireTextField(about, "title", "Site home.about", 300),
        body: requireTextField(about, "body", "Site home.about", 4000),
        stats: aboutStats.map((stat, index) => ({
          ...stat,
          value: requireTextField(stat, "value", `Site home.about.stats.${index}`, 120),
          label: requireTextField(stat, "label", `Site home.about.stats.${index}`, 200),
        })),
      },
      contact: normalizedContact,
    },
  };
  delete normalized.updatedAt;
  return normalized;
};

const validateImportedPhotos = (photos) => {
  if (!Array.isArray(photos) || photos.length > 5000) {
    throw new HttpError(400, "Bad Request", "Backup manifest.photos must be an array of at most 5000 items");
  }
  const ids = new Set();
  const storageKeys = new Set();
  const thumbnailKeys = new Set();
  return photos.map((source, index) => {
    const photo = requireRecord(source, `Backup photo ${index + 1}`);
    const id = typeof photo.id === "string" ? photo.id.trim() : "";
    const storageKey = typeof photo.storageKey === "string" ? photo.storageKey.trim() : "";
    const thumbnailKey = typeof photo.thumbnailKey === "string" ? photo.thumbnailKey.trim() : "";
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(id) || ids.has(id)) {
      throw new HttpError(400, "Bad Request", `Backup photo ${index + 1} has an invalid or duplicate id`);
    }
    if (!validMediaKey(storageKey, "uploads") || storageKeys.has(storageKey)) {
      throw new HttpError(400, "Bad Request", `Backup photo ${index + 1} has an invalid or duplicate storageKey`);
    }
    const src = normalizeMediaSource(photo.src, `Backup photo ${index + 1}.src`, { required: true });
    if (src.split("?")[0] !== `/media/${storageKey}`) {
      throw new HttpError(400, "Bad Request", `Backup photo ${index + 1} has a mismatched src`);
    }
    let thumbSrc = "";
    if (thumbnailKey) {
      thumbSrc = normalizeMediaSource(photo.thumbSrc, `Backup photo ${index + 1}.thumbSrc`, { required: true });
      if (!validMediaKey(thumbnailKey, "thumbnails")
        || thumbnailKeys.has(thumbnailKey)
        || thumbSrc.split("?")[0] !== `/media/${thumbnailKey}`) {
        throw new HttpError(400, "Bad Request", `Backup photo ${index + 1} has an invalid thumbnail reference`);
      }
      thumbnailKeys.add(thumbnailKey);
    } else if (photo.thumbSrc) {
      throw new HttpError(400, "Bad Request", `Backup photo ${index + 1} has thumbSrc without thumbnailKey`);
    }
    ids.add(id);
    storageKeys.add(storageKey);
    const normalized = {
      id,
      src,
      storageKey,
      thumbSrc,
      thumbnailKey,
    };
    for (const field of PHOTO_TEXT_FIELDS) {
      const maximum = field === "notes" ? 2000 : field === "alt" ? 700 : 300;
      normalized[field] = cleanText(photo[field], maximum);
    }
    normalized.airport = normalizeAirport(normalized.airport);
    normalized.categories = normalizeCategories(photo.categories);
    normalized.layout = normalizeLayout(cleanText(photo.layout, 24));
    normalized.featured = normalized.layout === "featured";
    normalized.createdAt = cleanText(photo.createdAt, 80);
    normalized.updatedAt = cleanText(photo.updatedAt, 80);
    return normalized;
  });
};

const validateBackupPayload = (value) => {
  requireRecord(value, "Backup payload");
  const sourceManifest = requireRecord(value.manifest, "Backup manifest");
  const site = validateSite(value.site);
  const photos = validateImportedPhotos(sourceManifest.photos);
  return {
    manifest: {
      ...sourceManifest,
      revision: Math.max(0, Number(sourceManifest.revision) || 0),
      photos,
    },
    site,
  };
};

const restoreData = async (bucket, source, reason) => {
  const { manifest, site } = validateBackupPayload(source);
  const [currentManifest, currentSite, objects] = await Promise.all([
    loadManifest(bucket),
    loadSite(bucket),
    listAllObjects(bucket),
  ]);
  const existingKeys = new Set(objects.map((object) => object.key));
  const requiredMediaKeys = new Set([
    ...manifestMediaKeys(manifest),
    ...siteMediaKeys(site),
  ]);
  const missingMediaCount = [...requiredMediaKeys].filter((key) => !existingKeys.has(key)).length;
  if (missingMediaCount) {
    throw new HttpError(
      409,
      "Referenced Media Missing",
      `备份引用的 ${missingMediaCount} 个媒体对象在 R2 中不存在，未执行恢复。`,
    );
  }
  await createBackup(bucket, reason);
  const restoredManifest = await saveManifest(bucket, currentManifest, manifest.photos);
  try {
    const restoredSite = await saveSite(bucket, currentSite, site);
    return { site: restoredSite, manifest: restoredManifest };
  } catch (error) {
    try {
      await writeJson(bucket, KEYS.manifest, { ...currentManifest }, {
        expectedEtag: storageEtag(restoredManifest),
      });
    } catch (rollbackError) {
      console.error(JSON.stringify({
        message: "Could not roll back manifest after a partial restore",
        error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
      }));
      throw new HttpError(
        503,
        "Partial Restore",
        "站点配置写入与清单补偿回滚均失败；媒体仍受恢复点保护，请从管理后台恢复刚创建的备份。",
      );
    }
    throw error;
  }
};

const auditDigest = async (entries) => {
  const encoded = new TextEncoder().encode(entries.map((entry) => `${entry.key}:${entry.size}:${entry.etag || ""}`).join("\n"));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const buildStorageAudit = async (bucket) => {
  const [objects, manifest, site, backupIndex] = await Promise.all([
    listAllObjects(bucket),
    loadManifest(bucket),
    loadSite(bucket),
    loadBackupIndex(bucket),
  ]);
  const backupMediaKeys = await protectedBackupMediaKeys(bucket, backupIndex);
  const referenced = new Set([
    KEYS.manifest,
    KEYS.site,
    KEYS.backups,
    KEYS.mutationLock,
    ...manifestMediaKeys(manifest),
    ...siteMediaKeys(site),
    ...backupMediaKeys,
    ...(backupIndex.backups || []).map((backup) => `backups/${backup.id}.json`),
  ]);
  const now = Date.now();
  const graceDays = 7;
  const threshold = now - graceDays * 24 * 60 * 60 * 1000;
  const cleanupObjects = objects.filter((object) => /^(uploads|thumbnails)\//.test(object.key)
    || (/^backups\/[A-Za-z0-9-]{8,80}\.json$/.test(object.key) && object.key !== KEYS.backups));
  const orphans = cleanupObjects.filter((object) => !referenced.has(object.key));
  const allEligible = orphans.filter((object) => new Date(object.uploaded || 0).getTime() <= threshold);
  const eligible = allEligible.slice(0, 1000);
  const allEligibleKeys = new Set(allEligible.map((object) => object.key));
  const totalBytes = objects.reduce((total, object) => total + Number(object.size || 0), 0);
  const referencedBytes = objects
    .filter((object) => referenced.has(object.key))
    .reduce((total, object) => total + Number(object.size || 0), 0);
  const eligibleBytes = eligible.reduce((total, object) => total + Number(object.size || 0), 0);
  const freeTierBytes = 10 * 1024 * 1024 * 1024;
  return {
    checkedAt: new Date(now).toISOString(),
    totalBytes,
    totalObjectCount: objects.length,
    referencedBytes,
    referencedCount: objects.filter((object) => referenced.has(object.key)).length,
    orphanCount: orphans.length,
    protectedOrphanCount: orphans.length - allEligible.length,
    eligibleCount: eligible.length,
    remainingEligibleCount: allEligible.length - eligible.length,
    eligibleBytes,
    graceDays,
    freeTierBytes,
    freeTierUsageRatio: Math.min(1, totalBytes / freeTierBytes),
    orphanSamples: orphans.slice(0, 50).map((object) => ({
      key: object.key,
      size: Number(object.size || 0),
      uploaded: object.uploaded,
      eligible: allEligibleKeys.has(object.key),
    })),
    auditToken: await auditDigest(eligible),
    eligibleKeys: eligible.map((object) => object.key),
  };
};

const handleRequest = async (context) => {
  const { request, env, params } = context;
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return empty();
  const segments = routePath(params);
  const bucket = getBucket(env);

  if (segments[0] === "home" && segments.length === 1) {
    if (method !== "GET" && method !== "HEAD") return methodNotAllowed(["GET", "HEAD", "OPTIONS"]);
    const [site, manifest] = await Promise.all([loadSite(bucket), loadManifest(bucket)]);
    const selectedKeys = new Set(siteMediaKeys({
      images: site.home.images,
      airportCovers: site.home.airportCovers,
    }));
    const photos = manifest.photos.filter((photo) => photo && (
      selectedKeys.has(photo.storageKey) || selectedKeys.has(photo.thumbnailKey)
    ));
    const payload = {
      site,
      manifest: { updatedAt: manifest.updatedAt, revision: manifest.revision, photos },
    };
    const headers = jsonCacheHeaders("home", `${etagFor("site", site)}-${etagFor("photos", manifest)}`);
    const modified = Math.max(Date.parse(site.updatedAt) || 0, Date.parse(manifest.updatedAt) || 0);
    if (modified > 0) headers["last-modified"] = new Date(modified).toUTCString();
    const response = versionedJson(request, "home", payload, headers);
    return method === "HEAD" ? empty(response.status, response.headers) : response;
  }

  if (segments[0] === "auth" && segments[1] === "check" && segments.length === 2) {
    if (method !== "POST") return methodNotAllowed(["POST", "OPTIONS"]);
    await requireAdmin(request, env);
    requireSameOrigin(request);
    return json({ ok: true });
  }

  if (segments[0] === "translations" && segments.length === 1) {
    if (method !== "GET" && method !== "HEAD") return methodNotAllowed(["GET", "HEAD", "OPTIONS"]);
    const site = await loadSite(bucket);
    const response = versionedJson(request, "translations", { ...(site.localization || { version: 1, entries: {} }), updatedAt: site.updatedAt });
    return method === "HEAD" ? empty(response.status, response.headers) : response;
  }

  if (segments[0] === "site" && segments.length === 1) {
    if (method === "GET" || method === "HEAD") {
      const site = await loadSite(bucket);
      const response = versionedJson(request, "site", site);
      return method === "HEAD" ? empty(response.status, response.headers) : response;
    }
    if (method === "PUT") {
      await requireMutationAccess(request, env);
      return withMutationLease(bucket, "site:update", async () => {
        const input = await parseJsonBody(request, MAX_SITE_JSON_BYTES);
        const body = validateSite(input);
        const currentSite = await loadSite(bucket);
        if (input.updatedAt !== undefined && input.updatedAt !== currentSite.updatedAt) {
          throw new HttpError(409, "Conflict", "站点内容已在其他窗口更新，请保留草稿并重新载入后再保存。");
        }
        await createBackup(bucket, "编辑首页前自动备份");
        return json(await saveSite(bucket, currentSite, body));
      });
    }
    return methodNotAllowed(["GET", "HEAD", "PUT", "OPTIONS"]);
  }

  if (segments[0] === "photos" && segments.length === 1) {
    if (method === "GET" || method === "HEAD") {
      const manifest = await loadManifest(bucket);
      const response = versionedJson(request, "photos", manifest);
      return method === "HEAD" ? empty(response.status, response.headers) : response;
    }
    if (method === "POST") {
      await requireMutationAccess(request, env);
      return withMutationLease(bucket, "photos:upload", () => handlePhotoUpload(request, bucket));
    }
    if (method === "DELETE") {
      await requireMutationAccess(request, env);
      return withMutationLease(bucket, "photos:clear", async () => {
        const manifest = await loadManifest(bucket);
        await createBackup(bucket, "清空作品库前自动备份");
        const updatedManifest = await saveManifest(bucket, manifest, []);
        return json({ deleted: manifest.photos.length, manifest: updatedManifest });
      });
    }
    return methodNotAllowed(["GET", "HEAD", "POST", "DELETE", "OPTIONS"]);
  }

  if (segments[0] === "photos" && segments[1] === "batch" && segments.length === 2) {
    if (method !== "PATCH") return methodNotAllowed(["PATCH", "OPTIONS"]);
    await requireMutationAccess(request, env);
    return withMutationLease(bucket, "photos:batch", () => handlePhotoBatch(request, bucket));
  }

  if (segments[0] === "photos" && segments[1] === "thumbnails" && segments.length === 2) {
    if (method !== "POST") return methodNotAllowed(["POST", "OPTIONS"]);
    await requireMutationAccess(request, env);
    return withMutationLease(bucket, "photos:thumbnails", () => handleThumbnailUpload(request, bucket));
  }

  if (segments[0] === "photos" && segments.length === 2) {
    const id = decodePathSegment(segments[1], "photo id");
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(id)) throw new HttpError(400, "Bad Request", "Invalid photo id");
    if (method === "PATCH") {
      await requireMutationAccess(request, env);
      return withMutationLease(bucket, "photos:update", () => handlePhotoPatch(request, bucket, id));
    }
    if (method === "DELETE") {
      await requireMutationAccess(request, env);
      return withMutationLease(bucket, "photos:delete", () => handlePhotoDelete(bucket, id));
    }
    return methodNotAllowed(["PATCH", "DELETE", "OPTIONS"]);
  }

  if (segments[0] === "backups") {
    await requireAdmin(request, env);
    if (segments.length === 1) {
      if (method === "GET") {
        const index = await loadBackupIndex(bucket);
        return json({ backups: index.backups || [] });
      }
      if (method === "POST") {
        requireSameOrigin(request);
        requireWritableDeployment(env);
        const body = await parseJsonBody(request, MAX_BACKUP_REASON_BYTES);
        return withMutationLease(bucket, "backups:create", async () => {
          const backup = await createBackup(bucket, cleanText(body.reason, 180) || "手动备份");
          return json({ backup }, { status: 201 });
        });
      }
      return methodNotAllowed(["GET", "POST", "OPTIONS"]);
    }

    if (segments[1] === "import" && segments.length === 2) {
      if (method !== "POST") return methodNotAllowed(["POST", "OPTIONS"]);
      requireSameOrigin(request);
      requireWritableDeployment(env);
      const body = await parseJsonBody(request);
      return withMutationLease(bucket, "backups:import", async () => json(
        await restoreData(bucket, body, "导入备份前自动备份"),
      ));
    }

    const id = decodePathSegment(segments[1], "backup id");
    if (segments[2] === "restore" && segments.length === 3) {
      if (method !== "POST") return methodNotAllowed(["POST", "OPTIONS"]);
      requireSameOrigin(request);
      requireWritableDeployment(env);
      return withMutationLease(bucket, "backups:restore", async () => {
        const backup = await getBackup(bucket, id);
        return json(await restoreData(bucket, backup, `恢复 ${id} 前自动备份`));
      });
    }
    if (segments.length === 2 && method === "GET") return json(await getBackup(bucket, id));
    if (segments.length === 2 && method === "DELETE") {
      requireSameOrigin(request);
      requireWritableDeployment(env);
      return withMutationLease(bucket, "backups:delete", async () => {
        const index = await removeBackup(bucket, id);
        return json({ backups: index.backups });
      });
    }
    return methodNotAllowed(["GET", "DELETE", "POST", "OPTIONS"]);
  }

  if (segments[0] === "storage") {
    await requireAdmin(request, env);
    if (segments.length === 1 && method === "GET") {
      const audit = await buildStorageAudit(bucket);
      const { eligibleKeys, ...publicAudit } = audit;
      return json(publicAudit);
    }
    if (segments[1] === "orphans" && segments.length === 2 && method === "DELETE") {
      requireSameOrigin(request);
      requireWritableDeployment(env);
      const body = await parseJsonBody(request, MAX_AUDIT_REQUEST_BYTES);
      return withMutationLease(bucket, "storage:cleanup", async () => {
        const audit = await buildStorageAudit(bucket);
        if (!body.auditToken || body.auditToken !== audit.auditToken) {
          throw new HttpError(409, "Conflict", "存储状态已变化，请重新扫描后再清理。");
        }
        if (audit.eligibleKeys.length) await bucket.delete(audit.eligibleKeys);
        return json({
          deletedCount: audit.eligibleKeys.length,
          deletedBytes: audit.eligibleBytes,
        });
      });
    }
    return methodNotAllowed(["GET", "DELETE", "OPTIONS"]);
  }

  return notFound("API route not found");
};

export const onRequest = async (context) => {
  try {
    return await handleRequest(context);
  } catch (error) {
    return handleError(error);
  }
};
