require('dotenv').config();
const mysql = require('mysql2/promise');

const categories = [
  { name: 'المواد الغذائية الأساسية', slug: 'pantry' },
  { name: 'الحليب ومشتقاته', slug: 'dairy' },
  { name: 'المشروبات والعصائر', slug: 'beverages' },
  { name: 'الحلويات والبسكويت', slug: 'snacks-sweets' },
  { name: 'مواد التنظيف', slug: 'cleaning' },
  { name: 'العناية الشخصية', slug: 'personal-care' },
  { name: 'الخضار والفواكه', slug: 'fruits-veg' }
];

// Generate 100 products
const productsData = [
  // 1. Pantry
  { cat: 'pantry', name: 'زيت المائدة سيفيتال', price: 600, v: ['1 لتر', '2 لتر', '5 لتر'], mult: [1, 1.9, 4.5] },
  { cat: 'pantry', name: 'سكر أبيض سيفيتال', price: 90, v: ['1 كغ', '2 كغ', '5 كغ'], mult: [1, 2, 5] },
  { cat: 'pantry', name: 'طماطم مصبرة إيزيس', price: 150, v: ['400 غ', '800 غ'], mult: [1, 1.9] },
  { cat: 'pantry', name: 'مقرونة عمر بن عمر', price: 65, v: ['500 غ'], mult: [1] },
  { cat: 'pantry', name: 'كسكس سفينة', price: 95, v: ['1 كغ', '5 كغ'], mult: [1, 4.8] },
  { cat: 'pantry', name: 'أرز بسمتي', price: 250, v: ['1 كغ'], mult: [1] },
  { cat: 'pantry', name: 'قهوة فاكتو', price: 220, v: ['250 غ'], mult: [1] },
  { cat: 'pantry', name: 'قهوة بونال', price: 210, v: ['250 غ'], mult: [1] },
  { cat: 'pantry', name: 'فرينة سيم', price: 45, v: ['1 كغ', '5 كغ'], mult: [1, 4.5] },
  { cat: 'pantry', name: 'سميد ماما', price: 60, v: ['1 كغ', '10 كغ'], mult: [1, 9.5] },
  { cat: 'pantry', name: 'عدس أحمر', price: 180, v: ['500 غ', '1 كغ'], mult: [1, 1.9] },
  { cat: 'pantry', name: 'حمص', price: 300, v: ['500 غ', '1 كغ'], mult: [1, 1.9] },
  { cat: 'pantry', name: 'لوبيا بيضاء', price: 250, v: ['500 غ', '1 كغ'], mult: [1, 1.9] },
  { cat: 'pantry', name: 'شاي أخضر المرجان', price: 150, v: ['200 غ'], mult: [1] },
  { cat: 'pantry', name: 'ملح المائدة', price: 20, v: ['1 كغ'], mult: [1] },
  { cat: 'pantry', name: 'خل أبيض', price: 40, v: ['1 لتر'], mult: [1] },
  { cat: 'pantry', name: 'زيت زيتون', price: 800, v: ['500 مل', '1 لتر'], mult: [1, 1.9] },
  { cat: 'pantry', name: 'خميرة الخبز', price: 120, v: ['500 غ'], mult: [1] },
  { cat: 'pantry', name: 'مايونيز لوسيور', price: 250, v: ['250 مل', '500 مل'], mult: [1, 1.8] },
  { cat: 'pantry', name: 'خردل (موتارد)', price: 150, v: ['250 غ'], mult: [1] },

  // 2. Dairy
  { cat: 'dairy', name: 'حليب كانديا', price: 100, v: ['1 لتر نصف دسم', '1 لتر كامل الدسم'], mult: [1, 1.1] },
  { cat: 'dairy', name: 'حليب نيدو غبرة', price: 950, v: ['500 غ', '1 كغ'], mult: [1, 1.9] },
  { cat: 'dairy', name: 'ياغورت صومام', price: 15, v: ['100 غ (حبة)', 'حزمة 4', 'حزمة 8'], mult: [1, 4, 8] },
  { cat: 'dairy', name: 'ياغورت دانون', price: 20, v: ['100 غ'], mult: [1] },
  { cat: 'dairy', name: 'جبن البقرة الضاحكة', price: 180, v: ['8 قطع', '16 قطعة', '24 قطعة'], mult: [1, 1.9, 2.8] },
  { cat: 'dairy', name: 'جبن كيري', price: 220, v: ['12 قطعة'], mult: [1] },
  { cat: 'dairy', name: 'زبدة فلوريال', price: 250, v: ['250 غ', '500 غ'], mult: [1, 1.9] },
  { cat: 'dairy', name: 'مارغرين لابيل', price: 150, v: ['250 غ', '500 غ'], mult: [1, 1.9] },
  { cat: 'dairy', name: 'جبن مبشور قرويير', price: 450, v: ['200 غ'], mult: [1] },
  { cat: 'dairy', name: 'كريم فريش صومام', price: 120, v: ['200 مل'], mult: [1] },
  { cat: 'dairy', name: 'بتي سويس صومام', price: 80, v: ['حزمة 6'], mult: [1] },
  { cat: 'dairy', name: 'جبن تارتينو', price: 280, v: ['400 غ'], mult: [1] },
  { cat: 'dairy', name: 'ياغورت ممزوج', price: 25, v: ['حبة'], mult: [1] },
  { cat: 'dairy', name: 'حليب لويا غبرة', price: 900, v: ['500 غ'], mult: [1] },

  // 3. Beverages
  { cat: 'beverages', name: 'كوكا كولا', price: 80, v: ['1 لتر', '2 لتر'], mult: [1, 1.8] },
  { cat: 'beverages', name: 'حمود بوعلام', price: 75, v: ['1 لتر', '2 لتر'], mult: [1, 1.8] },
  { cat: 'beverages', name: 'عصير رامي', price: 110, v: ['1 لتر (برتقال)', '1 لتر (فواكه مشكلة)'], mult: [1, 1] },
  { cat: 'beverages', name: 'عصير رويبة', price: 120, v: ['1 لتر'], mult: [1] },
  { cat: 'beverages', name: 'ماء معدني إفري', price: 30, v: ['1.5 لتر', 'حزمة 6x1.5 لتر'], mult: [1, 5.5] },
  { cat: 'beverages', name: 'ماء معدني سعيدة', price: 25, v: ['1.5 لتر', 'حزمة 6x1.5 لتر'], mult: [1, 5.5] },
  { cat: 'beverages', name: 'مشروب غازي بيبسي', price: 80, v: ['1 لتر', '2 لتر'], mult: [1, 1.8] },
  { cat: 'beverages', name: 'شويبس حامض', price: 90, v: ['1 لتر'], mult: [1] },
  { cat: 'beverages', name: 'عصير نغويز', price: 100, v: ['1 لتر'], mult: [1] },
  { cat: 'beverages', name: 'ماء منبع', price: 20, v: ['1.5 لتر'], mult: [1] },

  // 4. Snacks & Sweets
  { cat: 'snacks-sweets', name: 'شوكولاتة ميلكا', price: 180, v: ['100 غ (حليب)', '100 غ (بندق)'], mult: [1, 1] },
  { cat: 'snacks-sweets', name: 'بسكويت بيمو', price: 60, v: ['1 حزمة', '3 حزم'], mult: [1, 2.8] },
  { cat: 'snacks-sweets', name: 'بسكويت ماكسون', price: 50, v: ['1 حزمة'], mult: [1] },
  { cat: 'snacks-sweets', name: 'شيبس ماهراجا', price: 70, v: ['حجم صغير', 'حجم عائلي'], mult: [1, 2.5] },
  { cat: 'snacks-sweets', name: 'مربى المشمش نغويز', price: 180, v: ['400 غ', '800 غ'], mult: [1, 1.8] },
  { cat: 'snacks-sweets', name: 'نوتيلا', price: 850, v: ['400 غ', '750 غ'], mult: [1, 1.8] },
  { cat: 'snacks-sweets', name: 'عسل المرجان', price: 350, v: ['500 غ', '1 كغ'], mult: [1, 1.9] },
  { cat: 'snacks-sweets', name: 'كيك كيندر ديليس', price: 40, v: ['1 حبة', 'حزمة 10'], mult: [1, 9.5] },
  { cat: 'snacks-sweets', name: 'شوكولاتة أمبسادور', price: 120, v: ['100 غ'], mult: [1] },
  { cat: 'snacks-sweets', name: 'فول سوداني مملح', price: 100, v: ['150 غ'], mult: [1] },
  { cat: 'snacks-sweets', name: 'تويكس', price: 80, v: ['1 حبة'], mult: [1] },
  { cat: 'snacks-sweets', name: 'سنيكرز', price: 80, v: ['1 حبة'], mult: [1] },
  { cat: 'snacks-sweets', name: 'حلوى مصاصة', price: 10, v: ['1 حبة', 'كيس'], mult: [1, 20] },
  { cat: 'snacks-sweets', name: 'بسكويت برانس', price: 90, v: ['1 حزمة'], mult: [1] },

  // 5. Cleaning
  { cat: 'cleaning', name: 'سائل غسيل الأواني أزيز', price: 130, v: ['1 لتر', '3 لتر'], mult: [1, 2.8] },
  { cat: 'cleaning', name: 'مسحوق غسيل أومو', price: 600, v: ['1 كغ', '3 كغ'], mult: [1, 2.8] },
  { cat: 'cleaning', name: 'ماء جافيل براف', price: 60, v: ['1 لتر', '2 لتر'], mult: [1, 1.9] },
  { cat: 'cleaning', name: 'منظف الأرضيات أمير', price: 150, v: ['1 لتر'], mult: [1] },
  { cat: 'cleaning', name: 'معطر جو', price: 200, v: ['300 مل'], mult: [1] },
  { cat: 'cleaning', name: 'سائل غسيل الملابس إريال', price: 1200, v: ['3 لتر'], mult: [1] },
  { cat: 'cleaning', name: 'إسفنج أواني', price: 50, v: ['حزمة 3'], mult: [1] },
  { cat: 'cleaning', name: 'ورق حمام', price: 250, v: ['حزمة 6', 'حزمة 12'], mult: [1, 1.9] },
  { cat: 'cleaning', name: 'مناديل ورقية تريفل', price: 100, v: ['علبة 100'], mult: [1] },
  { cat: 'cleaning', name: 'مضاد حشرات', price: 300, v: ['بخاخ'], mult: [1] },
  { cat: 'cleaning', name: 'أكياس قمامة', price: 120, v: ['50 لتر (10 أكياس)', '100 لتر'], mult: [1, 1.5] },

  // 6. Personal Care
  { cat: 'personal-care', name: 'شامبو هيد آند شولدرز', price: 450, v: ['400 مل'], mult: [1] },
  { cat: 'personal-care', name: 'شامبو إلسيف', price: 400, v: ['400 مل'], mult: [1] },
  { cat: 'personal-care', name: 'صابون دوف', price: 150, v: ['1 حبة', 'حزمة 4'], mult: [1, 3.8] },
  { cat: 'personal-care', name: 'صابون لوكس', price: 80, v: ['1 حبة'], mult: [1] },
  { cat: 'personal-care', name: 'معجون أسنان سيجنال', price: 180, v: ['75 مل', '125 مل'], mult: [1, 1.5] },
  { cat: 'personal-care', name: 'معجون أسنان كولجيت', price: 200, v: ['75 مل'], mult: [1] },
  { cat: 'personal-care', name: 'شفرات حلاقة جيليت', price: 250, v: ['حزمة 5'], mult: [1] },
  { cat: 'personal-care', name: 'رغوة حلاقة نيفيا', price: 350, v: ['200 مل'], mult: [1] },
  { cat: 'personal-care', name: 'جل استحمام لو بتي مارسيي', price: 300, v: ['250 مل'], mult: [1] },
  { cat: 'personal-care', name: 'مزيل عرق نيفيا', price: 400, v: ['بخاخ 150 مل', 'رول أون'], mult: [1, 0.9] },
  { cat: 'personal-care', name: 'حفاظات أطفال بيمبس', price: 1800, v: ['مقاس 3', 'مقاس 4'], mult: [1, 1] },
  { cat: 'personal-care', name: 'مناديل مبللة للأطفال', price: 150, v: ['علبة 72'], mult: [1] },
  { cat: 'personal-care', name: 'كريم مرطب دوف', price: 450, v: ['150 مل'], mult: [1] },

  // 7. Fruits & Veg
  { cat: 'fruits-veg', name: 'طماطم طازجة', price: 120, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'بطاطا', price: 80, v: ['1 كغ', '5 كغ'], mult: [1, 5] },
  { cat: 'fruits-veg', name: 'بصل', price: 60, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'جزر', price: 70, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'خيار', price: 100, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'فلفل أخضر', price: 140, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'تفاح محلي', price: 250, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'موز', price: 350, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'برتقال', price: 150, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'ليمون', price: 200, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'سلطة (خس)', price: 70, v: ['1 حبة'], mult: [1] },
  { cat: 'fruits-veg', name: 'باذنجان', price: 120, v: ['1 كغ'], mult: [1] },
  { cat: 'fruits-veg', name: 'ثوم', price: 400, v: ['500 غ'], mult: [1] },
  { cat: 'fruits-veg', name: 'عنب', price: 300, v: ['1 كغ'], mult: [1] }
];

