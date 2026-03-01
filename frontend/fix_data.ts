import { db } from "./src/db";
import { sales, journals } from "./src/db/schema";
import { sql, lt } from "drizzle-orm";

async function migrate() {
    // If date is < 10,000,000,000, it's definitely seconds not ms
    const threshold = 10000000000;

    console.log("Migrating sales...");
    await db.update(sales)
        .set({ date: sql`${sales.date} * 1000` })
        .where(lt(sales.date, new Date(threshold))) // Using Date object because of mode: timestamp_ms
        .run();

    console.log("Migrating journals...");
    await db.update(journals)
        .set({ date: sql`${journals.date} * 1000` })
        .where(lt(journals.date, new Date(threshold)))
        .run();

    console.log("Done!");
}

migrate();
