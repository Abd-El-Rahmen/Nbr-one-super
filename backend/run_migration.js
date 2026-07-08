const db = require('./src/config/db');

const migrate = async () => {
  try {
    console.log('Running migration...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS delivery_pricing (
        tier_id VARCHAR(50) PRIMARY KEY,
        tier_name VARCHAR(100) NOT NULL,
        home_fee DECIMAL(10,2) NOT NULL DEFAULT 600,
        stop_desk_fee DECIMAL(10,2) NOT NULL DEFAULT 400
      )
    `);
    console.log('Created delivery_pricing table.');

    await db.query(`
      INSERT IGNORE INTO delivery_pricing (tier_id, tier_name, home_fee, stop_desk_fee) VALUES
      ('local', 'العاصمة', 300, 200),
      ('north', 'ولايات الشمال', 500, 350),
      ('center', 'ولايات الهضاب', 600, 400),
      ('south1', 'جنوب 1', 800, 550),
      ('south2', 'الجنوب الكبير', 1000, 700)
    `);
    console.log('Seeded delivery_pricing.');

    try {
      await db.query(`
        ALTER TABLE orders 
        ADD COLUMN delivery_type ENUM('home', 'stop_desk') DEFAULT 'home' AFTER status,
        ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0 AFTER delivery_type
      `);
      console.log('Altered orders table.');
    } catch(err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log('orders table already altered.');
      else throw err;
    }

    try {
      await db.query(`
        ALTER TABLE customers
        ADD COLUMN wilaya VARCHAR(100) DEFAULT NULL AFTER address_line,
        ADD COLUMN commune VARCHAR(100) DEFAULT NULL AFTER wilaya
      `);
      console.log('Altered customers table.');
    } catch(err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log('customers table already altered.');
      else throw err;
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
