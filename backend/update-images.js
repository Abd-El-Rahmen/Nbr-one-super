require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateImages() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_supermarket',
  });

  const categories = [
    { slug: 'pantry',        img: '/images/pantry.png' },
    { slug: 'dairy',         img: '/images/dairy.png' },
    { slug: 'beverages',     img: '/images/beverages.png' },
    { slug: 'snacks-sweets', img: '/images/snacks-sweets.png' },
    { slug: 'cleaning',      img: '/images/cleaning.png' },
    { slug: 'personal-care', img: '/images/personal-care.png' },
    // Use an online placeholder for fruits-veg since we hit a generation limit
    { slug: 'fruits-veg',    img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800' }
  ];

  for (const cat of categories) {
    // get category id
    const [rows] = await pool.query('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    if (rows.length > 0) {
      const catId = rows[0].id;
      // update products
      await pool.query('UPDATE products SET image_url = ? WHERE category_id = ?', [cat.img, catId]);
    }
  }

  console.log('✅ Images assigned to products successfully!');
  await pool.end();
}

updateImages().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
