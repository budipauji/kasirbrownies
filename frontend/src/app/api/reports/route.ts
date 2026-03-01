import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, rawMaterials, journals, saleItems, products } from "@/db/schema";
import { sql, desc, eq, ne } from "drizzle-orm";

export async function GET() {
    try {
        // 1. Total Sales Revenue (completed sales only)
        const totalSalesResult = await db
            .select({ total: sql<number>`coalesce(sum(${sales.total}), 0)` })
            .from(sales)
            .where(ne(sales.status, "cancelled"));
        const totalSales = Number(totalSalesResult[0]?.total ?? 0);

        // 2. Total Raw Material Inventory Value
        const inventoryResult = await db
            .select({
                totalValue: sql<number>`coalesce(sum(${rawMaterials.stock} * ${rawMaterials.costPerUnit}), 0)`,
            })
            .from(rawMaterials)
            .where(eq(rawMaterials.isDeleted, false));
        const inventoryValue = Number(inventoryResult[0]?.totalValue ?? 0);

        // 3. COGS (Beban HPP) â€” only from non-reversed journals
        const cogsResult = await db
            .select({ totalCogs: sql<number>`coalesce(sum(${journals.amount}), 0)` })
            .from(journals)
            .where(
                sql`${journals.account} = 'Beban HPP' AND ${journals.isReversed} = false`
            );
        const totalCogs = Number(cogsResult[0]?.totalCogs ?? 0);
        const grossProfit = totalSales - totalCogs;

        // 4. Total transaction count (completed)
        const totalTransactionsResult = await db
            .select({ count: sql<number>`count(${sales.id})` })
            .from(sales)
            .where(ne(sales.status, "cancelled"));
        const totalTransactions = Number(totalTransactionsResult[0]?.count ?? 0);

        // 5. Recent journal entries (last 50)
        const recentJournals = await db
            .select()
            .from(journals)
            .orderBy(desc(journals.createdAt))
            .limit(50);

        // 6. Recent sales (last 10, all statuses for full history)
        const recentSales = await db
            .select()
            .from(sales)
            .orderBy(desc(sales.createdAt))
            .limit(10);

        // 7. Last 5 completed sales with line-item details for "Penjualan Terakhir" widget
        const last5Sales = await db
            .select()
            .from(sales)
            .where(ne(sales.status, "cancelled"))
            .orderBy(desc(sales.createdAt))
            .limit(5);

        const recentSalesWithItems = await Promise.all(
            last5Sales.map(async (sale) => {
                const items = await db
                    .select({
                        quantity: saleItems.quantity,
                        price: saleItems.priceAtSale,
                        productName: products.name,
                    })
                    .from(saleItems)
                    .innerJoin(products, eq(saleItems.productId, products.id))
                    .where(eq(saleItems.saleId, sale.id));
                return { ...sale, items };
            })
        );

        // 8. Daily sales for the last 30 days (Postgres DATE_TRUNC)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyChartData = await db
            .select({
                date: sql<string>`to_char(date_trunc('day', ${sales.createdAt}), 'YYYY-MM-DD')`,
                total: sql<number>`coalesce(sum(${sales.total}), 0)`,
                count: sql<number>`count(${sales.id})`,
            })
            .from(sales)
            .where(
                sql`${sales.createdAt} >= ${thirtyDaysAgo} AND ${sales.status} != 'cancelled'`
            )
            .groupBy(sql`date_trunc('day', ${sales.createdAt})`)
            .orderBy(sql`date_trunc('day', ${sales.createdAt})`);

        return NextResponse.json({
            dashboard: {
                totalSales,
                inventoryValue,
                grossProfit,
                totalTransactions,
            },
            journals: recentJournals,
            recentSales,
            recentSalesWithItems,
            dailySales: dailyChartData,
        });
    } catch (error) {
        console.error("[GET /api/reports]", error);
        return NextResponse.json({ error: "Gagal mengambil data laporan" }, { status: 500 });
    }
}

