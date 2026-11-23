// Build do site: node build.js [tarefa ...]
//
// As fontes estão em src/ e o site gerado vai todo para dist/ (a pasta publicada no Netlify).
//   src/templates/  páginas (Nunjucks) com as duas línguas no mesmo ficheiro: {{#lang pt}}..{{/lang}}{{#lang en}}..{{/lang}}
//   src/config/     yaml com os dados do site (site, concertos, loja)
//   o resto de src/ (assets, docs, landing, forms, checkout, ...) é copiado tal e qual para dist/
//
// Cada página de src/templates/ é gerada duas vezes: dist/<página> (PT, a língua por defeito) e dist/en/<página> (EN).
//
// Tarefas: avif, webp, clean, static, og, html, sitemap, redirects, watch, serve, dev
// Sem tarefas corre o build completo: avif → webp → clean → static → og → html → sitemap → redirects
// (ver os scripts em package.json: npm run build, npm run dev, ...)

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const yaml = require("js-yaml");
const nunjucks = require("nunjucks");

// Abreviaturas dos meses mostradas no site
const MONTHS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Fontes do site
const SRC_DIR = "src";
// Templates (Nunjucks): ficheiros começados por "_" são parciais; EVENT_TEMPLATE é a página dos concertos;
// todos os outros *.html são páginas, geradas em PT e em EN (não é preciso registar páginas novas)
const TEMPLATES_DIR = `${SRC_DIR}/templates`;
const EVENT_TEMPLATE = "event.html";
// Dados (yaml). São também publicados em /config/ (a loja lê o artigos_loja.yaml no browser e na Netlify Function)
const DATA_DIR = `${SRC_DIR}/config`;

// Site gerado (publicado no Netlify, ver netlify.toml). É apagado e refeito em cada build: nunca editar.
const DIST_DIR = "dist";

// Ficheiros de src/ que não são copiados para dist/ (fontes que não vão para o servidor)
const STATIC_EXCLUDE = [
  "templates", // gerados pela tarefa html
  "assets/scss", // não é compilado por nenhum script
  "landing/concert/_sources",
];

// Línguas: PT na raiz (a língua por defeito), EN em /en/
const LANGS = {
  pt: { base: "/", locale: "pt_PT" },
  en: { base: "/en/", locale: "en_GB" },
};
const DEFAULT_LANG = "pt";
const otherLang = (lang) => (lang === "en" ? "pt" : "en");

// Pasta onde ficam as páginas dos concertos: /concerts/<id>/ (PT) e /en/concerts/<id>/ (EN)
const CONCERTS_DIR = "concerts";

// Imagens de partilha (og), sempre em jpg e sem logo nem texto: <id>.jpg por evento (cópia da imagem_v_1440x1800)
// e default.jpg para as restantes páginas (cópia da default_imagem_v_1440x1800 do site.yaml).
// São geradas no build (só existem em dist/).
const OG_DIR = "assets/img/og";
// tamanho máximo das cópias jpg (as maiores são reduzidas, para a partilha ser leve)
const OG_MAX_W = 1080;
const OG_MAX_H = 1920;
const OG_DEFAULT = "default";

// Página de erro "não encontrado" (o Netlify serve-a sozinho para endereços que não existem)
const PAGE_404 = "404.html";

// Páginas antigas com o sufixo _en (x_en.html), que passaram para /en/x.html: o _redirects manda-as para o sítio novo
const OLD_EN_PAGES = ["index", "pictures", "audio", "contact", "mediakit", "shop", "privacy"];

// Pastas de imagens do site (dentro de src/)
const IMG_DIRS = ["assets/img", "forms/assets/img"];

// Imagens novas (jpg, png, ...) postas nas pastas de imagens são convertidas para .avif no build;
// o original passa para ORIGINAIS_DIR (no .gitignore, não vai para o servidor).
// O logo em png fica como está.
const AVIF_SRC_EXT = /\.(jpe?g|png|gif|tiff?)$/i;
const AVIF_EXCLUDE = (file) => file === "assets/img/logo_transp_v00.png";
const AVIF_QUALITY = 60;
const AVIF_MAX = 2560; // lado maior, em px (as fotos maiores são reduzidas)
const ORIGINAIS_DIR = "_originais";

// Cópias .webp das imagens .avif, para browsers sem AVIF (ver src/assets/scripts/avif-fallback.js)
const WEBP_QUALITY = 80;

