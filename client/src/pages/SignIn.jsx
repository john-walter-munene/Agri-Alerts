import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Loader2, CloudSun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { getFarmer } from "@/api/farmers";
import { useActivePhone } from "@/hooks/useActivePhone";
import { normalizePhone, isValidKenyanPhone } from "@/lib/phone";

/**
 * Sign-in — phone-only "look up the farmer" flow.
 *
 * MVP: there is no real auth. We validate the phone exists in the DB and
 * remember it client-side. Documented as a limitation in the README.
 *
 * UX rules:
 *   - 404 -> toast suggests Register (single most common dead-end).
 *   - On success, navigate to the dashboard and let the AppShell pick up the
 *     new identity via the storage event.
 */
export default function SignIn() {
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { signIn } = useActivePhone();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isValidKenyanPhone(phone)) {
      toast.error("Phone must be a Kenyan number", "e.g. 0700000000 or +254700000000");
      return;
    }
    const normalized = normalizePhone(phone);
    setBusy(true);
    try {
      await getFarmer(normalized);
      signIn(normalized);
      toast.success("Signed in");
      navigate(`/dashboard/${encodeURIComponent(normalized)}`);
    } catch (err) {
      if (err.status === 404) {
        toast.error("No farmer with that phone", "Register first?");
      } else {
        toast.error("Couldn't sign in", err?.message || "Try again in a moment");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-center py-8">
      <Card className="max-w-md w-full overflow-hidden">
        {/* Hero strip — sky-toned to read as "weather sign-in". */}
        <div className="relative h-20 bg-gradient-to-r from-sky-400 via-sky-500 to-emerald-500">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_60%,white,transparent_40%),radial-gradient(circle_at_70%_30%,white,transparent_40%)]" />
          <CloudSun className="absolute right-4 top-4 h-12 w-12 text-white/80" />
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Welcome back
          </CardTitle>
          <CardDescription>
            Enter the phone number you registered with. No password needed for the MVP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0700000000"
                autoComplete="tel"
                disabled={busy}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign in
              </Button>
              <Link
                to="/register"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                No account? Register
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
