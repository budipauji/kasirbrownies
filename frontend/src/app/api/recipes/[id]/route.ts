import { NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/recipes/[id] — delete a recipe item
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const recipeId = parseInt(id);
        if (isNaN(recipeId)) {
            return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
        }

        // Delete the recipe
        const result = await db
            .delete(recipes)
            .where(eq(recipes.id, recipeId));

        if (!result || result.length === 0) {
            return NextResponse.json({ error: "Resep tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({ message: "Resep berhasil dihapus" }, { status: 200 });
    } catch (error) {
        console.error("[DELETE /api/recipes/[id]]", error);
        return NextResponse.json({ error: "Gagal menghapus resep" }, { status: 500 });
    }
}
