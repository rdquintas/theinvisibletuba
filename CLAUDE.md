# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site estático da banda The Invisible Tuba (theinvisibletuba.com), bilingue PT/EN. O código, os comentários e os dados YAML estão em português — manter essa convenção.

## Estrutura

- `src/` — todas as fontes do site.
  - `src/templates/` — templates Nunjucks: páginas (`index.html`, `contact.html`, ...), parciais com prefixo `_` (`_head.html`, `_menu.html`, `_footer.html`, `_upcoming_concerts.html`) e `event.html` (páginas dos concertos).
  - `src/config/` — os yaml (`site.yaml`, `concertos.yaml`, `artigos_loja.yaml`). Também são publicados em `/config/` (a loja lê-os).
  - o resto (`assets/`, `docs/`, `landing/`, `forms/`, `checkout/`, `robots.txt`, `favicon.png`, ...) é copiado tal e qual para `dist/`, exceto o `STATIC_EXCLUDE` do build.js (`templates`, `assets/scss`, `landing/concert/_sources`).
- `dist/` — o site gerado (no `.gitignore`). É apagado e refeito em cada build: **nunca editar**.
- `netlify/functions/` — a Netlify Function da loja.
- `build.js` — o build (Node, sem Grunt).

## Línguas

- PT é a língua por defeito, na raiz (`/contact.html`); EN fica em `/en/` (`/en/contact.html`). A index é `/` e `/en/`. Já não há ficheiros `x_en.html`.
- Cada template de página tem as duas línguas no mesmo ficheiro e é gerado duas vezes (`dist/x.html` e `dist/en/x.html`):
  `<h2>{{#lang pt}}Texto em PT{{/lang}}{{#lang en}}Text in EN{{/lang}}</h2>`
- `{{#lang xx}}...{{/lang}}` é trocado por `{% if lang == "xx" %}...{% endif %}` antes de o Nunjucks ler o template (`langBlocks` no build.js, aplicado também aos parciais). Pode ter várias linhas e outras tags, mas não pode estar dentro de outro bloco de língua nem dentro de uma expressão `{{ }}` / `{% %}` — aí usa-se a variável: `{% set page_title = ("Privacy Policy" if lang == "en" else "Política de Privacidade") + " | ..." %}`.
- Variáveis de todas as páginas (definidas no build.js, `langContext`): `lang` (`pt`/`en`), `base` (`/` ou `/en/`, para links entre páginas: `{{ base }}contact.html`), `root` (`/`, para assets: `{{ root }}assets/...`) e `alt_lang_url` (a mesma página na outra língua, usada no seletor de língua do `_menu.html`).
- Os links são sempre absolutos (as páginas EN estão numa subpasta).
- No browser, `zrq-cart.js` e `shop.js` sabem a língua pelo endereço (`/en/...`).
- Os endereços antigos (`x_en.html`, `concerts/<id>-en/`, `app/dados/`, `dados/`) são redirecionados com 301 pelo `dist/_redirects` (tarefa `redirects`), que também serve a `/en/404.html` nos endereços em `/en/` que não existem.

## Comandos

O build é feito por [build.js](build.js): `node build.js [tarefa ...]`; os scripts do `package.json` chamam-no.

