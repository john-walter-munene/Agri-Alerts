/**
 * Client-side phone normalizer — mirror of server/lib/phone.js so the user
 * can type `0700000001` in a form and we display `+254700000001` everywhere.
 *
 * Defense-in-depth: the server normalizes again, so the UI is allowed to be
 * slightly less strict.
 */
export const normalizePhone = (raw) => {
  if (!raw) return "";
  const digits = String(raw).replace(/[\s\-()]/g, "");

  if (digits.startsWith("+254")) return digits;
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  return digits;
};

/**
 * Lightweight predicate for form-level validation. Accepts the same set of
 * shapes the normalizer recognizes plus a length check on the Kenya MSISDN.
 */
export const isValidKenyanPhone = (raw) => {
  const n = normalizePhone(raw);
  return /^\+254\d{9}$/.test(n);
};
