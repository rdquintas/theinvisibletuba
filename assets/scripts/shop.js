/* ===========================================================
   The Invisible Tuba — shop catalogue
   Renders the product grid from shop.json and drives the
   image lightbox/carousel. Cart state itself lives in zrq-cart.js.
   =========================================================== */
(function (window, document) {
  'use strict';

  var SHOP_JSON_URL = '../app/dados/artigos_loja.json';
  var grid = document.getElementById('zrq-shop-grid');
  if (!grid) { return; }

  var lang = grid.getAttribute('data-lang') ||
    (/_en\.html?$/i.test(window.location.pathname) ? 'en' : 'pt');

  var strings = {
    pt: { add: 'ACRESCENTAR', empty: 'Ainda não há produtos disponíveis.', loading: 'A carregar produtos...' },
    en: { add: 'ADD', empty: 'No products available yet.', loading: 'Loading products...' }
  };
  var t = strings[lang];

  function buildAddButtonContent(btn) {
    var icon = document.createElement('i');
    icon.className = 'fa-solid fa-cart-shopping';
    btn.appendChild(icon);
    btn.appendChild(document.createTextNode(' ' + t.add));
  }

  function placeholderImage(label) {
    if (window.ZrqCart && window.ZrqCart.placeholderImage) {
      return window.ZrqCart.placeholderImage(label);
    }
    return '';
  }

  function formatPrice(amount) {
    if (window.ZrqCart && window.ZrqCart.formatPrice) {
      return window.ZrqCart.formatPrice(amount);
    }
    return '€' + amount.toFixed(2);
  }

  /* ---------------- Grid ---------------- */
  function renderGrid(products) {
    grid.innerHTML = '';

    if (!products.length) {
      var empty = document.createElement('p');
      empty.className = 'shop-empty';
      empty.textContent = t.empty;
      grid.appendChild(empty);
      return;
    }

    products.forEach(function (product) {
      var text = product[lang] || {};
      var card = document.createElement('article');
      card.className = 'shop-card';
      card.setAttribute('data-id', product.id);

      var media = document.createElement('div');
      media.className = 'shop-card-media';

      var img = document.createElement('img');
      img.loading = 'lazy';
      img.src = (product.images && product.images[0]) || placeholderImage(text.title);
      img.alt = text.title || product.id;
      img.onerror = function () {
        img.onerror = null;
        img.src = placeholderImage(text.title);
      };
      media.appendChild(img);

      var body = document.createElement('div');
      body.className = 'shop-card-body';

      var title = document.createElement('h3');
      title.className = 'shop-card-title';
      title.textContent = text.title || product.id;

      var price = document.createElement('h3');
      price.className = 'shop-card-price';
      price.textContent = formatPrice(product.price);
      price.textContent = price.textContent + " + IVA";

      var desc = document.createElement('p');
      desc.className = 'shop-card-desc';
      desc.textContent = text.description || '';

      var footer = document.createElement('div');
      footer.className = 'shop-card-footer';

      var addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'shop-add-btn';
      buildAddButtonContent(addBtn);
      addBtn.setAttribute('data-id', product.id);

      footer.appendChild(addBtn);

      body.appendChild(title);
      body.appendChild(price);
      body.appendChild(desc);
      body.appendChild(footer);

      card.appendChild(media);
      card.appendChild(body);
      grid.appendChild(card);

      media.addEventListener('click', function () {
        openLightbox(product);
      });

      addBtn.addEventListener('click', function (evt) {
        evt.stopPropagation();
        if (window.ZrqCart) {
          window.ZrqCart.add(product.id, 1);
        }
      });
    });
  }

  /* ---------------- Lightbox / carousel ---------------- */
  var lightboxOverlay = null;
  var stageImg = null;
  var thumbsWrap = null;
  var infoTitle = null;
  var infoDesc = null;
  var infoPrice = null;
  var infoAddBtn = null;
  var currentProduct = null;
  var currentIndex = 0;

  function buildLightbox() {
    if (lightboxOverlay) { return; }

    lightboxOverlay = document.createElement('div');
    lightboxOverlay.className = 'shop-lightbox-overlay';

    var box = document.createElement('div');
    box.className = 'shop-lightbox';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'shop-lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');

    var media = document.createElement('div');
    media.className = 'shop-lightbox-media';

    var stage = document.createElement('div');
    stage.className = 'shop-lightbox-stage';

    stageImg = document.createElement('img');
    stage.appendChild(stageImg);

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'shop-lightbox-arrow shop-lightbox-prev';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.setAttribute('aria-label', 'Previous image');

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'shop-lightbox-arrow shop-lightbox-next';
    nextBtn.innerHTML = '&#8250;';
    nextBtn.setAttribute('aria-label', 'Next image');

    stage.appendChild(prevBtn);
    stage.appendChild(nextBtn);

    thumbsWrap = document.createElement('div');
    thumbsWrap.className = 'shop-lightbox-thumbs';

    media.appendChild(stage);
    media.appendChild(thumbsWrap);

    var info = document.createElement('div');
    info.className = 'shop-lightbox-info';

    infoTitle = document.createElement('h3');
    infoDesc = document.createElement('p');

    var infoFooter = document.createElement('div');
    infoFooter.className = 'shop-lightbox-footer';

    infoPrice = document.createElement('span');
    infoPrice.className = 'shop-card-price';

    infoAddBtn = document.createElement('button');
    infoAddBtn.type = 'button';
    infoAddBtn.className = 'shop-add-btn';
    buildAddButtonContent(infoAddBtn);

    // infoFooter.appendChild(infoPrice);
    infoFooter.appendChild(infoAddBtn);

    info.appendChild(infoTitle);
    info.appendChild(infoDesc);
    info.appendChild(infoFooter);

    box.appendChild(closeBtn);
    box.appendChild(media);
    box.appendChild(info);
    lightboxOverlay.appendChild(box);
    document.body.appendChild(lightboxOverlay);

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', function () { showImage(currentIndex - 1); });
    nextBtn.addEventListener('click', function () { showImage(currentIndex + 1); });

    lightboxOverlay.addEventListener('click', function (evt) {
      if (evt.target === lightboxOverlay) { closeLightbox(); }
    });

    infoAddBtn.addEventListener('click', function () {
      if (currentProduct && window.ZrqCart) {
        window.ZrqCart.add(currentProduct.id, 1);
      }
    });

    document.addEventListener('keydown', function (evt) {
      if (!lightboxOverlay.classList.contains('is-open')) { return; }
      if (evt.key === 'Escape') { closeLightbox(); }
      if (evt.key === 'ArrowLeft') { showImage(currentIndex - 1); }
      if (evt.key === 'ArrowRight') { showImage(currentIndex + 1); }
    });
  }

  function showImage(index) {
    var images = (currentProduct && currentProduct.images) || [];
    if (!images.length) { return; }
    currentIndex = (index + images.length) % images.length;
    var fallback = placeholderImage(currentProduct[lang] ? currentProduct[lang].title : currentProduct.id);
    stageImg.src = images[currentIndex] || fallback;
    stageImg.alt = currentProduct[lang] ? currentProduct[lang].title : currentProduct.id;
    stageImg.onerror = function () {
      stageImg.onerror = null;
      stageImg.src = fallback;
    };

    Array.prototype.forEach.call(thumbsWrap.children, function (dot, i) {
      dot.classList.toggle('is-active', i === currentIndex);
    });
  }

  function openLightbox(product) {
    buildLightbox();
    currentProduct = product;
    var text = product[lang] || {};

    infoTitle.textContent = text.title || product.id;    
    infoDesc.textContent = text.description || '';
    infoPrice.textContent = formatPrice(product.price);

    infoTitle.textContent = infoTitle.textContent + " | " + infoPrice.textContent;

    thumbsWrap.innerHTML = '';
    (product.images || []).forEach(function (src, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Image ' + (i + 1));
      dot.addEventListener('click', function () { showImage(i); });
      thumbsWrap.appendChild(dot);
    });

    showImage(0);
    lightboxOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxOverlay) { return; }
    lightboxOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ---------------- Init ---------------- */
  fetch(SHOP_JSON_URL)
    .then(function (res) { return res.json(); })
    .then(function (data) { renderGrid(data.products || []); })
    .catch(function () {
      grid.innerHTML = '<p class="shop-empty">' + t.empty + '</p>';
    });
})(window, document);