- `npm run dev` — gera o site em `dist/` (sem `avif`/`webp`), serve-o em http://localhost:8080 (`PORT` para mudar) e atualiza-o quando muda algo em `src/` (watch).
- `npm run build` — build completo: `avif` → `webp` → `clean` → `static` → `og` → `html` → `sitemap` → `redirects`.
- `npm run build:netlify` — o build que o Netlify corre: igual mas sem `avif`/`webp`.
- `npm run watch` — só o watch (sem servidor): copia os ficheiros estáticos alterados e regenera o HTML (templates, yaml, css/js por causa do `?v=`). Não corre `og`/`avif`/`webp`; depois de mexer em fotos ou concertos corre `npm run build`.
- `npm run serve` — só o servidor local de `dist/` (como o Netlify: `/en/` → `/en/index.html`, 404 para o que não existe).
- `npm run html` — só recompila o HTML.
- `npm run clean` — apaga `dist/`.
- `npm run og` — regenera as imagens de partilha em jpg em `dist/assets/img/og/`: `<id>.jpg` por concerto ativo (cópia da `imagem_v_1440x1800`) e `default.jpg` das páginas normais (cópia da `default_imagem_v_1440x1800`), sem logo nem texto (usa `sharp`). Só existem em `dist/`.
- `npm run avif` — converte as imagens novas (jpg, png, gif, tif) de `src/assets/img/` e `src/forms/assets/img/` (e as fotos dos concertos) para `.avif` (máx. 2560px) e move o original para `_originais/` (no `.gitignore`). Não mexe no `logo_transp_v00.png`.
- `npm run webp` — gera `<imagem>.webp` ao lado de cada `.avif` em `src/` (só as novas/alteradas).
- `npm run sitemap` — regenera o `dist/sitemap.xml` (páginas PT/EN + concertos ativos; sem a 404 e sem a loja enquanto `loja_ativa: false`) e o `dist/_redirects`.
- `npm run git -- "mensagem"` — `git add . && git commit`, seguido de `git push`.

## Deploy (Netlify)

O site está no Netlify ([netlify.toml](netlify.toml)). Em cada push o Netlify corre `npm run build:netlify` e publica a pasta `dist/`.

- O Netlify **não** corre `avif` nem `webp`: as imagens `.avif`/`.webp` têm de ir no commit, em `src/` (corre `npm run build` localmente antes). As og e o HTML são gerados no Netlify (por isso o `isPast` dos concertos é o do dia do deploy).
- Não há PHP. A loja usa a Netlify Function `netlify/functions/create-checkout-session.mjs` (`/api/create-checkout-session`), que precisa da variável de ambiente `STRIPE_SECRET_KEY` no Netlify.
- A 404 é servida automaticamente pelo Netlify a partir da `dist/404.html` (e da `dist/en/404.html` em `/en/`, pelo `_redirects`).
- Para testar a função localmente: `npx netlify dev` (Netlify CLI, não instalado no projeto; a chave pode ir num `.env`, que está no `.gitignore`).

Não há testes nem linter. O SCSS em `src/assets/scss/` não é compilado por nenhum script do projeto; o CSS próprio do site está em `src/assets/css/zrq.css`, `zrq-cart.css`, `shop.css`.

## Arquitetura

### Templates → HTML gerado
- Todos os `*.html` de `src/templates/` que não começam por `_` (e não são o `event.html`) são páginas: são gerados em PT e EN sem ser preciso registá-los (render e sitemap).
- `404.html` usa `noindex` e só links absolutos; o Netlify serve-a sozinho em qualquer endereço que não exista.
- Variáveis de página no `_head.html`: `noindex` (meta robots), `page_title` e `jsonld` (dados estruturados schema.org: `MusicGroup` na index, `MusicEvent` nas páginas de evento, gerados no build.js).
- Filtros personalizados definidos em `createEnv` no build.js: `nl2br` e `linkify` (URLs, emails e `@utilizador` → Instagram). Função global `v('caminho')` → hash do conteúdo de `src/<caminho>`, usada como `?v=` nos links do CSS/JS próprio para o browser não usar versões antigas da cache (usar também em links novos para css/js do site).
- A tarefa `html` junta aos dados, por página e língua, `lang` / `base` / `alt_lang_url` / `og` / `page_description` / `jsonld` (`pageContext`) ou, nas páginas de evento, o contexto do evento (`eventContext`).

### Dados (`src/config/`)
Os três YAML são juntados num único objeto de dados disponível em todos os templates:
- `site.yaml` — contactos, `links` (newsletter, EPK, `site_url` e redes sociais — `instagram`, `spotify`, `tiktok`, `youtube`, `facebook`, também o `sameAs` do JSON-LD; nos templates `{{ links.instagram }}`), imagens por defeito dos eventos, `loja_ativa` (mostra o carrinho e o link "Shop" e carrega os scripts da loja em todas as páginas).
- `concertos.yaml` — lista `concerts`. O cabeçalho do ficheiro documenta os campos. `prepareConcerts` valida (`data` em `yyyymmdd` ou `yyyymm??`; `id` único em kebab-case, porque é o URL), calcula `day`/`month`/`month_en`/`isPast` **no momento do build** e ordena por data.
- `artigos_loja.yaml` — produtos da loja (`price` sem IVA), `loja_iva` (%) e `loja_portes` (EUR por encomenda), usados pelo carrinho e pelo checkout.

