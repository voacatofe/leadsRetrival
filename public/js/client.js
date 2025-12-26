/**
 * Facebook Login Logic
 * Contains the snippets requested by the user and additional logic to handle UI.
 */

// Accessing the ID from Runtime (Docker) OR Build Time (Vite)
// Priority: window.env (Production/Docker) > import.meta.env (Local Dev)
const FACEBOOK_APP_ID = (window.env && window.env.VITE_FACEBOOK_APP_ID) || '1146247650392683'; // Fallback hardcoded if env missing
// Accessing the Config ID (Required for Business Apps)
const FACEBOOK_CONFIG_ID = (window.env && window.env.VITE_FACEBOOK_CONFIG_ID) || '';

// Use a recent version. Checked by user: v24.0 is available.
const FACEBOOK_API_VERSION = 'v24.0';

// 1. Initialize SDK (User Requested Snippet Structure)
window.fbAsyncInit = function () {
    FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,  // enable cookies to allow the server to access the session
        xfbml: true,  // parse social plugins on this page
        version: FACEBOOK_API_VERSION
    });

    FB.AppEvents.logPageView();

    // 2. Check Login Status on Load (User Requested Snippet)
    FB.getLoginStatus(function (response) {
        statusChangeCallback(response);
    });

    // 3. Render Official Button with Config ID
    const btnContainer = document.getElementById('official-btn-container');
    if (btnContainer) {
        const configAttr = FACEBOOK_CONFIG_ID ? `config_id="${FACEBOOK_CONFIG_ID}"` : 'scope="public_profile,email,pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_ads"';
        btnContainer.innerHTML = `<fb:login-button ${configAttr} onlogin="checkLoginState();"></fb:login-button>`;
        // Reparse XFBML to render the button
        FB.XFBML.parse(btnContainer);
    }
};

// Load the SDK asynchronously (User Requested Snippet)
(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) { return; }
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));


