import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { createDb } from "./client";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./data/local.db";
  const { client, db } = createDb(url, process.env.DATABASE_AUTH_TOKEN);

  console.log(`Migrating database: ${url}`);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  client.close();
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