### Páginas de concertos
Cada concerto com `isEnabled: true` gera `dist/concerts/<id>/index.html` (PT) e `dist/en/concerts/<id>/index.html` (EN) a partir de `src/templates/event.html`; a tarefa `html` apaga antes as pastas `concerts/`, por isso os concertos desativados desaparecem sozinhos. `imagem_h` / `imagem_v_1440x1800` (e `default_imagem_h/_v` do config) são caminhos do site (`/assets/img/...`, ficheiro em `src/assets/img/...`) e aceitam `.jpg/.png/.webp/.gif/.tif/.avif`: `prepareConcerts` troca a extensão por `.avif` (`avifPath`), e as tarefas `avif` e `webp` convertem essas fotos onde quer que estejam (lista `concertImages`). A imagem de partilha (og) é `assets/img/og/<id>.jpg` (a mesma em PT e EN): uma cópia em jpg da `imagem_v_1440x1800` (máx. 1080×1920), sem texto nem logo, porque as redes sociais não leem AVIF; as og são sempre jpg. A descrição da partilha é "dia MÊS hora" + nome do evento + os primeiros 200 caracteres do `info` (`info_en` em EN) seguidos de "...". Mudar um `id` muda um link possivelmente já partilhado. Como `isPast` é calculado no build, `src/assets/scripts/zrq.js` esconde no browser os concertos que passaram depois da compilação.

### Loja (Stripe)
- Com `loja_ativa: false` só a `shop.html` (PT e EN) carrega os scripts da loja (`pagina_loja`) e fica com `noindex`.
- `src/assets/scripts/shop.js` e `zrq-cart.js` carregam `/config/artigos_loja.yaml` em runtime no browser (com `js-yaml`) — por isso `src/config/` é publicado.
- `netlify/functions/create-checkout-session.mjs` (Netlify Function em `/api/create-checkout-session`, chamada pelo `zrq-cart.js`) cria a sessão Stripe Checkout com preços validados do lado do servidor, lidos do `/config/artigos_loja.yaml` publicado no próprio site (preço + IVA arredondado por unidade, portes fixos, moeda do `currency` do yaml, morada só em Portugal — as contas do carrinho seguem as mesmas regras).
- A chave secreta é a variável de ambiente `STRIPE_SECRET_KEY` do Netlify (nunca no repositório).
- Depois do pagamento o Stripe volta para `checkout/success.html` (esvazia o carrinho) ou `checkout/cancel.html`, com `?lang=en|pt`. São páginas estáticas feitas à mão em `src/checkout/` (não geradas pelos templates), com `noindex`.

### Imagens AVIF + fallback WebP
As imagens do site são `.avif`; a tarefa `webp` cria cópias `.webp` (que têm de ir no commit). `src/assets/scripts/avif-fallback.js`, carregado no `<head>` (`_head.html`, landing pages e newsletter), troca `.avif` por `.webp` em browsers sem AVIF (Safari/iOS < 16): nos `<img>` quando dão erro, e nos `background-image` (inline, CSS e postos por JS) depois de testar o suporte. Nos templates continua-se a usar só `.avif`.

### Outras pastas (em `src/`, copiadas tal e qual)
Nos ficheiros estáticos `.html` / `.txt` / `.xml` (landing pages, newsletter, docs, `robots.txt`) o `copyStatic` do build.js troca `{{ links.xxx }}` pelo link do `site.yaml` (só isto: não passam pelo Nunjucks; dá erro se o link não existir). Os links da banda e do site nunca se escrevem à mão: vêm sempre de `links` no `site.yaml`.
- `forms/newsletter/` — página de subscrição da newsletter (formulário Brevo); independente dos templates.
- `landing/` — landing pages autónomas (concerto multilingue).
- `docs/` — EPK em PDF e media kit.
