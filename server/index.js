import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './initDB.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import adminRouter from './routes/admin.js';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Middlewares 
app.use(cors()); //guhuza frontend na back end kdi zikoresha port zitandukanya 
app.use(express.json()); //gutuma express ibasha gusoma amakuri yanditse muri req.body (json data)

// 2. Register Routes (imihanda cg x imiyoboro)
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);


// 3. Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Agri-Market API is running smoothly.' });
});

// 4. Start Server
async function startServer() {
    try {
        // Initialize DB tables first
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
