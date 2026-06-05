/**
 * Resolved at build time from .env / env-vars on the deploy host.
 * Falls back to localhost so `npm run dev` works without a .env file.
 */
// const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const RAW_BASE = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, "");

/**
 * Typed error our hooks can pattern-match against.
 * - status: HTTP status, or 0 when the request never reached the server
 * - issues: zod validation issues from the server (when status === 400)
 */
export class ApiError extends Error {
  constructor(message, { status = 0, issues = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

const buildUrl = (path, params) => {
  const url = new URL(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
};

/**
 * Single fetch wrapper used by every per-resource module.
 *
 *   - Sends JSON, expects JSON.
 *   - Translates the server's { success, data, error, issues } envelope
 *     into either a resolved `data` value or an `ApiError`.
 *   - Centralizes network-error mapping so hooks never branch on `error.name`.
 */
export async function request(path, { method = "GET", body, params, signal } = {}) {
  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // Network down, CORS, DNS — never reached the server.
    throw new ApiError(err.message || "Network request failed", { status: 0 });
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // Server returned non-JSON (e.g. proxy error page).
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, { status: res.status });
    return null;
  }

  if (!res.ok || payload?.success === false) {
    throw new ApiError(payload?.error || `Request failed (${res.status})`, {
      status: res.status,
      issues: payload?.issues ?? null,
    });
  }

  return payload?.data ?? payload;
}
