import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// kwinjiza cg gu creating umu user muri database
router.post('/register', async (req, res) => {

    //gufata data client cg se ukoresheje imachini atanze tukayafata dukoresheje fucntion ya req.body()
    const { name, email, password, role } = req.body;

    try {
        // hano tugiye kureba role kugirango twandike muri database uko byasabwe niba ari seller yandikwe nka seller gutyo gutyo

        const validRoles = ['buyer', 'vendor'];
        const useRole = validRoles.includes(role) ? role : 'buyer';



        //kureba niba user asanzwe ahari (if email already exist)
        const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ error: 'imeli mukoresheje yarakoreshejwe' });

        }

        //guhindura password (hashing password dukoresheje libary ya brcypt)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);


        // gushyira umu user muri database 
        const newUser = await pool.query(
            'INSERT INTO users(name,email,password_hash, role) VALUES($1,$2,$3,$4) RETURNING id, name, email, role, created_at',
            [name, email, passwordHash, useRole]
        );

        const user = newUser.rows[0];

        //gu creating JWT token nka icyemerera umu user kubona access kubintu runaka mugihe runaka

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // guha browser igisubizo niba user yabaye registerd cg se byanze  dukoresheje res fuction

        res.status(201).json({ token, user });

    } catch (error) {
        console.error('Kwiyandikisha byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });

    }


})
//gukora login
router.post('/login', async (req, res) => {
    //gufata user data (login credentials)
    const { email, password } = req.body;

    try {
        //kureba wa mu user muri database twifashishije amakuru ye yibanga yatanzwe na req.body

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'imel yawe cg password ntabwo ari byo )' });
        }
        const user = result.rows[0];
        // 3. Kugereranya password yashyizemo n'iyari muri database (Comparing passwords)
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Imeli cyangwa ijambo ry\'ibanga sibyo' });
        }

        // 4. Guhanga Token nshya (Generating the JWT token)
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 5. Gukura password hash mu makuru yoherezwa kuri browser (Removing password hash)
        const { password_hash, ...userWithoutPassword } = user;

        // 6. Kohereza igisubizo cyiza (Sending the success response)
        res.json({ token, user: userWithoutPassword });

    } catch (error) {
        console.error('Kwinjira byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// Google OAuth Login / Registration Endpoint
router.post('/google-login', async (req, res) => {
    const { name, email, role } = req.body;

    try {
        const validRoles = ['buyer', 'vendor'];
        const useRole = validRoles.includes(role) ? role : 'buyer';

        // Check if user already exists
        let userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (userQuery.rows.length === 0) {
            // Create user with a mock password hash
            const mockPassword = Math.random().toString(36).substring(7);
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(mockPassword, salt);

            const newUser = await pool.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
                [name, email, passwordHash, useRole]
            );
            user = newUser.rows[0];
            console.log(`Google user registered: ${email}`);
        } else {
            user = userQuery.rows[0];
            console.log(`Google user logged in: ${email}`);
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ token, user });
    } catch (error) {
        console.error('Google login failed:', error);
        res.status(500).json({ error: 'Server error during Google auth' });
    }
});

export default router;

