// Build do site (sem Grunt): node build.js [tarefa ...]
//
// Tarefas: clean-concerts, avif, og, webp, html, sitemap, dist, watch
// Sem tarefas corre o build completo: clean-concerts → avif → og → webp → html → sitemap
// (dist só é usada no Netlify: npm run netlify)
// (ver os scripts em package.json: npm run build, npm run html, ...)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const yaml = require("js-yaml");
const nunjucks = require("nunjucks");

// Abreviaturas dos meses mostradas no site
const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Pasta com os templates (Nunjucks) e os dados (app/dados/*.yaml)
const APP_DIR = "app";

// Pasta onde ficam as páginas dos concertos: concerts/<id>/ e concerts/<id>-en/
const CONCERTS_DIR = "concerts";

// Imagens de partilha (og), sempre em jpg e sem logo nem texto: <id>.jpg por evento (cópia da imagem_v_1440x1800)
// e default.jpg para as restantes páginas (cópia da default_imagem_v_1440x1800 do config.yaml)
const OG_DIR = "assets/img/og";
// tamanho máximo das cópias jpg (as maiores são reduzidas, para a partilha ser leve)
const OG_MAX_W = 1080;
const OG_MAX_H = 1920;
const OG_DEFAULT = "default";

// Página de erro "não encontrado" (o Netlify serve-a sozinho para endereços que não existem)
const PAGE_404 = "404.html";

// Pasta publicada no Netlify (netlify.toml): cópia do site sem os ficheiros de desenvolvimento.
// Fora ficam também todos os ficheiros/pastas da raiz começados por "." (.git, .vscode, .netlify, .env, ...)
// e os templates de app/ (só app/dados/ é publicado: a loja lê os yaml no browser e na Netlify Function).
const DIST_DIR = "dist";
const DIST_EXCLUDE = [
  "node_modules",
  "netlify",
  "netlify.toml",
  "build.js",
  "package.json",
  "package-lock.json",
  "CLAUDE.md",
  "README.md",
  "assets/scss",
  "landing/concert/_sources",
  "api", // antiga loja em PHP: pode ainda existir localmente o api/config.php com a chave secreta do Stripe
];

// Páginas normais (destino: origem). Páginas novas têm de ser adicionadas aqui (render e sitemap).
const PAGE_FILES = {
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

// Redes sociais da banda (dados estruturados / JSON-LD, "sameAs")
const SOCIAL_LINKS = [
  "https://www.instagram.com/theinvisibletuba/",
  "https://open.spotify.com/artist/2CqJyOnOEm6hm7QGs2llZ2",
  "https://www.tiktok.com/@theinvisibletuba",
  "https://www.youtube.com/@theinvisibletuba4630",
  "https://www.facebook.com/theinvisibletuba/",
];

// Pastas de imagens do site
const IMG_DIRS = ["assets/img", "forms/assets/img"];

// Imagens novas (jpg, png, ...) postas nas pastas de imagens são convertidas para .avif no build;
// o original passa para ORIGINAIS_DIR (no .gitignore, não vai para o servidor).
// As og (geradas em jpg para as redes sociais) e o logo em png ficam como estão.
const AVIF_SRC_EXT = /\.(jpe?g|png|gif|tiff?)$/i;
const AVIF_EXCLUDE = (file) => file.startsWith(OG_DIR + "/") || file === "assets/img/logo_transp_v00.png";
const AVIF_QUALITY = 60;
const AVIF_MAX = 2560; // lado maior, em px (as fotos maiores são reduzidas)
const ORIGINAIS_DIR = "_originais";

// Cópias .webp das imagens .avif, para browsers sem AVIF (ver assets/scripts/avif-fallback.js)
const WEBP_QUALITY = 80;

// ---------------------------------------------------------------------------
// Utilitários de ficheiros (caminhos sempre com "/", relativos à raiz do projeto)

const log = {
  ok: (msg) => console.log(`>> ${msg}`),
  info: (msg) => console.log(msg),
  warn: (msg) => console.warn(`AVISO: ${msg}`),
};

function readYaml(file) {
  return yaml.load(fs.readFileSync(file, "utf8"));
}

// lê um ficheiro de texto (sem o BOM inicial, se tiver)
function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "");
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Todos os ficheiros dentro de uma pasta (e subpastas), ordenados
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name).split(path.sep).join("/"))
    .sort();
}

// Subpastas diretas de uma pasta
function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `${dir}/${e.name}`)
    .sort();
}

// ---------------------------------------------------------------------------
// Dados

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
// Erros no yaml param o build.
function prepareConcerts(data, config) {
  const today = todayYmd();
  const ids = {};
  const errors = [];
  const concerts = (data.concerts || []).map((c) => {
    const d = String(c.data || "");
    const m = /^(\d{4})(\d{2})(\d{2}|\?\?)$/.exec(d);
    if (!m || +m[2] < 1 || +m[2] > 12) {
      errors.push(`concertos.yaml: "${c.id}" tem data inválida "${d}" (formato yyyymmdd)`);
      return c;
    }
    // o id é o link da página do concerto: só minúsculas, números e '-'
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(c.id || ""))) {
      errors.push(`concertos.yaml: id inválido "${c.id}" (só letras minúsculas, números e '-')`);
    }
    if (ids[c.id]) errors.push(`concertos.yaml: id "${c.id}" repetido`);
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
  if (errors.length) throw new Error(errors.join("\n"));
  // '??' fica depois de qualquer dia do mesmo mês ('?' > '9' em ASCII)
  concerts.sort((a, b) => (String(a.data) < String(b.data) ? -1 : String(a.data) > String(b.data) ? 1 : 0));
  data.concerts = concerts;
  return data;
}

// Lê os yaml de app/dados/ e junta tudo num único objeto (disponível em todos os templates)
function loadData() {
  const config = readYaml(`${APP_DIR}/dados/config.yaml`);
  const concertosYaml = readYaml(`${APP_DIR}/dados/concertos.yaml`);
  // Fotos dos concertos tal como estão no yaml (sem "/" inicial; só as locais), para as tarefas avif e webp
  const concertImages = (concertosYaml.concerts || [])
    .reduce((list, c) => list.concat(c.imagem_h, c.imagem_v_1440x1800), [config.default_imagem_h, config.default_imagem_v_1440x1800])
    .map((p) => imagePath(p).replace(/^\/+/, ""))
    .filter((p, i, list) => p && !/^https?:\/\//.test(p) && list.indexOf(p) === i);
  const data = Object.assign({}, config, prepareConcerts(concertosYaml, config), readYaml(`${APP_DIR}/dados/artigos_loja.yaml`));
  // Uma página por evento ativo: concerts/<id>/index.html (PT) e concerts/<id>-en/index.html (EN)
  const events = data.concerts.filter((c) => c.isEnabled);
  return { config, data, events, concertImages };
}

// ---------------------------------------------------------------------------
// Tamanhos de imagens

// Largura / altura de um .jpg, lidas do marcador SOF do ficheiro (null se não der)
function jpgSize(file) {
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
  if (!/\.avif$/i.test(file) || !fs.existsSync(file)) return null;
  const b = fs.readFileSync(file);
  const i = b.indexOf("ispe");
  if (i < 0 || i + 16 > b.length) return null;
  return { width: b.readUInt32BE(i + 8), height: b.readUInt32BE(i + 12) };
}

// ---------------------------------------------------------------------------
// Contexto das páginas (og, descrição, JSON-LD)

// Imagem de partilha de um evento: assets/img/og/<id>.jpg, cópia da imagem_v_1440x1800 em jpg
// (sem texto nem logo), gerada pela tarefa og. As redes sociais não mostram .avif.
function ogEventImage(c, site) {
  const file = `${OG_DIR}/${c.id}.jpg`;
  const size = jpgSize(file);
  if (!size) log.warn(`og: "${file}" do evento "${c.id}" não existe (corre "npm run og")`);
  return Object.assign({ url: `${site}/${file}`, type: "image/jpeg" }, size);
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
  // descrição da partilha: "24 OUT 22:00", o nome do evento por baixo e os primeiros 200 caracteres do info + "..."
  const infoText = String(info || "").replace(/\s+/g, " ").trim();
  const shareInfo = infoText.length > 200 ? infoText.slice(0, 200).trimEnd() + "..." : infoText;
  const shareDescription = [(c.day === "??" ? month : `${c.day} ${month}`) + (c.time ? ` ${c.time}` : ""), c.name, shareInfo].filter(Boolean).join("\n");
  const img = ogEventImage(c, site);
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

// ---------------------------------------------------------------------------
// Nunjucks

function createEnv() {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(APP_DIR, { noCache: true }), { autoescape: true });

  // v('assets/css/zrq.css'): hash do conteúdo, para usar em "?v=" nos links de css/js
  // (o browser volta a descarregar o ficheiro quando ele muda, em vez de usar o da cache)
  env.addGlobal("v", function (file) {
    return crypto.createHash("md5").update(readText(file)).digest("hex").slice(0, 8);
  });

  // nl2br: troca as quebras de linha (\n no yaml) por <br>
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

  return env;
}

// ---------------------------------------------------------------------------
// Imagens (sharp)

// cópia em jpg de uma imagem (reduzida a OG_MAX_W x OG_MAX_H, sem cortes)
async function renderOgJpg(sharp, src, out) {
  await sharp(src)
    .resize({ width: OG_MAX_W, height: OG_MAX_H, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#000000" }) // jpg não tem transparência
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  return out;
}

// imagem og de um evento: a imagem_v_1440x1800 convertida para jpg, sem mais nada
// (imagens externas (http) não são descarregadas: usa a imagem vertical por defeito)
function renderEventOg(sharp, c, fallbackImage) {
  let src = (/^https?:\/\//.test(c.imagem_v_1440x1800) ? fallbackImage : c.imagem_v_1440x1800).replace(/^\/+/, "");
  if (!fs.existsSync(src)) {
    log.warn(`og: imagem "${src}" do evento "${c.id}" não existe, a usar a imagem por defeito`);
    src = fallbackImage.replace(/^\/+/, "");
  }
  return renderOgJpg(sharp, src, `${OG_DIR}/${c.id}.jpg`);
}

// uma imagem de cada vez: as fotos grandes (2560px) gastam muita memória a descodificar
async function eachInSequence(list, fn) {
  for (const item of list) await fn(item);
}

// ---------------------------------------------------------------------------
// Tarefas

const tasks = {
  // Apaga as pastas de concerts/ dos concertos que já não estão ativos (e as imagens og que não sejam a default)
  // (isEnabled: false, removidos do yaml ou com o id mudado)
  "clean-concerts": ({ events }) => {
    const keep = {};
    events.forEach((c) => {
      keep[c.id] = true;
      keep[`${c.id}-en`] = true;
    });
    let removed = 0;
    listDirs(CONCERTS_DIR).forEach((dir) => {
      if (keep[dir.split("/").pop()]) return;
      fs.rmSync(dir, { recursive: true, force: true });
      log.info(`apagado ${dir}`);
      removed++;
    });
    listFiles(OG_DIR)
      .filter((file) => /\.jpg$/.test(file))
      .forEach((file) => {
        const name = file.split("/").pop().replace(/\.jpg$/, "");
        if (name !== OG_DEFAULT && !events.some((c) => c.id === name)) fs.rmSync(file);
      });
    log.ok(`${removed} pastas de concertos desativados apagadas`);
  },

  // Converte as imagens novas (das pastas de imagens e as fotos dos concertos em jpg, png, webp, ... estejam onde estiverem)
  // em <imagem>.avif e move o original para ORIGINAIS_DIR
  // (se já existir um .avif com o mesmo nome é substituído). O .webp é feito a seguir pela tarefa webp.
  avif: async ({ concertImages }) => {
    const sharp = require("sharp");
    const toAvif = (src) => src.replace(/\.[^.\/]+$/, ".avif");
    const seen = {};
    const concertSrc = concertImages.filter((p) => {
      if (!CONCERT_IMG_EXT.test(p)) return false;
      if (fs.existsSync(p)) return true;
      if (!fs.existsSync(avifPath(p))) log.warn(`avif: a foto "${p}" (concertos.yaml / config.yaml) não existe`);
      return false;
    });
    const found = IMG_DIRS.flatMap(listFiles).filter((f) => AVIF_SRC_EXT.test(f) && !AVIF_EXCLUDE(f));
    const todo = found.concat(concertSrc).filter((src) => {
      const out = toAvif(src);
      if (seen[out] === src) return false; // já está na lista
      if (seen[out]) {
        log.warn(`avif: ${src} ignorada (${seen[out]} também dá ${out})`);
        return false;
      }
      seen[out] = src;
      return true;
    });
    await eachInSequence(todo, async (src) => {
      await sharp(src)
        .rotate() // aplica a orientação EXIF das fotos do telemóvel
        .resize({ width: AVIF_MAX, height: AVIF_MAX, fit: "inside", withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY, effort: 4 })
        .toFile(toAvif(src));
      const dest = path.posix.join(ORIGINAIS_DIR, src);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
      log.info(`avif: ${src} (original em ${dest})`);
    });
    log.ok(`${todo.length} imagens convertidas para .avif`);
  },

  // Gera assets/img/og/<id>.jpg (cópia da imagem_v_1440x1800 de cada evento) e default.jpg (cópia da default_imagem_v_1440x1800)
  og: async ({ config, events }) => {
    const sharp = require("sharp");
    fs.mkdirSync(OG_DIR, { recursive: true });
    // as imagens por defeito também podem estar no config.yaml como .jpg / .png: usa o .avif
    const defaultV = avifPath(imagePath(config.default_imagem_v_1440x1800));
    const jobs = events.map((c) => renderEventOg(sharp, c, defaultV));
    jobs.push(renderOgJpg(sharp, defaultV.replace(/^\/+/, ""), `${OG_DIR}/${OG_DEFAULT}.jpg`));
    const files = await Promise.all(jobs);
    log.ok(`${files.length} imagens og geradas em ${OG_DIR}`);
  },

  // Gera <imagem>.webp ao lado de cada <imagem>.avif (só as novas ou alteradas desde a última vez),
  // incluindo as fotos dos concertos que estejam fora das pastas de imagens
  webp: async ({ concertImages }) => {
    const sharp = require("sharp");
    const all = IMG_DIRS.flatMap(listFiles).filter((f) => /\.avif$/i.test(f));
    concertImages.map(avifPath).forEach((p) => {
      if (/\.avif$/i.test(p) && fs.existsSync(p) && all.indexOf(p) < 0) all.push(p);
    });
    const toWebp = (src) => src.replace(/\.avif$/i, ".webp");
    const todo = all.filter((src) => {
      const out = toWebp(src);
      return !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs;
    });
    await eachInSequence(todo, (src) => sharp(src).webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(toWebp(src)));
    log.ok(`${todo.length} imagens .webp geradas (${all.length - todo.length} já estavam em dia)`);
  },

  // Gera o HTML a partir dos templates Nunjucks de app/: as páginas normais (PAGE_FILES) e,
  // para cada evento ativo, concerts/<id>/index.html (PT) e concerts/<id>-en/index.html (EN) a partir de app/event.html
  html: ({ data, events }) => {
    const env = createEnv();
    const pages = Object.keys(PAGE_FILES).map((dest) => ({ dest, src: PAGE_FILES[dest], ctx: () => pageContext(dest, data) }));
    events.forEach((c) => {
      ["pt", "en"].forEach((lang) => {
        const dest = `${CONCERTS_DIR}/${c.id}${lang === "en" ? "-en" : ""}/index.html`;
        pages.push({ dest, src: `${APP_DIR}/event.html`, ctx: () => eventContext(c, lang, data) });
      });
    });
    const failed = [];
    pages.forEach((p) => {
      try {
        const ctx = Object.assign({}, data, p.ctx());
        writeFile(p.dest, env.render(path.resolve(p.src), ctx));
      } catch (e) {
        failed.push(`${p.dest}: ${e.message}`);
      }
    });
    if (failed.length) throw new Error(`Erro ao gerar ${failed.length} páginas:\n${failed.join("\n")}`);
    log.ok(`${pages.length} páginas geradas`);
  },

  // Escreve o sitemap.xml: todas as páginas (PT e EN, ligadas com hreflang) e os concertos ativos.
  // Fora: a 404 e a loja enquanto loja_ativa for false.
  sitemap: ({ data, events }) => {
    const site = String(data.site_url || "").replace(/\/+$/, "");
    const pageUrl = (f) => site + "/" + (f === "index.html" ? "" : f);
    const escapeXml = (s) =>
      String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]);
    const pairs = [];
    Object.keys(PAGE_FILES)
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
    writeFile(
      "sitemap.xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
        urls.join("\n") +
        `\n</urlset>\n`
    );
    log.ok(`sitemap.xml com ${urls.length} endereços`);
  },

  // Copia o site para DIST_DIR (a pasta que o Netlify publica), sem os ficheiros de desenvolvimento
  dist: () => {
    const dataDir = `${APP_DIR}/dados`;
    const isPublic = (rel) => {
      if (rel.startsWith(".") || rel === DIST_DIR || rel === ORIGINAIS_DIR) return false;
      if (DIST_EXCLUDE.some((p) => rel === p || rel.startsWith(p + "/"))) return false;
      if (rel.startsWith(APP_DIR + "/") && rel !== dataDir && !rel.startsWith(dataDir + "/")) return false;
      return true;
    };
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    let copied = 0;
    const copyDir = (dir) => {
      fs.readdirSync(dir || ".", { withFileTypes: true }).forEach((e) => {
        const rel = dir ? `${dir}/${e.name}` : e.name;
        if (!isPublic(rel)) return;
        if (e.isDirectory()) return copyDir(rel);
        fs.mkdirSync(path.dirname(`${DIST_DIR}/${rel}`), { recursive: true });
        fs.copyFileSync(rel, `${DIST_DIR}/${rel}`);
        copied++;
      });
    };
    copyDir("");
    log.ok(`${copied} ficheiros copiados para ${DIST_DIR}/`);
  },
};

const DEFAULT_TASKS = ["clean-concerts", "avif", "og", "webp", "html", "sitemap"];

async function run(names) {
  const ctx = loadData();
  for (const name of names) {
    log.info(`\n[${name}]`);
    await tasks[name](ctx);
  }
}

// Recompila o HTML sempre que muda algo em app/ (templates e app/dados/*.yaml).
// Não corre og / avif / webp / clean-concerts: depois de mexer em concertos corre "npm run build".
function watch() {
  let timer = null;
  const rebuild = () => {
    timer = null;
    run(["html"]).catch((e) => console.error(`ERRO: ${e.message}`));
  };
  rebuild();
  fs.watch(APP_DIR, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 200);
  });
  log.info(`\nÀ espera de alterações em ${APP_DIR}/ (Ctrl+C para sair)`);
}

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== "watch" && !tasks[a]);
if (unknown.length) {
  console.error(`Tarefa desconhecida: ${unknown.join(", ")}. Tarefas: ${Object.keys(tasks).join(", ")}, watch`);
  process.exit(1);
}
if (args.includes("watch")) {
  watch();
} else {
  run(args.length ? args : DEFAULT_TASKS).catch((e) => {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  });
}
