import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, CloudRain } from "lucide-react";
import { fmtNum, fmtDate } from "@/lib/format";

/**
 * 7-day grid — scannable strip. Each day = min/max temp + rain probability.
 *
 * Designed for at-a-glance reading: the user spots a red-temperature day
 * or a 90% rain day without parsing numbers carefully.
 */
export default function DailyGrid({ daily = [] }) {
  if (!daily.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No forecast available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next 7 days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {daily.slice(0, 7).map((d) => (
            <div
              key={d.date}
              className="rounded-md border bg-card px-3 py-2 text-sm"
            >
              <div className="font-medium">{fmtDate(d.date)}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Thermometer className="h-3 w-3" />
                <span>
                  {fmtNum(d.temp_min, "°")} / {fmtNum(d.temp_max, "°")}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <CloudRain className="h-3 w-3" />
                <span>{fmtNum(d.precipitation_probability, "%")}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
