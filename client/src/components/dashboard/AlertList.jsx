import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRIGGER_LABELS } from "@/lib/enums";
import { fmtDate } from "@/lib/format";

/**
 * AlertList — renders the active/freshly-evaluated alerts for a dashboard view.
 *
 * Reused on the dashboard (this prop is `alerts` from /dashboard) and the
 * history page (where alerts come from /alerts and are already grouped by
 * date — the parent passes the day's slice).
 */
export default function AlertList({ alerts = [], title = "Alerts", empty = "No active alerts." }) {
  const hasAlerts = alerts.length > 0;
  return (
    <Card className="overflow-hidden">
      {/* Amber stripe — "alerts / advisory" identity; reads as caution at a glance. */}
      <div className="h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600" />
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className={
              hasAlerts
                ? "inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 ring-1 ring-amber-200"
                : "inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted ring-1 ring-border"
            }
          >
            {hasAlerts ? (
              <Bell className="h-4 w-4 text-amber-700" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
          <CardTitle>{title}</CardTitle>
        </div>
        {hasAlerts ? (
          <CardDescription>
            {alerts.length} alert{alerts.length === 1 ? "" : "s"} matched your forecast
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {alerts.map((a, i) => (
              <li key={a.id ?? i} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={a.severity}>{a.severity}</Badge>
                  <span className="font-medium">
                    {TRIGGER_LABELS[a.triggerType] || a.triggerType}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDate(a.forecastDate)}</span>
                </div>
                {a.message ? (
                  <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
