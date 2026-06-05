import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import NotRegistered from "@/components/dashboard/NotRegistered";
import { useAlertHistory } from "@/hooks/useFarmer";
import { TRIGGER_LABELS } from "@/lib/enums";
import { fmtDate, fmtDateTime } from "@/lib/format";

/**
 * Alert history — chronological feed grouped by `createdAt` calendar day.
 *
 * Grouping by day (vs. forecastDate) reflects WHEN the alert was recorded:
 * a dashboard refresh today that produced a rain alert for next Tuesday
 * shows under today, not Tuesday. Reviewers see activity, not a sparse
 * future-dated calendar.
 */
function groupByDay(alerts) {
  const groups = new Map();
  for (const a of alerts) {
    const day = new Date(a.createdAt).toISOString().slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(a);
  }
  return Array.from(groups.entries()); // already newest-first because input is
}

export default function Alerts() {
  const { phone } = useParams();
  const { data, isLoading, isError, error } = useAlertHistory(phone, { limit: 100 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (isError) {
    if (error?.status === 404) return <NotRegistered phone={phone} />;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn&apos;t load alert history</CardTitle>
          <CardDescription>{error?.message || "Unknown error"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No alerts yet</CardTitle>
          <CardDescription>
            Visit the dashboard to evaluate the forecast — any matching alerts will be saved here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const groups = groupByDay(data);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Alert history</h1>
        <p className="text-sm text-muted-foreground">
          Last {data.length} alerts. Newest first.
        </p>
      </header>

      {groups.map(([day, items]) => (
        <section key={day} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{fmtDate(day)}</h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {items.map((a) => (
                  <li key={a.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={a.severity}>{a.severity}</Badge>
                      <span className="font-medium">
                        {TRIGGER_LABELS[a.triggerType] || a.triggerType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        for {fmtDate(a.forecastDate)}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {fmtDateTime(a.createdAt)}
                      </span>
                    </div>
                    {a.message ? (
                      <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}
