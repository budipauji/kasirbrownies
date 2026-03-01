"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Product {
    id: number;
    name: string;
    price: number;
}

interface CartItem {
    product: Product;
    quantity: number;
    subtotal: number;
}

export default function SalesPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
    const [paymentAmount, setPaymentAmount] = useState<string>("");
    const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/products');
                if (!res.ok) throw new Error("Gagal mengambil data produk");
                const data = await res.json();
                setProducts(data);
            } catch (error) {
                toast.error("Gagal memuat produk dari server.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const formatRp = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

    const handleAddToCart = () => {
        if (!selectedProductId) {
            toast.warning("Pilih produk terlebih dahulu");
            return;
        }
        if (quantityToAdd < 1) {
            toast.warning("Jumlah minimal adalah 1");
            return;
        }

        const product = products.find(p => String(p.id) === selectedProductId);
        if (!product) return;

        setCart(prev => {
            const existingItem = prev.find(item => item.product.id === Number(selectedProductId));
            if (existingItem) {
                return prev.map(item =>
                    item.product.id === Number(selectedProductId)
                        ? { ...item, quantity: item.quantity + quantityToAdd, subtotal: (item.quantity + quantityToAdd) * item.product.price }
                        : item
                );
            } else {
                return [...prev, { product, quantity: quantityToAdd, subtotal: quantityToAdd * product.price }];
            }
        });

        // Reset inputs
        setSelectedProductId("");
        setQuantityToAdd(1);
    };

    const handleRemoveFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const payment = parseFloat(paymentAmount) || 0;
    const change = payment - cartTotal;

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.warning("Keranjang masih kosong");
            return;
        }
        if (payment < cartTotal) {
            toast.error("Uang yang diterima kurang dari total belanja");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    priceAtSale: item.product.price
                }))
            };

            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Gagal menyimpan penjualan");

            toast.success("Penjualan berhasil disimpan!");
            setCart([]);
            setPaymentAmount("");
        } catch (error) {
            toast.error("Terjadi kesalahan saat menyimpan transaksi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Tanggal Transaksi</CardTitle>
                        <CardDescription>Pilih tanggal jika ingin flashback pencatatan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-4 items-end">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="date">Tanggal</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={transactionDate}
                                    onChange={(e) => setTransactionDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Input Penjualan</CardTitle>
                        <CardDescription>Tambahkan roti yang dibeli pelanggan ke dalam keranjang.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-4 items-end">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="product">Pilih Produk</Label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId} disabled={isLoading}>
                                    <SelectTrigger id="product">
                                        <SelectValue placeholder={isLoading ? "Memuat..." : "Pilih roti..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(product => (
                                            <SelectItem key={product.id} value={String(product.id)}>
                                                {product.name} - {formatRp(product.price)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Jumlah</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    value={quantityToAdd}
                                    onChange={(e) => setQuantityToAdd(parseInt(e.target.value) || 1)}
                                />
                            </div>
                            <Button className="w-full sm:w-auto" onClick={handleAddToCart}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tambah
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Pesanan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produk</TableHead>
                                    <TableHead className="text-right">Harga</TableHead>
                                    <TableHead className="text-center">Jumlah</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cart.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                            Keranjang kosong
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    cart.map((item) => (
                                        <TableRow key={item.product.id}>
                                            <TableCell className="font-medium">{item.product.name}</TableCell>
                                            <TableCell className="text-right">{formatRp(item.product.price)}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatRp(item.subtotal)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveFromCart(item.product.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-4">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle>Ringkasan Pembayaran</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatRp(cartTotal)}</span>
                        </div>
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between font-bold text-lg">
                                <span>Total</span>
                                <span className="text-primary">{formatRp(cartTotal)}</span>
                            </div>
                        </div>
                        <div className="space-y-2 pt-4">
                            <Label htmlFor="payment">Uang Diterima</Label>
                            <Input
                                id="payment"
                                type="number"
                                placeholder="Rp 0"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Kembalian</span>
                            <span className={`font-medium ${change >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                {formatRp(change >= 0 ? change : 0)}
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            size="lg"
                            disabled={cart.length === 0 || isSubmitting}
                            onClick={handleCheckout}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Bayar Sekarang
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
