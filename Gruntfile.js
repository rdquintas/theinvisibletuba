// Abreviaturas dos meses mostradas no site
const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Pasta onde ficam as páginas dos concertos: concerts/<id>/ e concerts/<id>-en/
const CONCERTS_DIR = "concerts";

// Imagens de partilha (og), sempre em jpg e sem logo nem texto: <id>.jpg por evento (cópia da imagem_v_1440x1800)
// e default.jpg para as restantes páginas (cópia da default_imagem_v_1440x1800 do config.yaml)
const OG_DIR = "assets/img/og";
// tamanho máximo das cópias jpg (as maiores são reduzidas, para a partilha ser leve)
const OG_MAX_W = 1080;
const OG_MAX_H = 1920;
const OG_DEFAULT = "default";

// Página de erro "não encontrado" (o servidor tem de a usar: ErrorDocument 404 no .htaccess)
const PAGE_404 = "404.html";

// Redes sociais da banda (dados estruturados / JSON-LD, "sameAs")
const SOCIAL_LINKS = [
  "https://www.instagram.com/theinvisibletuba/",
  "https://open.spotify.com/artist/2CqJyOnOEm6hm7QGs2llZ2",
  "https://www.tiktok.com/@theinvisibletuba",
  "https://www.youtube.com/@theinvisibletuba4630",
  "https://www.facebook.com/theinvisibletuba/",
];

// Imagens novas (jpg, png, ...) postas nas pastas de imagens são convertidas para .avif no build;
// o original passa para ORIGINAIS_DIR (no .gitignore, não vai para o servidor).
// As og (geradas em jpg para as redes sociais) e o logo em png ficam como estão.
const AVIF_SRC = [
  "assets/img/**/*.{jpg,jpeg,png,gif,tif,tiff,JPG,JPEG,PNG,GIF,TIF,TIFF}",
  "forms/assets/img/**/*.{jpg,jpeg,png,gif,tif,tiff,JPG,JPEG,PNG,GIF,TIF,TIFF}",
  "!assets/img/og/**",
  "!assets/img/logo_transp_v00.png",
];
const AVIF_QUALITY = 60;
const AVIF_MAX = 2560; // lado maior, em px (as fotos maiores são reduzidas)
const ORIGINAIS_DIR = "_originais";

// Cópias .webp das imagens .avif, para browsers sem AVIF (ver assets/scripts/avif-fallback.js)
const WEBP_SRC = ["assets/img/**/*.avif", "forms/assets/img/**/*.avif"];
const WEBP_QUALITY = 80;

// Hoje no formato yyyymmdd
function todayYmd() {
  const n = new Date();
  return String(n.getFullYear()) + String(n.getMonth() + 1).padStart(2, "0") + String(n.getDate()).padStart(2, "0");
}

