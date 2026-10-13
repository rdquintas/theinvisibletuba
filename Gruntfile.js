// Abreviaturas dos meses mostradas no site
const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Pasta onde ficam as páginas dos concertos: concerts/<id>/ e concerts/<id>-en/
const CONCERTS_DIR = "concerts";

// Imagem de partilha (og) gerada para cada evento
const OG_DIR = "assets/img/og";
const OG_W = 1200;
const OG_H = 630;
// Imagem og das restantes páginas (só a foto por defeito + logo, sem texto)
const OG_DEFAULT = "default";

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
      imagem_h: imagePath(c.imagem_h) || imagePath(config.evento_imagem_h),
      imagem_v: imagePath(c.imagem_v) || imagePath(config.evento_imagem_v),
    });
  });
  // '??' fica depois de qualquer dia do mesmo mês ('?' > '9' em ASCII)
  concerts.sort((a, b) => (String(a.data) < String(b.data) ? -1 : String(a.data) > String(b.data) ? 1 : 0));
  data.concerts = concerts;
  return data;
}

// Dados extra de uma página de evento (app/event.html), por língua
function eventContext(c, lang, data) {
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
  return {
    root: "/",
    lang: lang,
    event: c,
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
      description: description,
      image: `${site}/${OG_DIR}/${c.id}${en ? "-en" : ""}.jpg`,
      image_type: "image/jpeg",
    },
  };
}

// --- imagem og: foto do hero + data / nome / local por cima ---

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]);
}

