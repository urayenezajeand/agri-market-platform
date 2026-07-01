import pg from 'pg';
import dotenv from 'dotenv';

// Load environmental variables from the .env file
dotenv.config();

const { Pool } = pg;

// Determine if we are in production
const isProduction = process.env.NODE_ENV === 'production';

// Check if a single connection URL is provided, otherwise use individual parameters
const pool = new Pool(
    process.env.DATABASE_URL
        ? { 
            connectionString: process.env.DATABASE_URL,
            ssl: isProduction ? { rejectUnauthorized: false } : false
          }
        : {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT || '5432'),
            // SSL is required on production databases (like Render/Railway/Heroku)
            ssl: isProduction ? { rejectUnauthorized: false } : false
        }
);

pool.on('connect', () => {
    console.log('Database connection pool established successfully.');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err);
    process.exit(-1);
});

export default pool;
