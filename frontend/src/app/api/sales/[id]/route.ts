import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, products, journals, rawMaterials, recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cancelSaleSchema, parseAndValidate } from "@/lib/validations";

// GET /api/sales/[id] â€” get sale details
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const saleId = parseInt(id, 10);

    if (isNaN(saleId)) {
        return NextResponse.json({ error: "ID penjualan tidak valid" }, { status: 400 });
    }

    try {
        const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));

        if (!sale) {
            return NextResponse.json({ error: "Penjualan tidak ditemukan" }, { status: 404 });
        }

        const items = await db
            .select()
            .from(saleItems)
            .where(eq(saleItems.saleId, saleId));

        return NextResponse.json({ ...sale, items });
    } catch (error) {
        console.error("[GET /api/sales/:id]", error);
        return NextResponse.json({ error: "Gagal mengambil data penjualan" }, { status: 500 });
    }
}

// PATCH /api/sales/[id] â€” soft cancel a sale (reverses stock + journals)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const saleId = parseInt(id, 10);

    if (isNaN(saleId)) {
        return NextResponse.json({ error: "ID penjualan tidak valid" }, { status: 400 });
    }

    const { data, error } = await parseAndValidate(req, cancelSaleSchema);
    if (error) return error;

    try {
        await db.transaction(async (tx) => {
            // 1. Fetch the sale
            const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));

            if (!sale) throw new Error("Penjualan tidak ditemukan");
            if (sale.status === "cancelled") throw new Error("Penjualan sudah dibatalkan sebelumnya");

            // 2. Soft cancel â€” never hard delete
            await tx
                .update(sales)
                .set({
                    status: "cancelled",
                    cancelledAt: new Date(),
                    cancelReason: data.cancelReason,
                    updatedAt: new Date(),
                })
                .where(eq(sales.id, saleId));

            // 3. Get sale items for stock reversal
            const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));

            // 4. Restore product stock + raw material stock
            for (const item of items) {
                const [product] = await tx.select().from(products).where(eq(products.id, item.productId));

                if (product) {
                    await tx
                        .update(products)
                        .set({ stock: product.stock + item.quantity, updatedAt: new Date() })
                        .where(eq(products.id, item.productId));
                }

                const productRecipes = await tx
                    .select()
                    .from(recipes)
                    .where(eq(recipes.productId, item.productId));

                for (const recipe of productRecipes) {
                    const [material] = await tx
                        .select()
                        .from(rawMaterials)
                        .where(eq(rawMaterials.id, recipe.materialId));

                    if (material) {
                        await tx
                            .update(rawMaterials)
                            .set({
                                stock: material.stock + recipe.quantity * item.quantity,
                                updatedAt: new Date(),
                            })
                            .where(eq(rawMaterials.id, recipe.materialId));
                    }
                }
            }

            // 5. Mark existing journals as reversed
            await tx
                .update(journals)
                .set({ isReversed: true, reversedAt: new Date() })
                .where(eq(journals.saleId, saleId));

            // 6. Insert reversal journal entries
            await tx.insert(journals).values([
                {
                    saleId,
                    type: "credit",
                    account: "Kas",
                    amount: sale.total,
                    description: `Reversal kas â€” pembatalan penjualan #${saleId}. Alasan: ${data.cancelReason}`,
                },
                {
                    saleId,
                    type: "debit",
                    account: "Pendapatan Penjualan",
                    amount: sale.total,
                    description: `Reversal pendapatan â€” pembatalan penjualan #${saleId}. Alasan: ${data.cancelReason}`,
                },
            ]);
        });

        return NextResponse.json({ message: "Penjualan berhasil dibatalkan", saleId });
    } catch (err: unknown) {
        console.error("[PATCH /api/sales/:id]", err);
        const message = err instanceof Error ? err.message : "Gagal membatalkan penjualan";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

