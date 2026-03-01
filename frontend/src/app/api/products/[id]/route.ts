import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, saleItems } from "@/db/schema";
import { eq } from "drizzle-orm";

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
        // Cannot soft-delete a product that has sales history
        const usedInSales = await db
            .select()
            .from(saleItems)
            .where(eq(saleItems.productId, productId));

        if (usedInSales.length > 0) {
            return NextResponse.json(
                {
                    error: `Produk ini sudah memiliki ${usedInSales.length} riwayat penjualan dan tidak dapat dihapus.`,
                },
                { status: 409 }
            );
        }

        // Soft delete
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

