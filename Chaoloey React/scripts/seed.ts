import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { carCatalog } from "../src/data/cars";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const memberPass = await bcrypt.hash("member123", 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: { name: "Admin", role: "admin", password: adminPass },
    create: {
      email: "admin@demo.com",
      name: "Admin",
      password: adminPass,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "member@demo.com" },
    update: { name: "Member", role: "member", password: memberPass },
    create: {
      email: "member@demo.com",
      name: "Member",
      password: memberPass,
      role: "member",
    },
  });

  const catalogNameSet = new Set(carCatalog.map((c) => c.name.toLowerCase()));

  for (const car of carCatalog) {
    const existing = await prisma.room.findFirst({ where: { name: car.name } });
    if (!existing) {
      await prisma.room.create({ data: { name: car.name, capacity: car.seats } });
    } else {
      await prisma.room.update({ where: { id: existing.id }, data: { capacity: car.seats } });
    }
  }

  const candidates = await prisma.room.findMany({
    where: {
      NOT: {
        name: {
          in: carCatalog.map((c) => c.name),
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  for (const row of candidates) {
    if (catalogNameSet.has(row.name.toLowerCase())) continue;
    const bookingCount = await prisma.booking.count({ where: { roomId: row.id } });
    const holdCount = await prisma.bookingHold.count({ where: { roomId: row.id } });
    if (bookingCount === 0 && holdCount === 0) {
      await prisma.room.delete({ where: { id: row.id } });
    }
  }

  console.log("Seed complete");
}

main().finally(async () => {
  await prisma.$disconnect();
});
