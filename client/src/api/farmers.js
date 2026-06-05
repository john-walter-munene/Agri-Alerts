import { request } from "./client";

/**
 * One module per backend resource. Keeps the URL surface in one place so a
 * route rename = one diff. Hooks (`src/hooks/*`) wrap these for React Query.
 */

const enc = (phone) => encodeURIComponent(phone);

export const createFarmer = (data) =>
  request("/api/farmers", { method: "POST", body: data });

export const getFarmer = (phone, { signal } = {}) =>
  request(`/api/farmers/${enc(phone)}`, { signal });

export const updateFarmer = (phone, data) =>
  request(`/api/farmers/${enc(phone)}`, { method: "PATCH", body: data });

export const getDashboard = (phone, { force = false, signal } = {}) =>
  request(`/api/farmers/${enc(phone)}/dashboard`, {
    params: force ? { force: "true" } : undefined,
    signal,
  });

export const getAlertHistory = (phone, { limit, signal } = {}) =>
  request(`/api/farmers/${enc(phone)}/alerts`, {
    params: limit ? { limit } : undefined,
    signal,
  });

export const askFarmer = (phone, payload) =>
  request(`/api/farmers/${enc(phone)}/ask`, { method: "POST", body: payload });