// Servidor local (npm run dev / npm run serve)
const DEV_PORT = Number(process.env.PORT) || 8080;

// ---------------------------------------------------------------------------
// Utilitários de ficheiros (caminhos sempre com "/")

const log = {
  ok: (msg) => console.log(`>> ${msg}`),
  info: (msg) => console.log(msg),
  warn: (msg) => console.warn(`AVISO: ${msg}`),
};

// caminho de um ficheiro do site ("assets/img/x.avif" ou "/assets/img/x.avif") dentro de src/ e de dist/
const srcPath = (p) => `${SRC_DIR}/${String(p).replace(/^\/+/, "")}`;
const distPath = (p) => `${DIST_DIR}/${String(p).replace(/^\/+/, "")}`;

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

// Lê os yaml de src/config/ e junta tudo num único objeto (disponível em todos os templates)
function loadData() {
  const config = readYaml(`${DATA_DIR}/site.yaml`);
  const concertosYaml = readYaml(`${DATA_DIR}/concertos.yaml`);
  // Fotos dos concertos tal como estão no yaml (sem "/" inicial; só as locais), para as tarefas avif e webp
  const concertImages = (concertosYaml.concerts || [])
    .reduce((list, c) => list.concat(c.imagem_h, c.imagem_v_1440x1800), [config.default_imagem_h, config.default_imagem_v_1440x1800])
    .map((p) => imagePath(p).replace(/^\/+/, ""))
    .filter((p, i, list) => p && !/^https?:\/\//.test(p) && list.indexOf(p) === i);
  const data = Object.assign({}, config, prepareConcerts(concertosYaml, config), readYaml(`${DATA_DIR}/artigos_loja.yaml`));
  // Uma página por evento ativo, em cada língua
  const events = data.concerts.filter((c) => c.isEnabled);
  return { config, data, events, concertImages };
}

// Páginas de src/templates/ (sem parciais nem a página dos eventos)
function listPages() {
  return fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith(".html") && !f.startsWith("_") && f !== EVENT_TEMPLATE)
    .sort();
}

// ---------------------------------------------------------------------------
// Endereços

const siteUrl = (data) => String(data.site_url || "").replace(/\/+$/, "");

// endereço (sem domínio) de uma página numa língua: "/contact.html", "/en/contact.html", "/" e "/en/" para a index
function pagePath(file, lang) {
  return LANGS[lang].base + (file === "index.html" ? "" : file);
}

// endereço (sem domínio) da página de um concerto: "/concerts/<id>/" e "/en/concerts/<id>/"
function eventPath(c, lang) {
  return `${LANGS[lang].base}${CONCERTS_DIR}/${c.id}/`;
}

// ficheiro em dist/ de um endereço ("/en/" -> "dist/en/index.html")
function distFile(urlPath) {
  return distPath(urlPath.endsWith("/") ? urlPath + "index.html" : urlPath);
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
// Contexto das páginas (língua, og, descrição, JSON-LD)

// Variáveis comuns a todas as páginas de uma língua
function langContext(lang) {
  return { lang: lang, base: LANGS[lang].base, root: "/" };
}

// Imagem de partilha de um evento: assets/img/og/<id>.jpg, cópia da imagem_v_1440x1800 em jpg
// (sem texto nem logo), gerada pela tarefa og. As redes sociais não mostram .avif.
function ogEventImage(c, site) {
  const file = `${OG_DIR}/${c.id}.jpg`;
  const size = jpgSize(distPath(file));
  if (!size) log.warn(`og: "${distPath(file)}" do evento "${c.id}" não existe (corre "npm run og")`);
  return Object.assign({ url: `${site}/${file}`, type: "image/jpeg" }, size);
}

// Dados extra de uma página de evento (src/templates/event.html), por língua
function eventContext(c, lang, data) {
  const en = lang === "en";
  const site = siteUrl(data);
  const url = eventPath(c, lang);
  const altUrl = eventPath(c, otherLang(lang));
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
  const heroV = avifSize(srcPath(c.imagem_v_1440x1800));
  return Object.assign(langContext(lang), {
    event: c,
    hero_v_ratio: heroV ? `${heroV.width} / ${heroV.height}` : null,
    page_title: title,
    page_description: description,
    alt_lang_url: altUrl,
    share_url: site + url,
    og: {
      url: site + url,
      alt_url: site + altUrl,
      lang: lang,
      alt_lang: otherLang(lang),
      locale: LANGS[lang].locale,
      title: title,
      description: shareDescription,
      image: ogImage,
      image_type: img.type,
      image_width: img.width,
      image_height: img.height,
    },
    jsonld: eventJsonLd(c, lang, site, site + url, description, ogImage),
  });
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
    inLanguage: lang,
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
function bandJsonLd(site, data, lang) {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "The Invisible Tuba",
    url: site + LANGS[lang].base,
    logo: `${site}/assets/img/logo_transp_v00.png`,
    image: `${site}/${OG_DIR}/${OG_DEFAULT}.jpg`,
    description: lang === "en" ? "The most entertaining band from Lisbon." : "A banda mais divertida de Lisboa.",
    genre: ["Swing", "Jazz", "New Orleans Jazz"],
    foundingLocation: { "@type": "Place", name: "Lisboa, Portugal" },
    email: data.email || undefined,
    sameAs: data.social_links && data.social_links.length ? data.social_links : undefined, // redes sociais (site.yaml)
  });
}

