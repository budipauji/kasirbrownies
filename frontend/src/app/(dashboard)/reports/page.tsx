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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, BookOpen, Loader2, Ban, Download } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

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

    // Filter state
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));

    // Cancel dialog state
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

    const formatRp = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    // Filter data by selected month/year
    const filterByMonth = (data: any[], dateField: string) => {
        return data.filter(item => {
            const date = new Date(item[dateField]);
            return date.getFullYear().toString() === selectedYear && 
                   String(date.getMonth() + 1).padStart(2, "0") === selectedMonth;
        });
    };

    const filteredSales = filterByMonth(recentSales, 'createdAt');
    const filteredJournals = filterByMonth(journals, 'createdAt');

    // Export to Excel
    const exportSalesToExcel = () => {
        if (filteredSales.length === 0) {
            toast.error("Tidak ada data penjualan untuk bulan ini");
            return;
        }

        const data = filteredSales.map(sale => ({
            'ID Transaksi': `#${sale.id}`,
            'Tanggal': new Date(sale.createdAt).toLocaleDateString('id-ID'),
            'Waktu': new Date(sale.createdAt).toLocaleTimeString('id-ID'),
            'Total (Rp)': sale.total,
            'Status': sale.status === 'cancelled' ? 'Dibatalkan' : 'Selesai',
            'Catatan': sale.note || '-',
            'Alasan Pembatalan': sale.cancelReason || '-',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Penjualan");
        
        // Format header
        const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "4472C4" } }, alignment: { horizontal: "center" } };
        Object.keys(data[0] || {}).forEach((key, index) => {
            const cellRef = XLSX.utils.encode_col(index) + "1";
            ws[cellRef].s = headerStyle;
        });

        const monthName = new Date(2024, parseInt(selectedMonth) - 1).toLocaleString('id-ID', { month: 'long' });
        XLSX.writeFile(wb, `Riwayat_Penjualan_${monthName}_${selectedYear}.xlsx`);
        toast.success("File Excel berhasil diunduh!");
    };

    const exportJournalsToExcel = () => {
        if (filteredJournals.length === 0) {
            toast.error("Tidak ada jurnal untuk bulan ini");
            return;
        }

        const data = filteredJournals.map(entry => ({
            'Tanggal': new Date(entry.createdAt).toLocaleDateString('id-ID'),
            'Akun': entry.account,
            'Tipe': entry.type === 'debit' ? 'Debit' : 'Kredit',
            'Jumlah (Rp)': entry.amount,
            'Referensi': entry.saleId ? `#${entry.saleId}` : '-',
            'Keterangan': entry.description || '-',
            'Status': entry.isReversed ? 'Reversed' : 'Aktif',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jurnal");

        // Format header
        const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "70AD47" } }, alignment: { horizontal: "center" } };
        Object.keys(data[0] || {}).forEach((key, index) => {
            const cellRef = XLSX.utils.encode_col(index) + "1";
            ws[cellRef].s = headerStyle;
        });

        const monthName = new Date(2024, parseInt(selectedMonth) - 1).toLocaleString('id-ID', { month: 'long' });
        XLSX.writeFile(wb, `Jurnal_Umum_${monthName}_${selectedYear}.xlsx`);
        toast.success("File Excel berhasil diunduh!");
    };

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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Riwayat Penjualan</CardTitle>
                                <CardDescription>
                                    Klik tombol <Ban className="inline h-3 w-3 text-destructive" /> untuk membatalkan transaksi.
                                    Stok bahan baku akan otomatis dikembalikan. Data tidak dihapus.
                                </CardDescription>
                            </div>
                            <div className="flex items-end gap-3">
                                <div>
                                    <Label htmlFor="sales-month" className="text-xs mb-1 block">Bulan</Label>
                                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                        <SelectTrigger className="w-[100px]" id="sales-month">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => {
                                                const month = String(i + 1).padStart(2, "0");
                                                const monthName = new Date(2024, i).toLocaleString('id-ID', { month: 'long' });
                                                return <SelectItem key={month} value={month}>{monthName}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="sales-year" className="text-xs mb-1 block">Tahun</Label>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-[100px]" id="sales-year">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 5 }, (_, i) => {
                                                const year = (new Date().getFullYear() - i).toString();
                                                return <SelectItem key={year} value={year}>{year}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={exportSalesToExcel} size="sm" className="gap-2">
                                    <Download className="h-4 w-4" /> Export Excel
                                </Button>
                            </div>
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
                                    {filteredSales.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                Belum ada data penjualan untuk bulan ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredSales.map((sale) => (
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Jurnal Umum (Double-Entry)</CardTitle>
                                <CardDescription>
                                    Pencatatan akuntansi otomatis dari setiap transaksi penjualan.
                                    Jurnal yang di-reverse ditandai saat transaksi dibatalkan.
                                </CardDescription>
                            </div>
                            <div className="flex items-end gap-3">
                                <div>
                                    <Label htmlFor="journal-month" className="text-xs mb-1 block">Bulan</Label>
                                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                        <SelectTrigger className="w-[100px]" id="journal-month">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => {
                                                const month = String(i + 1).padStart(2, "0");
                                                const monthName = new Date(2024, i).toLocaleString('id-ID', { month: 'long' });
                                                return <SelectItem key={month} value={month}>{monthName}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="journal-year" className="text-xs mb-1 block">Tahun</Label>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-[100px]" id="journal-year">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 5 }, (_, i) => {
                                                const year = (new Date().getFullYear() - i).toString();
                                                return <SelectItem key={year} value={year}>{year}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={exportJournalsToExcel} size="sm" className="gap-2">
                                    <Download className="h-4 w-4" /> Export Excel
                                </Button>
                            </div>
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
                                    {filteredJournals.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                Belum ada jurnal untuk bulan ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredJournals.map((entry) => (
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
                        {filteredJournals.length > 0 && (
                            <div className="border-t px-6 py-3 flex justify-end gap-8 text-sm">
                                <span>Total Debit (aktif): <span className="font-bold text-green-700">{formatRp(filteredJournals.filter(j => j.type === "debit" && !j.isReversed).reduce((sum, j) => sum + j.amount, 0))}</span></span>
                                <span>Total Kredit (aktif): <span className="font-bold text-red-700">{formatRp(filteredJournals.filter(j => j.type === "credit" && !j.isReversed).reduce((sum, j) => sum + j.amount, 0))}</span></span>
                            </div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
