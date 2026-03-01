"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TrendingUp, BookOpen, Loader2, Ban } from "lucide-react"
import { toast } from "sonner"

interface DashboardData {
    totalSales: number;
    inventoryValue: number;
    grossProfit: number;
    totalTransactions: number;
}

interface JournalEntry {
    id: number;
    saleId: number | null;
    account: string;
    type: string;
    amount: number;
    description: string | null;
    isReversed: boolean;
    createdAt: string;
}

interface Sale {
    id: number;
    total: number;
    status: string;
    cashierId: string | null;
    note: string | null;
    createdAt: string;
    cancelReason: string | null;
}

export default function ReportsPage() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    // Cancel dialog state
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

    const formatRp = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/reports');
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setDashboard(data.dashboard);
            setJournals(data.journals || []);
            setRecentSales(data.recentSales || []);
        } catch {
            toast.error("Gagal memuat data laporan.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const openCancelDialog = (id: number) => {
        setCancelTargetId(id);
        setCancelReason("");
        setCancelDialogOpen(true);
    };

    const handleCancelSale = async () => {
        if (!cancelTargetId) return;
        if (cancelReason.trim().length < 5) {
            toast.warning("Alasan pembatalan minimal 5 karakter.");
            return;
        }

        setIsSubmittingCancel(true);
        setCancellingId(cancelTargetId);
        try {
            const res = await fetch(`/api/sales/${cancelTargetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelReason: cancelReason.trim() }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Gagal membatalkan transaksi");
            }

            toast.success("Transaksi berhasil dibatalkan. Stok dikembalikan.");
            setCancelDialogOpen(false);
            await fetchReports();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Terjadi kesalahan saat membatalkan";
            toast.error(msg);
        } finally {
            setIsSubmittingCancel(false);
            setCancellingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const activeJournals = journals.filter(j => !j.isReversed);
    const totalDebits = activeJournals.filter(j => j.type === "debit").reduce((sum, j) => sum + j.amount, 0);
    const totalCredits = activeJournals.filter(j => j.type === "credit").reduce((sum, j) => sum + j.amount, 0);

    return (
        <div className="flex flex-col gap-6">
            {/* Cancel Confirmation Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batalkan Transaksi #{cancelTargetId}</DialogTitle>
                        <DialogDescription>
                            Transaksi tidak akan dihapus, hanya ditandai sebagai dibatalkan.
                            Stok bahan baku dan produk akan dikembalikan secara otomatis.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="cancel-reason">Alasan Pembatalan <span className="text-destructive">*</span></Label>
                        <Input
                            id="cancel-reason"
                            placeholder="Minimal 5 karakter, contoh: Salah input produk"
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={isSubmittingCancel}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleCancelSale} disabled={isSubmittingCancel}>
                            {isSubmittingCancel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ya, Batalkan Transaksi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Pendapatan</CardDescription>
                        <CardTitle className="text-2xl text-green-600">{formatRp(dashboard?.totalSales || 0)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">{dashboard?.totalTransactions || 0} transaksi penjualan</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                        <CardDescription>Total HPP (Beban Pokok)</CardDescription>
                        <CardTitle className="text-2xl text-red-600">{formatRp((dashboard?.totalSales || 0) - (dashboard?.grossProfit || 0))}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Harga Pokok Penjualan</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardDescription>Laba Kotor</CardDescription>
                        <CardTitle className={`text-2xl ${(dashboard?.grossProfit || 0) >= 0 ? "text-blue-600" : "text-destructive"}`}>
                            {formatRp(dashboard?.grossProfit || 0)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Pendapatan dikurangi HPP</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="sales">
                <TabsList>
                    <TabsTrigger value="sales" className="gap-2">
                        <TrendingUp className="h-4 w-4" /> Riwayat Penjualan
                    </TabsTrigger>
                    <TabsTrigger value="journal" className="gap-2">
                        <BookOpen className="h-4 w-4" /> Buku Besar (Jurnal)
                    </TabsTrigger>
                </TabsList>

                {/* ==================== RIWAYAT PENJUALAN ==================== */}
                <TabsContent value="sales">
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat Penjualan</CardTitle>
                            <CardDescription>
                                Klik tombol <Ban className="inline h-3 w-3 text-destructive" /> untuk membatalkan transaksi.
                                Stok bahan baku akan otomatis dikembalikan. Data tidak dihapus.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Tanggal &amp; Waktu</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-center">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentSales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                Belum ada data penjualan.
                                            </TableCell>
                                        </TableRow>
                                    ) : recentSales.map((sale) => (
                                        <TableRow key={sale.id} className={sale.status === "cancelled" ? "opacity-60" : ""}>
                                            <TableCell className="font-mono text-xs">#{sale.id}</TableCell>
                                            <TableCell className="text-sm">{formatDate(sale.createdAt)}</TableCell>
                                            <TableCell className={`text-right font-bold ${sale.status === "cancelled" ? "line-through text-muted-foreground" : "text-green-700"}`}>
                                                {formatRp(sale.total)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={sale.status === "cancelled" ? "destructive" : "default"}>
                                                    {sale.status === "cancelled" ? "Dibatalkan" : "Selesai"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {sale.status !== "cancelled" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openCancelDialog(sale.id)}
                                                        disabled={cancellingId === sale.id}
                                                        className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        {cancellingId === sale.id
                                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                                            : <Ban className="h-3 w-3" />
                                                        }
                                                        Batalkan
                                                    </Button>
                                                )}
                                                {sale.status === "cancelled" && sale.cancelReason && (
                                                    <span className="text-xs text-muted-foreground italic truncate max-w-[120px] block">
                                                        {sale.cancelReason}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== BUKU BESAR (JURNAL) ==================== */}
                <TabsContent value="journal">
                    <Card>
                        <CardHeader>
                            <CardTitle>Jurnal Umum (Double-Entry)</CardTitle>
                            <CardDescription>
                                Pencatatan akuntansi otomatis dari setiap transaksi penjualan.
                                Jurnal yang di-reverse ditandai saat transaksi dibatalkan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Akun</TableHead>
                                        <TableHead>Tipe</TableHead>
                                        <TableHead>Ref. Transaksi</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {journals.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                Belum ada jurnal. Lakukan penjualan untuk melihat entri jurnal.
                                            </TableCell>
                                        </TableRow>
                                    ) : journals.map((entry) => (
                                        <TableRow key={entry.id} className={entry.isReversed ? "opacity-50" : ""}>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(entry.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    entry.account === "Kas" ? "default" :
                                                        entry.account === "Pendapatan Penjualan" ? "secondary" :
                                                            "outline"
                                                }>
                                                    {entry.account}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={entry.type === "debit" ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                                                    {entry.type === "debit" ? "Debit" : "Kredit"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {entry.saleId ? `#${entry.saleId}` : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatRp(entry.amount)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {entry.isReversed ? (
                                                    <Badge variant="outline" className="text-muted-foreground">Reversed</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Aktif</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        {journals.length > 0 && (
                            <div className="border-t px-6 py-3 flex justify-end gap-8 text-sm">
                                <span>Total Debit (aktif): <span className="font-bold text-green-700">{formatRp(totalDebits)}</span></span>
                                <span>Total Kredit (aktif): <span className="font-bold text-red-700">{formatRp(totalCredits)}</span></span>
                            </div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
