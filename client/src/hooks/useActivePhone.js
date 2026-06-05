import * as React from "react";
import { getActivePhone, setActivePhone, clearActivePhone } from "@/lib/session";

/**
 * React hook around the activePhone session.
 *
 * Subscribes to both:
 *   - cross-tab `storage` events (native)
 *   - same-tab `agriAlert:activePhoneChanged` events (our setter dispatches)
 *
 * So sign-out in one tab propagates to every component in every tab.
 */
export function useActivePhone() {
  const [phone, setPhone] = React.useState(() => getActivePhone());

  React.useEffect(() => {
    const sync = () => setPhone(getActivePhone());
    window.addEventListener("storage", sync);
    window.addEventListener("agriAlert:activePhoneChanged", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("agriAlert:activePhoneChanged", sync);
    };
  }, []);

  return {
    phone,
    signIn: (p) => setActivePhone(p),
    signOut: () => clearActivePhone(),
  };
}
