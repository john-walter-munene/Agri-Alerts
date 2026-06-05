import { Link } from "react-router-dom";
import { UserX, CloudOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Friendly empty state for "this phone is not registered".
 *
 * Used by Dashboard/Alerts/Settings when the API returns 404. Without this,
 * a stale shared link or typo'd URL drops the user into a generic error card
 * with a Prisma-flavored "not found" message — disorienting. This converts
 * the dead end into a deliberate next step.
 */
export default function NotRegistered({ phone }) {
  return (
    <div className="flex justify-center py-8">
      <Card className="max-w-md w-full overflow-hidden">
        {/* Hero strip — muted slate-to-amber, signals "nothing yet, but easy to fix". */}
        <div className="relative h-20 bg-gradient-to-r from-slate-400 via-slate-500 to-amber-500">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_60%,white,transparent_40%)]" />
          <CloudOff className="absolute right-4 top-4 h-12 w-12 text-white/80" />
        </div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Not registered</CardTitle>
          </div>
          <CardDescription>
            {phone ? (
              <>
                We couldn&apos;t find a farmer with phone <code>{phone}</code>.
              </>
            ) : (
              <>That farmer phone isn&apos;t registered yet.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link to="/register" className={cn(buttonVariants({ variant: "default" }))}>
            Register an account
          </Link>
          <Link
            to="/sign-in"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Sign in instead
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
