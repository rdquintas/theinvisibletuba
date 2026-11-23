/*
* Javascript to show and hide cookie banner using localstroage
*/

/**
 * Shows the Cookie banner 
 */
function showCookieBanner(){
    let cookieBanner = document.getElementsByClassName("nk-cookie-banner")[0];
    cookieBanner.style.display = "block";
}

/**
 * Hides the Cookie banner and saves the value to localstorage
 */
function hideCookieBanner(){
    localStorage.setItem("web_dev_isCookieAccepted", "yes");

    // Aceitar: dá o consentimento ao Google Analytics (por defeito está "denied")
    if (typeof gtag === "function") {
        gtag("consent", "update", {
            ad_user_data: "granted",
            ad_personalization: "granted",
            ad_storage: "granted",
            analytics_storage: "granted",
        });
    }
    // só agora descarrega o gtag.js (carregarGA está no <head> de cada página)
    if (typeof carregarGA === "function") {
        carregarGA();
    }

    let cookieBanner = document.getElementsByClassName("nk-cookie-banner")[0];
    cookieBanner.style.display = "none";
}

/**
 * Recusar: esconde o banner e guarda "rejected" (o consentimento do Google
 * Analytics fica "denied", como está por defeito no _head.html)
 */
function rejectCookieBanner(){
    localStorage.setItem("web_dev_isCookieAccepted", "rejected");

    let cookieBanner = document.getElementsByClassName("nk-cookie-banner")[0];
    cookieBanner.style.display = "none";
}

/**
 * Checks the localstorage and shows Cookie banner based on it.
 */
function initializeCookieBanner(){
    let isCookieAccepted = localStorage.getItem("web_dev_isCookieAccepted");
    if(isCookieAccepted === null)
    {
        localStorage.clear();
        localStorage.setItem("web_dev_isCookieAccepted", "no");
        showCookieBanner();
    }
    if(isCookieAccepted === "no"){
        showCookieBanner();
    }
}

// Assigning values to window object
window.onload = initializeCookieBanner();
window.nk_hideCookieBanner = hideCookieBanner;
window.nk_rejectCookieBanner = rejectCookieBanner;
