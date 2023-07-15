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

$(document).ready(function () {
  $(".zrq-focus-input").click(function (oEvent) {
    setTimeout(function () {
      $("#footer-email")[0].focus();
    }, 200);
  });

  $(".youtube-link").grtyoutube();
});