// caminho de imagem do yaml -> "/assets/img/x.avif" (aceita com ou sem "/" inicial)
function imagePath(p) {
  p = String(p || "").trim();
  if (!p || /^https?:\/\//.test(p)) return p;
  return "/" + p.replace(/^\/+/, "");
}

// Fotos dos concertos: no yaml podem ser .jpg, .png, .webp, ... mas a página usa sempre o .avif
// com o mesmo nome (criado no build pela tarefa avif, o .webp pela tarefa webp)
const CONCERT_IMG_EXT = /\.(jpe?g|png|gif|tiff?|webp)$/i;
function avifPath(p) {
  return /^https?:\/\//.test(p) ? p : p.replace(CONCERT_IMG_EXT, ".avif");
}

// corta um texto para a descrição de partilha, sem partir palavras
function shortText(text, max) {
  text = String(text || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, text.lastIndexOf(" ", max - 1)).replace(/[\s,.;:–-]+$/, "") + "…";
}

// Cada concerto tem "data: 'yyyymmdd'" (dia desconhecido: '202610??').
// Gera day / month / month_en para os templates, marca isPast (data já passou
// no momento da compilação), valida o id (usado no link) e resolve as imagens do hero e ordena por data ascendente.
function prepareConcerts(data, config, grunt) {
  const today = todayYmd();
  const ids = {};
  const concerts = (data.concerts || []).map((c) => {
    const d = String(c.data || "");
    const m = /^(\d{4})(\d{2})(\d{2}|\?\?)$/.exec(d);
    if (!m || +m[2] < 1 || +m[2] > 12) {
      grunt.fail.warn(`concertos.yaml: "${c.id}" tem data inválida "${d}" (formato yyyymmdd)`);
      return c;
    }
    // o id é o link da página do concerto: só minúsculas, números e '-'
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(c.id || ""))) {
      grunt.fail.warn(`concertos.yaml: id inválido "${c.id}" (só letras minúsculas, números e '-')`);
    }
    if (ids[c.id]) grunt.fail.warn(`concertos.yaml: id "${c.id}" repetido`);
    ids[c.id] = true;
    return Object.assign({}, c, {
      day: m[3] === "??" ? "??" : String(+m[3]),
      month: MONTHS_PT[+m[2] - 1],
      month_en: MONTHS_EN[+m[2] - 1],
      // '??' só conta como passado quando o mês inteiro já passou
      isPast: d.replace("??", "99") < today,
      imagem_h: avifPath(imagePath(c.imagem_h) || imagePath(config.default_imagem_h)),
      imagem_v_1440x1800: avifPath(imagePath(c.imagem_v_1440x1800) || imagePath(config.default_imagem_v_1440x1800)),
    });
  });
  // '??' fica depois de qualquer dia do mesmo mês ('?' > '9' em ASCII)
  concerts.sort((a, b) => (String(a.data) < String(b.data) ? -1 : String(a.data) > String(b.data) ? 1 : 0));
  data.concerts = concerts;
  return data;
}

