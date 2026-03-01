import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, recipes, rawMaterials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createProductSchema, parseAndValidate } from "@/lib/validations";

// GET /api/products — return all products with recipes (exclude soft-deleted)
export async function GET() {
    try {
        const allProducts = await db
            .select()
            .from(products)
            .where(eq(products.isDeleted, false));

        const allRecipes = await db.select().from(recipes);
        const allMaterials = await db
            .select()
            .from(rawMaterials)
            .where(eq(rawMaterials.isDeleted, false));

        const materialMap = new Map(allMaterials.map((m) => [m.id, m]));

        const productsWithRecipes = allProducts.map((product) => {
            const productRecipes = allRecipes
                .filter((r) => r.productId === product.id)
                .map((r) => ({
                    ...r,
                    rawMaterial: materialMap.get(r.materialId) ?? {
                        name: "Unknown",
                        unit: "-",
                        id: r.materialId,
                        costPerUnit: 0,
                        stock: 0,
                        isDeleted: false,
                        deletedAt: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                }));
            return { ...product, recipes: productRecipes };
        });

        return NextResponse.json(productsWithRecipes);
    } catch (error) {
        console.error("[GET /api/products]", error);
        return NextResponse.json({ error: "Gagal mengambil data produk" }, { status: 500 });
    }
}

// POST /api/products — create a product with BOM
export async function POST(req: Request) {
    const { data, error } = await parseAndValidate(req, createProductSchema);
    if (error) return error;

    try {
        const [newProduct] = await db
            .insert(products)
            .values({
                name: data.name,
                price: data.price,
                stock: data.stock ?? 0,
                imageUrl: data.imageUrl ?? null,
            })
            .returning();

        let createdRecipes: typeof recipes.$inferSelect[] = [];

        if (Array.isArray(data.recipes) && data.recipes.length > 0) {
            const recipeValues = data.recipes.map((item) => ({
                productId: newProduct.id,
                materialId: item.materialId,
                quantity: item.quantity,
            }));

            createdRecipes = await db.insert(recipes).values(recipeValues).returning();
        }

        return NextResponse.json({ ...newProduct, recipes: createdRecipes }, { status: 201 });
    } catch (err) {
        console.error("[POST /api/products]", err);
        return NextResponse.json({ error: "Gagal menyimpan produk" }, { status: 500 });
    }
}

