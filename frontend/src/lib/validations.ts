import { z } from "zod";

// â”€â”€â”€ Materials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createMaterialSchema = z.object({
    name: z
        .string({ message: "Nama bahan wajib diisi" })
        .min(2, "Nama minimal 2 karakter")
        .max(255, "Nama maksimal 255 karakter"),
    unit: z
        .string({ message: "Satuan wajib diisi" })
        .min(1, "Satuan wajib diisi"),
    stock: z
        .number({ message: "Stok wajib diisi" })
        .nonnegative("Stok tidak boleh negatif")
        .default(0),
    costPerUnit: z
        .number({ message: "Harga per unit wajib diisi" })
        .nonnegative("Harga tidak boleh negatif")
        .default(0),
});

export const updateMaterialSchema = createMaterialSchema.partial();

// â”€â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const recipeItemSchema = z.object({
    materialId: z
        .number({ message: "Material ID wajib diisi" })
        .int("Material ID harus berupa integer")
        .positive("Material ID harus positif"),
    quantity: z
        .number({ message: "Jumlah wajib diisi" })
        .positive("Jumlah harus lebih dari 0"),
});

export const createProductSchema = z.object({
    name: z
        .string({ message: "Nama produk wajib diisi" })
        .min(2, "Nama minimal 2 karakter")
        .max(255, "Nama maksimal 255 karakter"),
    price: z
        .number({ message: "Harga wajib diisi" })
        .nonnegative("Harga tidak boleh negatif"),
    stock: z
        .number()
        .nonnegative("Stok tidak boleh negatif")
        .default(0),
    imageUrl: z.string().url("URL gambar tidak valid").optional().nullable(),
    recipes: z
        .array(recipeItemSchema)
        .optional()
        .default([]),
});

export const updateProductSchema = createProductSchema.partial();

// â”€â”€â”€ Sales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const saleItemSchema = z.object({
    productId: z
        .number({ message: "Product ID wajib diisi" })
        .int("Product ID harus berupa integer")
        .positive("Product ID harus positif"),
    quantity: z
        .number({ message: "Jumlah wajib diisi" })
        .int("Jumlah harus berupa bilangan bulat")
        .positive("Jumlah harus lebih dari 0"),
    priceAtSale: z
        .number({ message: "Harga jual wajib diisi" })
        .nonnegative("Harga jual tidak boleh negatif"),
});

export const createSaleSchema = z.object({
    items: z
        .array(saleItemSchema)
        .min(1, "Penjualan harus memiliki minimal 1 item"),
    note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
    cashierId: z.string().optional(),
});

export const cancelSaleSchema = z.object({
    cancelReason: z
        .string({ message: "Alasan pembatalan wajib diisi" })
        .min(5, "Alasan minimal 5 karakter")
        .max(500, "Alasan maksimal 500 karakter"),
});

// â”€â”€â”€ Helper: parse & validate JSON body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function parseAndValidate<T>(
    req: Request,
    schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return {
            data: null,
            error: new Response(
                JSON.stringify({ error: "Invalid JSON body" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            ),
        };
    }

    const result = schema.safeParse(body);
    if (!result.success) {
        return {
            data: null,
            error: new Response(
                JSON.stringify({
                    error: "Validation failed",
                    details: result.error.flatten().fieldErrors,
                }),
                { status: 422, headers: { "Content-Type": "application/json" } }
            ),
        };
    }

    return { data: result.data, error: null };
}
