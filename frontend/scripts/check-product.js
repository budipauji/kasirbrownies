const { db } = require('../src/db');
const { products } = require('../src/db/schema');
(async()=>{
  const rows = await db.select().from(products).where({id:2});
  console.log('product id2', rows);
  process.exit(0);
})();