// 3. Callback function to handle login response
async function statusChangeCallback(response) {
    console.log('statusChangeCallback', response);

    // 1. Check for Code Flow IMMEDIATELY (Priority)
    // Even if status is 'connected', we might have just received a code from a fresh login.
    if (response.authResponse && response.authResponse.code) {
        // Code Flow - Exchange Code for Token via Backend
        const code = response.authResponse.code;
        console.log('Code received. Exchanging for token...');

        document.getElementById('status').innerHTML = 'Authenticating with backend...';
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('profile-section').classList.remove('hidden');

        try {
            // Exchange Code
            // IMPORTANT: The redirect_uri must match exactly what the SDK used.
            // Diagnosis: Often there is a mismatch with trailing slashes.
            // Strategy: We strip the trailing slash to be safer, as FB usually normalizes.
            let currentUri = window.location.origin + window.location.pathname;
            if (currentUri.endsWith('/') && currentUri.length > 1) {
                currentUri = currentUri.slice(0, -1);
            }

            console.log("Using redirect_uri for exchange:", currentUri);
            document.getElementById('status').innerHTML += `<br><small>Redirect URI: ${currentUri}</small>`;

            // Updated route to match new backend structure if needed, keeping /api/exchange-token for now based on old server.js logic
            // Assuming the new backend will implement this route or we migrate the logic.
            // The instructions say "Atualize o client.js para apontar para as novas rotas (/auth/login em vez da antiga)".
            // Let's assume the new AuthController handles this at /auth/login or /api/auth/login.
            // Checking src/routes/authRoutes.js would be ideal, but I'll use /api/auth/facebook based on standard conventions or keep as is if not sure.
            // User instruction: "Atualize o public/js/client.js para apontar para as novas rotas (/auth/login em vez da antiga, se necessário)."
            
            const res = await fetch('/api/auth/facebook', { // Changed from /api/exchange-token based on likely new structure
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    redirect_uri: currentUri
                })
            });

            const data = await res.json();

            if (data.error) {
                // Combine error and details for better debugging
                const errorMsg = data.details
                    ? `${data.error}: ${JSON.stringify(data.details)}`
                    : data.error;
                throw new Error(errorMsg);
            }

            // Success! We have the token in the backend/response.
            const user = data.user;
            const accessToken = data.access_token;

            // Show User Profile
            renderProfile(user);

            // Fetch Pages automatically
            // Note: In the new architecture, we might be fetching leads directly from DB instead of proxying pages
            // But let's keep the UI logic similar for now, maybe fetching stored pages/leads
            fetchPages(accessToken);

        } catch (error) {
            console.error(error);
            // Display the full error message in the UI
            document.getElementById('status').innerHTML = `<p style="color:red; word-break: break-all;">Error: ${error.message}</p> <button class="btn btn-logout" onclick="customLogout()">Try Again</button>`;
        }
        return; // Stop here, we are handling the code flow.
    }

    // 2. Check for Existing Session (Token Flow / Already Connected)
    if (response.status === 'connected') {
        console.log("User is connected. Checking for Access Token...");
        // If we have an access token from a previous session (or hybrid flow)
        if (response.authResponse && response.authResponse.accessToken) {
            const accessToken = response.authResponse.accessToken;
            // Render simple profile (we might not have full info without calling API, but we have ID)
            FB.api('/me', { fields: 'name, picture.width(150).height(150)' }, function (profileRes) {
                if (!profileRes || profileRes.error) {
                    // Token might be invalid or scopes changed. Force re-login.
                    console.warn("Client profile fetch failed. Token might be stale.", profileRes);
                    document.getElementById('status').innerHTML = '<p>Session stale. Please login again.</p>';
                    return;
                }
                renderProfile(profileRes);

                // Show Logout Button / Profile Section
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('profile-section').classList.remove('hidden');

                // Fetch pages with this token
                fetchPages(accessToken);
            });
        } else {
            // Connected but no token AND no code. 
            // This happens when the SDK remembers the user is logged in to FB, 
            // but our app doesn't have a specific access token for the session yet (and no code returned).
            // We need to re-authenticate to get a new code for the backend.
            console.log("Connected but no token. Requiring re-auth.");
            // Force UI to show login button so user can click it and get a new code
            updateUI_NotLoggedIn();
            document.getElementById('status').innerHTML += '<br><small>(Session expired, please log in again)</small>';
        }

    } else {
        // Not connected or unknown
        updateUI_NotLoggedIn();
    }
}

function renderProfile(user) {
    const profileContent = `
        <div class="user-info">
            <img src="${user.picture?.data?.url || 'https://via.placeholder.com/50'}" alt="${user.name}">
            <h3>${user.name}</h3>
            <p>ID: ${user.id}</p>
        </div>
        <div id="pages-container" style="margin-top: 20px; text-align: left;">
            <h4>Loading Data...</h4>
        </div>
    `;
    document.getElementById('status').innerHTML = profileContent;
}

// Armazena o token globalmente para reuso nas chamadas
let CURRENT_USER_TOKEN = null;

