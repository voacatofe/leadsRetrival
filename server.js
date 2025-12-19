import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// Serve static files from 'dist' (production) or root (dev fallback if needed)
app.use(express.static('dist'));

// API Routes
app.post('/api/exchange-token', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    try {
        const appId = process.env.FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const redirectUri = req.headers.referer || 'http://localhost:3000/'; // Must match the frontend origin exactly

        // 1. Exchange Code for Access Token
        console.log('Exchanging code for token...');
        const tokenResponse = await axios.get('https://graph.facebook.com/v24.0/oauth/access_token', {
            params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri.split('?')[0], // Remove query params from referer
                code: code
            }
        });

        const accessToken = tokenResponse.data.access_token;
        console.log('Token acquired. Fetching user info...');

        // 2. Fetch User Info
        const userResponse = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,picture',
                access_token: accessToken
            }
        });

        res.json({
            access_token: accessToken,
            user: userResponse.data
        });

    } catch (error) {
        console.error('Error exchanging token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to exchange token', details: error.response?.data });
    }
});

app.get('/api/pages', async (req, res) => {
    const { access_token } = req.query;

    if (!access_token) {
        return res.status(400).json({ error: 'Access Token is required' });
    }

    try {
        console.log('Fetching pages...');
        // Verify permissions: pages_show_list, pages_read_engagement
        const response = await axios.get('https://graph.facebook.com/v24.0/me/accounts', {
            params: {
                access_token: access_token,
                fields: 'id,name,access_token,category,tasks'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching pages:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch pages', details: error.response?.data });
    }
});

app.get('/api/leads', async (req, res) => {
    const { page_token, page_id } = req.query;

    if (!page_token || !page_id) {
        return res.status(400).json({ error: 'Page Token and Page ID are required' });
    }

    try {
        console.log(`Fetching leads for page ${page_id}...`);
        // Verify permissions: leads_retrieval
        const response = await axios.get(`https://graph.facebook.com/v24.0/${page_id}/leadgen_forms`, {
            params: {
                access_token: page_token,
                fields: 'id,name,status,leads_count,created_time'
            }
        });

        // For each form, we might want to fetch actual leads, but let's start with listing forms
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching leads:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch leads', details: error.response?.data });
    }
});


// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
