// Fallback para browsers sem suporte AVIF (ex: Safari/iOS < 16): troca *.avif por *.webp.
// As cópias .webp são geradas no build (tarefa "webp" do Gruntfile) ao lado de cada .avif.
// Tem de ser carregado no <head>, antes das imagens, e sem async/defer.
(function () {
  var RE = /\.avif\b/gi;
  function webp(s) {
    return s.replace(RE, ".webp");
  }
  function hasAvif(s) {
    RE.lastIndex = 0;
    return !!s && RE.test(s);
  }

  // <img>: quando um .avif não abre, tenta o .webp (também apanha as imagens criadas por JS, ex: loja).
  // Corre na fase de captura, antes do onerror da própria imagem, que só é chamado se o .webp também falhar.
  document.addEventListener(
    "error",
    function (e) {
      var img = e.target;
      if (!img || img.tagName !== "IMG" || !hasAvif(img.getAttribute("src") || img.srcset)) return;
      e.stopImmediatePropagation();
      if (img.srcset) img.srcset = webp(img.srcset);
      img.src = webp(img.getAttribute("src") || "");
    },
    true
  );

  // background-image (style="" e ficheiros CSS) não dá erro: testa uma AVIF 1x1 e, se falhar, reescreve-os
  var test = new Image();
  test.onerror = semAvif;
  test.src =
    "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAD6AAEAAAAAAAAAFwAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAfbWRhdBIACgc4AAYQENBpMgoYAAAAQAX172To";

  function fixStyle(el) {
    var s = el.getAttribute && el.getAttribute("style");
    if (hasAvif(s)) el.setAttribute("style", webp(s));
  }

  function fixTree(root) {
    if (!root.querySelectorAll) return;
    fixStyle(root);
    var els = root.querySelectorAll('[style*=".avif"]');
    for (var i = 0; i < els.length; i++) fixStyle(els[i]);
  }

  function fixRules(rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.cssRules) fixRules(r.cssRules); // @media
      if (r.style && hasAvif(r.style.backgroundImage)) {
        r.style.setProperty("background-image", webp(r.style.backgroundImage), r.style.getPropertyPriority("background-image"));
      }
    }
  }

  function fixSheets() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      try {
        fixRules(document.styleSheets[i].cssRules || []);
      } catch (e) {} // CSS de outros domínios não se pode ler
    }
  }

  function fixAll() {
    fixTree(document.documentElement);
    fixSheets();
  }

  function semAvif() {
    document.documentElement.className += " no-avif";
    fixAll();
    document.addEventListener("DOMContentLoaded", fixAll);
    window.addEventListener("load", fixAll);
    // backgrounds postos depois por JS (ex: slider revolution, que usa a imagem do <img> como fundo)
    if (window.MutationObserver) {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var m = list[i];
          if (m.type === "attributes") fixStyle(m.target);
          else for (var j = 0; j < m.addedNodes.length; j++) fixTree(m.addedNodes[j]);
        }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["style"], childList: true, subtree: true });
    }
  }
})();