// Largura / altura de um .jpg, lidas do marcador SOF do ficheiro (null se não der)
function jpgSize(file) {
  const fs = require("fs");
  if (!fs.existsSync(file)) return null;
  const b = fs.readFileSync(file);
  let i = 2;
  while (i + 9 < b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    // SOF0..SOF15, exceto DHT (c4), JPG (c8) e DAC (cc)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

// Largura / altura de um .avif, lidas da caixa "ispe" do ficheiro (null se não der)
function avifSize(file) {
  const fs = require("fs");
  if (!/\.avif$/i.test(file) || !fs.existsSync(file)) return null;
  const b = fs.readFileSync(file);
  const i = b.indexOf("ispe");
  if (i < 0 || i + 16 > b.length) return null;
  return { width: b.readUInt32BE(i + 8), height: b.readUInt32BE(i + 12) };
}

// Imagem de partilha de um evento: assets/img/og/<id>.jpg, cópia da imagem_v_1440x1800 em jpg
// (sem texto nem logo), gerada pela tarefa og. As redes sociais não mostram .avif.
function ogEventImage(c, site, grunt) {
  const file = `${OG_DIR}/${c.id}.jpg`;
  const size = jpgSize(file);
  if (!size) grunt.log.warn(`og: "${file}" do evento "${c.id}" não existe (corre "npx grunt og")`);
  return Object.assign({ url: `${site}/${file}`, type: "image/jpeg" }, size);
}

// Dados extra de uma página de evento (app/event.html), por língua
function eventContext(c, lang, data, grunt) {
  const en = lang === "en";
  const site = String(data.site_url || "").replace(/\/+$/, "");
  const urlPt = `/${CONCERTS_DIR}/${c.id}/`;
  const urlEn = `/${CONCERTS_DIR}/${c.id}-en/`;
  const url = en ? urlEn : urlPt;
  const month = en ? c.month_en : c.month;
  const when = (c.day === "??" ? month : `${c.day} ${month}`) + (c.time ? ` · ${c.time}` : "");
  const where = c.location || "";
  const info = en ? c.info_en : c.info;
  const intro = en ? `The Invisible Tuba live: ${when}` : `The Invisible Tuba ao vivo: ${when}`;
  const description = [intro + (where ? `, ${where}` : "") + ".", shortText(info, 180)].filter(Boolean).join(" ");
  const title = `${c.name} | The Invisible Tuba`;
  // descrição da partilha: "24 OUT 22:00", o nome do evento por baixo e os primeiros 200 caracteres do info + "..."
  const infoText = String(info || "").replace(/\s+/g, " ").trim();
  const shareInfo = infoText.length > 200 ? infoText.slice(0, 200).trimEnd() + "..." : infoText;
  const shareDescription = [(c.day === "??" ? month : `${c.day} ${month}`) + (c.time ? ` ${c.time}` : ""), c.name, shareInfo].filter(Boolean).join("\n");
  const img = ogEventImage(c, site, grunt);
  const ogImage = img.url;
  // proporção da imagem_v_1440x1800 ("900 / 1600"): no telemóvel o hero ocupa a largura toda com essa proporção
  const heroV = avifSize(c.imagem_v_1440x1800.replace(/^\/+/, ""));
  return {
    root: "/",
    lang: lang,
    event: c,
    hero_v_ratio: heroV ? `${heroV.width} / ${heroV.height}` : null,
    page_title: title,
    page_description: description,
    alt_lang_url: en ? urlPt : urlEn,
    share_url: site + url,
    og: {
      url: site + url,
      alt_url: site + (en ? urlPt : urlEn),
      lang: en ? "en" : "pt",
      alt_lang: en ? "pt" : "en",
      locale: en ? "en_GB" : "pt_PT",
      title: title,
      description: shareDescription,
      image: ogImage,
      image_type: img.type,
      image_width: img.width,
      image_height: img.height,
    },
    jsonld: eventJsonLd(c, lang, site, site + url, description, ogImage),
  };
}

// Converte um objeto em JSON para pôr num <script type="application/ld+json">
// ("<" escapado para o texto nunca fechar a tag </script>)
function jsonLd(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
}

// Diferença horária de Lisboa nessa data, no formato "+01:00" (hora de verão) / "+00:00"
function lisbonOffset(y, m, d) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Lisbon", timeZoneName: "longOffset" })
    .formatToParts(new Date(Date.UTC(y, m - 1, d, 12)))
    .find((p) => p.type === "timeZoneName").value; // "GMT+01:00" ou "GMT"
  return name === "GMT" ? "+00:00" : name.replace("GMT", "");
}

// Dados estruturados (schema.org MusicEvent) para o Google mostrar o concerto nos resultados.
// Só para concertos com o dia definido (o Google exige a data de início).
function eventJsonLd(c, lang, site, pageUrl, description, ogImage) {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(c.data || ""));
  if (!m) return null;
  let startDate = `${m[1]}-${m[2]}-${m[3]}`;
  const t = /^(\d{1,2})[:h](\d{2})$/.exec(String(c.time || "").trim());
  if (t) startDate += `T${t[1].padStart(2, "0")}:${t[2]}:00${lisbonOffset(+m[1], +m[2], +m[3])}`;
  const hero = /^https?:\/\//.test(c.imagem_h) ? c.imagem_h : site + c.imagem_h;
  const free = !c.ticketsLink || c.ticketsLink === "#";
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: c.name,
    description: description,
    url: pageUrl,
    inLanguage: lang === "en" ? "en" : "pt",
    image: [ogImage, hero],
    startDate: startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: c.location || c.address || "",
      address: {
        "@type": "PostalAddress",
        streetAddress: c.address || undefined,
        addressLocality: c.location || undefined,
        addressCountry: "PT",
      },
    },
    performer: { "@type": "MusicGroup", name: "The Invisible Tuba", url: site + "/" },
    isAccessibleForFree: free,
    offers: {
      "@type": "Offer",
      url: free ? pageUrl : c.ticketsLink,
      price: free ? 0 : undefined,
      priceCurrency: free ? "EUR" : undefined,
      availability: "https://schema.org/InStock",
    },
  });
}

