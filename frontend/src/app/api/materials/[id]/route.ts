import { NextResponse } from "next/server";
import { db } from "@/db";
import { rawMaterials, recipes } from "@/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/materials/[id] — soft delete a material
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const materialId = parseInt(id, 10);

    if (isNaN(materialId)) {
        return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    try {
        // Check if used in any recipe
        const usedInRecipes = await db
            .select()
            .from(recipes)
            .where(eq(recipes.materialId, materialId));

        if (usedInRecipes.length > 0) {
            return NextResponse.json(
                {
                    error: `Bahan baku ini digunakan di ${usedInRecipes.length} resep produk. Hapus produk terkait terlebih dahulu.`,
                },
                { status: 409 }
            );
        }

        // Soft delete
        await db
            .update(rawMaterials)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where(eq(rawMaterials.id, materialId));

        return NextResponse.json({ success: true, message: "Bahan baku berhasil dihapus." });
    } catch (error) {
        console.error("[DELETE /api/materials/:id]", error);
        return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
    }
}

