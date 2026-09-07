export const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com/beacon.min.js; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob: https://tiles.openfreemap.org; connect-src 'self' https://tiles.openfreemap.org; font-src 'self' data:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-permitted-cross-domain-policies": "none",
};

const API_HEADERS = {
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

export class HttpError extends Error {
  constructor(status, message, detail = "") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
  }
}

export const withSecurityHeaders = (response, { api = false } = {}) => {
  const headers = new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
    headers.set(name, value);
  });
  if (api) {
    Object.entries(API_HEADERS).forEach(([name, value]) => {
      headers.set(name, value);
    });
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export const json = (data, init = {}) => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return withSecurityHeaders(new Response(JSON.stringify(data), { ...init, headers }), { api: true });
};

export const empty = (status = 204, headers = {}) => {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("cache-control")) responseHeaders.set("cache-control", "no-store");
  return withSecurityHeaders(new Response(null, { status, headers: responseHeaders }), { api: true });
};

export const methodNotAllowed = (allowed) => json(
  { error: "Method Not Allowed" },
  { status: 405, headers: { allow: allowed.join(", ") } },
);

export const notFound = (detail = "Not found") => json({ error: "Not Found", detail }, { status: 404 });

const digest = async (value) => new Uint8Array(await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(value),
));

const secureEqual = async (left, right) => {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(leftDigest, rightDigest);
  }
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
};

export const requireAdmin = async (request, env) => {
  const configured = String(env.ADMIN_TOKEN || "");
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!configured || !supplied || !(await secureEqual(configured, supplied))) {
    throw new HttpError(401, "Unauthorized");
  }
};

export const requireSameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(request.url).origin;
  if (origin !== expected) throw new HttpError(403, "Forbidden", "Request origin did not pass validation");
};

const readDeclaredLength = (request) => {
  const header = request.headers.get("content-length");
  if (header == null) return null;
  if (!/^\d+$/.test(header.trim())) {
    throw new HttpError(400, "Bad Request", "Invalid Content-Length header");
  }
  const length = Number(header);
  if (!Number.isSafeInteger(length)) {
    throw new HttpError(413, "Payload Too Large");
  }
  return length;
};

const isJsonContentType = (contentType) => {
  const mediaType = String(contentType || "").split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json" || mediaType.endsWith("+json");
};

export const parseJsonBody = async (request, maximumBytes = 5 * 1024 * 1024) => {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    throw new HttpError(415, "Unsupported Media Type", "Expected an application/json request body");
  }
  const declaredLength = readDeclaredLength(request);
  if (declaredLength !== null && declaredLength > maximumBytes) {
    throw new HttpError(413, "Payload Too Large");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Bad Request", "Expected a JSON request body");
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel().catch(() => {});
        throw new HttpError(413, "Payload Too Large");
      }
      chunks.push(value);
    }
  } catch {
    if (totalBytes > maximumBytes) throw new HttpError(413, "Payload Too Large");
    throw new HttpError(400, "Bad Request", "Could not read the request body");
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpError(400, "Bad Request", "Expected a UTF-8 JSON request body");
  }
  let value;
  try {
    value = JSON.parse(body);
  } catch {
    throw new HttpError(400, "Bad Request", "Expected a valid JSON request body");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Bad Request", "Expected a JSON object");
  }
  return value;
};

const weakEtagValue = (value) => String(value || "").trim().replace(/^W\//i, "");

export const ifNoneMatchMatches = (header, etag) => {
  if (!header || !etag) return false;
  const expected = weakEtagValue(etag);
  return String(header).split(",").some((candidate) => {
    const value = candidate.trim();
    return value === "*" || weakEtagValue(value) === expected;
  });
};

export const handleError = (error) => {
  if (error instanceof HttpError) {
    const response = json(
      { error: error.message, ...(error.detail ? { detail: error.detail } : {}) },
      {
        status: error.status,
        headers: error.status === 401
          ? { "www-authenticate": 'Bearer realm="Hugo.aviation Admin"' }
          : undefined,
      },
    );
    return response;
  }
  console.error(JSON.stringify({
    message: "Unhandled API error",
    error: error instanceof Error ? error.message : String(error),
  }));
  return json({ error: "Internal Server Error" }, { status: 500 });
};

export const text = (value, init = {}) => {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "text/plain; charset=utf-8");
  return withSecurityHeaders(new Response(value, { ...init, headers }));
};