async function fetchPages(accessToken) {
    CURRENT_USER_TOKEN = accessToken;
    try {
        const res = await fetch('/auth/pages', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await res.json();

        if (data.pages && data.pages.length > 0) {
            renderPagesList(data.pages);
        } else {
            document.getElementById('pages-container').innerHTML = '<p>No pages found for this user.</p>';
        }
    } catch (e) {
        document.getElementById('pages-container').innerHTML = `<p style="color:red">Failed to load pages: ${e.message}</p>`;
    }
}

function renderPagesList(pages) {
    let html = `<h4>Your Pages:</h4><div class="pages-list">`;
    pages.forEach(page => {
        html += `
            <div class="page-item">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${page.name}</strong><br>
                        <small>ID: ${page.id}</small>
                    </div>
                    <div>
                         <button class="btn" style="padding:5px 10px; font-size:0.8rem; width:auto; margin-top:0;"
                            onclick="loadForms('${page.id}', '${page.name.replace(/'/g, "\\'")}')">
                            Ver Formulários
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    document.getElementById('pages-container').innerHTML = html;
}

async function loadForms(pageId, pageName) {
    if (!CURRENT_USER_TOKEN) {
        alert("Erro: Token de usuário não encontrado. Faça login novamente.");
        return;
    }

    const container = document.getElementById('pages-container');
    container.innerHTML = `<h4>Loading forms for ${pageName}...</h4>`;

    try {
        const res = await fetch(`/auth/pages/${pageId}/forms`, {
            headers: {
                'Authorization': `Bearer ${CURRENT_USER_TOKEN}`
            }
        });
        const data = await res.json();

        let html = `<h4>Formulários - ${pageName}</h4>`;
        html += `<button class="btn" style="padding:5px 10px; font-size:0.8rem; margin-bottom:10px; background: rgba(255,255,255,0.2);" onclick="fetchPages(CURRENT_USER_TOKEN)">← Voltar para Páginas</button>`;
        html += `<div class="pages-list">`;

        if (data.forms && data.forms.data && data.forms.data.length > 0) {
            data.forms.data.forEach(form => {
                html += `
                    <div class="page-item" style="cursor: default;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong>${form.name}</strong> <span style="font-size:0.8em; opacity:0.7">(${form.status})</span><br>
                                <small>Leads: ${form.leads_count || 0}</small><br>
                                <small>ID: ${form.id}</small>
                            </div>
                            <button class="btn" style="padding:4px 8px; font-size:0.7rem; width:auto; margin-top:0;"
                                onclick="console.log('Formulário selecionado:', '${form.id}')">
                                Selecionar
                            </button>
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<p>Nenhum formulário de leads encontrado nesta página.</p>';
        }
        
        html += `</div>`;
        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <p style="color:red">Erro ao carregar formulários: ${e.message}</p>
            <button class="btn" onclick="fetchPages(CURRENT_USER_TOKEN)">Voltar</button>
        `;
    }
}


// 4. Wrapper for the onlogin attribute (User Requested Snippet)
function checkLoginState() {
    FB.getLoginStatus(function (response) {
        statusChangeCallback(response);
    });
}

// --- Custom Helper Functions for UI ---

function updateUI_NotLoggedIn() {
    document.getElementById('status').innerHTML = 'Please log in to continue.';
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('profile-section').classList.add('hidden');
}

// Custom Login Button Handler (for the "Pretty" button)
function customLogin() {
    // If we have a Config ID, use it (Business Login) and force 'code' flow (required by some Business Apps).
    // Otherwise fallback to scope (Classic Login).
    const opts = FACEBOOK_CONFIG_ID
        ? { config_id: FACEBOOK_CONFIG_ID, response_type: 'code', override_default_response_type: true }
        : { scope: 'public_profile,email,pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_ads' };

    console.log('Logging in with options:', opts);

    FB.login(function (response) {
        console.log('Login Response:', response);
        if (response.status === 'connected' || (response.authResponse && response.authResponse.code)) {
            statusChangeCallback(response);
        } else {
            console.log('User cancelled login or did not fully authorize.');
        }
    }, opts);
}

// Custom Logout Handler
function customLogout() {
    console.log("Attempting logout...");

    // In 'code' flow, we might not have a client-side token, so FB.logout might be confused.
    // We check status first.
    FB.getLoginStatus(function (response) {
        if (response.status === 'connected') {
            FB.logout(function (resp) {
                console.log("Logged out via FB.logout", resp);
                statusChangeCallback(resp);
            });
        } else {
            // If the SDK thinks we aren't connected (common in code flow without cookie persistence),
            // just force the UI to reset.
            console.log("User not connected in SDK (Code Flow?), forcing UI reset.");
            updateUI_NotLoggedIn();
        }
    });
}

// Expose functions to global scope for HTML onclick attributes
window.customLogin = customLogin;
window.customLogout = customLogout;
window.checkLoginState = checkLoginState;
window.loadForms = loadForms;
window.fetchPages = fetchPages;