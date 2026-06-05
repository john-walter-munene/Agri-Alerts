import { Thermometer, CloudRain, Wind, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/format";

/**
 * "Current" card — top-of-fold summary derived from hourly[0].
 *
 * 4 metrics laid out as a 2x2 grid on mobile, 4-up on >=sm. Each metric tile
 * sits on a faint sky tint so the card scans as "the weather card" without
 * heavy chrome.
 */
export default function CurrentCard({ current }) {
  const items = [
    { icon: Thermometer, label: "Temp", value: fmtNum(current?.temperature, "°C"), tone: "amber" },
    { icon: CloudRain, label: "Rain", value: fmtNum(current?.precipitation_probability, "%"), tone: "sky" },
    { icon: Wind, label: "Wind", value: fmtNum(current?.wind_speed, " km/h"), tone: "slate" },
    { icon: Droplets, label: "Humidity", value: fmtNum(current?.humidity, "%"), tone: "emerald" },
  ];

  const toneClass = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  return (
    <Card className="overflow-hidden">
      {/* Top gradient stripe — weather card identity. */}
      <div className="h-1 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400" />
      <CardHeader>
        <CardTitle>Current conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map(({ icon: Icon, label, value, tone }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-md p-3 ring-1 ring-inset bg-card-foreground/[0.015] ring-border/60"
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-md ring-1",
                  toneClass[tone],
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
                <div className="text-xl font-semibold tabular-nums">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
