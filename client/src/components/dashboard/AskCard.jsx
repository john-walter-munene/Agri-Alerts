import * as React from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAskFarmer } from "@/hooks/useFarmer";
import { useToast } from "@/components/ui/toast";

/**
 * "Ask about my farm" card.
 *
 * Two modes:
 *   - custom: user types a question -> grounded answer from Gemini
 *   - auto:   one-click "generate general farming advice" — useful for the
 *             demo video and for low-literacy users who just want a summary.
 *
 * Renders Gemini output as plain text (whitespace-preserved). Markdown
 * rendering would add a dep for ~one bold per response.
 */
export default function AskCard({ phone }) {
  const [question, setQuestion] = React.useState("");
  const [lastAnswer, setLastAnswer] = React.useState(null);
  const ask = useAskFarmer(phone);
  const toast = useToast();

  const submit = (mode) => {
    const trimmed = question.trim();
    if (mode === "custom" && !trimmed) {
      toast.error("Type a question first");
      return;
    }
    setLastAnswer(null);
    ask.mutate(
      mode === "custom" ? { mode: "custom", question: trimmed } : { mode: "auto" },
      {
        onSuccess: (data) => setLastAnswer(data.aiAnswer),
        onError: (err) =>
          toast.error("Couldn't get an answer", err?.message || "Try again in a moment"),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Ask about my farm
        </CardTitle>
        <CardDescription>
          Grounded in your location, crop, current forecast, and active alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="e.g. Should I delay planting this week?"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={ask.isPending}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => submit("custom")} disabled={ask.isPending}>
            {ask.isPending && ask.variables?.mode !== "auto" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Ask
          </Button>
          <Button variant="outline" onClick={() => submit("auto")} disabled={ask.isPending}>
            {ask.isPending && ask.variables?.mode === "auto" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Auto-advice
          </Button>
        </div>

        {lastAnswer ? (
          <div className="mt-2 rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
            {lastAnswer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
