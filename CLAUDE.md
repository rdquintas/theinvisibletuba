# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site estático da banda The Invisible Tuba (theinvisibletuba.com), bilingue PT/EN. O código, os comentários e os dados YAML estão em português — manter essa convenção.

## Comandos

O build é feito por [build.js](build.js) (Node, sem Grunt): `node build.js [tarefa ...]`; os scripts do `package.json` chamam-no.

- `npm run build` — build completo: `clean-concerts` → `avif` → `og` → `webp` → `html` → `sitemap`.
- `npm run sitemap` — regenera o `sitemap.xml` (páginas PT/EN + concertos ativos; sem a 404 e sem a loja enquanto `loja_ativa: false`).
- `npm run html` — só recompila o HTML (rápido, sem gerar imagens).
- `npm run og` — regenera as imagens de partilha em jpg em `assets/img/og/`: `<id>.jpg` por concerto ativo (cópia da `imagem_v_1440x1800`) e `default.jpg` das páginas normais (cópia da `default_imagem_v_1440x1800`), sem logo nem texto (usa `sharp`).
- `npm run avif` — converte as imagens novas (jpg, png, gif, tif) de `assets/img/` e `forms/assets/img/` para `.avif` (máx. 2560px) e move o original para `_originais/` (no `.gitignore`). Não mexe em `assets/img/og/` nem no `logo_transp_v00.png`.
- `npm run webp` — gera `<imagem>.webp` ao lado de cada `.avif` em `assets/img/` e `forms/assets/img/` (só as novas/alteradas).
- `npm run clean-concerts` — apaga as páginas e as og dos concertos desativados/removidos.
- `npm run watch` — recompila o HTML quando muda algo em `app/` (templates e `app/dados/*.yaml`). Não corre `og`/`avif`/`webp`/`clean-concerts`; depois de mexer em concertos corre `npm run build`.
- `npm run netlify` — o build que o Netlify corre (ver abaixo): `clean-concerts` → `og` → `html` → `sitemap` → `dist`.
- `npm run git -- "mensagem"` — `git add . && git commit`, seguido de `git push`.

## Deploy (Netlify)

O site está no Netlify ([netlify.toml](netlify.toml)). Em cada push o Netlify corre `npm run netlify` e publica a pasta `dist/` (no `.gitignore`), que a tarefa `dist` do build.js enche com uma cópia do site **sem** os ficheiros de desenvolvimento (`DIST_EXCLUDE`: build.js, `package*.json`, `netlify/`, templates `app/*.html`, scss, `landing/concert/_sources`, `api/`, ficheiros começados por `.` na raiz, ...). Ficheiros/pastas novos na raiz são publicados, exceto se forem acrescentados ao `DIST_EXCLUDE`.

- O Netlify **não** corre `avif` nem `webp`: as imagens `.avif`/`.webp` têm de ir no commit (corre `npm run build` localmente antes). As og (`og`) e o HTML são regenerados no Netlify (por isso o `isPast` dos concertos é o do dia do deploy).
- Não há PHP. A loja usa a Netlify Function `netlify/functions/create-checkout-session.mjs` (`/api/create-checkout-session`), que precisa da variável de ambiente `STRIPE_SECRET_KEY` no Netlify.
- A 404 é servida automaticamente pelo Netlify a partir da `404.html` da raiz.
- Para testar a função localmente: `npx netlify dev` (Netlify CLI, não instalado no projeto; a chave pode ir num `.env`, que está no `.gitignore`).

Não há testes nem linter. O SCSS em `assets/scss/` não é compilado por nenhum script do projeto; o CSS próprio do site está em `assets/css/zrq.css`, `zrq-cart.css`, `shop.css`.

## Arquitetura

### Templates → HTML gerado
- As fontes estão em `app/` (Nunjucks, renderizado pelo [build.js](build.js), tarefa `html`). Os ficheiros `*.html` na raiz e em `concerts/` são **gerados — nunca editar**, são sobrescritos no build.
- Cada página existe em duas versões: `x.html` (PT) e `x_en.html` (EN). Parciais com prefixo `_` (`_head.html`, `_menu[_en].html`, `_footer[_en].html`, `_upcoming_concerts.html`). Alguns parciais escolhem a língua com `{% set lang = 'en' %}` antes do `include`.
- Páginas novas têm de ser adicionadas ao mapa `PAGE_FILES` em [build.js](build.js) (usado no render e no sitemap).
- `404.html` (de `app/404.html`) usa `root = "/"` e `noindex`; o Netlify serve-a sozinho em qualquer endereço que não exista.
- Variáveis de página no `_head.html`: `noindex` (meta robots) e `jsonld` (dados estruturados schema.org: `MusicGroup` na index, `MusicEvent` nas páginas de evento, gerados no build.js).
- Filtros personalizados definidos em `createEnv` no build.js: `nl2br` e `linkify` (URLs, emails e `@utilizador` → Instagram). Função global `v('caminho')` → hash do conteúdo, usada como `?v=` nos links do CSS/JS próprio para o browser não usar versões antigas da cache (usar também em links novos para css/js do site).
- A tarefa `html` junta aos dados, por página, `og` / `page_description` / `jsonld` (`pageContext`) ou, nas páginas de evento, o contexto do evento (`eventContext`).

