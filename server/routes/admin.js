import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth and admin checks on all routes in this file
router.use(authenticateToken);
router.use(requireAdmin);

// 1. GET /api/admin/stats - Retrieve dashboard overview KPIs and recent entries
router.get('/stats', async (req, res) => {
    try {
        const usersCountRes = await pool.query('SELECT COUNT(*)::int as count FROM users');
        const vendorsCountRes = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'vendor'");
        const buyersCountRes = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'buyer'");
        const adminsCountRes = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'admin'");
        
        const productsCountRes = await pool.query('SELECT COUNT(*)::int as count FROM products');
        const ordersCountRes = await pool.query('SELECT COUNT(*)::int as count FROM orders');
        const revenueRes = await pool.query("SELECT SUM(total_amount)::float as revenue FROM orders WHERE status != 'cancelled'");
        
        const recentOrdersRes = await pool.query(`
            SELECT o.id, o.total_amount, o.status, o.created_at, u.name as buyer_name, u.email as buyer_email
            FROM orders o
            LEFT JOIN users u ON o.buyer_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);
        
        const recentProductsRes = await pool.query(`
            SELECT p.id, p.name, p.price, p.category, u.name as vendor_name
            FROM products p
            LEFT JOIN users u ON p.vendor_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);

        res.json({
            users: {
                total: usersCountRes.rows[0].count,
                vendors: vendorsCountRes.rows[0].count,
                buyers: buyersCountRes.rows[0].count,
                admins: adminsCountRes.rows[0].count
            },
            products: productsCountRes.rows[0].count,
            orders: ordersCountRes.rows[0].count,
            revenue: revenueRes.rows[0].revenue || 0,
            recentOrders: recentOrdersRes.rows,
            recentProducts: recentProductsRes.rows
        });
    } catch (error) {
        console.error('Failed to retrieve admin stats:', error);
        res.status(500).json({ error: 'Server error retrieving statistics' });
    }
});

// 2. GET /api/admin/users - Retrieve all registered users
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, vendor_status, tin_number, rdb_certificate, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to retrieve users:', error);
        res.status(500).json({ error: 'Server error retrieving users list' });
    }
});

// 3. PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['buyer', 'vendor', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid user role' });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
            [role, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update user role:', error);
        res.status(500).json({ error: 'Server error updating user role' });
    }
});

// 4. DELETE /api/admin/users/:id - Delete a user from the platform
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({ error: 'Server error deleting user' });
    }
});

// 5. GET /api/admin/products - Retrieve all products (catalog moderation)
router.get('/products', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.name as vendor_name, u.email as vendor_email
            FROM products p
            LEFT JOIN users u ON p.vendor_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to retrieve products:', error);
        res.status(500).json({ error: 'Server error retrieving products list' });
    }
});

// 6. DELETE /api/admin/products/:id - Delete any product listing
router.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Failed to delete product:', error);
        res.status(500).json({ error: 'Server error deleting product' });
    }
});

// 7. GET /api/admin/orders - Retrieve all platform orders
router.get('/orders', async (req, res) => {
    try {
        const ordersRes = await pool.query(`
            SELECT o.*, u.name as buyer_name, u.email as buyer_email
            FROM orders o
            LEFT JOIN users u ON o.buyer_id = u.id
            ORDER BY o.created_at DESC
        `);
        const orders = ordersRes.rows;

        for (const order of orders) {
            const itemsRes = await pool.query(`
                SELECT oi.*, p.name as product_name, p.image_url
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = $1
            `, [order.id]);
            order.items = itemsRes.rows;
        }

        res.json(orders);
    } catch (error) {
        console.error('Failed to retrieve orders:', error);
        res.status(500).json({ error: 'Server error retrieving orders list' });
    }
});

// 8. PUT /api/admin/users/:id/vendor-status - Onboard or moderate a seller/vendor status
router.put('/users/:id/vendor-status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'pending'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid onboarding status' });
    }

    try {
        const result = await pool.query(
            "UPDATE users SET vendor_status = $1 WHERE id = $2 AND role = 'vendor' RETURNING id, name, email, role, vendor_status",
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor/Seller not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to update vendor status:', error);
        res.status(500).json({ error: 'Server error updating vendor status' });
    }
});

// 9. PUT /api/admin/products/:id/approve - Approve or reject a listed product crop
router.put('/products/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { approve } = req.body; // boolean

    try {
        const result = await pool.query(
            "UPDATE products SET is_approved = $1 WHERE id = $2 RETURNING *",
            [!!approve, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product/Crop not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Failed to approve product:', error);
        res.status(500).json({ error: 'Server error during product approval' });
    }
});

// 10. POST /api/admin/payouts - Record a payout disbursement to a farmer/seller
router.post('/payouts', async (req, res) => {
    const { vendor_id, amount } = req.body;

    if (!vendor_id || amount === undefined || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Vendor ID and positive payout amount are required' });
    }

    try {
        const vendorCheck = await pool.query("SELECT id, name FROM users WHERE id = $1 AND role = 'vendor'", [vendor_id]);
        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor/Farmer not found' });
        }

        const result = await pool.query(
            "INSERT INTO payouts (vendor_id, amount) VALUES ($1, $2) RETURNING *",
            [vendor_id, amount]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to record payout:', error);
        res.status(500).json({ error: 'Server error recording seller payout' });
    }
});

// 11. GET /api/admin/payouts - Retrieve payout logs
router.get('/payouts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.name as vendor_name, u.email as vendor_email
            FROM payouts p
            LEFT JOIN users u ON p.vendor_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to retrieve payouts:', error);
        res.status(500).json({ error: 'Server error retrieving payouts history' });
    }
});

// 12. GET /api/admin/payouts/summary - Calculate sales earnings ledger and pending balances for all sellers
router.get('/payouts/summary', async (req, res) => {
    try {
        const salesRes = await pool.query(`
            SELECT u.id as vendor_id, u.name as vendor_name, u.email as vendor_email,
                   COALESCE(SUM(oi.price * oi.quantity), 0)::float as gross_sales
            FROM users u
            LEFT JOIN products p ON u.id = p.vendor_id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'delivered'
            WHERE u.role = 'vendor'
            GROUP BY u.id, u.name, u.email
        `);

        const payoutsRes = await pool.query(`
            SELECT vendor_id, COALESCE(SUM(amount), 0)::float as total_paid
            FROM payouts
            GROUP BY vendor_id
        `);

        const sales = salesRes.rows;
        const payouts = payoutsRes.rows;

        const summary = sales.map(s => {
            const pInfo = payouts.find(p => p.vendor_id === s.vendor_id);
            const totalPaid = pInfo ? pInfo.total_paid : 0;
            const balance = s.gross_sales - totalPaid;
            return {
                vendor_id: s.vendor_id,
                vendor_name: s.vendor_name,
                vendor_email: s.vendor_email,
                gross_sales: s.gross_sales,
                total_paid: totalPaid,
                balance: balance
            };
        });

        res.json(summary);
    } catch (error) {
        console.error('Failed to retrieve payouts summary:', error);
        res.status(500).json({ error: 'Server error calculating payouts summary' });
    }
});

export default router;
