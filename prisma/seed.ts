import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@antik.app" },
    update: {},
    create: { email: "demo@antik.app", name: "Demo", passwordHash, role: "ADMIN" },
  });

  const existing = await prisma.item.count();
  if (existing > 0) return;

  const raum = await prisma.location.create({
    data: { name: "Wohnzimmer", description: "Vitrine an der Ostwand" },
  });
  const keller = await prisma.location.create({
    data: { name: "Keller" },
  });
  const kiste = await prisma.location.create({
    data: { name: "Kiste 1", description: "Beschriftet: Geschirr Oma", parentId: keller.id },
  });

  const uhr = await prisma.item.create({
    data: {
      name: "Standuhr",
      inventoryNumber: "INV-0001",
      category: "Uhr",
      era: "Biedermeier",
      origin: "Schwarzwald, ca. 1830",
      material: "Eichenholz, Messing",
      dimensions: "H 210 cm, B 45 cm, T 28 cm",
      condition: "Gut",
      description: "Standuhr mit geschnitztem Gehäuse, Werk ungeprüft.",
      acquisitionNote: "Geerbt von Großvater (väterlicherseits).",
      locationId: raum.id,
      createdById: user.id,
      searchText: "Standuhr Biedermeier Uhr Schwarzwald Eichenholz Messing",
    },
  });
  await prisma.appraisal.create({
    data: { itemId: uhr.id, value: 1800, currency: "EUR", appraisalDate: new Date("2024-06-01"), appraiser: "Auktionshaus Beispiel", note: "Geschätzt nach Foto" },
  });

  const krug = await prisma.item.create({
    data: {
      name: "Porzellan-Kanne",
      inventoryNumber: "INV-0002",
      category: "Keramik",
      era: "Jugendstil",
      origin: "Meißen",
      material: "Porzellan",
      dimensions: "H 22 cm",
      condition: "Sehr gut",
      description: "Kanne mit floralem Jugendstil-Dekor, keine Beschädigungen.",
      acquisitionNote: "Aus der Sammlung der Großmutter.",
      locationId: kiste.id,
      createdById: user.id,
      searchText: "Porzellan-Kanne Keramik Jugendstil Meißen Porzellan",
    },
  });
  await prisma.appraisal.create({
    data: { itemId: krug.id, value: 450, currency: "EUR", appraisalDate: new Date("2025-02-15"), appraiser: "Antiquitäten Müller" },
  });

  console.log("Seed abgeschlossen: demo@antik.app / demo1234 (Admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
