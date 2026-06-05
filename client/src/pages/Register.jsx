import * as React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Loader2, Sprout } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useCreateFarmer } from "@/hooks/useFarmer";
import { useActivePhone } from "@/hooks/useActivePhone";
import { CROP_TYPES, TRIGGER_TYPES, TRIGGER_LABELS } from "@/lib/enums";
import { normalizePhone, isValidKenyanPhone } from "@/lib/phone";

/**
 * Register form.
 *
 * Geolocation is opt-in via the "use my location" button. We don't auto-prompt
 * because (a) it's a privacy norm violation and (b) `navigator.geolocation`
 * needs a user gesture to avoid the silent-deny browser default on insecure
 * origins or restricted iframes.
 *
 * Phone is normalized client-side for display + validation but the server
 * normalizes again — never trust the client.
 */
const DEFAULT_FORM = {
  phone: "",
  name: "",
  lat: "",
  lon: "",
  locationLabel: "",
  cropType: "maize",
  alertTriggers: [...TRIGGER_TYPES],
};

export default function Register() {
  const [form, setForm] = React.useState(DEFAULT_FORM);
  const [geoLoading, setGeoLoading] = React.useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateFarmer();
  const { signIn } = useActivePhone();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleTrigger = (t) =>
    setForm((f) => ({
      ...f,
      alertTriggers: f.alertTriggers.includes(t)
        ? f.alertTriggers.filter((x) => x !== t)
        : [...f.alertTriggers, t],
    }));

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(5),
          lon: pos.coords.longitude.toFixed(5),
        }));
        toast.success("Location captured");
      },
      (err) => {
        setGeoLoading(false);
        toast.error("Couldn't read location", err.message);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (!isValidKenyanPhone(form.phone)) {
      toast.error("Phone must be a Kenyan number", "e.g. 0700000000 or +254700000000");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      toast.error("Latitude and longitude must be numbers");
      return;
    }
    if (!form.alertTriggers.length) {
      toast.error("Pick at least one alert trigger");
      return;
    }

    const payload = {
      phone: normalizePhone(form.phone),
      name: form.name.trim(),
      lat,
      lon,
      locationLabel: form.locationLabel.trim() || undefined,
      cropType: form.cropType,
      alertTriggers: form.alertTriggers,
    };

    create.mutate(payload, {
      onSuccess: (data) => {
        signIn(data.phone); // remember them for next visit
        toast.success("Account created", `Welcome, ${data.name}`);
        navigate(`/dashboard/${encodeURIComponent(data.phone)}`);
      },
      onError: (err) => {
        if (err.status === 409) {
          toast.error("That phone is already registered");
        } else {
          toast.error("Couldn't register", err.message || "Try again in a moment");
        }
      },
    });
  };

  return (
    <Card className="max-w-2xl mx-auto overflow-hidden">
      {/* Hero strip — meadow-toned to read as "grow / register your land". */}
      <div className="relative h-20 bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent_40%),radial-gradient(circle_at_80%_50%,white,transparent_40%)]" />
        <Sprout className="absolute right-4 top-4 h-12 w-12 text-white/85" />
      </div>
      <CardHeader>
        <CardTitle>Register a farmer</CardTitle>
        <CardDescription>
          You&apos;ll get rain, frost, wind, and drought alerts tuned to your crop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={set("phone")}
                placeholder="0700000000"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={set("name")} placeholder="Jane Doe" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={form.lat}
                onChange={set("lat")}
                placeholder="Latitude (-0.7833)"
                inputMode="decimal"
              />
              <Input
                value={form.lon}
                onChange={set("lon")}
                placeholder="Longitude (35.3417)"
                inputMode="decimal"
              />
              <Button
                type="button"
                variant="outline"
                onClick={requestGeolocation}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                Use my location
              </Button>
            </div>
            <Input
              value={form.locationLabel}
              onChange={set("locationLabel")}
              placeholder="Location label (optional, e.g. Kapkimolwa, Bomet)"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cropType">Crop</Label>
            <select
              id="cropType"
              value={form.cropType}
              onChange={set("cropType")}
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
                    checked={form.alertTriggers.includes(t)}
                    onChange={() => toggleTrigger(t)}
                    className="h-4 w-4 accent-primary"
                  />
                  {TRIGGER_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
            {create.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
