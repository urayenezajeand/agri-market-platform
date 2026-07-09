import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

// Derive the directory path in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Initializing database tables...');
    await pool.query(sql);
    console.log('Database tables initialized successfully.');

    // Ensure OTP columns exist on users table (Dynamic migration)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP");
      console.log('OTP columns ensured on users table.');
    } catch (e) {
      console.error('Failed to ensure OTP columns:', e);
    }

    // Ensure vendor_status column exists on users table (Dynamic migration)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_status VARCHAR(50) DEFAULT 'approved'");
      console.log('vendor_status column ensured on users table.');
    } catch (e) {
      console.error('Failed to ensure vendor_status column:', e);
    }

    // Ensure tin_number and rdb_certificate columns exist on users table (Dynamic migration)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS tin_number VARCHAR(100)");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rdb_certificate TEXT");
      console.log('TIN and RDB columns ensured on users table.');
    } catch (e) {
      console.error('Failed to ensure TIN and RDB columns:', e);
    }

    // Ensure phone and shipping_address columns exist on users table (Dynamic migration)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(100)");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_address TEXT");
      console.log('Phone and Shipping Address columns ensured on users table.');
    } catch (e) {
      console.error('Failed to ensure phone/address columns:', e);
    }

    // Ensure vendor profile columns exist on users table (Dynamic migration)
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR(255) DEFAULT 'Kigali'");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS badge VARCHAR(100) DEFAULT 'Local Partner'");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(255) DEFAULT 'General Crops'");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS image_url TEXT");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) DEFAULT 4.8");
      console.log('Vendor profile columns ensured on users table.');
    } catch (e) {
      console.error('Failed to ensure vendor profile columns:', e);
    }

    // Ensure discount_percent column exists on products table (Dynamic migration)
    try {
      await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0");
      console.log('discount_percent column ensured on products table.');
    } catch (e) {
      console.error('Failed to ensure discount_percent column:', e);
    }

    // Ensure is_approved column exists on products table (Dynamic migration)
    try {
      await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE");
      // Approve all pre-existing products so they don't get hidden
      await pool.query("UPDATE products SET is_approved = TRUE WHERE is_approved IS NOT TRUE");
      console.log('is_approved column ensured and default products approved.');
    } catch (e) {
      console.error('Failed to ensure is_approved column:', e);
    }

    // 1. Seed a default vendor account (Farmer Kamana) if missing
    const userCheck = await pool.query("SELECT id FROM users WHERE email = 'kamana@agrimarket.rw'");
    let vendorId;
    
    const kamanaProfile = {
      name: 'Farmer Kamana',
      email: 'kamana@agrimarket.rw',
      region: 'Musanze District',
      badge: 'Top Seller',
      specialty: 'Kinigi Potatoes & Organic Tomatoes',
      bio: 'Kamana has been farming in the fertile volcanic soil of Musanze for 15 years, supplying high-quality organic crops.',
      image_url: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=450&auto=format&fit=crop&q=80',
      rating: 4.9
    };

    if (userCheck.rows.length === 0) {
      // Default password hash for 'password123'
      const passwordHash = '$2a$10$UeRSy8Sfs68nOuhhRYyjSekMRmIir41IZZVjMMj9/4Mq/Wf7iKNdO';
      const vendorResult = await pool.query(
        "INSERT INTO users (name, email, password_hash, role, region, badge, specialty, bio, image_url, rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
        [kamanaProfile.name, kamanaProfile.email, passwordHash, 'vendor', kamanaProfile.region, kamanaProfile.badge, kamanaProfile.specialty, kamanaProfile.bio, kamanaProfile.image_url, kamanaProfile.rating]
      );
      vendorId = vendorResult.rows[0].id;
      console.log('Seeded default vendor account: kamana@agrimarket.rw (password123)');
    } else {
      vendorId = userCheck.rows[0].id;
      // Update existing account to have the correct profile values
      await pool.query(
        "UPDATE users SET region = $1, badge = $2, specialty = $3, bio = $4, image_url = $5, rating = $6 WHERE id = $7",
        [kamanaProfile.region, kamanaProfile.badge, kamanaProfile.specialty, kamanaProfile.bio, kamanaProfile.image_url, kamanaProfile.rating, vendorId]
      );
      console.log('Updated existing default vendor account profile values.');
    }

    // 1b. Seed default admin accounts if missing, or ensure their role is admin
    const passwordHash = '$2a$10$UeRSy8Sfs68nOuhhRYyjSekMRmIir41IZZVjMMj9/4Mq/Wf7iKNdO'; // password123

    const adminCheck1 = await pool.query("SELECT id FROM users WHERE email = 'urayenezajeand@gmail.com'");
    if (adminCheck1.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ['Jean de Dieu Urayeneza', 'urayenezajeand@gmail.com', passwordHash, 'admin']
      );
      console.log('Seeded admin account: urayenezajeand@gmail.com (password123)');
    } else {
      await pool.query("UPDATE users SET role = 'admin' WHERE email = 'urayenezajeand@gmail.com'");
      console.log('Ensured admin role for urayenezajeand@gmail.com');
    }

    const adminCheck2 = await pool.query("SELECT id FROM users WHERE email = 'admin@agrimarket.rw'");
    if (adminCheck2.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ['System Administrator', 'admin@agrimarket.rw', passwordHash, 'admin']
      );
      console.log('Seeded admin account: admin@agrimarket.rw (password123)');
    } else {
      await pool.query("UPDATE users SET role = 'admin' WHERE email = 'admin@agrimarket.rw'");
      console.log('Ensured admin role for admin@agrimarket.rw');
    }

    // 2. Seed default local Rwandan crops if database products table is empty
    const productCheck = await pool.query("SELECT id FROM products WHERE vendor_id = $1 LIMIT 1", [vendorId]);
    
    if (productCheck.rows.length === 0) {
      console.log('Products table empty. Seeding default crops...');
      const defaultCrops = [
        [
          'Organic Tomatoes (Inyanya)', 
          'Freshly harvested red tomatoes from Musanze. Packed with flavor and perfect for stews.', 
          1200, 
          150, 
          'Vegetables', 
          'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=60', 
          vendorId
        ],
        [
          'Irish Potatoes (Ibirayi)', 
          'High-quality Irish potatoes (Kinigi type) direct from Northern Province. Great for fries or boiling.', 
          450, 
          500, 
          'Tubers', 
          'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=60', 
          vendorId
        ],
        [
          'Yellow Beans (Ibihyimbo)', 
          'Dry yellow beans from Eastern Province. High in protein, clean, and sorted.', 
          900, 
          300, 
          'Grains', 
          'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&auto=format&fit=crop&q=60', 
          vendorId
        ],
        [
          'Sweet Bananas (Imineke)', 
          'Ripe sweet bananas (Kamaramasenge) from Southern Province. Sweet and organic.', 
          1500, 
          80, 
          'Fruits', 
          'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=60', 
          vendorId
        ],
        [
          'Fresh Maize (Ibigori)', 
          'Fresh sweet corn cobs from Gatsibo. Perfect for roasting or boiling.', 
          300, 
          400, 
          'Grains', 
          'https://images.unsplash.com/photo-1551754655-cd27e38d20f6?w=400&auto=format&fit=crop&q=60', 
          vendorId
        ],
        [
          'Green Cabbage (Ishu)', 
          'Crispy and compact green cabbage heads from Gicumbi. Hand-picked and organic.', 
          400, 
          200, 
          'Vegetables', 
          'https://images.unsplash.com/photo-1588710920403-d6f765275e7a?w=400&auto=format&fit=crop&q=60', 
          vendorId
        ]
      ];

      for (const crop of defaultCrops) {
        await pool.query(
          "INSERT INTO products (name, description, price, stock, category, image_url, vendor_id, is_approved) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)",
          crop
        );
      }
      console.log('Seeded default agricultural crops with high-resolution visual assets.');
    } else {
      console.log('Products already exist in database. Skipping seeding.');
    }

  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}
