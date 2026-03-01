import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, saleItems, recipes } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/products/[id] — update product data and recipes
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { name, price, recipes: updatedRecipes } = body;

        // update product fields
        const updateData: any = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = price;

        await db.update(products).set(updateData).where(eq(products.id, productId));

        // handle recipes: replace existing set with given array
        if (Array.isArray(updatedRecipes)) {
            // delete all existing recipes for this product
            await db.delete(recipes).where(eq(recipes.productId, productId));

            if (updatedRecipes.length > 0) {
                const recipeValues = updatedRecipes.map((item: any) => ({
                    productId,
                    materialId: item.materialId,
                    quantity: item.quantity,
                }));
                await db.insert(recipes).values(recipeValues);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[PATCH /api/products/:id]", err);
        return NextResponse.json({ error: "Gagal mengupdate produk" }, { status: 500 });
    }
}

// DELETE /api/products/[id] — soft delete a product
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
        return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    try {
        // For made-to-order bakery: allow soft-delete even with sales history
        // Sales are immutable historical records
        
        // First, hard-delete all recipes associated with this product
        await db.delete(recipes).where(eq(recipes.productId, productId));
        
        // Then soft-delete the product itself
        await db
            .update(products)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where(eq(products.id, productId));

        return NextResponse.json({ success: true, message: "Produk berhasil dihapus." });
    } catch (error) {
        console.error("[DELETE /api/products/:id]", error);
        return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
    }
}

