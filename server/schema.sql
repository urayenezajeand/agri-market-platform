-- 1. USERS TABLE (Handles Buyers, Vendors, and Admins)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'buyer', -- 'buyer', 'vendor', or 'admin'
    otp_code VARCHAR(6),
    otp_expiry TIMESTAMP,
    vendor_status VARCHAR(50) NOT NULL DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
    tin_number VARCHAR(100),
    rdb_certificate TEXT,
    phone VARCHAR(100),
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE (Belongs to a specific Vendor/Seller)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL, -- e.g., 'Vegetables', 'Fruits', 'Grains', 'Livestock'
    image_url TEXT,
    vendor_id INT REFERENCES users(id) ON DELETE CASCADE,
    discount_percent INT DEFAULT 0,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ORDERS TABLE (Created by a Buyer)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    buyer_id INT REFERENCES users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    shipping_address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ORDER ITEMS TABLE (Breaks down products inside an order)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL -- Price at the exact moment of purchase
);

-- 5. PAYOUTS TABLE (Admin payout records to sellers)
CREATE TABLE IF NOT EXISTS payouts (
    id SERIAL PRIMARY KEY,
    vendor_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'paid', -- 'paid'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
