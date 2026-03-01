import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL environment variable is not set. " +
        "Tambahkan DATABASE_URL di file .env.local Anda."
    );
}

const connectionString = process.env.DATABASE_URL;

// Prevent multiple connections in development (hot-reload safe)
const globalForDb = globalThis as unknown as { pgClient: ReturnType<typeof postgres> | undefined };

const client =
    globalForDb.pgClient ??
    postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = client;
}

export const db = drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === "development",
});

export type Database = typeof db;