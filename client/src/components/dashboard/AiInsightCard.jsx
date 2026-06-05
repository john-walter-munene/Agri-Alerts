import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * AI insight card.
 *
 * Surfaces the source ("weather-ai" vs "fallback-static") as a small badge so
 * a reviewer can verify the WeatherAI integration is actually running — and
 * so we don't accidentally pass off a static template as live AI output.
 */
export default function AiInsightCard({ insight, source }) {
  const isLive = source === "weather-ai";

  const subtitle = isLive
    ? "Generated from this week's forecast"
    : "Generated from this week's forecast while live AI insights are unavailable.";

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 ring-1 ring-emerald-100">
                <Sparkles className="h-4 w-4 text-emerald-700" />
              </span>
              AI insight
            </CardTitle>

            <CardDescription>{subtitle}</CardDescription>
          </div>

          <Badge variant={isLive ? "default" : "secondary"}>
            {isLive ? "WeatherAI" : "Fallback"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">
        {insight || "No insight available right now."}
      </CardContent>
    </Card>
  );
}