### Dados (`app/dados/`)
Os três YAML são juntados num único objeto de dados disponível em todos os templates:
- `config.yaml` — contactos, `site_url`, imagens por defeito dos eventos, `loja_ativa` (mostra o carrinho e o link "Shop" e carrega os scripts da loja em todas as páginas).
- `concertos.yaml` — lista `concerts`. O cabeçalho do ficheiro documenta os campos. `prepareConcerts` valida (`data` em `yyyymmdd` ou `yyyymm??`; `id` único em kebab-case, porque é o URL), calcula `day`/`month`/`month_en`/`isPast` **no momento do build** e ordena por data.
- `artigos_loja.yaml` — produtos da loja (`price` sem IVA), `loja_iva` (%) e `loja_portes` (EUR por encomenda), usados pelo carrinho e pelo checkout.

### Páginas de concertos
Cada concerto com `isEnabled: true` gera `concerts/<id>/index.html` (PT) e `concerts/<id>-en/index.html` (EN) a partir de `app/event.html`. `imagem_h` / `imagem_v_1440x1800` (e `default_imagem_h/_v` do config) aceitam `.jpg/.png/.webp/.gif/.tif/.avif`: `prepareConcerts` troca a extensão por `.avif` (`avifPath`), e as tarefas `avif` e `webp` convertem essas fotos onde quer que estejam (lista `concertImages`). A imagem de partilha (og) é `assets/img/og/<id>.jpg` (a mesma em PT e EN): uma cópia em jpg da `imagem_v_1440x1800` (máx. 1080×1920), sem texto nem logo, porque as redes sociais não leem AVIF; as og são sempre jpg. A descrição da partilha é "dia MÊS hora" + nome do evento + os primeiros 200 caracteres do `info` (`info_en` em EN) seguidos de "...". `clean-concerts` apaga as pastas e as imagens og de concertos desativados/removidos. Mudar um `id` muda um link possivelmente já partilhado. Como `isPast` é calculado no build, `assets/scripts/zrq.js` esconde no browser os concertos que passaram depois da compilação.

### Loja (Stripe)
- Com `loja_ativa: false` só a `shop.html` / `shop_en.html` carregam os scripts da loja (`pagina_loja`) e ficam com `noindex`.
- `assets/scripts/shop.js` e `zrq-cart.js` carregam `app/dados/artigos_loja.yaml` em runtime no browser (com `js-yaml`) — por isso `app/dados/` tem de estar publicado (a tarefa `dist` mantém-no).
- `netlify/functions/create-checkout-session.mjs` (Netlify Function em `/api/create-checkout-session`, chamada pelo `zrq-cart.js`) cria a sessão Stripe Checkout com preços validados do lado do servidor, lidos do `app/dados/artigos_loja.yaml` publicado no próprio site (preço + IVA arredondado por unidade, portes fixos, moeda do `currency` do yaml, morada só em Portugal — as contas do carrinho seguem as mesmas regras).
- A chave secreta é a variável de ambiente `STRIPE_SECRET_KEY` do Netlify (nunca no repositório).
- Depois do pagamento o Stripe volta para `checkout/success.html` (esvazia o carrinho) ou `checkout/cancel.html`, com `?lang=en|pt`. São páginas estáticas feitas à mão (não geradas pelo build), com `noindex`.

### Imagens AVIF + fallback WebP
As imagens do site são `.avif`; a tarefa `webp` cria cópias `.webp` (que têm de ir no commit). `assets/scripts/avif-fallback.js`, carregado no `<head>` (`_head.html`, landing pages e newsletter), troca `.avif` por `.webp` em browsers sem AVIF (Safari/iOS < 16): nos `<img>` quando dão erro, e nos `background-image` (inline, CSS e postos por JS) depois de testar o suporte. Nos templates continua-se a usar só `.avif`.

### Outras pastas
- `forms/newsletter/` — página de subscrição da newsletter (formulário Brevo); independente do build.
- `landing/` — landing pages autónomas (concerto multilingue).
- `docs/` — EPK em PDF e media kit.
