import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboard,
  getAlertHistory,
  getFarmer,
  createFarmer,
  updateFarmer,
  askFarmer,
} from "@/api/farmers";
import { qk } from "./queryKeys";

/**
 * Dashboard query.
 *
 * staleTime mirrors the server-side cache TTL (30 min). No window-focus refetch
 * because a farmer dashboard is "intent-driven" — the user pulls the
 * "Re-check conditions" button when they want fresh data; we shouldn't burn
 * WeatherAI quota every time the tab regains focus.
 */
export const useDashboard = (phone, { enabled = true } = {}) =>
  useQuery({
    queryKey: qk.dashboard(phone),
    queryFn: ({ signal }) => getDashboard(phone, { signal }),
    enabled: Boolean(phone) && enabled,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

/**
 * Re-check (force-refresh) mutation. On success, primes the dashboard cache
 * with the fresh payload so the UI updates without a second round-trip.
 */
export const useRecheckDashboard = (phone) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getDashboard(phone, { force: true }),
    onSuccess: (data) => {
      qc.setQueryData(qk.dashboard(phone), data);
      // The dashboard write may have produced new alerts -> stale the history.
      qc.invalidateQueries({ queryKey: ["farmer", phone, "alerts"] });
    },
  });
};

export const useAlertHistory = (phone, { limit } = {}) =>
  useQuery({
    queryKey: qk.alerts(phone, { limit }),
    queryFn: ({ signal }) => getAlertHistory(phone, { limit, signal }),
    enabled: Boolean(phone),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useFarmer = (phone) =>
  useQuery({
    queryKey: qk.farmer(phone),
    queryFn: ({ signal }) => getFarmer(phone, { signal }),
    enabled: Boolean(phone),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useCreateFarmer = () => useMutation({ mutationFn: createFarmer });

export const useUpdateFarmer = (phone) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateFarmer(phone, data),
    onSuccess: (data) => {
      // Settings changes (cropType, alertTriggers) affect alert messages on
      // the dashboard, so invalidate both farmer + dashboard caches.
      qc.setQueryData(qk.farmer(phone), data);
      qc.invalidateQueries({ queryKey: qk.dashboard(phone) });
    },
  });
};

export const useAskFarmer = (phone) =>
  useMutation({ mutationFn: (payload) => askFarmer(phone, payload) });
