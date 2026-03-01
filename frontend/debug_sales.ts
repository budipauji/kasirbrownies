import { db } from "./src/db";
import { sales } from "./src/db/schema";
import { sql } from "drizzle-orm";

async function debug() {
    const allSales = await db.select().from(sales);
    console.log("Total sales in DB:", allSales.length);
    console.log("Samples:", JSON.stringify(allSales.slice(-2), null, 2));

    const grouped = await db.select({
        dateRaw: sales.date,
        formatted: sql`strftime('%Y-%m-%d', datetime(${sales.date} / 1000, 'unixepoch'))`
    }).from(sales);
    console.log("Formatted dates:", JSON.stringify(grouped, null, 2));
}

debug();
