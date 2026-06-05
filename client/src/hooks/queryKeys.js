/**
 * Centralized cache-key factory.
 *
 * Why: TanStack Query's docs recommend factories over inline arrays so that
 * invalidations stay consistent and you can grep one place when a key shape
 * has to change.
 *
 * Convention: `[resource, scope?, params?]`.
 */
export const qk = {
  farmer: (phone) => ["farmer", phone],
  dashboard: (phone) => ["farmer", phone, "dashboard"],
  alerts: (phone, params = {}) => ["farmer", phone, "alerts", params],
};