// Dados estruturados da banda (schema.org MusicGroup), na página inicial
function bandJsonLd(site, data, en) {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "The Invisible Tuba",
    url: site + "/" + (en ? "index_en.html" : ""),
    logo: `${site}/assets/img/logo_transp_v00.png`,
    image: `${site}/${OG_DIR}/${OG_DEFAULT}.jpg`,
    description: en ? "The most entertaining band from Lisbon." : "A banda mais divertida de Lisboa.",
    genre: ["Swing", "Jazz", "New Orleans Jazz"],
    foundingLocation: { "@type": "Place", name: "Lisboa, Portugal" },
    email: data.email || undefined,
    sameAs: SOCIAL_LINKS,
  });
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]);
}

// imagem og de um evento: a imagem_v_1440x1800 convertida para jpg, sem mais nada
// (imagens externas (http) não são descarregadas: usa a imagem vertical por defeito)
async function renderEventOg(sharp, grunt, c, fallbackImage) {
  let src = (/^https?:\/\//.test(c.imagem_v_1440x1800) ? fallbackImage : c.imagem_v_1440x1800).replace(/^\/+/, "");
  if (!grunt.file.exists(src)) {
    grunt.log.warn(`og: imagem "${src}" do evento "${c.id}" não existe, a usar a imagem por defeito`);
    src = fallbackImage.replace(/^\/+/, "");
  }
  return renderOgJpg(sharp, src, `${OG_DIR}/${c.id}.jpg`);
}

// imagem og das páginas que não são eventos: a default_imagem_v_1440x1800 convertida para jpg, sem mais nada
function renderDefaultOg(sharp, image) {
  return renderOgJpg(sharp, image.replace(/^\/+/, ""), `${OG_DIR}/${OG_DEFAULT}.jpg`);
}

// cópia em jpg de uma imagem (reduzida a OG_MAX_W x OG_MAX_H, sem cortes)
async function renderOgJpg(sharp, src, out) {
  await sharp(src)
    .resize({ width: OG_MAX_W, height: OG_MAX_H, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#000000" }) // jpg não tem transparência
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  return out;
}

// Dados de partilha (og) das páginas normais: "contact.html" <-> "contact_en.html"
function pageContext(dest, data) {
  const site = String(data.site_url || "").replace(/\/+$/, "");
  const en = /_en\.html$/.test(dest);
  // a página 404 é mostrada em qualquer endereço: sem canonical / og
  if (dest === PAGE_404) return { page_description: "The Invisible Tuba" };
  const pageUrl = (f) => site + "/" + (f === "index.html" ? "" : f);
  const alt = en ? dest.replace(/_en\.html$/, ".html") : dest.replace(/\.html$/, "_en.html");
  const description = en ? "The most entertaining band from Lisbon." : "A banda mais divertida de Lisboa.";
  const size = jpgSize(`${OG_DIR}/${OG_DEFAULT}.jpg`) || {};
  return {
    page_description: description,
    og: {
      url: pageUrl(dest),
      alt_url: pageUrl(alt),
      lang: en ? "en" : "pt",
      alt_lang: en ? "pt" : "en",
      locale: en ? "en_GB" : "pt_PT",
      title: "The Invisible Tuba",
      description: description,
      image: `${site}/${OG_DIR}/${OG_DEFAULT}.jpg`,
      image_type: "image/jpeg",
      image_width: size.width,
      image_height: size.height,
    },
    jsonld: /^index(_en)?\.html$/.test(dest) ? bandJsonLd(site, data, en) : null,
  };
}

// Escreve o sitemap.xml: todas as páginas (PT e EN, ligadas com hreflang) e os concertos ativos.
// Fora: a 404 e a loja enquanto loja_ativa for false.
function writeSitemap(grunt, data, pageFiles, events) {
  const site = String(data.site_url || "").replace(/\/+$/, "");
  const pageUrl = (f) => site + "/" + (f === "index.html" ? "" : f);
  const pairs = [];
  Object.keys(pageFiles)
    .filter((f) => !/_en\.html$/.test(f) && f !== PAGE_404)
    .filter((f) => data.loja_ativa || !/^shop/.test(f))
    .forEach((f) => pairs.push([pageUrl(f), pageUrl(f.replace(/\.html$/, "_en.html"))]));
  events.forEach((c) => pairs.push([`${site}/${CONCERTS_DIR}/${c.id}/`, `${site}/${CONCERTS_DIR}/${c.id}-en/`]));
  const entry = (loc, pt, en) =>
    `  <url>\n    <loc>${escapeXml(loc)}</loc>\n` +
    `    <xhtml:link rel="alternate" hreflang="pt" href="${escapeXml(pt)}"/>\n` +
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}"/>\n` +
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(pt)}"/>\n  </url>`;
  const urls = [];
  pairs.forEach(([pt, en]) => urls.push(entry(pt, pt, en), entry(en, pt, en)));
  grunt.file.write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      urls.join("\n") +
      `\n</urlset>\n`
  );
  return urls.length;
}

