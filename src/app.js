import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import sequelize from './config/database.js';

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/webhooks', webhookRoutes);

// Dynamic Env Config for Frontend
app.get('/env-config.js', (req, res) => {
    const env = {
        VITE_FACEBOOK_APP_ID: process.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID,
        VITE_FACEBOOK_CONFIG_ID: process.env.VITE_FACEBOOK_CONFIG_ID || process.env.FACEBOOK_CONFIG_ID
    };
    res.set('Content-Type', 'application/javascript');
    res.send(`window.env = ${JSON.stringify(env)};`);
});

// Serve static files from 'public' (User Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Fallback for SPA or unknown routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start Server and Sync DB
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Sync models (use { force: true } only for dev/reset)
        // await sequelize.sync({ alter: true }); 
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

// Only start server if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}

export default app;