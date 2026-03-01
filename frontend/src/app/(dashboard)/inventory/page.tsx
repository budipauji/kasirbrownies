"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Loader2, Package, ShoppingBag, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"

// Unit options as requested
const UNIT_OPTIONS = ["gram", "Kilogram", "mililiter", "Liter"];

interface RawMaterial {
    id: number;
    name: string;
    unit: string;
    costPerUnit: number;
    stock: number;
}

interface RecipeItem {
    materialId: number | string;
    quantity: number;
}

interface Product {
    id: number;
    name: string;
    price: number;
    recipes: { id: number; rawMaterial: { id: number; name: string; unit: string }; quantity: number }[];
    salesCount?: number;
}

export default function InventoryPage() {
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
    const [deletingRecipeId, setDeletingRecipeId] = useState<number | null>(null);

    // Add Material form state
    const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
    const [newMaterial, setNewMaterial] = useState({ name: "", unit: "Kilogram", costPerUnit: "", stock: "" });
    const [isSubmittingMaterial, setIsSubmittingMaterial] = useState(false);

    // Add/Edit Product form state
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [isEditProductOpen, setIsEditProductOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: "", price: "" });
    const [editProductId, setEditProductId] = useState<number | null>(null);
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([{ materialId: "", quantity: 0 }]);
    const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

    const formatRp = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

    const fetchMaterials = useCallback(async () => {
        setIsLoadingMaterials(true);
        try {
            const res = await fetch('/api/materials');
            if (!res.ok) throw new Error("Failed");
            setMaterials(await res.json());
        } catch {
            toast.error("Gagal memuat data bahan baku.");
        } finally {
            setIsLoadingMaterials(false);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        setIsLoadingProducts(true);
        try {
            const res = await fetch('/api/products');
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            console.log('Fetched products:', data);
            setProducts(data);
        } catch {
            toast.error("Gagal memuat data produk.");
        } finally {
            setIsLoadingProducts(false);
        }
    }, []);

    useEffect(() => {
        fetchMaterials();
        fetchProducts();
    }, [fetchMaterials, fetchProducts]);

    // ── ADD MATERIAL ──────────────────────────────────────────────────────────
    const handleAddMaterial = async () => {
        if (!newMaterial.name || !newMaterial.unit) {
            toast.warning("Nama dan satuan bahan baku wajib diisi.");
            return;
        }
        setIsSubmittingMaterial(true);
        try {
            const res = await fetch('/api/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newMaterial.name,
                    unit: newMaterial.unit,
                    costPerUnit: parseFloat(newMaterial.costPerUnit) || 0,
                    stock: parseFloat(newMaterial.stock) || 0,
                }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Bahan baku berhasil ditambahkan!");
            setIsAddMaterialOpen(false);
            setNewMaterial({ name: "", unit: "Kilogram", costPerUnit: "", stock: "" });
            fetchMaterials();
        } catch {
            toast.error("Gagal menambahkan bahan baku.");
        } finally {
            setIsSubmittingMaterial(false);
        }
    };

    // ── DELETE MATERIAL ───────────────────────────────────────────────────────
    const handleDeleteMaterial = async (id: number, name: string) => {
        if (!confirm(`Hapus bahan baku "${name}"?\n\nBahan yang sudah digunakan di resep produk tidak bisa dihapus.`)) return;
        setDeletingMaterialId(id);
        try {
            const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menghapus");
            toast.success("Bahan baku berhasil dihapus!");
            fetchMaterials();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Terjadi kesalahan");
        } finally {
            setDeletingMaterialId(null);
        }
    };

    // ── ADD PRODUCT ───────────────────────────────────────────────────────────
    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.price) {
            toast.warning("Nama produk dan harga jual wajib diisi.");
            return;
        }
        const validRecipes = recipeItems.filter(r => r.materialId && r.quantity > 0);
        setIsSubmittingProduct(true);
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: parseFloat(newProduct.price) || 0,
                    recipes: validRecipes
                        .filter((r) => r.materialId && r.quantity > 0)
                        .map((r) => ({ materialId: Number(r.materialId), quantity: r.quantity })),
                }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Produk berhasil ditambahkan!");
            setIsAddProductOpen(false);
            setNewProduct({ name: "", price: "" });
            setRecipeItems([{ materialId: "", quantity: 0 }]);
            fetchProducts();
        } catch {
            toast.error("Gagal menambahkan produk.");
        } finally {
            setIsSubmittingProduct(false);
        }
    };

    const handleStartEditProduct = (product: Product) => {
        setEditProductId(product.id);
        setNewProduct({ name: product.name, price: String(product.price) });
        setRecipeItems(
            product.recipes.map(r => ({ materialId: String(r.rawMaterial.id), quantity: r.quantity }))
        );
        setIsEditProductOpen(true);
    };

    const handleSaveEditedProduct = async () => {
        if (!newProduct.name || !newProduct.price) {
            toast.warning("Nama produk dan harga jual wajib diisi.");
            return;
        }
        const validRecipes = recipeItems.filter(r => r.materialId && r.quantity > 0);
        setIsSubmittingProduct(true);
        try {
            const res = await fetch(`/api/products/${editProductId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: parseFloat(newProduct.price) || 0,
                    recipes: validRecipes.map(r => ({ materialId: Number(r.materialId), quantity: r.quantity })),
                }),
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Produk berhasil diupdate!");
            setIsEditProductOpen(false);
            setEditProductId(null);
            setNewProduct({ name: "", price: "" });
            setRecipeItems([{ materialId: "", quantity: 0 }]);
            fetchProducts();
        } catch {
            toast.error("Gagal memperbarui produk.");
        } finally {
            setIsSubmittingProduct(false);
        }
    };
    // ── DELETE PRODUCT ────────────────────────────────────────────────────────
    const handleDeleteProduct = async (id: number, name: string) => {
        if (!confirm(`Hapus produk "${name}"?\n\nProduk yang sudah memiliki riwayat penjualan tidak bisa dihapus.`)) return;
        setDeletingProductId(id);
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menghapus");
            toast.success("Produk berhasil dihapus!");
            fetchProducts();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Terjadi kesalahan");
        } finally {
            setDeletingProductId(null);
        }
    };

    // ── DELETE RECIPE ────────────────────────────────────────────────────────
    const handleDeleteRecipe = async (recipeId: number, materialName: string, productName: string) => {
        if (!confirm(`Hapus resep "${materialName}" dari produk "${productName}"?`)) return;
        setDeletingRecipeId(recipeId);
        try {
            const res = await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menghapus resep");
            toast.success("Resep berhasil dihapus!");
            fetchProducts();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Terjadi kesalahan");
        } finally {
            setDeletingRecipeId(null);
        }
    };



    // ── RECIPE HELPERS ────────────────────────────────────────────────────────
    const addRecipeRow = () => setRecipeItems(prev => [...prev, { materialId: "", quantity: 0 }]);
    const removeRecipeRow = (index: number) => setRecipeItems(prev => prev.filter((_, i) => i !== index));
    const updateRecipeRow = (index: number, field: keyof RecipeItem, value: string | number) => {
        setRecipeItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    return (
        <div className="flex flex-col gap-6">
            <Tabs defaultValue="materials">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="materials" className="gap-2">
                            <Package className="h-4 w-4" /> Bahan Baku
                        </TabsTrigger>
                        <TabsTrigger value="products" className="gap-2">
                            <ShoppingBag className="h-4 w-4" /> Produk &amp; Resep
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ========== RAW MATERIALS TAB ========== */}
                <TabsContent value="materials">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Bahan Baku</CardTitle>
                                <CardDescription>Kelola stok dan harga beli bahan baku</CardDescription>
                            </div>
                            <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Tambah Bahan</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Tambah Bahan Baku</DialogTitle>
                                        <DialogDescription>Isi detail bahan baku baru</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="mat-name" className="text-right">Nama</Label>
                                            <Input
                                                id="mat-name"
                                                className="col-span-3"
                                                placeholder="cth: Tepung Terigu"
                                                value={newMaterial.name}
                                                onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="mat-unit" className="text-right">Satuan</Label>
                                            <Select
                                                value={newMaterial.unit}
                                                onValueChange={v => setNewMaterial(p => ({ ...p, unit: v }))}
                                            >
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {UNIT_OPTIONS.map(u => (
                                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="mat-cost" className="text-right">Harga/Satuan</Label>
                                            <Input
                                                id="mat-cost"
                                                type="number"
                                                className="col-span-3"
                                                placeholder="Rp 0"
                                                value={newMaterial.costPerUnit}
                                                onChange={e => setNewMaterial(p => ({ ...p, costPerUnit: e.target.value }))}
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="mat-stock" className="text-right">Stok Awal</Label>
                                            <Input
                                                id="mat-stock"
                                                type="number"
                                                className="col-span-3"
                                                placeholder="0"
                                                value={newMaterial.stock}
                                                onChange={e => setNewMaterial(p => ({ ...p, stock: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddMaterial} disabled={isSubmittingMaterial}>
                                            {isSubmittingMaterial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Simpan
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Bahan</TableHead>
                                        <TableHead className="text-center">Satuan</TableHead>
                                        <TableHead className="text-right">Stok</TableHead>
                                        <TableHead className="text-right">Harga/Satuan</TableHead>
                                        <TableHead className="text-right">Nilai Stok</TableHead>
                                        <TableHead className="text-center">Hapus</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingMaterials ? (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Memuat data...</TableCell></TableRow>
                                    ) : materials.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Belum ada bahan baku.</TableCell></TableRow>
                                    ) : materials.map(m => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-medium">{m.name}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{m.unit}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={m.stock < 5 ? "text-destructive font-semibold" : ""}>
                                                    {m.stock.toFixed(2)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">{formatRp(m.costPerUnit)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatRp(m.stock * m.costPerUnit)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteMaterial(m.id, m.name)}
                                                    disabled={deletingMaterialId === m.id}
                                                    className="gap-1"
                                                >
                                                    {deletingMaterialId === m.id
                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                        : <Trash2 className="h-3 w-3" />
                                                    }
                                                    Hapus
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        {materials.length > 0 && (
                            <CardFooter className="justify-end border-t pt-4">
                                <div className="text-sm text-muted-foreground">
                                    Total Nilai Persediaan: <span className="font-bold text-foreground">
                                        {formatRp(materials.reduce((sum, m) => sum + m.stock * m.costPerUnit, 0))}
                                    </span>
                                </div>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>

                {/* ========== PRODUCTS & RECIPES TAB ========== */}
                <TabsContent value="products">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Produk &amp; Resep (BOM)</CardTitle>
                                <CardDescription>Kelola daftar produk dan bill of materials</CardDescription>
                            </div>
                            <Dialog
                                open={isAddProductOpen || isEditProductOpen}
                                onOpenChange={(open) => {
                                    if (open) {
                                        setIsAddProductOpen(true);
                                    } else {
                                        setIsAddProductOpen(false);
                                        setIsEditProductOpen(false);
                                        setEditProductId(null);
                                        setNewProduct({ name: "", price: "" });
                                        setRecipeItems([{ materialId: "", quantity: 0 }]);
                                    }
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>{isEditProductOpen ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
                                        <DialogDescription>Isi nama, harga jual, dan resep bahan baku</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="prod-name" className="text-right">Nama Produk</Label>
                                            <Input
                                                id="prod-name"
                                                className="col-span-3"
                                                placeholder="cth: Roti Coklat Besar"
                                                value={newProduct.name}
                                                onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="prod-price" className="text-right">Harga Jual</Label>
                                            <Input
                                                id="prod-price"
                                                type="number"
                                                className="col-span-3"
                                                placeholder="Rp 0"
                                                value={newProduct.price}
                                                onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <Label className="mb-2 block">Resep (Bill of Materials)</Label>
                                            {materials.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic">
                                                    Belum ada bahan baku. Tambahkan bahan baku terlebih dahulu di tab Bahan Baku.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {recipeItems.map((item, index) => (
                                                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                                            {/* Bahan dropdown — shows "Nama (Satuan)" */}
                                                            <div className="col-span-6">
                                                                <Select
                                                                    value={item.materialId ? String(item.materialId) : ""}
                                                                    onValueChange={v => updateRecipeRow(index, 'materialId', v)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Pilih bahan..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {materials.map(m => (
                                                                            <SelectItem key={m.id} value={String(m.id)}>
                                                                                {m.name} <span className="text-muted-foreground text-xs">({m.unit})</span>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            {/* Quantity + unit label */}
                                                            <div className="col-span-4 flex items-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    step="0.001"
                                                                    placeholder="Jumlah"
                                                                    value={item.quantity || ""}
                                                                    onChange={e => updateRecipeRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                                />
                                                                {item.materialId && (
                                                                    <span className="text-xs text-muted-foreground shrink-0 w-10">
                                                                        {materials.find(m => String(m.id) === String(item.materialId))?.unit ?? ""}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Remove row */}
                                                            <div className="col-span-2 flex justify-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-destructive hover:bg-destructive/10"
                                                                    onClick={() => removeRecipeRow(index)}
                                                                    disabled={recipeItems.length <= 1}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <Button variant="outline" size="sm" className="mt-2" onClick={addRecipeRow}>
                                                        <Plus className="mr-1 h-3 w-3" /> Tambah Bahan
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={isEditProductOpen ? handleSaveEditedProduct : handleAddProduct} disabled={isSubmittingProduct}>
                                            {isSubmittingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {isEditProductOpen ? "Simpan Perubahan" : "Simpan Produk"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {isLoadingProducts ? (
                                <div className="text-center py-12 text-muted-foreground">Memuat data produk...</div>
                            ) : products.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">Belum ada produk.</div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {products.map(product => (
                                        <Card key={product.id} className="border bg-card">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <CardTitle className="text-base flex-1">{product.name}</CardTitle>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleStartEditProduct(product)}
                                                            title="Edit produk"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Badge className="shrink-0">{formatRp(product.price)}</Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Komposisi Resep</p>
                                                {product.recipes.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground italic">Tidak ada resep</p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {product.recipes.map((r, i) => (
                                                            <li key={i} className="flex justify-between items-center text-sm bg-secondary/30 p-2 rounded">
                                                                <div className="flex-1 flex items-center justify-between">
                                                                    <div>
                                                                        <span className="text-muted-foreground">{r.rawMaterial.name}</span>
                                                                        <span className="ml-2 font-mono font-medium">{r.quantity} {r.rawMaterial.unit}</span>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                                                                            onClick={() => handleDeleteRecipe(r.id, r.rawMaterial.name, product.name)}
                                                                            disabled={deletingRecipeId === r.id}
                                                                            title="Hapus resep ini"
                                                                        >
                                                                            {deletingRecipeId === r.id
                                                                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                                                                : <Trash2 className="h-3 w-3" />
                                                                            }
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </CardContent>
                                            <CardFooter className="pt-2 border-t">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="w-full gap-1"
                                                    onClick={() => handleDeleteProduct(product.id, product.name)}
                                                    disabled={deletingProductId === product.id}
                                                    title={undefined}
                                                >
                                                    {deletingProductId === product.id
                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                        : <Trash2 className="h-3 w-3" />
                                                    }
                                                    Hapus Produk
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
