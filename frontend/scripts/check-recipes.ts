import { db } from '../src/db';
import { recipes } from '../src/db/schema';
import { eq } from 'drizzle-orm';

(async () => {
  const all = await db.select().from(recipes);
  console.log('all recipes', all);
  const m1 = await db.select().from(recipes).where(eq(recipes.materialId, 1));
  console.log('recipes using material 1 via eq', m1);
  process.exit(0);
})();