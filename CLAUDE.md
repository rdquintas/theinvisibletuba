# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site estático da banda The Invisible Tuba (theinvisibletuba.com), bilingue PT/EN, alojado no Netlify. O código, os comentários e os dados YAML estão em português — manter essa convenção.

## Comandos

O build é um script Node simples, [build.js](build.js) (`node build.js [tarefa ...]`), chamado pelos scripts do `package.json`:

- `npm run dev` — build do site (sem `avif`/`webp`), servidor local em http://localhost:8080 (EN em `/en/`) e `watch`.
- `npm run build` — build completo: `avif` → `webp` → `clean` → `static` → `og` → `html` → `sitemap` → `redirects`.
- `npm run build:netlify` — o que o Netlify corre: igual ao build completo mas sem `avif`/`webp` (não mexe nas imagens de `src/`).
- `npm run html` — só regenera o HTML (rápido).
- `npm run og` — gera as imagens de partilha em `dist/assets/img/og/`: `<id>.jpg` por concerto ativo (cópia da `imagem_v_1440x1800`) e `default.jpg` (cópia da `default_imagem_v_1440x1800`), sem logo nem texto, máx. 1080×1920 (usa `sharp`).
- `npm run avif` — converte as imagens novas (jpg, png, gif, tif) de `src/assets/img/` e `src/forms/assets/img/` (e as fotos dos concertos onde estiverem) para `.avif` (máx. 2560px) e move o original para `_originais/` (no `.gitignore`). Não mexe no `logo_transp_v00.png`.
- `npm run webp` — gera `<imagem>.webp` ao lado de cada `.avif` (só as novas/alteradas).
- `npm run sitemap` — regenera `dist/sitemap.xml` e `dist/_redirects`.
- `npm run watch` / `npm run serve` — só o watch / só o servidor de `dist/`. O watch copia os estáticos e regenera `html` + `sitemap`, mas não corre `og`/`avif`/`webp`: depois de mexer em fotos ou concertos corre `npm run build`.
- `npm run git -- "mensagem"` — `git add . && git commit` seguido de `git push`. Um push para o ramo publicado faz deploy em produção no Netlify.

Não há testes nem linter. O SCSS em `src/assets/scss/` não é compilado por nenhum script (nem copiado para `dist/`); o CSS próprio do site está em `src/assets/css/zrq.css`, `zrq-cart.css`, `shop.css`.

## Arquitetura

### src/ → dist/
- As fontes estão todas em `src/`; o site gerado vai para `dist/` (a pasta publicada, no `.gitignore`). `dist/` é apagada e refeita em cada build — **nunca editar**.
- `src/templates/` — templates Nunjucks. O resto de `src/` (assets, docs, landing, forms, checkout, config, robots.txt, ...) é copiado tal e qual para `dist/` (tarefa `static`), exceto o `STATIC_EXCLUDE` do build.js (`templates`, `assets/scss`, `landing/concert/_sources`).
- Nos ficheiros estáticos de texto (`.html`, `.txt`, `.xml` — landing pages, newsletter, docs, robots.txt) o `{{ links.xxx }}` é trocado pelo link do `site.yaml` ao copiar (erro se o link não existir); não passam pelo Nunjucks.

### Templates e línguas
- Cada template tem as duas línguas no mesmo ficheiro: `{{#lang pt}}Texto{{/lang}}{{#lang en}}Text{{/lang}}` (convertido para `{% if lang == "pt" %}` antes do Nunjucks, também nos parciais). Os blocos não podem estar uns dentro dos outros nem dentro de `{{ }}`/`{% %}` — aí usa-se a variável `lang` (`{{ "Home" if lang == "en" else "Início" }}`).
- Cada página é gerada duas vezes: `dist/x.html` (PT, a língua por defeito) e `dist/en/x.html` (EN). Variáveis por língua: `lang`, `base` (`/` ou `/en/`, para links internos: `{{ base }}shop.html`), `root` (`/`), `alt_lang_url` (a mesma página na outra língua).
- Parciais começam por `_` (`_head.html`, `_menu.html`, `_footer.html`, `_upcoming_concerts.html`). Qualquer outro `*.html` em `src/templates/` é uma página (não é preciso registá-la); `event.html` é a página dos concertos.
- `404.html` tem `noindex`; o Netlify serve-a sozinho e o `_redirects` usa a `/en/404.html` para os endereços em `/en/`.
- Variáveis de página no `_head.html`: `noindex` (meta robots) e `jsonld` (schema.org: `MusicGroup` na index, `MusicEvent` nas páginas de evento, gerados no build.js por `pageContext` / `eventContext`, que também dão o `og` e a `page_description`).
- Filtros: `nl2br` e `linkify` (URLs, emails e `@utilizador` → Instagram). Função global `v('assets/css/zrq.css')` → hash do conteúdo, usada como `?v=` nos links do CSS/JS próprio para o browser não usar versões antigas da cache (usar também em links novos para css/js do site).

