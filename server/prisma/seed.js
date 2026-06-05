const { PrismaClient } = require("@prisma/client");
const { TRIGGER_TYPES } = require("../lib/enums");

const prisma = new PrismaClient();

/**
 * One demo farmer so reviewers see a populated dashboard with zero clicks.
 *
 * Idempotent: re-running `npm run prisma:seed` is safe — upsert ensures we
 * don't duplicate, and resets the demo data to a known state for screenshots.
 */
async function main() {
  const phone = "+254700000001";

  const demo = await prisma.farmer.upsert({
    where: { phone },
    create: {
      phone,
      name: "Demo Farmer",
      lat: -0.7833,
      lon: 35.3417,
      locationLabel: "Kapkimolwa, Bomet, Kenya",
      cropType: "tea",
      // SQLite has no native String[] — store as JSON string
      alertTriggers: JSON.stringify([...TRIGGER_TYPES]),
    },
    update: {
      name: "Demo Farmer",
      lat: -0.7833,
      lon: 35.3417,
      locationLabel: "Kapkimolwa, Bomet, Kenya",
      cropType: "tea",
      alertTriggers: JSON.stringify([...TRIGGER_TYPES]),
    },
  });

  console.log(`✓ Seeded demo farmer ${demo.phone} (${demo.name})`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
