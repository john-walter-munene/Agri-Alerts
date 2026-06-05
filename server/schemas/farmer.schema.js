const { z } = require("zod");
const { CROP_TYPES, TRIGGER_TYPES } = require("../lib/enums");

/**
 * Schemas validate at the controller boundary so services can assume clean,
 * typed input. The phone field is intentionally permissive here — strict
 * normalization happens in lib/phone before the value reaches Prisma.
 */

const phoneSchema = z
  .string()
  .trim()
  .min(7, "phone is too short")
  .max(20, "phone is too long");

const createFarmerSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(1, "name is required").max(100),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  locationLabel: z.string().trim().min(1).max(200).optional(),
  cropType: z.enum(CROP_TYPES),
  // Default to all triggers enabled — friendlier for the demo.
  alertTriggers: z.array(z.enum(TRIGGER_TYPES)).default([...TRIGGER_TYPES]),
});

// Update accepts a partial payload. Phone is not updatable — it's the identifier.
const updateFarmerSchema = createFarmerSchema.partial().omit({ phone: true });

const askFarmerSchema = z
  .object({
    question: z.string().trim().min(1).max(500).optional(),
    mode: z.enum(["auto", "custom"]).default("custom"),
  })
  // If mode === "custom" then question is required.
  .refine((v) => v.mode !== "custom" || !!v.question, {
    message: "question is required when mode is 'custom'",
    path: ["question"],
  });

module.exports = {
  createFarmerSchema,
  updateFarmerSchema,
  askFarmerSchema,
};
