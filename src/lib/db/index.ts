import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Completely disable all caching to ensure immediate consistency
neonConfig.fetchConnectionCache = false;
neonConfig.useSecureWebSocket = false;

if (!process.env.DATABASE_URL) {
  throw new Error("database url not found");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

// Separate connection for fresh reads (to avoid cache issues)
const sqlFresh = neon(process.env.DATABASE_URL);
export const dbFresh = drizzle(sqlFresh);