// Dados de partilha (og) das páginas normais: "/contact.html" <-> "/en/contact.html"
function pageContext(file, lang, data) {
  const site = siteUrl(data);
  const alt = otherLang(lang);
  const ctx = langContext(lang);
  ctx.alt_lang_url = pagePath(file, alt);
  // a página 404 é mostrada em qualquer endereço: sem canonical / og; a outra língua é a sua página inicial
  if (file === PAGE_404) {
    ctx.alt_lang_url = LANGS[alt].base;
    ctx.page_description = "The Invisible Tuba";
    return ctx;
  }
  const description = lang === "en" ? "The most entertaining band from Lisbon." : "A banda mais divertida de Lisboa.";
  const size = jpgSize(distPath(`${OG_DIR}/${OG_DEFAULT}.jpg`)) || {};
  return Object.assign(ctx, {
    page_description: description,
    og: {
      url: site + pagePath(file, lang),
      alt_url: site + pagePath(file, alt),
      lang: lang,
      alt_lang: alt,
      locale: LANGS[lang].locale,
      title: "The Invisible Tuba",
      description: description,
      image: `${site}/${OG_DIR}/${OG_DEFAULT}.jpg`,
      image_type: "image/jpeg",
      image_width: size.width,
      image_height: size.height,
    },
    jsonld: file === "index.html" ? bandJsonLd(site, data, lang) : null,
  });
}

// ---------------------------------------------------------------------------
// Nunjucks

