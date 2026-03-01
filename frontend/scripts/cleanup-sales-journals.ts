import { db } from "../src/db/index";
import { sales, saleItems, journals } from "../src/db/schema";

async function cleanupSalesAndJournals() {
    try {
        console.log("🧹 Starting cleanup of sales and journals...\n");

        // Delete all journals
        const deletedJournals = await db.delete(journals);
        console.log("✓ Deleted all journals");

        // Delete all sale items
        const deletedSaleItems = await db.delete(saleItems);
        console.log("✓ Deleted all sale items");

        // Delete all sales
        const deletedSales = await db.delete(sales);
        console.log("✓ Deleted all sales");

        console.log("\n✅ Database cleanup completed successfully!");
        console.log("📋 Summary:");
        console.log("   - Journals: deleted");
        console.log("   - Sale Items: deleted");
        console.log("   - Sales: deleted");
        console.log("\n🎉 All sales and journal records have been removed!");
    } catch (error) {
        console.error("❌ Error during cleanup:", error);
        process.exit(1);
    }
}

cleanupSalesAndJournals();
