/**
 * Crop + trigger constants — mirror of server/lib/enums.js. Used for form
 * dropdowns/checkboxes. If the server enum changes, update both — there's
 * no shared schema package in MVP.
 */
export const CROP_TYPES = ["maize", "tea", "wheat", "beans", "potatoes", "bananas", "mixed"];

export const TRIGGER_TYPES = ["rain", "frost", "extreme_wind", "drought"];

export const TRIGGER_LABELS = {
  rain: "Heavy rain",
  frost: "Frost",
  extreme_wind: "Extreme wind",
  drought: "Drought",
};

export const SEVERITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