// Blocos de língua nos templates: {{#lang pt}}Texto em PT{{/lang}}{{#lang en}}Text in EN{{/lang}}
// passam a {% if lang == "pt" %}...{% endif %} antes de o Nunjucks ler o template (também nos parciais).
// Podem ter várias linhas e conter outras tags do Nunjucks, mas não podem estar uns dentro dos outros
// nem dentro de uma expressão {{ }} / {% %} (aí usa-se a variável lang: {{ "Home" if lang == "en" else "Início" }}).
function langBlocks(src, name) {
  return src
    .replace(/\{\{#lang\s+([a-z]+)\s*\}\}/g, (m, lang) => {
      if (!LANGS[lang]) throw new Error(`${name}: língua desconhecida em "${m}" (línguas: ${Object.keys(LANGS).join(", ")})`);
      return `{% if lang == "${lang}" %}`;
    })
    .replace(/\{\{\/lang\}\}/g, "{% endif %}");
}

function createEnv() {
  const loader = new nunjucks.FileSystemLoader(TEMPLATES_DIR, { noCache: true });
  const getSource = loader.getSource.bind(loader);
  loader.getSource = (name) => {
    const source = getSource(name);
    if (source) source.src = langBlocks(source.src, name);
    return source;
  };
  const env = new nunjucks.Environment(loader, { autoescape: true });

  // v('assets/css/zrq.css'): hash do conteúdo, para usar em "?v=" nos links de css/js
  // (o browser volta a descarregar o ficheiro quando ele muda, em vez de usar o da cache)
  env.addGlobal("v", function (file) {
    return crypto.createHash("md5").update(readText(srcPath(file))).digest("hex").slice(0, 8);
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
  let src = srcPath(/^https?:\/\//.test(c.imagem_v_1440x1800) ? fallbackImage : c.imagem_v_1440x1800);
  if (!fs.existsSync(src)) {
    log.warn(`og: imagem "${src}" do evento "${c.id}" não existe, a usar a imagem por defeito`);
    src = srcPath(fallbackImage);
  }
  return renderOgJpg(sharp, src, distPath(`${OG_DIR}/${c.id}.jpg`));
}

// uma imagem de cada vez: as fotos grandes (2560px) gastam muita memória a descodificar
async function eachInSequence(list, fn) {
  for (const item of list) await fn(item);
}

// ---------------------------------------------------------------------------
// Cópia dos ficheiros estáticos (src/ -> dist/)

// caminho relativo a src/ ("assets/css/zrq.css") de um ficheiro que é copiado para dist/? (null se não for)
function staticRel(file) {
  const rel = path.relative(SRC_DIR, file).split(path.sep).join("/");
  if (!rel || rel.startsWith("..")) return null;
  if (rel.split("/").some((part) => part.startsWith("."))) return null; // .DS_Store, ...
  if (STATIC_EXCLUDE.some((p) => rel === p || rel.startsWith(p + "/"))) return null;
  return rel;
}

// copia um ficheiro de src/ para dist/ (só os que vão para o site)
function copyStatic(file) {
  const rel = staticRel(file);
  if (!rel || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const dest = distPath(rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
  return true;
}

// no watch: copia o ficheiro alterado, ou apaga-o de dist/ se foi apagado de src/
// (só se continuar a não existir passado meio segundo: os editores e o git às vezes
// apagam e voltam a criar o ficheiro ao gravar)
function syncStatic(file) {
  const rel = staticRel(file);
  if (!rel) return;
  try {
    if (copyStatic(file)) return;
  } catch (e) {
    log.warn(`não deu para copiar ${file} (${e.code || e.message}), a tentar outra vez`);
  }
  setTimeout(() => {
    try {
      if (!copyStatic(file) && !fs.existsSync(file)) fs.rmSync(distPath(rel), { recursive: true, force: true });
    } catch (e) {
      log.warn(`não deu para copiar ${file}: ${e.message}`);
    }
  }, 500);
}

// ---------------------------------------------------------------------------
// Tarefas

const tasks = {
  // Converte as imagens novas (das pastas de imagens e as fotos dos concertos em jpg, png, webp, ... estejam onde estiverem)
  // em <imagem>.avif (em src/) e move o original para ORIGINAIS_DIR
  // (se já existir um .avif com o mesmo nome é substituído). O .webp é feito a seguir pela tarefa webp.
  avif: async ({ concertImages }) => {
    const sharp = require("sharp");
    const toAvif = (src) => src.replace(/\.[^.\/]+$/, ".avif");
    const seen = {};
    const concertSrc = concertImages.map(srcPath).filter((p) => {
      if (!CONCERT_IMG_EXT.test(p)) return false;
      if (fs.existsSync(p)) return true;
      if (!fs.existsSync(avifPath(p))) log.warn(`avif: a foto "${p}" (concertos.yaml / site.yaml) não existe`);
      return false;
    });
    const found = IMG_DIRS.map(srcPath)
      .flatMap(listFiles)
      .filter((f) => AVIF_SRC_EXT.test(f) && !AVIF_EXCLUDE(path.posix.relative(SRC_DIR, f)));
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
      const dest = path.posix.join(ORIGINAIS_DIR, path.posix.relative(SRC_DIR, src));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
      log.info(`avif: ${src} (original em ${dest})`);
    });
    log.ok(`${todo.length} imagens convertidas para .avif`);
  },

  // Gera <imagem>.webp ao lado de cada <imagem>.avif em src/ (só as novas ou alteradas desde a última vez),
  // incluindo as fotos dos concertos que estejam fora das pastas de imagens
  webp: async ({ concertImages }) => {
    const sharp = require("sharp");
    const all = IMG_DIRS.map(srcPath)
      .flatMap(listFiles)
      .filter((f) => /\.avif$/i.test(f));
    concertImages.map((p) => srcPath(avifPath(p))).forEach((p) => {
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

  // Apaga a pasta dist/ (o build volta a gerá-la toda; assim não ficam lá concertos/páginas antigos)
  clean: () => {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    log.ok(`${DIST_DIR}/ apagada`);
  },

  // Copia os ficheiros estáticos de src/ para dist/ (tudo exceto os templates e o STATIC_EXCLUDE)
  static: () => {
    const copied = listFiles(SRC_DIR).filter(copyStatic).length;
    log.ok(`${copied} ficheiros copiados de ${SRC_DIR}/ para ${DIST_DIR}/`);
  },

  // Gera dist/assets/img/og/<id>.jpg (cópia da imagem_v_1440x1800 de cada evento) e default.jpg (cópia da default_imagem_v_1440x1800)
  og: async ({ config, events }) => {
    const sharp = require("sharp");
    const ogDir = distPath(OG_DIR);
    fs.rmSync(ogDir, { recursive: true, force: true }); // sem as og de concertos que já não estão ativos
    fs.mkdirSync(ogDir, { recursive: true });
    // as imagens por defeito também podem estar no site.yaml como .jpg / .png: usa o .avif
    const defaultV = avifPath(imagePath(config.default_imagem_v_1440x1800));
    const jobs = events.map((c) => renderEventOg(sharp, c, defaultV));
    jobs.push(renderOgJpg(sharp, srcPath(defaultV), `${ogDir}/${OG_DEFAULT}.jpg`));
    const files = await Promise.all(jobs);
    log.ok(`${files.length} imagens og geradas em ${ogDir}`);
  },

  // Gera o HTML a partir dos templates de src/templates/, para cada língua:
  // as páginas (dist/x.html e dist/en/x.html) e, para cada evento ativo,
  // dist/concerts/<id>/index.html e dist/en/concerts/<id>/index.html a partir de event.html
  html: ({ data, events }) => {
    const env = createEnv();
    const pages = [];
    Object.keys(LANGS).forEach((lang) => {
      listPages().forEach((file) => {
        pages.push({ dest: distFile(pagePath(file, lang)), src: file, ctx: () => pageContext(file, lang, data) });
      });
      // as páginas dos concertos são refeitas do zero (sem as dos concertos que já não estão ativos)
      fs.rmSync(distPath(LANGS[lang].base + CONCERTS_DIR), { recursive: true, force: true });
      events.forEach((c) => {
        pages.push({ dest: distFile(eventPath(c, lang)), src: EVENT_TEMPLATE, ctx: () => eventContext(c, lang, data) });
      });
    });
    const failed = [];
    pages.forEach((p) => {
      try {
        writeFile(p.dest, env.render(p.src, Object.assign({}, data, p.ctx())));
      } catch (e) {
        failed.push(`${p.dest}: ${e.message}`);
      }
    });
    if (failed.length) throw new Error(`Erro ao gerar ${failed.length} páginas:\n${failed.join("\n")}`);
    log.ok(`${pages.length} páginas geradas`);
  },

  // Escreve o dist/sitemap.xml: todas as páginas (PT e EN, ligadas com hreflang) e os concertos ativos.
  // Fora: a 404 e a loja enquanto loja_ativa for false.
  sitemap: ({ data, events }) => {
    const site = siteUrl(data);
    const escapeXml = (s) =>
      String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]);
    const pairs = [];
    listPages()
      .filter((f) => f !== PAGE_404)
      .filter((f) => data.loja_ativa || !/^shop/.test(f))
      .forEach((f) => pairs.push([site + pagePath(f, "pt"), site + pagePath(f, "en")]));
    events.forEach((c) => pairs.push([site + eventPath(c, "pt"), site + eventPath(c, "en")]));
    const entry = (loc, pt, en) =>
      `  <url>\n    <loc>${escapeXml(loc)}</loc>\n` +
      `    <xhtml:link rel="alternate" hreflang="pt" href="${escapeXml(pt)}"/>\n` +
      `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}"/>\n` +
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(pt)}"/>\n  </url>`;
    const urls = [];
    pairs.forEach(([pt, en]) => urls.push(entry(pt, pt, en), entry(en, pt, en)));
    writeFile(
      distPath("sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
        urls.join("\n") +
        `\n</urlset>\n`
    );
    log.ok(`sitemap.xml com ${urls.length} endereços`);
  },

  // Escreve o dist/_redirects (Netlify): os endereços antigos (x_en.html, concerts/<id>-en/, app/dados/, dados/)
  // passam para os novos com 301 (links já partilhados e o Google), e a 404 em inglês para os endereços em /en/
  redirects: ({ events }) => {
    const lines = ["# Gerado pelo build.js (tarefa redirects): não editar"];
    OLD_EN_PAGES.forEach((p) => lines.push(`/${p}_en.html  ${pagePath(`${p}.html`, "en")}  301`));
    events.forEach((c) => {
      lines.push(`/${CONCERTS_DIR}/${c.id}-en  ${eventPath(c, "en")}  301`);
      lines.push(`/${CONCERTS_DIR}/${c.id}-en/*  ${eventPath(c, "en")}  301`);
    });
    lines.push("/app/dados/*  /config/:splat  301");
    lines.push("/dados/config.yaml  /config/site.yaml  301");
    lines.push("/dados/*  /config/:splat  301");
    lines.push(`/en/*  /en/${PAGE_404}  404`);
    writeFile(distPath("_redirects"), lines.join("\n") + "\n");
    log.ok(`_redirects com ${lines.length - 1} regras`);
  },
};

// build completo (local): também converte as imagens novas em src/ (avif / webp têm de ir no commit)
const DEFAULT_TASKS = ["avif", "webp", "clean", "static", "og", "html", "sitemap", "redirects"];
// o que o Netlify corre (npm run build:netlify) e o arranque do npm run dev: sem mexer nas imagens de src/
const SITE_TASKS = ["clean", "static", "og", "html", "sitemap", "redirects"];

async function run(names) {
  const ctx = loadData();
  for (const name of names) {
    log.info(`\n[${name}]`);
    await tasks[name](ctx);
  }
}

// Atualiza dist/ sempre que muda algo em src/: os ficheiros estáticos são copiados (ou apagados) e
// o HTML é regenerado (templates, yaml, e também css/js, por causa do ?v= nos links).
// Não corre og / avif / webp: depois de mexer em fotos ou concertos corre "npm run build".
function watch() {
  let timer = null;
  const changed = new Set();
  const rebuild = () => {
    timer = null;
    const files = [...changed];
    changed.clear();
    files.forEach(syncStatic);
    const html = files.some((f) => !staticRel(f) || /\.(html|ya?ml|css|js)$/i.test(f));
    if (!html) return log.ok(`${files.length} ficheiros copiados`);
    run(["html", "sitemap"]).catch((e) => console.error(`ERRO: ${e.message}`));
  };
  fs.watch(SRC_DIR, { recursive: true }, (event, name) => {
    if (!name) return;
    changed.add(path.join(SRC_DIR, name).split(path.sep).join("/"));
    clearTimeout(timer);
    timer = setTimeout(rebuild, 200);
  });
  log.info(`\nÀ espera de alterações em ${SRC_DIR}/ (Ctrl+C para sair)`);
}

// Servidor local de dist/ (como o Netlify: /en/ -> /en/index.html, 404.html para o que não existe)
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

function serve() {
  const root = path.resolve(DIST_DIR);
  const find = (urlPath) => {
    let file = path.join(root, urlPath);
    if (!file.startsWith(root)) return null;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
  };
  http
    .createServer((req, res) => {
      let urlPath;
      try {
        urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      } catch (e) {
        urlPath = "/";
      }
      // /en -> /en/ (como no Netlify), para os links relativos funcionarem
      if (!path.extname(urlPath) && !urlPath.endsWith("/") && find(urlPath + "/")) {
        res.writeHead(301, { Location: urlPath + "/" });
        return res.end();
      }
      let file = find(urlPath);
      let status = 200;
      if (!file) {
        status = 404;
        file = find(urlPath.startsWith("/en/") ? `/en/${PAGE_404}` : `/${PAGE_404}`);
      }
      if (!file) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(status, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
      fs.createReadStream(file).pipe(res);
    })
    .listen(DEV_PORT, () => log.info(`\nSite em http://localhost:${DEV_PORT}/ (EN em http://localhost:${DEV_PORT}/en/)`));
}

const SPECIAL = { watch, serve };
const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== "dev" && !SPECIAL[a] && !tasks[a]);
if (unknown.length) {
  console.error(`Tarefa desconhecida: ${unknown.join(", ")}. Tarefas: ${Object.keys(tasks).join(", ")}, watch, serve, dev`);
  process.exit(1);
}

// "dev" = build do site (sem avif/webp) + watch + serve
const names = args.flatMap((a) => (a === "dev" ? SITE_TASKS.concat("watch", "serve") : [a]));
const buildTasks = names.filter((a) => tasks[a]);
const extra = names.filter((a) => SPECIAL[a]);
run(buildTasks.length || extra.length ? buildTasks : DEFAULT_TASKS)
  .then(() => extra.forEach((a) => SPECIAL[a]()))
  .catch((e) => {
    console.error(`ERRO: ${e.message}`);
    process.exit(1);
  });
