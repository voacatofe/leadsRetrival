/**
 * Facebook Login Logic
 * Contains the snippets requested by the user and additional logic to handle UI.
 */

// Accessing the ID from Runtime (Docker) OR Build Time (Vite)
// Priority: window.env (Production/Docker) > import.meta.env (Local Dev)
const FACEBOOK_APP_ID = (window.env && window.env.VITE_FACEBOOK_APP_ID) || import.meta.env.VITE_FACEBOOK_APP_ID;
// Accessing the Config ID (Required for Business Apps)
const FACEBOOK_CONFIG_ID = (window.env && window.env.VITE_FACEBOOK_CONFIG_ID) || import.meta.env.VITE_FACEBOOK_CONFIG_ID;


if (!FACEBOOK_APP_ID || FACEBOOK_APP_ID === 'YOUR_APP_ID_HERE') {
    console.error("⚠️ FACEBOOK_APP_ID is missing! Check your .env file.");
    alert("⚠️ Please set your VITE_FACEBOOK_APP_ID in the .env file!");
}

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
        const configAttr = FACEBOOK_CONFIG_ID ? `config_id="${FACEBOOK_CONFIG_ID}"` : 'scope="public_profile"';
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

    if (response.status === 'connected') {
        // Classic Token Flow (should not happen with config_id)
        testAPI();
    } else if (response.authResponse && response.authResponse.code) {
        // Code Flow - Exchange Code for Token via Backend
        const code = response.authResponse.code;
        console.log('Code received. Exchanging for token...');

        document.getElementById('status').innerHTML = 'Authenticating with backend...';
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('profile-section').classList.remove('hidden');

        try {
            // Exchange Code
            const res = await fetch('/api/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Success! We have the token in the backend/response.
            const user = data.user;
            const accessToken = data.access_token;

            // Show User Profile
            renderProfile(user);

            // Fetch Pages automatically
            fetchPages(accessToken);

        } catch (error) {
            console.error(error);
            document.getElementById('status').innerHTML = `<p style="color:red">Error: ${error.message}</p> <button class="btn btn-logout" onclick="customLogout()">Try Again</button>`;
        }
    } else {
        updateUI_NotLoggedIn();
    }
}

function renderProfile(user) {
    const profileContent = `
        <div class="user-info">
            <img src="${user.picture?.data?.url}" alt="${user.name}">
            <h3>${user.name}</h3>
            <p>ID: ${user.id}</p>
        </div>
        <div id="pages-container" style="margin-top: 20px; text-align: left;">
            <h4>Loading Pages...</h4>
        </div>
    `;
    document.getElementById('status').innerHTML = profileContent;
}

async function fetchPages(accessToken) {
    try {
        const res = await fetch(`/api/pages?access_token=${accessToken}`);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            let html = `<h4>Select a Page:</h4><div class="pages-list">`;
            data.data.forEach(page => {
                html += `
                    <div class="page-item" onclick="fetchLeads('${page.access_token}', '${page.id}', '${page.name}')">
                        <strong>${page.name}</strong><br>
                        <small>${page.category}</small>
                    </div>
                `;
            });
            html += '</div>';
            document.getElementById('pages-container').innerHTML = html;
        } else {
            document.getElementById('pages-container').innerHTML = '<p>No pages found. (Check permissions)</p>';
        }
    } catch (e) {
        document.getElementById('pages-container').innerHTML = `<p style="color:red">Failed to load pages: ${e.message}</p>`;
    }
}

async function fetchLeads(pageToken, pageId, pageName) {
    document.getElementById('pages-container').innerHTML = `<h4>Loading forms for ${pageName}...</h4>`;

    try {
        const res = await fetch(`/api/leads?page_token=${pageToken}&page_id=${pageId}`);
        const data = await res.json();

        // This endpoint returns LeadGen Forms
        let html = `<h4>Lead Forms - ${pageName}</h4>`;
        html += `<button class="btn" style="padding:5px 10px; font-size:0.8rem; margin-bottom:10px" onclick="location.reload()">Back</button>`;

        if (data.data && data.data.length > 0) {
            data.data.forEach(form => {
                html += `
                    <div class="page-item" style="cursor: default;">
                        <strong>${form.name}</strong> (${form.status})<br>
                        <small>Leads Count: ${form.leads_count || 0}</small><br>
                        <small>ID: ${form.id}</small>
                    </div>
                `;
            });
        } else {
            html += '<p>No lead forms found.</p>';
        }

        document.getElementById('pages-container').innerHTML = html;

    } catch (e) {
        alert("Error fetching leads: " + e.message);
    }
}


// 4. Wrapper for the onlogin attribute (User Requested Snippet)
function checkLoginState() {
    FB.getLoginStatus(function (response) {
        statusChangeCallback(response);
    });
}

// --- Custom Helper Functions for UI ---

function testAPI() {
    console.log('Welcome!  Fetching your information.... ');
    // Hide login button, show user info
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('profile-section').classList.remove('hidden');

    FB.api('/me', { fields: 'name, picture.width(150).height(150)' }, function (response) {
        console.log('Successful login for: ' + response.name);

        const profileContent = `
            <div class="user-info">
                <img src="${response.picture.data.url}" alt="${response.name}">
                <h3>${response.name}</h3>
                <div style="margin-top: 10px; font-size: 0.7em; word-break: break-all; opacity: 0.6;">
                    ID: ${response.id}
                </div>
            </div>
        `;
        document.getElementById('status').innerHTML = profileContent;
    });
}

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
        : { scope: 'public_profile' };

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
window.fetchLeads = fetchLeads;
