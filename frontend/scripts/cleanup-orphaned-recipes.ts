import { db } from "../src/db/index";
import { recipes, products } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function cleanupOrphanedRecipes() {
    try {
        console.log("🧹 Starting cleanup of orphaned recipes...\n");

        // Get all recipes
        const allRecipes = await db.select().from(recipes);
        console.log(`Total recipes in database: ${allRecipes.length}`);

        if (allRecipes.length === 0) {
            console.log("✅ No recipes found. Database is clean!");
            return;
        }

        // Get all active (non-deleted) products
        const activeProducts = await db
            .select()
            .from(products)
            .where(eq(products.isDeleted, false));
        
        const activeProductIds = new Set(activeProducts.map(p => p.id));
        console.log(`Active products: ${activeProductIds.size}\n`);

        // Find orphaned recipes (recipes whose product is deleted)
        const orphanedRecipes = allRecipes.filter(
            r => !activeProductIds.has(r.productId)
        );

        if (orphanedRecipes.length === 0) {
            console.log("✅ No orphaned recipes found!");
            return;
        }

        console.log(`Found ${orphanedRecipes.length} orphaned recipe(s):\n`);
        for (const recipe of orphanedRecipes) {
            console.log(`  - Recipe ID ${recipe.id}: productId=${recipe.productId}, materialId=${recipe.materialId}, qty=${recipe.quantity}`);
        }

        // Delete orphaned recipes
        for (const recipe of orphanedRecipes) {
            await db.delete(recipes).where(eq(recipes.id, recipe.id));
            console.log(`  ✓ Deleted recipe ID ${recipe.id}`);
        }

        console.log(`\n✅ Successfully deleted ${orphanedRecipes.length} orphaned recipe(s)!`);
        console.log("🎉 You can now delete the raw materials!");

    } catch (error) {
        console.error("❌ Error during cleanup:", error);
        process.exit(1);
    }
}

cleanupOrphanedRecipes();
