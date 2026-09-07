import {
  HttpError,
  handleError,
  ifNoneMatchMatches,
  methodNotAllowed,
  text,
  withSecurityHeaders,
} from "../_shared/http.js";
import { getBucket } from "../_shared/storage.js";

const PUBLIC_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
]);

const mediaKey = (params) => {
  const value = params?.path;
  const key = (Array.isArray(value) ? value.join("/") : String(value || "")).replace(/^\/+/, "");
  if (!/^(uploads|thumbnails)\/[A-Za-z0-9_./-]+$/.test(key) || key.includes("..")) {
    throw new HttpError(404, "Not Found");
  }
  return key;
};

const conditionalHeaders = (request) => {
  const headers = new Headers();
  for (const name of ["if-match", "if-none-match", "if-modified-since", "if-unmodified-since"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (headers.has("if-match")) headers.delete("if-unmodified-since");
  if (headers.has("if-none-match")) headers.delete("if-modified-since");
  return headers;
};

const strongEtagMatches = (header, etag) => String(header || "").split(",").some((candidate) => {
  const value = candidate.trim();
  return value === "*" || (!value.startsWith("W/") && value === etag);
});

const timestampNotNewerThan = (uploaded, header) => {
  const resourceTime = new Date(uploaded || 0).getTime();
  const headerTime = Date.parse(header || "");
  return Number.isFinite(resourceTime)
    && Number.isFinite(headerTime)
    && Math.floor(resourceTime / 1000) <= Math.floor(headerTime / 1000);
};

const ifRangeAllows = (request, object) => {
  const value = request.headers.get("if-range");
  if (!value) return true;
  if (value.startsWith('"') || value.startsWith("W/")) {
    return !value.startsWith("W/") && value === object.httpEtag;
  }
  return timestampNotNewerThan(object.uploaded, value);
};

const singleByteRange = (header) => {
  const match = String(header || "").trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match || (!match[1] && !match[2])) return null;
  return {
    header: `bytes=${match[1]}-${match[2]}`,
    first: match[1] ? Number(match[1]) : null,
    last: match[2] ? Number(match[2]) : null,
  };
};

const rangeIsUnsatisfiable = (range, size) => size === 0 || (range.first === null
  ? range.last === 0
  : range.first >= size || (range.last !== null && range.last < range.first));

const preconditionStatus = (request, object) => {
  const ifMatch = request.headers.get("if-match");
  if (ifMatch && !strongEtagMatches(ifMatch, object.httpEtag)) return 412;
  const ifUnmodifiedSince = request.headers.get("if-unmodified-since");
  if (!ifMatch
    && Number.isFinite(Date.parse(ifUnmodifiedSince || ""))
    && !timestampNotNewerThan(object.uploaded, ifUnmodifiedSince)) {
    return 412;
  }
  if (ifNoneMatchMatches(request.headers.get("if-none-match"), object.httpEtag)) return 304;
  if (!request.headers.has("if-none-match")
    && timestampNotNewerThan(object.uploaded, request.headers.get("if-modified-since"))) {
    return 304;
  }
  return null;
};

const responseHeaders = (object) => {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  const contentType = String(headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!PUBLIC_IMAGE_TYPES.has(contentType)) {
    headers.set("content-type", "application/octet-stream");
    headers.set("content-disposition", 'attachment; filename="media-download"');
  }
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  const uploaded = new Date(object.uploaded || 0).getTime();
  if (Number.isFinite(uploaded) && uploaded > 0) headers.set("last-modified", new Date(uploaded).toUTCString());
  return headers;
};

const mediaResponse = async (context) => {
  const { request, env, params } = context;
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return methodNotAllowed(["GET", "HEAD"]);

  const bucket = getBucket(env);
  const key = mediaKey(params);
  let object;
  let knownObject;
  let rangedResponse = false;
  let acceptedRange;
  try {
    const requestedRange = method === "GET" ? singleByteRange(request.headers.get("range")) : null;
    let useRange = Boolean(requestedRange);
    if (useRange && request.headers.has("if-range")) {
      knownObject = await bucket.head(key);
      if (!knownObject) return text("Not found", { status: 404, headers: { "cache-control": "no-store" } });
      useRange = ifRangeAllows(request, knownObject);
    }
    const conditions = conditionalHeaders(request);
    rangedResponse = useRange;
    acceptedRange = useRange ? requestedRange : null;
    object = method === "HEAD"
      ? await bucket.head(key)
      : await bucket.get(key, {
        ...(conditions.keys().next().done ? {} : { onlyIf: conditions }),
        ...(useRange ? { range: new Headers({ range: requestedRange.header }) } : {}),
      });
  } catch (error) {
    const invalidRange = Number(error?.code) === 10039 || /\b10039\b/.test(String(error?.message || ""));
    if (!invalidRange) throw error;
    const head = knownObject || await bucket.head(key).catch(() => null);
    const headers = head ? responseHeaders(head) : new Headers({ "accept-ranges": "bytes" });
    const conditionalStatus = head ? preconditionStatus(request, head) : null;
    if (conditionalStatus) {
      headers.delete("content-length");
      return withSecurityHeaders(new Response(null, { status: conditionalStatus, headers }));
    }
    headers.set("cache-control", "no-store");
    if (head) headers.set("content-range", `bytes */${head.size}`);
    return withSecurityHeaders(new Response(null, { status: 416, headers }));
  }
  if (!object) return text("Not found", { status: 404, headers: { "cache-control": "no-store" } });

  const headers = responseHeaders(object);
  if (method === "HEAD") {
    const conditionalStatus = preconditionStatus(request, object);
    if (conditionalStatus) {
      headers.delete("content-length");
      return withSecurityHeaders(new Response(null, { status: conditionalStatus, headers }));
    }
    headers.set("content-length", String(object.size));
    return withSecurityHeaders(new Response(null, { status: 200, headers }));
  }
  if (!("body" in object)) {
    headers.delete("content-length");
    return withSecurityHeaders(new Response(null, {
      status: preconditionStatus(request, object) || 412,
      headers,
    }));
  }

  // Some R2 runtimes ignore an unsatisfiable range and return the full object
  // instead of throwing 10039. Check its size after preconditions, without an
  // additional HEAD on ordinary GETs, so that full bytes never masquerade as 206.
  if (acceptedRange && rangeIsUnsatisfiable(acceptedRange, object.size)) {
    await object.body.cancel().catch(() => {});
    headers.set("cache-control", "no-store");
    headers.set("content-range", `bytes */${object.size}`);
    headers.delete("content-length");
    return withSecurityHeaders(new Response(null, { status: 416, headers }));
  }

  let status = 200;
  // R2 may also describe the full body with range metadata. Only an honored
  // client Range request is a partial HTTP response.
  if (rangedResponse && object.range && "offset" in object.range && "length" in object.range) {
    status = 206;
    headers.set("content-length", String(object.range.length));
    headers.set(
      "content-range",
      `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`,
    );
  } else {
    headers.set("content-length", String(object.size));
  }

  return withSecurityHeaders(new Response(object.body, { status, headers }));
};

export const onRequest = async (context) => {
  try {
    return await mediaResponse(context);
  } catch (error) {
    return handleError(error);
  }
};
