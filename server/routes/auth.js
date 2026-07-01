import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { sendOtpEmail } from '../mailer.js';
import { authenticateToken } from '../middleware/auth.js';

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

        // Generate 6-digit OTP for login verification
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        // Save OTP to DB
        await pool.query(
            'UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3',
            [otp, expiry, user.id]
        );

        // Send OTP via email in the background (prevent blocking HTTP response)
        sendOtpEmail(email, user.name, otp).catch(err => {
            console.error('[BACKGROUND EMAIL ERROR] Failed to send login OTP email:', err);
        });

        // Return otpRequired status
        res.status(200).json({ 
            otpRequired: true, 
            email: email, 
            message: 'Injiza umubare w\'ibanga woherejwe kuri imeli yawe (Please verify OTP sent to your email)',
            otp: otp // Retaining for easy presentation/dev view helper
        });

    } catch (error) {
        console.error('Kwinjira byanze:', error);
        res.status(500).json({ error: 'Server ifite ikibazo' });
    }
});

// Verify login OTP challenge
router.post('/verify-login-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Umukoresha ntagaragara muri system' });
        }

        const user = result.rows[0];

        // Verify OTP matches and is not expired
        if (!user.otp_code || user.otp_code !== otp) {
            return res.status(400).json({ error: 'Umubare w\'ibanga ntuhura (Invalid OTP code)' });
        }

        if (new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ error: 'Igihe cyo gukoresha uyu mubare cyarangiye (OTP expired)' });
        }

        // Clear OTP values
        await pool.query(
            'UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password_hash, ...userWithoutPassword } = user;

        res.status(200).json({ token, user: userWithoutPassword });

    } catch (error) {
        console.error('OTP verification failed:', error);
        res.status(500).json({ error: 'Server error during OTP verification' });
    }
});

// Google OAuth Login / Registration Endpoint
router.post('/google-login', async (req, res) => {
    const { name, email, role } = req.body;

    try {
        // Check if user already exists
        let userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (userQuery.rows.length === 0) {
            // User does not exist. If role is provided, create the account.
            if (role) {
                const validRoles = ['buyer', 'vendor'];
                const useRole = validRoles.includes(role) ? role : 'buyer';

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
                // No role provided, tell frontend that role choice is required
                return res.status(200).json({ needsRole: true });
            }
        } else {
            // User already exists, log in directly using stored role
            user = userQuery.rows[0];
            console.log(`Google user logged in: ${email}`);
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ token, user, needsRole: false });
    } catch (error) {
        console.error('Google login failed:', error);
        res.status(500).json({ error: 'Server error during Google auth' });
    }
});

// Request Password Reset OTP
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ error: 'Ugomba kugaragaza imeli (Email is required)' });
        }

        // Check if user exists
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Imeli ntayo twasanze muri database (Email not found)' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set expiry time to 5 minutes from now
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        // Update database with OTP
        await pool.query(
            'UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE email = $3',
            [otp, expiry, email]
        );

        const user = userQuery.rows[0];

        // Send OTP via email (Gmail/SMTP) in the background (prevent blocking HTTP response)
        sendOtpEmail(email, user.name, otp).catch(err => {
            console.error('[BACKGROUND EMAIL ERROR] Failed to send password reset OTP:', err);
        });

        res.status(200).json({ 
            message: 'OTP yoherejwe kuri imeli yanyu (OTP sent to your email successfully!)',
            otp: otp 
        });
    } catch (error) {
        console.error('Failed to generate OTP:', error);
        res.status(500).json({ error: 'Server error during OTP creation' });
    }
});

// Verify OTP and Reset Password
router.post('/verify-otp', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Uzuza amakuru yose asabwa (Fill all required fields)' });
        }

        // Find user
        const userQuery = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND otp_code = $2 AND otp_expiry > NOW()',
            [email, otp]
        );

        if (userQuery.rows.length === 0) {
            return res.status(400).json({ error: 'OTP code siyo cg yaraye yarengeje igihe (Invalid or expired OTP)' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP
        await pool.query(
            'UPDATE users SET password_hash = $1, otp_code = NULL, otp_expiry = NULL WHERE email = $2',
            [passwordHash, email]
        );

        console.log(`Password reset successfully for user: ${email}`);
        res.status(200).json({ message: 'Ijambo ry\'ibanga ryahinduwe neza! (Password reset successful!)' });
    } catch (error) {
        console.error('Failed to reset password via OTP:', error);
        res.status(500).json({ error: 'Server error during password update' });
    }
});

// Update User Profile (Name & Email)
router.put('/profile', authenticateToken, async (req, res) => {
    const { name, email } = req.body;
    const userId = req.user.id;

    try {
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }

        // Check if email already taken by another user
        const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, userId]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Imeli mukoresheje yarakoreshejwe (Email already in use)' });
        }

        // Update user profile in database
        const updated = await pool.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, created_at',
            [name, email, userId]
        );

        res.status(200).json({ user: updated.rows[0] });
    } catch (error) {
        console.error('Failed to update user profile:', error);
        res.status(500).json({ error: 'Server error during profile update' });
    }
});

// Update User Password
router.put('/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required.' });
        }

        // Get user password hash
        const userQuery = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const user = userQuery.rows[0];

        // Google OAuth users who never had a password won't have a known current password.
        const isGoogleUser = user.password_hash.startsWith('$2a$10$') === false || user.email.includes('gmail.com'); 
        
        if (currentPassword) {
            const valid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!valid) {
                return res.status(400).json({ error: 'Ijambo ry\'ibanga rya kera si ryo (Incorrect current password)' });
            }
        } else if (!isGoogleUser) {
            return res.status(400).json({ error: 'Ugomba kwerekana ijambo ry\'ibanga rya kera (Current password is required)' });
        }

        // Hash and update new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

        res.status(200).json({ message: 'Ijambo ry\'ibanga ryahinduwe neza! (Password updated successfully)' });
    } catch (error) {
        console.error('Failed to update password:', error);
        res.status(500).json({ error: 'Server error during password update' });
    }
});

export default router;

