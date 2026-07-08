require('dotenv').config();
const mysql = require('mysql2/promise');

const IMAGE_MAP = [
  { keywords: ['زيت'], url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['طماطم'], url: 'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['قهوة'], url: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['شاي'], url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['ياغورت'], url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['حليب'], url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['زبدة', 'مارغرين'], url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['ماء'], url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['عصير', 'مشروب', 'كوكا', 'شويبس'], url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['شوكولاتة', 'نوتيلا', 'سنيكرز', 'تويكس'], url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['بسكويت', 'كيك'], url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=600&auto=format&fit=crop' },
  { keywords: ['بطاطا', 'بصل', 'جزر'], url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=600&auto=format&fit=crop' }
];

const CAT_IMAGES = {
  1: 'https://images.unsplash.com/photo-1606859191214-25806e8e2423?q=80&w=600&auto=format&fit=crop',
  2: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=600&auto=format&fit=crop',
  3: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format&fit=crop',
  4: 'https://images.unsplash.com/photo-1614088685112-0a760b71a3c8?q=80&w=600&auto=format&fit=crop',
  5: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?q=80&w=600&auto=format&fit=crop',
  6: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop',
  7: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop'
};

async function assignImages() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_supermarket',
  });

  const [products] = await pool.query('SELECT id, name, category_id FROM products');
  let count = 0;

  for (const product of products) {
    let assignedUrl = CAT_IMAGES[product.category_id] || CAT_IMAGES[1];
    
    for (const mapping of IMAGE_MAP) {
      if (mapping.keywords.some(kw => product.name.includes(kw))) {
        assignedUrl = mapping.url;
        break;
      }
    }

    await pool.query('UPDATE products SET image_url = ? WHERE id = ?', [assignedUrl, product.id]);
    count++;
  }

  console.log(`✅ Assigned realistic Unsplash images to ${count} products successfully!`);
  await pool.end();
}

assignImages().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