async function seed() {
  console.log('Connecting to Database...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_supermarket',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Emptying tables...');
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE inventory_logs');
    await pool.query('TRUNCATE TABLE order_items');
    await pool.query('TRUNCATE TABLE orders');
    await pool.query('TRUNCATE TABLE product_variants');
    await pool.query('TRUNCATE TABLE products');
    await pool.query('TRUNCATE TABLE categories');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Inserting categories...');
    const catMap = {};
    for (const c of categories) {
      const [res] = await pool.query('INSERT INTO categories (name, slug) VALUES (?, ?)', [c.name, c.slug]);
      catMap[c.slug] = res.insertId;
    }

    console.log(`Inserting ${productsData.length} products with variants...`);
    let variantCount = 0;
    
    for (const p of productsData) {
      const catId = catMap[p.cat];
      const [pRes] = await pool.query(
        'INSERT INTO products (name, description, category_id, base_price, is_active) VALUES (?, ?, ?, ?, ?)',
        [p.name, `أفضل جودة من ${p.name} متوفرة في نمبر وان سوبرماركت.`, catId, p.price, true]
      );
      const productId = pRes.insertId;

      // Insert variants
      for (let i = 0; i < p.v.length; i++) {
        const vName = p.v[i];
        const multiplier = p.mult[i];
        const vPrice = i === 0 && multiplier === 1 ? null : Math.round(p.price * multiplier);
        const sku = `PRD-${productId}-V${i+1}`;
        // Random stock between 10 and 150
        const stock = Math.floor(Math.random() * 140) + 10;
        
        await pool.query(
          'INSERT INTO product_variants (product_id, name, sku, price_override, stock_quantity) VALUES (?, ?, ?, ?, ?)',
          [productId, vName, sku, vPrice, stock]
        );
        variantCount++;
      }
    }

    console.log('✅ Seeding completed successfully!');
    console.log(`-> 7 Categories inserted.`);
    console.log(`-> ${productsData.length} Products inserted.`);
    console.log(`-> ${variantCount} Variants inserted with stock.`);

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pool.end();
  }
}

seed();
