import { db } from '../src/db';
import { products } from '../src/db/schema';

(async () => {
  const rows = await db.select().from(products).where({ id: 2 });
  console.log('product id2', rows);
})();
