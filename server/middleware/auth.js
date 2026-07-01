import jwt from 'jsonwebtoken';

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
export function requireVendor(req, res, next) {
    if (req.user && req.user.role === 'vendor') {
        next(); // Niba ari vendor, mureke akomeze
    } else {
        res.status(403).json({ error: 'Nta burenganzira ufite: Abacuruzi (vendors) gusa ni bo bemerewe.' });
    }
}