module.exports = function (grunt) {
  const config = grunt.file.readYAML("app/dados/config.yaml");
  const concertosYaml = grunt.file.readYAML("app/dados/concertos.yaml");
  // Fotos dos concertos tal como estão no yaml (sem "/" inicial; só as locais), para as tarefas avif e webp
  const concertImages = (concertosYaml.concerts || [])
    .reduce((list, c) => list.concat(c.imagem_h, c.imagem_v_1440x1800), [config.default_imagem_h, config.default_imagem_v_1440x1800])
    .map((p) => imagePath(p).replace(/^\/+/, ""))
    .filter((p, i, list) => p && !/^https?:\/\//.test(p) && list.indexOf(p) === i);
  const data = Object.assign(
    {},
    config,
    prepareConcerts(concertosYaml, config, grunt),
    grunt.file.readYAML("app/dados/artigos_loja.yaml")
  );

  // Uma página por evento ativo: concerts/<id>/index.html (PT) e concerts/<id>-en/index.html (EN)
  const events = data.concerts.filter((c) => c.isEnabled);
  const eventPages = {};
  const eventFiles = {};
  events.forEach((c) => {
    eventPages[`${CONCERTS_DIR}/${c.id}/index.html`] = { concert: c, lang: "pt" };
    eventPages[`${CONCERTS_DIR}/${c.id}-en/index.html`] = { concert: c, lang: "en" };
  });
  Object.keys(eventPages).forEach((dest) => (eventFiles[dest] = "app/event.html"));

  // Páginas normais (destino: origem)
  const pageFiles = {
    "index.html": "app/index.html",
    "index_en.html": "app/index_en.html",
    "pictures.html": "app/pictures.html",
    "pictures_en.html": "app/pictures_en.html",
    "audio.html": "app/audio.html",
    "audio_en.html": "app/audio_en.html",
    "contact.html": "app/contact.html",
    "contact_en.html": "app/contact_en.html",
    "mediakit.html": "app/mediakit.html",
    "mediakit_en.html": "app/mediakit_en.html",
    "shop.html": "app/shop.html",
    "shop_en.html": "app/shop_en.html",
    "privacy.html": "app/privacy.html",
    "privacy_en.html": "app/privacy_en.html",
    [PAGE_404]: "app/404.html",
  };

  // Project configuration.
  grunt.initConfig({
    nunjucks: {
      options: {
        // Dados dos ficheiros YAML
        data: data,
        // Nas páginas de evento junta os dados desse evento (this = ficheiro a gerar)
        preprocessData: function (d) {
          const page = eventPages[this.dest];
          return Object.assign(d, page ? eventContext(page.concert, page.lang, d, grunt) : pageContext(this.dest, d));
        },
        // Aponta para a pasta onde estão os ficheiros HTML e os parciais
        paths: ["app"],
        // nl2br: troca as quebras de linha (\n no yaml) por <br> (não existe no nunjucks 2)
        configureEnvironment: function (env, nunjucks) {
          // v('assets/css/zrq.css'): hash do conteúdo, para usar em "?v=" nos links de css/js
          // (o browser volta a descarregar o ficheiro quando ele muda, em vez de usar o da cache)
          env.addGlobal("v", function (file) {
            return require("crypto").createHash("md5").update(grunt.file.read(file)).digest("hex").slice(0, 8);
          });
          env.addFilter("nl2br", function (str) {
            if (str == null) return "";
            const escaped = nunjucks.lib.escape(String(str));
            return new nunjucks.runtime.SafeString(escaped.replace(/\r\n|\n/g, "<br>\n"));
          });
          // linkify: transforma urls (http://, https://, www.), emails e @utilizador (instagram) em links
          env.addFilter("linkify", function (str) {
            if (str == null) return "";
            const html = str instanceof nunjucks.runtime.SafeString ? String(str) : nunjucks.lib.escape(String(str));
            const re = /\b(?:https?:\/\/|www\.)[^\s<]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?<![\w.+\/@-])@[A-Za-z0-9_.]+/g;
            return new nunjucks.runtime.SafeString(
              html.replace(re, function (match) {
                // Pontuação no fim (ex: "ver www.site.pt.") não faz parte do link
                const trail = match.match(/(?:[.,;:!?)\]]|&quot;|&#39;)+$/);
                const url = trail ? match.slice(0, -trail[0].length) : match;
                const rest = trail ? trail[0] : "";
                let href = url;
                let attrs = ' target="_blank" rel="noopener"';
                if (url.charAt(0) === "@") {
                  href = "https://www.instagram.com/" + url.slice(1) + "/";
                } else if (url.indexOf("@") > -1 && !/^(https?:\/\/|www\.)/.test(url)) {
                  href = "mailto:" + url;
                  attrs = "";
                } else if (url.indexOf("www.") === 0) {
                  href = "https://" + url;
                }
                return '<a href="' + href + '"' + attrs + ">" + url + "</a>" + rest;
              })
            );
          });
        },
      },
      render: {
        // Mantém exatamente o mesmo mapa de destino: origem
        files: Object.assign({}, pageFiles, eventFiles),
      },
    },
    watch: {
      scripts: {
        files: ["app/*.*"],
        tasks: ["nunjucks"],
        options: {
          spawn: false,
        },
      },
    },
  });

  // Gera assets/img/og/<id>.jpg (cópia da imagem_v_1440x1800 de cada evento) e default.jpg (cópia da default_imagem_v_1440x1800)
  grunt.registerTask("og", "Gera as imagens de partilha (og) em jpg", function () {
    const done = this.async();
    const sharp = require("sharp");
    grunt.file.mkdir(OG_DIR);
    // as imagens por defeito também podem estar no config.yaml como .jpg / .png: usa o .avif
    const defaultV = avifPath(imagePath(config.default_imagem_v_1440x1800));
    const jobs = events.map((c) => renderEventOg(sharp, grunt, c, defaultV));
    jobs.push(renderDefaultOg(sharp, defaultV));
    Promise.all(jobs)
      .then((files) => {
        grunt.log.ok(`${files.length} imagens og geradas em ${OG_DIR}`);
        done();
      })
      .catch(done);
  });

  // Converte as imagens novas (AVIF_SRC e as fotos dos concertos em jpg, png, webp, ... estejam onde estiverem)
  // em <imagem>.avif e move o original para ORIGINAIS_DIR
  // (se já existir um .avif com o mesmo nome é substituído). O .webp é feito a seguir pela tarefa webp.
  grunt.registerTask("avif", "Converte as imagens novas (jpg, png, ...) para .avif", function () {
    const done = this.async();
    const fs = require("fs");
    const path = require("path");
    const sharp = require("sharp");
    const seen = {};
    const concertSrc = concertImages.filter((p) => {
      if (!CONCERT_IMG_EXT.test(p)) return false;
      if (grunt.file.exists(p)) return true;
      if (!grunt.file.exists(avifPath(p))) grunt.log.warn(`avif: a foto "${p}" (concertos.yaml / config.yaml) não existe`);
      return false;
    });
    const todo = grunt.file.expand(AVIF_SRC).concat(concertSrc).filter((src) => {
      if (seen[src.replace(/\.[^.\/]+$/, ".avif")] === src) return false; // já está na lista
      const out = src.replace(/\.[^.\/]+$/, ".avif");
      if (seen[out]) {
        grunt.log.warn(`avif: ${src} ignorada (${seen[out]} também dá ${out})`);
        return false;
      }
      seen[out] = src;
      return true;
    });
    // uma de cada vez, como na tarefa webp
    todo
      .reduce(
        (p, src) =>
          p.then(() =>
            sharp(src)
              .rotate() // aplica a orientação EXIF das fotos do telemóvel
              .resize({ width: AVIF_MAX, height: AVIF_MAX, fit: "inside", withoutEnlargement: true })
              .avif({ quality: AVIF_QUALITY, effort: 4 })
              .toFile(src.replace(/\.[^.\/]+$/, ".avif"))
              .then(() => {
                const dest = path.join(ORIGINAIS_DIR, src);
                grunt.file.mkdir(path.dirname(dest));
                fs.renameSync(src, dest);
                grunt.log.writeln(`avif: ${src} (original em ${dest})`);
              })
          ),
        Promise.resolve()
      )
      .then(() => {
        grunt.log.ok(`${todo.length} imagens convertidas para .avif`);
        done();
      })
      .catch(done);
  });

  // Gera <imagem>.webp ao lado de cada <imagem>.avif (só as novas ou alteradas desde a última vez),
  // incluindo as fotos dos concertos que estejam fora de WEBP_SRC
  grunt.registerTask("webp", "Gera cópias .webp das imagens .avif", function () {
    const done = this.async();
    const fs = require("fs");
    const sharp = require("sharp");
    const all = grunt.file.expand(WEBP_SRC);
    concertImages.map(avifPath).forEach((p) => {
      if (/\.avif$/i.test(p) && grunt.file.exists(p) && all.indexOf(p) < 0) all.push(p);
    });
    const todo = all.filter((src) => {
      const out = src.replace(/.avif$/i, ".webp");
      return !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs;
    });
    // uma de cada vez: as fotos grandes (2560px) gastam muita memória a descodificar
    todo
      .reduce(
        (p, src) =>
          p.then(() =>
            sharp(src)
              .webp({ quality: WEBP_QUALITY, effort: 5 })
              .toFile(src.replace(/.avif$/i, ".webp"))
              .then(() => grunt.verbose.writeln(`webp: ${src}`))
          ),
        Promise.resolve()
      )
      .then(() => {
        grunt.log.ok(`${todo.length} imagens .webp geradas (${all.length - todo.length} já estavam em dia)`);
        done();
      })
      .catch(done);
  });

  // Apaga as pastas de concerts/ dos concertos que já não estão ativos (e as imagens og que não sejam a default)
  // (isEnabled: false, removidos do yaml ou com o id mudado)
  grunt.registerTask("clean-concerts", "Apaga as páginas dos concertos desativados", function () {
    const keep = {};
    events.forEach((c) => {
      keep[c.id] = true;
      keep[`${c.id}-en`] = true;
    });
    let removed = 0;
    grunt.file.expand({ filter: "isDirectory" }, `${CONCERTS_DIR}/*`).forEach((dir) => {
      const name = dir.split("/").pop();
      if (keep[name]) return;
      grunt.file.delete(dir);
      grunt.log.writeln(`apagado ${dir}`);
      removed++;
    });
    grunt.file.expand(`${OG_DIR}/*.jpg`).forEach((file) => {
      const name = file.split("/").pop().replace(/\.jpg$/, "");
      if (name !== OG_DEFAULT && !events.some((c) => c.id === name)) grunt.file.delete(file);
    });
    grunt.log.ok(`${removed} pastas de concertos desativados apagadas`);
  });

  grunt.registerTask("sitemap", "Gera o sitemap.xml", function () {
    grunt.log.ok(`sitemap.xml com ${writeSitemap(grunt, data, pageFiles, events)} endereços`);
  });

  grunt.loadNpmTasks("grunt-nunjucks-2-html");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.registerTask("default", ["clean-concerts", "avif", "og", "webp","nunjucks", "sitemap"]);
};
