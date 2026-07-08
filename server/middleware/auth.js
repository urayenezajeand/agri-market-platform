import jwt from 'jsonwebtoken';
import pool from '../db.js';

// 1. Gukora isuzuma niba umukoresha afite Token y'umutekano (Authentication check)
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Fata Token ikurikira ijambo "Bearer"

    if (!token) {
        return res.status(401).json({ error: 'Nta burenganzira ufite: Nta token ihari (Unauthorized: Missing token)' });
    }

    // Gupima niba Token ari iy'ukuri kandi itararenza igihe
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token ntigikora cyangwa yarengeje igihe (Forbidden: Invalid token)' });
        }
        // Shyira amakuru y'umu-user muri request kugira ngo routes zizayagereho
        req.user = user;
        next(); // Emerera request gukomeza imbere
    });
}

// 2. Kureba niba uwinjira ari umucuruzi (Vendor check)
export async function requireVendor(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Nta burenganzira: Winjira mbere (Unauthorized)' });
    }

    try {
        const userCheck = await pool.query('SELECT role, vendor_status FROM users WHERE id = $1', [req.user.id]);
        if (userCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Umukoresha ntazwi muri system (User not found).' });
        }

        const user = userCheck.rows[0];
        if (user.role === 'vendor') {
            if (user.vendor_status === 'approved') {
                next();
            } else if (user.vendor_status === 'pending') {
                res.status(403).json({ error: 'Konti yanyu y\'ubucuruzi iracyategereje kwemezwa n\'umuyobozi (Your vendor account is pending admin approval).' });
            } else {
                res.status(403).json({ error: 'Konti yanyu y\'ubucuruzi yaranzwe cyangwa yasibwe (Your vendor account was rejected).' });
            }
        } else {
            res.status(403).json({ error: 'Nta burenganzira ufite: Abacuruzi (vendors) gusa ni bo bemerewe.' });
        }
    } catch (error) {
        console.error('requireVendor check failed:', error);
        res.status(500).json({ error: 'Server validation error' });
    }
}

// 3. Kureba niba uwinjira ari admin (Admin check)
export function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next(); // Niba ari admin, mureke akomeze
    } else {
        res.status(403).json({ error: 'Nta burenganzira ufite: Abayobozi (admins) gusa ni bo bemerewe.' });
    }
}
