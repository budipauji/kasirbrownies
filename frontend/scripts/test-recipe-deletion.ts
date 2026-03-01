import { db } from "../src/db";
import { recipes, rawMaterials } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function testRecipeDeletion() {
    try {
        console.log("\n=== BEFORE DELETION ===\n");

        // Get all recipes
        const allRecipes = await db.select().from(recipes);
        console.log("All recipes:", allRecipes);

        // Get all materials
        const allMaterials = await db.select().from(rawMaterials);
        console.log("\nAll materials:", allMaterials.map(m => ({ id: m.id, name: m.name })));

        if (allRecipes.length > 0) {
            const recipeToDelete = allRecipes[0];
            console.log(`\n=== ATTEMPTING TO DELETE RECIPE ID ${recipeToDelete.id} ===\n`);
            
            // Simulate DELETE endpoint logic
            const result = await db
                .delete(recipes)
                .where(eq(recipes.id, recipeToDelete.id));

            console.log(`\nDeletion result:`, {
                rowsAffected: result.length,
                message: `Recipe ${recipeToDelete.id} deleted successfully`
            });

            // Check material now that recipe is gone
            const material = await db
                .select()
                .from(rawMaterials)
                .where(eq(rawMaterials.id, recipeToDelete.materialId));
            
            if (material.length > 0) {
                console.log(`\n=== Now trying to delete material "${material[0].name}" ===\n`);
                
                // Check if any recipes reference this material
                const recipesUsingMaterial = await db
                    .select()
                    .from(recipes)
                    .where(eq(recipes.materialId, recipeToDelete.materialId));
                
                console.log(`Recipes still using material "${material[0].name}":`, recipesUsingMaterial);
                console.log(`✅ Material can now be deleted! (${recipesUsingMaterial.length} recipes remaining)`);
            }

            // Verify recipe is gone
            console.log("\n=== AFTER DELETION ===\n");
            const remainingRecipes = await db.select().from(recipes);
            console.log("Remaining recipes:", remainingRecipes);
        } else {
            console.log("No recipes to delete");
        }

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
    process.exit(0);
}

testRecipeDeletion();
