require('dotenv').config();
const db = require('./src/config/db');
const fs = require('fs');

async function run() {
  try {
    const migration1 = fs.readFileSync('./migration_01.sql', 'utf8');
    const migration2 = fs.readFileSync('./migration_02.sql', 'utf8');
    const migration3 = fs.readFileSync('./migration_03.sql', 'utf8');

    const sqls = [...migration1.split(';'), ...migration2.split(';'), ...migration3.split(';')].map(s => s.trim()).filter(s => s.length > 0);

    for (const sql of sqls) {
      console.log('Executing:', sql);
      try {
        await db.query(sql);
      } catch (err) {
        console.warn('Warning (may be ignorable):', err.message);
      }
    }
    console.log('Migrations complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
