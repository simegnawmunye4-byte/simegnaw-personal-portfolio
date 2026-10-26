import "./src/config.js";
import app from "./src/app.js";
import { prisma } from "./src/db.js";

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. From the backend folder, run `Copy-Item .env.example .env` and set your PostgreSQL connection string in .env.",
  );
  process.exit(1);
}

const port = Number(process.env.PORT || 5000);

try {
  await prisma.$connect();
  const server = app.listen(port, () => {
    console.log(`Portfolio API listening on http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(async (error) => {
      await prisma.$disconnect();
      if (error) {
        console.error("Error during server shutdown:", error);
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} catch (error) {
  console.error("Could not connect to PostgreSQL:", error.message);
  process.exitCode = 1;
}