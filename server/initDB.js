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

    // 1. Seed a default vendor account (Farmer Kamana) if missing
    const userCheck = await pool.query("SELECT id FROM users WHERE email = 'kamana@agrimarket.rw'");
    let vendorId;
    
    if (userCheck.rows.length === 0) {
      // Default password hash for 'password123'
      const passwordHash = '$2a$10$Rz/6h7sP6d/b9L9h4eH/Ie/4c4.W3jXjR5UqO/Cj/2l/8k7v4/7.S';
      const vendorResult = await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
        ['Farmer Kamana', 'kamana@agrimarket.rw', passwordHash, 'vendor']
      );
      vendorId = vendorResult.rows[0].id;
      console.log('Seeded default vendor account: kamana@agrimarket.rw (password123)');
    } else {
      vendorId = userCheck.rows[0].id;
    }

    // 2. Seed default local Rwandan crops if database products table is empty or has old placeholder records
    // We clear old records to ensure the new high-quality images load successfully
    await pool.query("DELETE FROM products WHERE vendor_id = $1", [vendorId]);
    
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
        "INSERT INTO products (name, description, price, stock, category, image_url, vendor_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        crop
      );
    }
    console.log('Seeded default agricultural crops with high-resolution visual assets.');

  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}