// parte o nome em linhas de até maxChars (no máximo maxLines; o resto leva "…")
function wrapText(text, maxChars, maxLines) {
  const lines = [];
  let line = "";
  String(text).split(/\s+/).forEach((word) => {
    if (line && (line + " " + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

function ogSvg(c, lang) {
  const en = lang === "en";
  const month = en ? c.month_en : c.month;
  const date = c.day === "??" ? month : `${c.day} ${month}`;
  const long = String(c.name).length > 40;
  const size = long ? 50 : 64;
  const lineH = Math.round(size * 1.1);
  const lines = wrapText(c.name, long ? 32 : 24, 3);
  const font = "Lato, 'Segoe UI', Arial, sans-serif";

  // de baixo para cima: local, nome, data
  let y = OG_H - 60;
  const parts = [];
  if (c.location) {
    parts.push(`<text x="60" y="${y}" font-size="32" fill="#dddddd">${escapeXml(c.location)}</text>`);
    y -= 56;
  }
  lines
    .slice()
    .reverse()
    .forEach((l) => {
      parts.push(`<text x="60" y="${y}" font-size="${size}" font-weight="700" fill="#ffffff">${escapeXml(l)}</text>`);
      y -= lineH;
    });
  y -= 6;
  parts.push(
    `<text x="60" y="${y}" font-size="44" font-weight="900" fill="#d4af37">${escapeXml(date)}` +
      (c.time ? `<tspan fill="#ffffff" font-weight="400" dx="18">${escapeXml(c.time)}</tspan>` : "") +
      `</text>`
  );
  parts.push(`<rect x="60" y="${y + 18}" width="80" height="4" fill="#d4af37"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0" stop-color="#000" stop-opacity="0.88"/>
      <stop offset="0.55" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  <g font-family="${font}">${parts.join("\n")}</g>
</svg>`;
}

async function renderOg(sharp, grunt, c, lang, fallbackImage) {
  // imagens externas (http) não são descarregadas: usa a imagem por defeito
  let src = /^https?:\/\//.test(c.imagem_h) ? fallbackImage : c.imagem_h;
  src = src.replace(/^\/+/, "");
  if (!grunt.file.exists(src)) {
    grunt.log.warn(`og: imagem "${src}" do evento "${c.id}" não existe, a usar a imagem por defeito`);
    src = fallbackImage.replace(/^\/+/, "");
  }
  const logo = await sharp("assets/img/logo_transp_v00.png").resize({ height: 150 }).toBuffer();
  const out = `${OG_DIR}/${c.id}${lang === "en" ? "-en" : ""}.jpg`;
  await sharp(src)
    .resize(OG_W, OG_H, { fit: "cover" })
    .composite([{ input: Buffer.from(ogSvg(c, lang)) }, { input: logo, top: 30, left: 45 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  return out;
}

// imagem og das páginas que não são eventos: só a foto por defeito com o logo
async function renderDefaultOg(sharp, image) {
  const logo = await sharp("assets/img/logo_transp_v00.png").resize({ height: 260 }).toBuffer();
  const out = `${OG_DIR}/${OG_DEFAULT}.jpg`;
  await sharp(image.replace(/^\/+/, ""))
    .resize(OG_W, OG_H, { fit: "cover" })
    .composite([{ input: logo, top: 40, left: 50 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  return out;
}

// Dados de partilha (og) das páginas normais: "contact.html" <-> "contact_en.html"
function pageContext(dest, data) {
  const site = String(data.site_url || "").replace(/\/+$/, "");
  const en = /_en\.html$/.test(dest);
  const pageUrl = (f) => site + "/" + (f === "index.html" ? "" : f);
  const alt = en ? dest.replace(/_en\.html$/, ".html") : dest.replace(/\.html$/, "_en.html");
  const description = en ? "The most entertaining band from Lisbon." : "A banda mais divertida de Lisboa.";
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
    },
  };
}

module.exports = function (grunt) {
  const config = grunt.file.readYAML("app/dados/config.yaml");
  const data = Object.assign(
    {},
    config,
    prepareConcerts(grunt.file.readYAML("app/dados/concertos.yaml"), config, grunt),
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

  // Project configuration.
  grunt.initConfig({
    nunjucks: {
      options: {
        // Dados dos ficheiros YAML
        data: data,
        // Nas páginas de evento junta os dados desse evento (this = ficheiro a gerar)
        preprocessData: function (d) {
          const page = eventPages[this.dest];
          return Object.assign(d, page ? eventContext(page.concert, page.lang, d) : pageContext(this.dest, d));
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
        files: Object.assign(
          {
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
          },
          eventFiles
        ),
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

  // Gera assets/img/og/<id>.jpg e <id>-en.jpg para a partilha dos eventos
  grunt.registerTask("og", "Gera as imagens de partilha (og) dos eventos", function () {
    const done = this.async();
    const sharp = require("sharp");
    grunt.file.mkdir(OG_DIR);
    const jobs = [];
    events.forEach((c) => ["pt", "en"].forEach((lang) => jobs.push(renderOg(sharp, grunt, c, lang, config.evento_imagem_h))));
    jobs.push(renderDefaultOg(sharp, config.evento_imagem_h));
    Promise.all(jobs)
      .then((files) => {
        grunt.log.ok(`${files.length} imagens og geradas em ${OG_DIR}`);
        done();
      })
      .catch(done);
  });

  // Gera <imagem>.webp ao lado de cada <imagem>.avif (só as novas ou alteradas desde a última vez)
  grunt.registerTask("webp", "Gera cópias .webp das imagens .avif", function () {
    const done = this.async();
    const fs = require("fs");
    const sharp = require("sharp");
    const todo = grunt.file.expand(WEBP_SRC).filter((src) => {
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
        grunt.log.ok(`${todo.length} imagens .webp geradas (${grunt.file.expand(WEBP_SRC).length - todo.length} já estavam em dia)`);
        done();
      })
      .catch(done);
  });

  // Apaga as pastas de concerts/ (e as imagens og) dos concertos que já não estão ativos
  // (isEnabled: false, removidos do yaml ou com o id mudado)
  grunt.registerTask("clean-concerts", "Apaga as páginas dos concertos desativados", function () {
    const keep = { [OG_DEFAULT]: true };
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
      if (!keep[file.split("/").pop().replace(/\.jpg$/, "")]) grunt.file.delete(file);
    });
    grunt.log.ok(`${removed} pastas de concertos desativados apagadas`);
  });

  grunt.loadNpmTasks("grunt-nunjucks-2-html");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.registerTask("default", ["clean-concerts", "og", "webp", "nunjucks"]);
};