### Dados (`src/config/`)
Os três YAML são juntados num único objeto disponível em todos os templates, e são também publicados em `/config/` (a loja lê-os no browser):
- `site.yaml` — contactos, `loja_ativa`, imagens por defeito dos eventos e `links:` (todos os links do site: `site_url`, newsletter, EPK, Google Drive, redes sociais; usados como `{{ links.xxx }}`). As redes sociais (`instagram`, `spotify`, `tiktok`, `youtube`, `facebook`) vão também para o `sameAs` do JSON-LD.
- `concertos.yaml` — lista `concerts`. O cabeçalho do ficheiro documenta os campos. `prepareConcerts` valida (`data` em `yyyymmdd` ou `yyyymm??`; `id` único em kebab-case, porque é o URL), calcula `day`/`month`/`month_en`/`isPast` **no momento do build** e ordena por data. Erros no yaml param o build.
- `artigos_loja.yaml` — produtos da loja (`price` sem IVA), `loja_iva` (%) e `loja_portes` (EUR por encomenda).

### Páginas de concertos
- Cada concerto com `isEnabled: true` gera `dist/concerts/<id>/index.html` (PT) e `dist/en/concerts/<id>/index.html` (EN) a partir de `event.html`. As pastas de concertos são refeitas em cada build, por isso concertos desativados desaparecem sozinhos.
- `imagem_h` / `imagem_v_1440x1800` (e `default_imagem_h/_v` do `site.yaml`) aceitam `.jpg/.png/.webp/.gif/.tif/.avif`: o build troca a extensão por `.avif` (`avifPath`), e as tarefas `avif` e `webp` convertem essas fotos onde quer que estejam (`concertImages`).
- A imagem de partilha (og) é `assets/img/og/<id>.jpg` (a mesma em PT e EN), gerada só em `dist/`: as redes sociais não leem AVIF, por isso as og são sempre jpg. A descrição da partilha é "dia MÊS hora" + nome do evento + os primeiros 200 caracteres do `info` (`info_en` em EN) seguidos de "...".
- Mudar um `id` muda um link possivelmente já partilhado. Como `isPast` é calculado no build, `src/assets/scripts/zrq.js` esconde no browser os concertos que passaram depois da compilação.

### Redirects (`dist/_redirects`, gerado pela tarefa `redirects`)
Endereços antigos com 301: `x_en.html` → `/en/x.html`, `/concerts/<id>-en/` → `/en/concerts/<id>/`, `/app/dados/*` e `/dados/*` → `/config/*`. Páginas novas que existiam no formato antigo vão em `OLD_EN_PAGES` no build.js.

### Loja (Stripe)
- Com `loja_ativa: false` só a `shop.html` carrega os scripts da loja (`pagina_loja`) e fica com `noindex` (e fora do sitemap).
- `src/assets/scripts/shop.js` e `zrq-cart.js` carregam `/config/artigos_loja.yaml` em runtime no browser (com `js-yaml`).
- O checkout é a Netlify Function [netlify/functions/create-checkout-session.mjs](netlify/functions/create-checkout-session.mjs) (`POST /api/create-checkout-session`): cria a sessão Stripe Checkout com preços validados do lado do servidor, lidos do `/config/artigos_loja.yaml` publicado (preço + IVA arredondado por unidade, portes fixos, morada só em Portugal — as contas do carrinho seguem as mesmas regras). Precisa da variável de ambiente `STRIPE_SECRET_KEY` no Netlify. As páginas de retorno estão em `src/checkout/`.

### Imagens AVIF + fallback WebP
As imagens do site são `.avif`; a tarefa `webp` cria cópias `.webp`. Os `.avif`/`.webp` **não** são gerados no Netlify: corre `npm run build` localmente e faz commit deles. `src/assets/scripts/avif-fallback.js`, carregado no `<head>` (`_head.html`, landing pages e newsletter), troca `.avif` por `.webp` em browsers sem AVIF (Safari/iOS < 16): nos `<img>` quando dão erro, e nos `background-image` (inline, CSS e postos por JS) depois de testar o suporte. Nos templates continua-se a usar só `.avif`.

### Outras pastas
- `src/forms/newsletter/` — página de subscrição da newsletter (formulário Brevo); estática.
- `src/landing/concert/` — landing page autónoma do concerto, em várias línguas (`index_xx.html`); `_sources/camones/` (fontes + `data.json`) não é publicado.
- `src/docs/` — EPK em PDF e media kit.
