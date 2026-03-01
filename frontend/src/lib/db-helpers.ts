import { eq } from "drizzle-orm";
import { rawMaterials, products } from "@/db/schema";

/**
 * Reusable WHERE condition to exclude soft-deleted records.
 * Usage: db.select().from(rawMaterials).where(notDeleted(rawMaterials))
 */
export const notDeleted = <T extends { isDeleted: typeof rawMaterials.isDeleted }>(
    table: T
) => eq(table.isDeleted, false);
