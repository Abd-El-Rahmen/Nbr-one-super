const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const seedWilayas = async () => {
  try {
    const dataPath = path.join(__dirname, './data/algeria.js');
    const content = fs.readFileSync(dataPath, 'utf8');
    
    // Parse the WILAYAS array using regex and eval
    const match = content.match(/export const WILAYAS = (\[[\s\S]*?\]);/);
    if (!match) {
      console.log('WILAYAS not found in algeria.js');
      return;
    }
    
    const wilayas = eval(match[1]);
    
    const tiers = {
      local:   { home: 300, desk: 200 },
      north:   { home: 500, desk: 350 },
      center:  { home: 600, desk: 400 },
      south1:  { home: 800, desk: 550 },
      south2:  { home: 1000,desk: 700 }
    };

    console.log('Truncating old pricing...');
    await db.query('TRUNCATE TABLE delivery_pricing');

    console.log('Seeding 58 Wilayas...');
    let sql = 'INSERT INTO delivery_pricing (tier_id, tier_name, home_fee, stop_desk_fee) VALUES ';
    const values = [];
    
    wilayas.forEach((w, i) => {
      const home = tiers[w.tier] ? tiers[w.tier].home : 600;
      const desk = tiers[w.tier] ? tiers[w.tier].desk : 400;
      values.push(`('${w.code}', '${w.code} - ${w.name}', ${home}, ${desk})`);
    });
    
    sql += values.join(', ') + ';';
    await db.query(sql);
    
    console.log('Successfully seeded 58 Wilayas pricing!');
  } catch (err) {
    console.error('Seeding error:', err);
  }
};

module.exports = seedWilayas;
