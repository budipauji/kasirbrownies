import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, products, recipes, rawMaterials, journals } from "@/db/schema";
import { eq, inArray, ne } from "drizzle-orm";
import { createSaleSchema, parseAndValidate } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/sales â€” return all non-cancelled sales
export async function GET() {
    try {
        const allSales = await db
            .select()
            .from(sales)
            .where(ne(sales.status, "cancelled"))
            .orderBy(sales.createdAt);

        return NextResponse.json(allSales);
    } catch (error) {
        console.error("[GET /api/sales]", error);
        return NextResponse.json({ error: "Gagal mengambil data penjualan" }, { status: 500 });
    }
}

// POST /api/sales â€” create a new sale transaction (atomic)
export async function POST(req: Request) {
    const { data, error } = await parseAndValidate(req, createSaleSchema);
    if (error) return error;

    // Get current session for cashier ID
    const session = await auth.api.getSession({ headers: await headers() });
    const cashierId = session?.user?.id ?? null;

    try {
        const result = await db.transaction(async (tx) => {
            // 1. Validate product availability & calculate total
            const productIds = data.items.map((item) => item.productId);
            const existingProducts = await tx
                .select()
                .from(products)
                .where(inArray(products.id, productIds));

            if (existingProducts.length !== productIds.length) {
                throw new Error("Beberapa produk tidak ditemukan");
            }

            let total = 0;
            let totalCogs = 0;

            // Validate raw materials availability based on recipes (BOM)
            for (const item of data.items) {
                const product = existingProducts.find((p) => p.id === item.productId);
                if (!product) throw new Error(`Produk ID ${item.productId} tidak ditemukan`);
                
                // Check if recipes exist and raw materials are sufficient
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
                        const qtyNeeded = recipe.quantity * item.quantity;
                        if (material.stock < qtyNeeded) {
                            throw new Error(
                                `Bahan baku "${material.name}" tidak cukup. Butuh ${qtyNeeded} ${material.unit}, stok: ${material.stock} ${material.unit}`
                            );
                        }
                    }
                }

                total += item.priceAtSale * item.quantity;
            }

            // 2. Insert sale record
            const [newSale] = await tx
                .insert(sales)
                .values({
                    total,
                    cashierId,
                    note: data.note,
                    status: "completed",
                })
                .returning();

            // 3. Insert sale items
            const itemsToInsert = data.items.map((item) => ({
                saleId: newSale.id,
                productId: item.productId,
                quantity: item.quantity,
                priceAtSale: item.priceAtSale,
                subtotal: item.priceAtSale * item.quantity,
            }));
            await tx.insert(saleItems).values(itemsToInsert);

            // 4. Deduct raw material stock based on recipes (BOM engine)
            for (const item of data.items) {
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
                        const qtyUsed = recipe.quantity * item.quantity;
                        totalCogs += qtyUsed * material.costPerUnit;

                        await tx
                            .update(rawMaterials)
                            .set({
                                stock: material.stock - qtyUsed,
                                updatedAt: new Date(),
                            })
                            .where(eq(rawMaterials.id, recipe.materialId));
                    }
                }
            }

            // 5. Double-entry accounting journals
            const journalEntries: (typeof journals.$inferInsert)[] = [
                {
                    saleId: newSale.id,
                    type: "debit",
                    account: "Kas",
                    amount: total,
                    description: `Penerimaan kas dari penjualan #${newSale.id}`,
                },
                {
                    saleId: newSale.id,
                    type: "credit",
                    account: "Pendapatan Penjualan",
                    amount: total,
                    description: `Pendapatan dari penjualan #${newSale.id}`,
                },
            ];

            if (totalCogs > 0) {
                journalEntries.push(
                    {
                        saleId: newSale.id,
                        type: "debit",
                        account: "Beban HPP",
                        amount: totalCogs,
                        description: `HPP penjualan #${newSale.id}`,
                    },
                    {
                        saleId: newSale.id,
                        type: "credit",
                        account: "Persediaan Bahan",
                        amount: totalCogs,
                        description: `Pengurangan persediaan penjualan #${newSale.id}`,
                    }
                );
            }

            await tx.insert(journals).values(journalEntries);

            return newSale;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
        console.error("[POST /api/sales]", err);
        const message = err instanceof Error ? err.message : "Gagal memproses transaksi penjualan";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

