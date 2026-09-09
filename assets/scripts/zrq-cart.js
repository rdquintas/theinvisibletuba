/* ===========================================================
   The Invisible Tuba — shopping cart
   Shared on every page: header icon + badge, sliding drawer,
   toast notifications and Stripe Checkout hand-off.
   Cart state lives in localStorage so it survives navigation.
   =========================================================== */
(function (window, document) {
  'use strict';

  var STORAGE_KEY = 'tib_shop_cart';
  var SHOP_JSON_URL = '../app/dados/artigos_loja.json';
  var VAT_RATE = 23 / 100;
  var CTT_VALUE = 3.50; // fixed shipping cost for Portugal (CTT)

  var lang = /_en\.html?$/i.test(window.location.pathname) ? 'en' : 'pt';

  var i18n = {
    pt: {
      title: 'O Meu Carrinho',
      empty: 'O teu carrinho está vazio.',
      clear: 'Limpar Carrinho',
      checkout: 'Finalizar Compra',
      checkoutBusy: 'A processar...',
      vatTotal: 'IVA Total (23%)',
      shipping: 'Portes de Envio*',
      shippingNote: '* Envios apenas para Portugal Continental e Ilhas.',
      total: 'Total Final',
      added: 'Adicionado ao carrinho',
      removed: 'Produto removido',
      cleared: 'Carrinho limpo',
      genericError: 'Ocorreu um erro. Tenta novamente.',
      emptyCartError: 'O teu carrinho está vazio.'
    },
    en: {
      title: 'My Cart',
      empty: 'Your cart is empty.',
      clear: 'Clear Cart',
      checkout: 'Checkout',
      checkoutBusy: 'Processing...',
      vatTotal: 'VAT Total (23%)',
      shipping: 'Shipping*',
      shippingNote: '* We only ship to mainland Portugal and the islands.',
      total: 'Final Total',
      added: 'Added to cart',
      removed: 'Item removed',
      cleared: 'Cart cleared',
      genericError: 'Something went wrong. Please try again.',
      emptyCartError: 'Your cart is empty.'
    }
  };
  var t = i18n[lang];

  var products = null;
  var productsPromise = null;

  function loadProducts() {
    if (productsPromise) {
      return productsPromise;
    }
    productsPromise = fetch(SHOP_JSON_URL)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        products = {};
        (data.products || []).forEach(function (p) {
          products[p.id] = p;
        });
        return products;
      })
      .catch(function () {
        products = {};
        return products;
      });
    return productsPromise;
  }

  function readCart() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var cart = raw ? JSON.parse(raw) : [];
      return Array.isArray(cart) ? cart : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(cart) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) { /* storage unavailable, ignore */ }
  }

  function formatPrice(amount) {
    try {
      return new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'pt-PT', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    } catch (e) {
      return '€' + amount.toFixed(2);
    }
  }

  /* Generates a simple branded placeholder tile for products that
     don't have a real photo uploaded yet (assets/img/shop/*.avif). */
  function placeholderImage(label) {
    var safeLabel = (label || 'The Invisible Tuba')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">' +
      '<rect width="800" height="800" fill="#af8c45"/>' +
      '<rect width="800" height="800" fill="#252525" fill-opacity="0.15"/>' +
      '<text x="400" y="380" font-family="Arial, sans-serif" font-size="34" ' +
      'fill="#ffffff" text-anchor="middle" font-weight="bold">The Invisible Tuba</text>' +
      '<text x="400" y="440" font-family="Arial, sans-serif" font-size="26" ' +
      'fill="#ffffff" text-anchor="middle">' + safeLabel + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  /* ---------------- Toast ---------------- */
  var toastContainer = null;
  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'zrq-toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function toast(message, isError) {
    var container = ensureToastContainer();
    var el = document.createElement('div');
    el.className = 'zrq-toast' + (isError ? ' is-error' : '');
    el.textContent = message;
    container.appendChild(el);
    window.requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });
    window.setTimeout(function () {
      el.classList.remove('is-visible');
      window.setTimeout(function () {
        if (el.parentNode) { el.parentNode.removeChild(el); }
      }, 300);
    }, 3000);
  }

  /* ---------------- Badge ---------------- */
  function updateBadge() {
    var countEl = document.getElementById('zrqCartCount');
    if (!countEl) { return; }
    var cart = readCart();
    var total = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    countEl.textContent = String(total);
    countEl.hidden = total === 0;
  }

  /* ---------------- Drawer ---------------- */
  var overlay = null;
  var itemsEl = null;
  var vatEl = null;
  var shippingEl = null;
  var totalEl = null;
  var checkoutBtn = null;

  function buildDrawer() {
    if (overlay) { return; }

    overlay = document.createElement('div');
    overlay.className = 'zrq-cart-overlay';

    var drawer = document.createElement('div');
    drawer.className = 'zrq-cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', t.title);

    var header = document.createElement('div');
    header.className = 'zrq-cart-header';
    header.innerHTML = '<h3>' + t.title + '</h3><button type="button" class="zrq-cart-close" aria-label="Close">&times;</button>';

    itemsEl = document.createElement('div');
    itemsEl.className = 'zrq-cart-items';

    var footer = document.createElement('div');
    footer.className = 'zrq-cart-footer';

    var vatRow = document.createElement('div');
    vatRow.className = 'zrq-cart-vat';
    vatRow.innerHTML = '<span>' + t.vatTotal + '</span><span class="zrq-cart-vat-amount">' + formatPrice(0) + '</span>';
    vatEl = vatRow.querySelector('.zrq-cart-vat-amount');

    var shippingRow = document.createElement('div');
    shippingRow.className = 'zrq-cart-shipping';
    shippingRow.innerHTML = '<span>' + t.shipping + '</span><span class="zrq-cart-shipping-amount">' + formatPrice(0) + '</span>';
    shippingEl = shippingRow.querySelector('.zrq-cart-shipping-amount');

    var shippingNote = document.createElement('p');
    shippingNote.className = 'zrq-cart-note';
    shippingNote.textContent = t.shippingNote;

    var totalRow = document.createElement('div');
    totalRow.className = 'zrq-cart-total';
    totalRow.innerHTML = '<span>' + t.total + '</span><span class="zrq-cart-total-amount">' + formatPrice(0) + '</span>';
    totalEl = totalRow.querySelector('.zrq-cart-total-amount');

    checkoutBtn = document.createElement('button');
    checkoutBtn.type = 'button';
    checkoutBtn.className = 'btn zrq-cart-checkout';
    checkoutBtn.textContent = t.checkout;

    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn zrq-cart-clear';
    clearBtn.textContent = t.clear;

    footer.appendChild(vatRow);
    footer.appendChild(shippingRow);
    footer.appendChild(shippingNote);
    footer.appendChild(totalRow);
    footer.appendChild(checkoutBtn);
    footer.appendChild(clearBtn);

    drawer.appendChild(header);
    drawer.appendChild(itemsEl);
    drawer.appendChild(footer);
    overlay.appendChild(drawer);
    document.body.appendChild(overlay);

    header.querySelector('.zrq-cart-close').addEventListener('click', closeDrawer);
    overlay.addEventListener('click', function (evt) {
      if (evt.target === overlay) { closeDrawer(); }
    });
    clearBtn.addEventListener('click', function () {
      writeCart([]);
      renderDrawer();
      updateBadge();
      toast(t.cleared);
    });
    checkoutBtn.addEventListener('click', startCheckout);

    itemsEl.addEventListener('click', function (evt) {
      var btn = evt.target.closest('[data-action]');
      if (!btn) { return; }
      var id = btn.getAttribute('data-id');
      var action = btn.getAttribute('data-action');
      var cart = readCart();
      var entry = cart.find(function (i) { return i.id === id; });
      if (!entry) { return; }
      if (action === 'inc') {
        entry.qty += 1;
      } else if (action === 'dec') {
        entry.qty -= 1;
        if (entry.qty <= 0) {
          cart = cart.filter(function (i) { return i.id !== id; });
          toast(t.removed);
        }
      }
      writeCart(cart);
      renderDrawer();
      updateBadge();
    });

    document.addEventListener('keydown', function (evt) {
      if (evt.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  function renderDrawer() {
    if (!itemsEl) { return; }
    var cart = readCart();

    if (!products) {
      loadProducts().then(renderDrawer);
      return;
    }

    itemsEl.innerHTML = '';

    if (cart.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'zrq-cart-empty';
      empty.textContent = t.empty;
      itemsEl.appendChild(empty);
      vatEl.textContent = formatPrice(0);
      shippingEl.textContent = formatPrice(0);
      totalEl.textContent = formatPrice(0);
      checkoutBtn.disabled = true;
      return;
    }

    checkoutBtn.disabled = false;
    var grandTotal = 0;

    cart.forEach(function (item) {
      var product = products[item.id];
      if (!product) { return; }
      var lineTotal = product.price * item.qty;
      grandTotal += lineTotal;

      var row = document.createElement('div');
      row.className = 'zrq-cart-item';

      var img = document.createElement('img');
      img.className = 'zrq-cart-item-img';
      img.src = (product.images && product.images[0]) || '';
      img.alt = product[lang] ? product[lang].title : product.id;
      img.onerror = function () {
        img.onerror = null;
        img.src = placeholderImage(img.alt);
      };

      var info = document.createElement('div');
      info.className = 'zrq-cart-item-info';

      var title = document.createElement('p');
      title.className = 'zrq-cart-item-title';
      title.textContent = product[lang] ? product[lang].title : product.id;

      var price = document.createElement('p');
      price.className = 'zrq-cart-item-price';
      price.textContent = formatPrice(product.price) + ' × ' + item.qty + ' = ' + formatPrice(lineTotal);

      var qtyWrap = document.createElement('div');
      qtyWrap.className = 'zrq-cart-qty';
      qtyWrap.innerHTML =
        '<button type="button" data-action="dec" data-id="' + item.id + '" aria-label="-">&minus;</button>' +
        '<span>' + item.qty + '</span>' +
        '<button type="button" data-action="inc" data-id="' + item.id + '" aria-label="+">&plus;</button>';

      info.appendChild(title);
      info.appendChild(price);
      info.appendChild(qtyWrap);

      row.appendChild(img);
      row.appendChild(info);
      itemsEl.appendChild(row);
    });

    var vatAmount = grandTotal * VAT_RATE;
    var shippingAmount = CTT_VALUE;
    vatEl.textContent = formatPrice(vatAmount);
    shippingEl.textContent = formatPrice(shippingAmount);
    totalEl.textContent = formatPrice(grandTotal + vatAmount + shippingAmount);
  }

  function openDrawer() {
    buildDrawer();
    renderDrawer();
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!overlay) { return; }
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ---------------- Checkout ---------------- */
  function startCheckout() {
    var cart = readCart();
    if (cart.length === 0) {
      toast(t.emptyCartError, true);
      return;
    }
    checkoutBtn.disabled = true;
    var originalLabel = checkoutBtn.textContent;
    checkoutBtn.textContent = t.checkoutBusy;

    fetch('api/create-checkout-session.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, lang: lang })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok && result.data && result.data.url) {
          window.location.href = result.data.url;
        } else {
          toast((result.data && result.data.error) || t.genericError, true);
          checkoutBtn.disabled = false;
          checkoutBtn.textContent = originalLabel;
        }
      })
      .catch(function () {
        toast(t.genericError, true);
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = originalLabel;
      });
  }

  /* ---------------- Public API ---------------- */
  function addToCart(id, qty) {
    qty = qty || 1;
    var cart = readCart();
    var entry = cart.find(function (i) { return i.id === id; });
    if (entry) {
      entry.qty += qty;
    } else {
      cart.push({ id: id, qty: qty });
    }
    writeCart(cart);
    updateBadge();
    if (overlay && overlay.classList.contains('is-open')) {
      renderDrawer();
    }
    toast(t.added);
  }

  function init() {
    var trigger = document.getElementById('zrqCartTrigger');
    if (trigger) {
      trigger.addEventListener('click', openDrawer);
    }
    loadProducts().then(updateBadge);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ZrqCart = {
    add: addToCart,
    open: openDrawer,
    close: closeDrawer,
    toast: toast,
    formatPrice: formatPrice,
    placeholderImage: placeholderImage,
    loadProducts: loadProducts,
    lang: lang
  };
})(window, document);
