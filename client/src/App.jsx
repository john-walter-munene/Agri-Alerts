import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Register from "./pages/Register";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";
import { DEMO_PHONE } from "./lib/demo";
import { useActivePhone } from "./hooks/useActivePhone";

/**
 * Route surface.
 *
 *   /                       -> active phone if signed in, else demo (zero-click)
 *   /sign-in                -> phone-only sign-in (no password, MVP)
 *   /register               -> registration form
 *   /dashboard/:phone       -> live forecast + AI + alerts
 *   /alerts/:phone          -> persisted history feed
 *   /settings/:phone        -> crop + trigger preferences + sign out
 *   *                       -> 404
 *
 * Identity model: phone in localStorage. Not real auth — see README.
 */
function LandingRedirect() {
  const { phone } = useActivePhone();
  const target = phone || DEMO_PHONE;
  return <Navigate to={`/dashboard/${encodeURIComponent(target)}`} replace />;
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard/:phone" element={<Dashboard />} />
        <Route path="/alerts/:phone" element={<Alerts />} />
        <Route path="/settings/:phone" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
