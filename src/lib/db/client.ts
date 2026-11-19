import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

let client: Client | null = null;
let db: Db | null = null;

function ensureLocalDataDir(url: string) {
  if (!url.startsWith("file:")) return;
  const filePath = url.replace(/^file:/, "");
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
}

export function getDbUrl() {
  return process.env.DATABASE_URL ?? "file:./data/local.db";
}

export function createDb(url = getDbUrl(), authToken = process.env.DATABASE_AUTH_TOKEN) {
  ensureLocalDataDir(url);
  const libsql = createClient({
    url,
    authToken: authToken || undefined,
  });
  return {
    client: libsql,
    db: drizzle(libsql, { schema }),
  };
}

export function getDb(): Db {
  if (db) return db;
  const created = createDb();
  client = created.client;
  db = created.db;
  return db;
}

export function getClient(): Client {
  if (client) return client;
  getDb();
  if (!client) throw new Error("Database client failed to initialize");
  return client;
}
