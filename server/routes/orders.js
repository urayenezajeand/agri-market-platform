import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendOrderReceiptEmail } from '../mailer.js';

const router = express.Router();

// 1. KUREMA ORDER / CHECKOUT (Create a new order - All logged-in users)
router.post('/', authenticateToken, async (req, res) => {
    const { shipping_address, phone, items } = req.body; // items: [{ product_id, quantity }]
    const buyer_id = req.user.id;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Nta bicuruzwa biri mu kagare (Cart is empty)' });
    }

    // Gufungura umuyoboro w'ibibazo (Get database client for Transaction)
    const client = await pool.connect();

    try {
        // A. Gutangira TRANSACTION (Start database transaction)
        await client.query('BEGIN');

        let totalAmount = 0;
        const itemsDetailed = [];

        // B. Kubika ibiranga order muri table ya 'orders' (ibanza kuba total = 0)
        const orderResult = await client.query(
            'INSERT INTO orders (buyer_id, total_amount, shipping_address, phone, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [buyer_id, 0, shipping_address, phone, 'pending']
        );
        const orderId = orderResult.rows[0].id;

        // C. Gushyiramo buri gicuruzwa (Loop through cart items)
        for (const item of items) {
            const { product_id, quantity } = item;

            // 1. Kuzana amakuru y'icyo gicuruzwa (Fetch product price and stock)
            const productRes = await client.query('SELECT price, stock, name FROM products WHERE id = $1 FOR UPDATE', [product_id]);
            if (productRes.rows.length === 0) {
                throw new Error(`Igicuruzwa cya ID ${product_id} ntikibonetse`);
            }

            const { price, stock, name: productName } = productRes.rows[0];

            // 2. Kureba niba stock ihagije (Check stock availability)
            if (stock < quantity) {
                throw new Error(`Stock y'igicuruzwa "${productName}" ntiyagabanyuka: Hakenewe ${quantity}, hasigaye ${stock}`);
            }

            // 3. Kubara igiciro (Calculate items total)
            const itemTotal = parseFloat(price) * quantity;
            totalAmount += itemTotal;

            itemsDetailed.push({ name: productName, price: parseFloat(price), quantity });

            // 4. Kugabanya stock muri database (Reduce product stock)
            await client.query(
                'UPDATE products SET stock = stock - $1 WHERE id = $2',
                [quantity, product_id]
            );

            // 5. Kwandika icyo gicuruzwa muri 'order_items' (Save order item details)
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [orderId, product_id, quantity, price]
            );
        }

        // D. Guhindura total_amount nyayo muri 'orders' (Update overall order total)
        await client.query(
            'UPDATE orders SET total_amount = $1 WHERE id = $2',
            [totalAmount, orderId]
        );

        // E. Kwemeza TRANSACTION (Commit transaction)
        await client.query('COMMIT');

        // F. Yohereza inyemezabwishyu (Send order confirmation receipt email asynchronously)
        const userRes = await client.query('SELECT name, email FROM users WHERE id = $1', [buyer_id]);
        if (userRes.rows.length > 0) {
            const { name: buyerName, email: buyerEmail } = userRes.rows[0];
            sendOrderReceiptEmail(buyerEmail, buyerName, orderId, totalAmount, shipping_address, phone, itemsDetailed)
                .catch(err => console.error('[EMAIL ERROR] Failed to send async order receipt email:', err));
        }

        res.status(201).json({ id: orderId, total_amount: totalAmount, message: 'Ibyo watumije byakirwe neza (Order placed successfully)' });

    } catch (error) {
        // F. Niba hari ikibazo, gusubiza ibyari byakozwe inyuma (Rollback on failure)
        await client.query('ROLLBACK');
        console.error('Checkout failed, transaction rolled back:', error);
        res.status(400).json({ error: error.message || 'Server ifite ikibazo cyo gutumiza' });
    } finally {
        // Gufungura umuyoboro w'inyongera (Release client back to pool)
        client.release();
    }
});

// 2. KUZANA AMA ORDER Y'UMUGUZI (Get buyer's order history)
router.get('/buyer', authenticateToken, async (req, res) => {
    const buyer_id = req.user.id;

    try {
        // Gushaka ama orders yose y'umuguzi
        const ordersRes = await pool.query(
            'SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC',
            [buyer_id]
        );

        const orders = ordersRes.rows;

        // Buri order tuyishakira ibicuruzwa biyigize (Fetch items for each order)
        for (const order of orders) {
            const itemsRes = await pool.query(
                `SELECT oi.*, p.name as product_name, p.image_url 
                 FROM order_items oi 
                 LEFT JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = $1`,
                [order.id]
            );
            order.items = itemsRes.rows;
        }

        res.json(orders);
    } catch (error) {
        console.error('Kuzana orders z\'umuguzi byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// 3. KUZANA AMASALES Y'UMUCURUZI (Get items sold by vendor - Vendor Only)
router.get('/vendor', authenticateToken, async (req, res) => {
    const vendor_id = req.user.id;

    try {
        // SQL JOIN: Kuzana ibicuruzwa by'uyu vendor byaguzwe n'aba-buyers
        const result = await pool.query(
            `SELECT oi.*, p.name as product_name, p.image_url, 
                    o.created_at, o.status, o.shipping_address, o.phone, 
                    u.name as buyer_name, u.email as buyer_email
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             JOIN orders o ON oi.order_id = o.id
             JOIN users u ON o.buyer_id = u.id
             WHERE p.vendor_id = $1
             ORDER BY o.created_at DESC`,
            [vendor_id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Kuzana sales z\'umucuruzi byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// 4. GUHINDURA IMITERERE Y'ORDER (Update order status - e.g. mark as shipped)
router.patch('/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'processing', 'shipped', 'delivered', 'cancelled'

    try {
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order ntibonetse (Order not found)' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Guhindura status y\'order byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

export default router;
