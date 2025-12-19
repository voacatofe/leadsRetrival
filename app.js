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
function statusChangeCallback(response) {
    console.log('statusChangeCallback');
    console.log(response);

    if (response.status === 'connected') {
        // Logged into your app and Facebook (Classic Flow with Token)
        testAPI();
    } else if (response.authResponse && response.authResponse.code) {
        // Business Flow returning Code (No Token available for Client-side API)
        // We cannot call FB.api('/me') without a token.
        console.log('Received Auth Code:', response.authResponse.code);

        const profileContent = `
            <div class="user-info">
                <h3>Login Successful (Code Flow)</h3>
                <p style="color: #ccc; font-size: 0.9em; margin-top: 10px;">
                    Code received! <br>
                    <span style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 4px;">
                        ${response.authResponse.code.substring(0, 20)}...
                    </span>
                </p>
                <div style="margin-top: 15px; font-size: 0.8em; opacity: 0.8; background: #333; padding: 10px; border-radius: 8px;">
                    <strong>Note:</strong> Your app requires a Backend to exchange this code for an Access Token. 
                    Client-side API calls are disabled in this mode.
                </div>
            </div>
        `;
        document.getElementById('status').innerHTML = profileContent;
        // Adjust UI
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('profile-section').classList.remove('hidden');

    } else {
        // Not logged into your app or we are unable to tell.
        updateUI_NotLoggedIn();
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
