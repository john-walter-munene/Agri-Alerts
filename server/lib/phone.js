/**
 * Phone normalization for Kenyan numbers (option A).
 *
 * Goal: phone is the user identifier, so a registration as "0700000001" and a
 * lookup as "+254700000001" must hit the same row. We normalize at the edge
 * (controller + service lookups) and store one canonical form.
 *
 * Rules (intentionally simple for the MVP):
 *   - Strip spaces, dashes, parentheses
 *   - "07XXXXXXXX" or "01XXXXXXXX"  -> "+2547XXXXXXXX" / "+2541XXXXXXXX"
 *   - "2547XXXXXXXX"               -> "+2547XXXXXXXX"
 *   - "+254XXXXXXXXX"              -> passthrough (already canonical)
 *   - Anything else                -> passthrough (let it fail validation if invalid)
 *
 * Non-Kenyan numbers are left untouched. The spec targets African farmers; if we
 * widen to other regions later, swap this for libphonenumber-js.
 */
const normalizePhone = (raw) => {
  if (typeof raw !== "string") return raw;

  const cleaned = raw.replace(/[\s\-().]/g, "");

  // 07XXXXXXXX or 01XXXXXXXX -> +2547XXXXXXXX / +2541XXXXXXXX
  if (/^0[17]\d{8}$/.test(cleaned)) {
    return `+254${cleaned.slice(1)}`;
  }

  // 2547XXXXXXXX or 2541XXXXXXXX -> +254...
  if (/^254[17]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return cleaned;
};

module.exports = { normalizePhone };
