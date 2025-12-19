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

    if (data.data && data.data.length > 0) {
        // render list
    } else {
        // THIS IS WHAT IS SHOWING
        // document.getElementById('pages-container').innerHTML = '<p>No pages found. (Check permissions)</p>';
    }
    ```
So `data.data` is empty or undefined.

If `data` came back with an error, the `catch` block would have handled it.
```javascript
} catch (e) {
    document.getElementById('pages-container').innerHTML = `<p style="color:red">Failed to load pages: ${e.message}</p>`;
}
```
Wait, in `app.js`:
```javascript
const res = await fetch(`/api/pages?access_token=${accessToken}`);
const data = await res.json();

if (data.data && data.data.length > 0) {
    // ...
} else {
    // THIS IS WHAT IS SHOWING
    // document.getElementById('pages-container').innerHTML = '<p>No pages found. (Check permissions)</p>';
}
```
This means the API call *succeeded* (status 200), but `data.data` is empty.
This strongly suggests that `me / accounts` is returning an empty list.

Why would `me / accounts` be empty if the user just selected pages?
1.  **Wrong Access Token**: Maybe the code exchange didn't work as expected or returned a token for a different user (unlikely).
2.  **Permissions**: The token does NOT have `pages_show_list` permission. Even if the user selects pages in the dialog, if the *app* doesn't have the permission to list them, the API might return empty or error.
3.  **App Secret**: If the token exchange logic on the backend ( `/ api / exchange - token`) failed to include the app secret or used the wrong one, the token might be invalid or limited? No, if it was invalid, `me / accounts` would error.

Let's look at `server.js` token exchange.
```javascript
const tokenResponse = await axios.get('https://graph.facebook.com/v24.0/oauth/access_token', {
    params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri.split('?')[0],
        code: code
    }
});
```
If `client_secret` were missing/wrong, this call would fail with 400/401, causing `statusChangeCallback` to catch an error and show "Error: Failed to exchange token".
The user sees the profile loaded (name, ID). That means **Token Exchange Worked** and **User Profile Fetch Worked**.
So we have a valid Access Token.

The issue is strictly with `fetchPages`.
The frontend calls `/ api / pages ? access_token =...`
The backend calls `https://graph.facebook.com/v24.0/me/accounts`.

If the user created a specific "Login Configuration"(Config ID) for "Business", and that configuration * only * included`email` and`public_profile`, but * not * `pages_show_list` or`pages_read_engagement`, then`me/accounts` might return empty even if the user selected pages(because the app isn't allowed to see them).
The user * said * they did it, but maybe they didn't add all of them, or they need to re-generate the Config ID? No, normally you just edit the config.

The user's screenshot showing the permissions dialog lists:
"Pages: Catofe"
"Verifique para quais ações o BrokerApp - CRM está solicitando permissão"
"Acessar leads para suas Páginas"(`leads_retrieval`)
I DO NOT SEE`pages_show_list` explicitly listed as "Manage Pages" or "List Pages" in the screenshot.
    Usually "Acessar leads" implies some page access, but`me/accounts` specifically needs`pages_show_list`.

I will try to debug by:
1.  Adding a log in `server.js` to show the exact response from`me/accounts`.
2.  Cleaning up the code as requested.
3.  Advising the user to double - check`pages_show_list`.

    Actually, in the screenshot "Verifique para quais ações...", it lists:
- "Acessar leads para suas Páginas"
It * should * also list something like "Mostrar lista de páginas" if `pages_show_list` was requested.

I will optimize the code first and verify.

One detail: `style.css` has some blob animations that might be distracting or heavy ? User said "simple and smooth".I'll check `index.html` to see if I can clean it up.

Let's focus on `server.js` logging and "cleanup".

    ** Task **: Clean up legacy code and debug empty pages list.

        I'll remove `index.html` comments and `app.js` commented out blocks.
I'll add detailed logging to `server.js`.

User said: "Se necessário, apague todo o código legado e velho".

I will set a task boundary.
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
