"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Loader2 } from "lucide-react"

interface DashboardStats {
    totalSales: number;
    inventoryValue: number;
    grossProfit: number;
    totalTransactions: number;
}

interface DailySale {
    date: string; // "2026-03-01"
    total: number;
    count: number;
}

interface SaleItem {
    quantity: number;
    priceAtSale: number;
    productName: string;
}

interface RecentSale {
    id: number;
    createdAt: string;
    total: number;
    items: SaleItem[];
}

const formatRp = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border rounded-lg shadow-md p-3 text-sm">
                <p className="font-semibold mb-1">{label}</p>
                <p className="text-primary">{formatRp(payload[0].value)}</p>
                <p className="text-muted-foreground text-xs">{payload[0].payload.count} transaksi</p>
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [dailySales, setDailySales] = useState<DailySale[]>([]);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/reports', { cache: 'no-store' });
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                setStats(data.dashboard);
                setDailySales(data.dailySales || []);
                setRecentSales(data.recentSalesWithItems || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const chartData = dailySales.map(d => ({
        name: formatDateLabel(d.date),
        total: d.total,
        count: d.count,
    }));

    const statCards = [
        { label: "Total Penjualan", value: formatRp(stats?.totalSales || 0), sub: `${stats?.totalTransactions || 0} transaksi` },
        { label: "Nilai Persediaan", value: formatRp(stats?.inventoryValue || 0), sub: "Bahan baku tersisa" },
        { label: "Laba Kotor", value: formatRp(stats?.grossProfit || 0), sub: "Pendapatan - HPP" },
        { label: "Total Transaksi", value: String(stats?.totalTransactions || 0), sub: "Semua waktu" },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Card key={card.label}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className="text-xs text-muted-foreground">{card.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Chart + Recent Sales */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Bar Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Ringkasan Penjualan</CardTitle>
                        <CardDescription>Total penjualan harian (30 hari terakhir)</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {chartData.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                                Belum ada data penjualan untuk ditampilkan.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="total"
                                        radius={[4, 4, 0, 0]}
                                        fill="hsl(var(--primary))"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Sales */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Penjualan Terakhir</CardTitle>
                        <CardDescription>5 transaksi terbaru</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentSales.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                Belum ada transaksi penjualan.
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {recentSales.map((sale) => {
                                    const itemLabel = sale.items.length > 0
                                        ? sale.items.map(i => `${i.productName} x${i.quantity}`).join(', ')
                                        : 'Detail tidak tersedia';
                                    const dateLabel = new Date(sale.createdAt).toLocaleString('id-ID', {
                                        dateStyle: 'short',
                                        timeStyle: 'short'
                                    });
                                    return (
                                        <div key={sale.id} className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{itemLabel}</p>
                                                <p className="text-xs text-muted-foreground">{dateLabel}</p>
                                            </div>
                                            <div className="text-sm font-semibold text-green-600 shrink-0">
                                                +{formatRp(sale.total)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
