import * as React from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import NotRegistered from "@/components/dashboard/NotRegistered";
import { useFarmer, useUpdateFarmer } from "@/hooks/useFarmer";
import { useToast } from "@/components/ui/toast";
import { CROP_TYPES, TRIGGER_TYPES, TRIGGER_LABELS } from "@/lib/enums";

/**
 * Settings — crop + trigger preferences only.
 *
 * MVP scope deliberately excludes phone / location editing — those would
 * require a "change of identity" flow (re-verify phone, recompute alerts
 * cache key, etc.) that's out of scope for the challenge submission.
 *
 * Save is dirty-aware: button stays disabled until something actually changed.
 */
export default function Settings() {
  const { phone } = useParams();
  const { data: farmer, isLoading, isError, error } = useFarmer(phone);
  const update = useUpdateFarmer(phone);
  const toast = useToast();

  const [cropType, setCropType] = React.useState("");
  const [triggers, setTriggers] = React.useState([]);

  // Re-sync local state when the farmer query refetches (e.g. after a save).
  React.useEffect(() => {
    if (farmer) {
      setCropType(farmer.cropType);
      setTriggers(farmer.alertTriggers || []);
    }
  }, [farmer]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    if (error?.status === 404) return <NotRegistered phone={phone} />;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn&apos;t load settings</CardTitle>
          <CardDescription>{error?.message || "Unknown error"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const toggleTrigger = (t) =>
    setTriggers((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const isDirty =
    cropType !== farmer.cropType ||
    triggers.length !== (farmer.alertTriggers?.length || 0) ||
    !triggers.every((t) => farmer.alertTriggers?.includes(t));

  const onSave = () => {
    if (!triggers.length) {
      toast.error("Pick at least one alert trigger");
      return;
    }
    update.mutate(
      { cropType, alertTriggers: triggers },
      {
        onSuccess: () => toast.success("Preferences saved"),
        onError: (err) => toast.error("Couldn't save", err?.message || "Try again in a moment"),
      },
    );
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Update crop and alert preferences for <code>{farmer.phone}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="cropType">Crop</Label>
          <select
            id="cropType"
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CROP_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Alert triggers</Label>
          <div className="grid grid-cols-2 gap-2">
            {TRIGGER_TYPES.map((t) => (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={triggers.includes(t)}
                  onChange={() => toggleTrigger(t)}
                  className="h-4 w-4 accent-primary"
                />
                {TRIGGER_LABELS[t]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onSave} disabled={!isDirty || update.isPending}>
            {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
          {!isDirty ? (
            <span className="text-xs text-muted-foreground">No changes to save</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
