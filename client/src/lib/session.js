/**
 * Active-farmer session — localStorage-backed.
 *
 * Not real auth (MVP). We persist the phone the user registered or signed in
 * with so they land on their own dashboard between visits. The server still
 * doesn't trust this — it's purely a client-side convenience.
 *
 * Cross-tab sync is via the native `storage` event (handled in useActivePhone).
 */
const KEY = "agriAlert.activePhone";

export const getActivePhone = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setActivePhone = (phone) => {
  if (typeof window === "undefined") return;
  try {
    if (phone) window.localStorage.setItem(KEY, phone);
    else window.localStorage.removeItem(KEY);
    // Same-tab listeners — native `storage` only fires on OTHER tabs.
    window.dispatchEvent(new CustomEvent("agriAlert:activePhoneChanged"));
  } catch {
    // localStorage blocked (private mode quota / disabled) — degrade silently.
  }
};

export const clearActivePhone = () => setActivePhone(null);
