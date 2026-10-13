# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Site estático da banda The Invisible Tuba (theinvisibletuba.com), bilingue PT/EN. O código, os comentários e os dados YAML estão em português — manter essa convenção.

## Comandos

- `npx grunt` — build completo (tarefa `default`): `clean-concerts` → `og` → `webp` → `nunjucks`.
- `npx grunt nunjucks` — só recompila o HTML (rápido, sem gerar imagens).
- `npx grunt og` — regenera as imagens de partilha em `assets/img/og/` (usa `sharp`).
- `npx grunt webp` — gera `<imagem>.webp` ao lado de cada `.avif` em `assets/img/` e `forms/assets/img/` (só as novas/alteradas).
- `npx grunt watch` — recompila (`nunjucks`) quando muda algo em `app/*.*`. Nota: não vê `app/dados/*.yaml` nem corre `og`/`clean-concerts`; depois de mexer em concertos corre `npx grunt`.
- `npm run git -- "mensagem"` — `git add . && git commit`, seguido de `git push` e `git ftp push` (deploy por FTP com [git-ftp](https://github.com/git-ftp/git-ftp)). É um deploy para produção.

Não há testes nem linter. O SCSS em `assets/scss/` não é compilado por nenhum script do projeto; o CSS próprio do site está em `assets/css/zrq.css`, `zrq-cart.css`, `shop.css`.

## Arquitetura

### Templates → HTML gerado
- As fontes estão em `app/` (Nunjucks, via `grunt-nunjucks-2-html`). Os ficheiros `*.html` na raiz e em `concerts/` são **gerados — nunca editar**, são sobrescritos no build. (O README fala em `grunt-bake`; isso está desatualizado, exceto em `landing/concert/_sources/camones/`, que tem o seu próprio Gruntfile com bake.)
- Cada página existe em duas versões: `x.html` (PT) e `x_en.html` (EN). Parciais com prefixo `_` (`_head.html`, `_menu[_en].html`, `_footer[_en].html`, `_upcoming_concerts.html`). Alguns parciais escolhem a língua com `{% set lang = 'en' %}` antes do `include`.
- Páginas novas têm de ser adicionadas ao mapa `files` do `nunjucks.render` em [Gruntfile.js](Gruntfile.js).
- Filtros personalizados definidos no Gruntfile: `nl2br` e `linkify` (URLs, emails e `@utilizador` → Instagram). Função global `v('caminho')` → hash do conteúdo, usada como `?v=` nos links do CSS/JS próprio para o browser não usar versões antigas da cache (usar também em links novos para css/js do site).
- `preprocessData` injeta por página `og` / `page_description` (`pageContext`) ou, nas páginas de evento, o contexto do evento (`eventContext`).

### Dados (`app/dados/`)
Os três YAML são juntados num único objeto de dados disponível em todos os templates:
- `config.yaml` — contactos, `site_url`, imagens por defeito dos eventos.
- `concertos.yaml` — lista `concerts`. O cabeçalho do ficheiro documenta os campos. `prepareConcerts` valida (`data` em `yyyymmdd` ou `yyyymm??`; `id` único em kebab-case, porque é o URL), calcula `day`/`month`/`month_en`/`isPast` **no momento do build** e ordena por data.
- `artigos_loja.yaml` — produtos da loja.

### Páginas de concertos
Cada concerto com `isEnabled: true` gera `concerts/<id>/index.html` (PT) e `concerts/<id>-en/index.html` (EN) a partir de `app/event.html`, mais `assets/img/og/<id>[-en].jpg` (foto do hero + texto + logo). `clean-concerts` apaga as pastas e imagens og de concertos desativados/removidos. Mudar um `id` muda um link possivelmente já partilhado. Como `isPast` é calculado no build, `assets/scripts/zrq.js` esconde no browser os concertos que passaram depois da compilação.

### Loja (Stripe)
- `assets/scripts/shop.js` e `zrq-cart.js` carregam `app/dados/artigos_loja.yaml` em runtime no browser (com `js-yaml`) — por isso `app/dados/` tem de estar publicado no servidor.
- `api/create-checkout-session.php` cria a sessão Stripe Checkout com preços validados do lado do servidor, lidos do mesmo `app/dados/artigos_loja.yaml` (via `api/yaml.php`, que usa a extensão `yaml` do PHP se existir, senão um leitor simples incluído).
- `api/config.php` (segredos Stripe) está no `.gitignore`; o modelo é `api/config.example.php`.

### Imagens AVIF + fallback WebP
As imagens do site são `.avif`; a tarefa `webp` cria cópias `.webp` (que têm de ir no commit, porque o deploy é por git-ftp). `assets/scripts/avif-fallback.js`, carregado no `<head>` (`_head.html`, landing pages e newsletter), troca `.avif` por `.webp` em browsers sem AVIF (Safari/iOS < 16): nos `<img>` quando dão erro, e nos `background-image` (inline, CSS e postos por JS) depois de testar o suporte. Nos templates continua-se a usar só `.avif`.

### Outras pastas
- `forms/newsletter/` — página de subscrição da newsletter (formulário Brevo); independente do build.
- `landing/` — landing pages autónomas (concerto multilingue).
- `docs/` — EPK em PDF e media kit.
