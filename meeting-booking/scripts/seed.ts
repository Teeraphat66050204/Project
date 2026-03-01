import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const memberPass = await bcrypt.hash("member123", 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Admin",
      password: adminPass,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "member@demo.com" },
    update: {},
    create: {
      email: "member@demo.com",
      name: "Member",
      password: memberPass,
      role: "member",
    },
  });

  const cars = [
    { name: "Toyota Yaris", seats: 5 },
    { name: "Honda Civic", seats: 5 },
    { name: "Mazda CX-5", seats: 5 },
    { name: "Mitsubishi Pajero Sport", seats: 7 },
    { name: "Nissan Almera", seats: 5 },
  ];

  for (const car of cars) {
    const existing = await prisma.room.findFirst({ where: { name: car.name } });
    if (!existing) {
      await prisma.room.create({
        data: {
          name: car.name,
          capacity: car.seats,
        },
      });
      continue;
    }

    await prisma.room.update({
      where: { id: existing.id },
      data: { capacity: car.seats },
    });
  }

  console.log("Seeded users and cars created");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
