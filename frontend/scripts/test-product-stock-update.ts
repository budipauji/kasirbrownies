import fetch from "node-fetch";

const API_BASE = "http://localhost:3000";

async function testProductStockUpdate() {
    try {
        console.log("\n=== TESTING PRODUCT STOCK UPDATE ===\n");

        // Get all products
        console.log("📦 Fetching all products...");
        const productsRes = await fetch(`${API_BASE}/api/products`);
        const products = await productsRes.json();
        
        if (!Array.isArray(products) || products.length === 0) {
            console.log("❌ No products found");
            return;
        }

        console.log(`✅ Found ${products.length} products:\n`);
        products.forEach(p => {
            console.log(`   - ID: ${p.id}, Name: "${p.name}", Current Stock: ${p.stock}`);
        });

        // Try to update first product stock
        const productToUpdate = products[0];
        const newStock = 50;
        
        console.log(`\n📝 Updating product "${productToUpdate.name}" (ID: ${productToUpdate.id}) stock to ${newStock}...`);
        
        const updateRes = await fetch(`${API_BASE}/api/products/${productToUpdate.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: newStock }),
        });

        if (!updateRes.ok) {
            const error = await updateRes.text();
            console.log(`❌ Update failed: ${error}`);
            return;
        }

        const updated = await updateRes.json();
        console.log(`✅ Update successful!\n`);
        console.log(`   Product: ${updated.name}`);
        console.log(`   New Stock: ${updated.stock}`);
        console.log(`   Updated At: ${updated.updatedAt}`);

    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

testProductStockUpdate();
