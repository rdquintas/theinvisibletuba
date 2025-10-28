document.addEventListener(
  "play",
  function (e) {
    var audios = document.getElementsByTagName("audio");
    for (var i = 0, len = audios.length; i < len; i++) {
      if (audios[i] != e.target) {
        audios[i].pause();
      }
    }
  },
  true
);

function closeCookies() {
  window.nk_hideCookieBanner();
  gtag('consent', 'update', {
    'ad_user_data': 'granted',
    'ad_personalization': 'granted',
    'ad_storage': 'granted',
    'analytics_storage': 'granted'
  });
}


$(document).ready(function () {
  $(".zrq-focus-input").click(function (oEvent) {
    setTimeout(function () {
      $("#footer-email")[0].focus();
    }, 200);
  });

  $(".youtube-link").grtyoutube();
});


