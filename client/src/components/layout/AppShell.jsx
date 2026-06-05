import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  CloudSun,
  Sprout,
  LayoutDashboard,
  Bell,
  Settings,
  UserPlus,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_PHONE } from "@/lib/demo";
import { useActivePhone } from "@/hooks/useActivePhone";
import { useFarmer } from "@/hooks/useFarmer";
import { useToast } from "@/components/ui/toast";

/**
 * AppShell — single top-level layout, identity-aware.
 *
 * Three states:
 *   1. Signed in    -> nav scoped to active phone; identity chip + Sign out.
 *   2. Anonymous    -> nav scoped to demo phone; "Demo mode" pill + Sign in/Register.
 *   3. Viewing other -> URL phone differs from active phone (e.g. shared link);
 *                       same as signed-in but nav points at URL phone.
 *
 * The active phone is sourced from useActivePhone (localStorage-backed,
 * cross-tab synced). Phone in URL always wins for scoping the current view.
 */
const navItem = ({ isActive }) =>
  cn(
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent/20 hover:text-foreground",
  );

export default function AppShell() {
  const { phone: urlPhone } = useParams();
  const { phone: activePhone, signOut } = useActivePhone();
  const navigate = useNavigate();
  const toast = useToast();

  const scope = urlPhone || activePhone || DEMO_PHONE;
  const isDemoView = scope === DEMO_PHONE && !activePhone;

  // Only fetch farmer card when the user is actually signed in — saves a
  // request on the demo landing.
  const { data: farmer } = useFarmer(activePhone);

  const handleSignOut = () => {
    signOut();
    toast.info("Signed out");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="container flex items-center justify-between gap-3 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg shrink-0 group">
            {/* Brand mark: sun-cloud + sprout. Visually communicates weather + crops at a glance. */}
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 ring-1 ring-emerald-200/60 transition-shadow group-hover:shadow-sm">
              <CloudSun className="h-5 w-5 text-sky-600" />
              <Sprout className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-emerald-600" />
            </span>
            <span className="hidden sm:inline bg-gradient-to-r from-emerald-700 to-sky-700 bg-clip-text text-transparent">
              AgriAlert
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            <NavLink to={`/dashboard/${encodeURIComponent(scope)}`} className={navItem}>
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">Dashboard</span>
            </NavLink>
            <NavLink to={`/alerts/${encodeURIComponent(scope)}`} className={navItem}>
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">Alerts</span>
            </NavLink>
            <NavLink to={`/settings/${encodeURIComponent(scope)}`} className={navItem}>
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Settings</span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {activePhone ? (
              <>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs">
                  <User className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="font-medium text-emerald-900">
                    {farmer?.name || "Signed in"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={cn(navItem({ isActive: false }), "cursor-pointer")}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Sign out</span>
                </button>
              </>
            ) : (
              <>
                {isDemoView ? (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Demo mode
                  </span>
                ) : null}
                <NavLink to="/sign-in" className={navItem}>
                  <LogIn className="h-4 w-4" />
                  <span className="hidden md:inline">Sign in</span>
                </NavLink>
                <NavLink to="/register" className={navItem}>
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden md:inline">Register</span>
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container flex-1 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        <span>AgriAlert &middot; WeatherAI MVP 2026 - John Walter&trade;</span>
      </footer>
    </div>
  );
}
