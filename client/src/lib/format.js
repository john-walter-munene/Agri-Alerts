/**
 * Tiny formatting helpers for the dashboard.
 *
 * Why a separate module: every page renders these the same way, and keeping
 * the null/undefined fallback to "—" in one place avoids inconsistency
 * (some cards showing "0°C" because someone defaulted with `?? 0`).
 */

export const fmtNum = (n, unit = "", { decimals = 0 } = {}) => {
  if (n == null || Number.isNaN(n)) return "—";
  const v = decimals > 0 ? Number(n).toFixed(decimals) : Math.round(n);
  return `${v}${unit}`;
};

/**
 * Formats an ISO time like "2026-06-05T10:00" to "10:00".
 * Tolerant of upstream variance: WeatherAI sometimes returns no T-separator.
 */
export const fmtHour = (iso) => {
  if (!iso) return "";
  const m = String(iso).match(/T?(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : iso;
};

export const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
