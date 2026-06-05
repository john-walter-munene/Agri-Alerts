import * as React from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CurrentCard from "@/components/dashboard/CurrentCard";
import DailyGrid from "@/components/dashboard/DailyGrid";
import AiInsightCard from "@/components/dashboard/AiInsightCard";
import AlertList from "@/components/dashboard/AlertList";
import AskCard from "@/components/dashboard/AskCard";
import NotRegistered from "@/components/dashboard/NotRegistered";
import { useDashboard, useRecheckDashboard } from "@/hooks/useFarmer";
import { useToast } from "@/components/ui/toast";
import { fmtDateTime } from "@/lib/format";

/**
 * Lazy-load the Recharts-based chart so it doesn't bloat the initial bundle.
 * Recharts + its d3 dependencies are ~150KB gzip; chunking them keeps the
 * first paint snappy. Suspense fallback matches the chart height so layout
 * doesn't jump.
 */
const HourlyChart = React.lazy(() => import("@/components/dashboard/HourlyChart"));

/**
 * Dashboard — the primary surface.
 *
 * Layout (top -> bottom):
 *   1. Header: farmer + location + "Re-check conditions"
 *   2. Two-col on >=md: Current conditions | AI insight
 *   3. Hourly chart (full width)
 *   4. 7-day grid (full width)
 *   5. Active alerts (full width)
 *   6. Ask card (full width)
 *
 * Re-check button uses the same hook regardless of cache state — when fresh
 * it still fires (user explicitly asked); cache will be primed with the
 * response and quota counter updated.
 */
export default function Dashboard() {
  const { phone } = useParams();
  const { data, isLoading, isError, error } = useDashboard(phone);
  const recheck = useRecheckDashboard(phone);
  const toast = useToast();

  const onRecheck = () => {
    recheck.mutate(undefined, {
      onSuccess: () => toast.success("Forecast refreshed"),
      onError: (err) =>
        toast.error("Couldn't refresh", err?.message || "Provider may be unavailable"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (isError) {
    if (error?.status === 404) return <NotRegistered phone={phone} />;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn&apos;t load dashboard</CardTitle>
          <CardDescription>{error?.message || "Unknown error"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { farmer, current, daily, hourly, aiInsight, aiInsightSource, alerts, meta } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{farmer.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {farmer.locationLabel || `${farmer.lat.toFixed(3)}, ${farmer.lon.toFixed(3)}`}
            </span>
            <span>&middot;</span>
            <span className="capitalize">{farmer.cropType}</span>
            <span>&middot;</span>
            <span>
              Updated {fmtDateTime(meta?.fetchedAt)}
              {meta?.cached ? " (cached)" : ""}
            </span>
          </div>
        </div>
        <Button onClick={onRecheck} disabled={recheck.isPending}>
          {recheck.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Re-check conditions
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <CurrentCard current={current} />
        <AiInsightCard insight={aiInsight} source={aiInsightSource} />
      </div>

      <React.Suspense fallback={<Skeleton className="h-80" />}>
        <HourlyChart hourly={hourly} />
      </React.Suspense>
      <DailyGrid daily={daily} />

      <AlertList alerts={alerts} title="Active alerts" empty="No active alerts for your crop." />

      <AskCard phone={phone} />
    </div>
  );
}
