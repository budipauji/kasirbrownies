import { db } from "../db";
import { rawMaterials, products, recipes } from "../db/schema";

async function seed() {
    console.log("Seeding database...");

    // 1. Raw Materials (serial IDs â€” omit id, let DB auto-increment)
    const [tepung, gula, coklat] = await db
        .insert(rawMaterials)
        .values([
            { name: "Tepung Terigu", unit: "kg", costPerUnit: 12000, stock: 50 },
            { name: "Gula Pasir",    unit: "kg", costPerUnit: 15000, stock: 20 },
            { name: "Coklat Batang", unit: "kg", costPerUnit: 50000, stock: 10 },
        ])
        .returning();

    console.log("Raw materials seeded.", { tepung: tepung.id, gula: gula.id, coklat: coklat.id });

    // 2. Products
    const [rotiCoklat, rotiManis] = await db
        .insert(products)
        .values([
            { name: "Roti Coklat Besar",   price: 15000, stock: 0 },
            { name: "Roti Manis Standar",  price: 8000,  stock: 0 },
        ])
        .returning();

    console.log("Products seeded.", { rotiCoklat: rotiCoklat.id, rotiManis: rotiManis.id });

    // 3. Recipes (BOM)
    await db.insert(recipes).values([
        // Roti Coklat: 0.2kg Tepung, 0.05kg Gula, 0.1kg Coklat
        { productId: rotiCoklat.id, materialId: tepung.id, quantity: 0.2  },
        { productId: rotiCoklat.id, materialId: gula.id,   quantity: 0.05 },
        { productId: rotiCoklat.id, materialId: coklat.id, quantity: 0.1  },
        // Roti Manis: 0.15kg Tepung, 0.08kg Gula
        { productId: rotiManis.id,  materialId: tepung.id, quantity: 0.15 },
        { productId: rotiManis.id,  materialId: gula.id,   quantity: 0.08 },
    ]);

    console.log("Recipes seeded. Done!");
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
