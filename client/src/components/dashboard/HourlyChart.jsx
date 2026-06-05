import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fmtHour } from "@/lib/format";

/**
 * 24h chart — two stacked, single-axis charts (temperature line, precip bar).
 *
 * Why split (not dual-axis line): dual-axis charts conflate magnitudes that
 * have nothing to do with each other (°C and %). On small screens the user
 * can't tell which axis belongs to which line. Stacking is unambiguous.
 *
 * Defensive: filters out hourly rows where the metric is null so Recharts
 * doesn't draw a 0-line through gaps.
 */
export default function HourlyChart({ hourly = [] }) {
  const tempData = hourly
    .map((h) => ({ time: fmtHour(h.time), temperature: h.temperature }))
    .filter((r) => r.temperature != null);

  const precipData = hourly
    .map((h) => ({ time: fmtHour(h.time), precipitation: h.precipitation_probability }))
    .filter((r) => r.precipitation != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next 24 hours</CardTitle>
        <CardDescription>Temperature and rain probability</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempData} margin={{ top: 5, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} unit="°" />
              <Tooltip formatter={(v) => `${v}°C`} />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={precipData} margin={{ top: 5, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar
                dataKey="precipitation"
                fill="hsl(var(--accent))"
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
