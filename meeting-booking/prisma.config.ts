import "dotenv/config";
// Prisma 5.x in this project does not expose "prisma/config".
// Keep a plain object config to avoid type-check errors in Astro/TS.
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
};
