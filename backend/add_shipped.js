const db = require('./src/config/db');

async function run() {
  const conn = await db.getConnection();
  try {
    await conn.query("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'failed', 'rejected') DEFAULT 'pending';");
    console.log("Successfully altered enum!");
  } catch (err) {
    console.error(err);
  } finally {
    conn.release();
    process.exit(0);
  }
}
run();
