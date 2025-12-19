/**
 * Facebook Login Logic
 * Contains the snippets requested by the user and additional logic to handle UI.
 */

// Accessing the ID from Runtime (Docker) OR Build Time (Vite)
// Priority: window.env (Production/Docker) > import.meta.env (Local Dev)
const FACEBOOK_APP_ID = (window.env && window.env.VITE_FACEBOOK_APP_ID) || import.meta.env.VITE_FACEBOOK_APP_ID;

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
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    if (response.status === 'connected') {
        // Logged into your app and Facebook.
        testAPI();
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
    FB.login(function (response) {
        if (response.status === 'connected') {
            statusChangeCallback(response);
        } else {
            console.log('User cancelled login or did not fully authorize.');
        }
    }, { scope: 'public_profile' });
}

// Custom Logout Handler
function customLogout() {
    FB.logout(function (response) {
        // Person is now logged out
        statusChangeCallback(response);
    });
}

// Expose functions to global scope for HTML onclick attributes
window.customLogin = customLogin;
window.customLogout = customLogout;
window.checkLoginState = checkLoginState;
