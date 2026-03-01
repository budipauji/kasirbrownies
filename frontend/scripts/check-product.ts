import { db } from '../src/db';
import { products } from '../src/db/schema';
import { eq } from 'drizzle-orm';

(async () => {
  const rows = await db.select().from(products).where(eq(products.id, 2));
  console.log('product id2', rows);
})();
