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

function closeCookies() {
  window.nk_hideCookieBanner();
  gtag("consent", "update", {
    ad_user_data: "granted",
    ad_personalization: "granted",
    ad_storage: "granted",
    analytics_storage: "granted",
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

// partilha no instagram (página do evento): o instagram não tem link de partilha,
// por isso usa a partilha nativa do telemóvel com a imagem og (o instagram aparece na lista);
// sem partilha nativa (computador) copia o link e mostra uma mensagem
function shareInstagram(e) {
  e.preventDefault();
  const a = e.currentTarget;
  const d = a.dataset;
  const msg = document.querySelector(".zrq-event__share-msg");

  function copyLink() {
    if (!navigator.clipboard) return window.prompt("", d.url);
    navigator.clipboard.writeText(d.url).then(function () {
      if (!msg) return;
      msg.textContent = d.copied;
      msg.hidden = false;
      setTimeout(function () {
        msg.hidden = true;
      }, 5000);
    });
  }

  if (!navigator.share) return copyLink();

  fetch(d.image)
    .then(function (r) {
      return r.blob();
    })
    .then(function (blob) {
      const file = new File([blob], d.image.split("/").pop(), { type: "image/jpeg" });
      const data = { files: [file], title: d.title };
      return navigator.canShare && navigator.canShare(data) ? navigator.share(data) : navigator.share({ title: d.title, url: d.url });
    })
    .catch(function (err) {
      // cancelado pelo utilizador: não faz nada
      if (err && err.name === "AbortError") return;
      copyLink();
    });
}

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".zrq-share-ig").forEach(function (a) {
    a.addEventListener("click", shareInstagram);
  });
});
