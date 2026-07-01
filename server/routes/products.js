import express from 'express';
import pool from '../db.js';
import { authenticateToken, requireVendor } from '../middleware/auth.js';

const router = express.Router();

// 1. GUSHAKA IBICURUZWA BYOSE (Retrieve all products with search and filtering)
router.get('/', async (req, res) => {
    const { category, search } = req.query;

    // Urufatiro rwa query (Join users to get the vendor's name)
    let queryText = 'SELECT p.*, u.name as vendor_name FROM products p JOIN users u ON p.vendor_id = u.id';
    let queryParams = [];
    let conditions = [];

    // Niba hari category bafunguye (Filtering by category)
    if (category) {
        queryParams.push(category);
        conditions.push(`p.category = $${queryParams.length}`);
    }

    // Niba barimo gushakisha izina (Searching by name)
    if (search) {
        queryParams.push(`%${search}%`);
        conditions.push(`p.name ILIKE $${queryParams.length}`);
    }

    // Guteranya ibice bya query
    if (conditions.length > 0) {
        queryText += ' WHERE ' + conditions.join(' AND ');
    }

    // Gutondeka ibicuruzwa kuva ku bishya (Ordering by newest first)
    queryText += ' ORDER BY p.created_at DESC';

    try {
        const result = await pool.query(queryText, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Kuzana ibicuruzwa byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// 2. KUZANA ICYAKURIKIWE KIMWE (Get details of a single product by ID)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT p.*, u.name as vendor_name, u.email as vendor_email FROM products p JOIN users u ON p.vendor_id = u.id WHERE p.id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Iki gicuruzwa ntikibonetse (Product not found)' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Kuzana igicuruzwa byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// 3. GUSHIRAHO IGICURUZWA GISHYA (Create a new product - Vendor Only)
router.post('/', authenticateToken, requireVendor, async (req, res) => {
    const { name, description, price, stock, category, image_url } = req.body;

    // Gufata ID ya vendor muri Token securely (loaded by authenticateToken middleware)
    const vendor_id = req.user.id;

    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price, stock, category, image_url, vendor_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, description, price, stock, category, image_url, vendor_id]
        );

        // Subiza browser igicuruzwa twamaze kurema muri DB (status 201 Created)
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Gushyiraho igicuruzwa byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// 4. GUHINDURA IGICURUZWA (Update product - Vendor Only, Owner Check)
router.put('/:id', authenticateToken, requireVendor, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, category, image_url } = req.body;
    const vendor_id = req.user.id;

    try {
        // Kureba niba icyo gicuruzwa gihari n'uwo ari icyo
        const productCheck = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if (productCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Iki gicuruzwa ntikibonetse (Product not found)' });
        }

        // Isuzuma: Ese umucuruzi ushaka kugihindura ni we nyiracyo?
        if (productCheck.rows[0].vendor_id !== vendor_id) {
            return res.status(403).json({ error: 'Nta burenganzira ufite bwo guhindura iki gicuruzwa (Forbidden: You do not own this product)' });
        }

        // Guhindura amakuru (Update details in DB)
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, category = $5, image_url = $6 WHERE id = $7 RETURNING *',
            [name, description, price, stock, category, image_url, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Guhindura igicuruzwa byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// 5. GUSIBA IGICURUZWA (Delete product - Vendor Only, Owner Check)
router.delete('/:id', authenticateToken, requireVendor, async (req, res) => {
    const { id } = req.params;
    const vendor_id = req.user.id;

    try {
        // Kureba niba icyo gicuruzwa gihari n'uwo ari icyo
        const productCheck = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if (productCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Iki gicuruzwa ntikibonetse (Product not found)' });
        }

        // Isuzuma: Ese ushaka kugisiba ni we nyiracyo?
        if (productCheck.rows[0].vendor_id !== vendor_id) {
            return res.status(403).json({ error: 'Nta burenganzira ufite bwo gusiba iki gicuruzwa (Forbidden: You do not own this product)' });
        }

        // Gusiba igicuruzwa (Delete from DB)
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Igicuruzwa cyasibwe neza (Product deleted successfully)' });
    } catch (error) {
        console.error('Gusiba igicuruzwa byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

export default router;

