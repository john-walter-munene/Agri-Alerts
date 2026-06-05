/**
 * Canonical enums shared by validation, the alert engine, and the seed script.
 * Keep these in one place so the schema, the crop rules, and the trigger
 * evaluators can't drift apart.
 */

const CROP_TYPES = ["maize", "tea", "wheat", "beans", "sorghum", "mixed"];

const TRIGGER_TYPES = ["rain", "frost", "extreme_wind", "drought"];

module.exports = { CROP_TYPES, TRIGGER_TYPES };
