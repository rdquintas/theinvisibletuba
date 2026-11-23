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
  true,
);

// aceitar cookies (o consentimento do Google Analytics é dado no cookie-banner.js)
function closeCookies() {
  window.nk_hideCookieBanner();
}

$(document).ready(function () {
  $(".zrq-focus-input").click(function (oEvent) {
    setTimeout(function () {
      $("#footer-email")[0].focus();
    }, 200);
  });

  $(".youtube-link").grtyoutube();

  // vídeo do YouTube: troca a miniatura pelo player só quando se clica
  $(".zrq-yt-lite").one("click", function () {
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + this.dataset.id + "?autoplay=1";
    iframe.title = "YouTube video player";
    iframe.width = 315;
    iframe.height = 560;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    $(this).replaceWith(iframe);
  });
});

// esconde concertos cuja data (data-date="yyyymmdd") já passou;
// '??' no dia só esconde quando o mês inteiro já passou
function hidePastConcerts() {
  const n = new Date();
  const today =
    String(n.getFullYear()) + String(n.getMonth() + 1).padStart(2, "0") + String(n.getDate()).padStart(2, "0");
  const items = document.querySelectorAll(".tit-show[data-date]");
  let visible = 0;
  items.forEach(function (li) {
    const past = li.dataset.date.replace("??", "99") < today;
    li.hidden = past;
    if (!past) visible++;
  });
  const empty = document.querySelector(".tit-shows__empty");
  if (empty && items.length) empty.hidden = visible > 0;
}

document.addEventListener("DOMContentLoaded", hidePastConcerts);
