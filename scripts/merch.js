/**
 * merch.js — Catalog page module for the LeBron James merch shop.
 * Handles rendering, filtering, sorting, modal, and add-to-cart logic.
 */

import { Cart_State, loadCart, saveCart, updateBadge } from './cart.js';
import { merchArray } from './merchandise.js';

// ── Module-level filter state ─────────────────────────────────────────────
export let activeCategory = 'all';
export let activeSortOrder = null; // 'asc' | 'desc' | null

// ── Price formatter ───────────────────────────────────────────────────────
/**
 * Formats a number as South African Rand with space thousands separator.
 * e.g. 6000 → "R 6 000", 16500 → "R 16 500"
 */
export function formatPrice(amount) {
  return amount.toLocaleString('ru-RU') + ' ₽';
}

// ── renderCatalog ─────────────────────────────────────────────────────────
/**
 * Filters and sorts merchArray, then injects one Product_Card per product
 * into #catalog-grid. Also updates #cart-button visibility.
 * @param {Array} [productsOverride] - Optional array to use instead of merchArray (for testing).
 */
export function renderCatalog(productsOverride) {
  const source = productsOverride !== undefined ? productsOverride : merchArray;

  // 1. Filter
  let visible = activeCategory === 'all'
    ? source.slice()
    : source.filter((p) => p.category === activeCategory);

  // 2. Sort
  if (activeSortOrder === 'asc') {
    visible.sort((a, b) => a.price - b.price);
  } else if (activeSortOrder === 'desc') {
    visible.sort((a, b) => b.price - a.price);
  }

  // 3. Render cards
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  grid.innerHTML = visible.map((product) => productCardTemplate(product)).join('');

  // 4. Wire up card interactions
  grid.querySelectorAll('.product-card-img-wrap, .product-card-name').forEach((el) => {
    el.addEventListener('click', () => {
      const id = Number(el.closest('.product-card').dataset.id);
      const product = source.find((p) => p.id === id);
      if (product) openModal(product);
    });
  });

  grid.querySelectorAll('.btn-add-cart').forEach((btn) => {
    btn.addEventListener('click', () => addToCart(Number(btn.dataset.id)));
  });

  grid.querySelectorAll('.card-qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      if (btn.dataset.action === 'inc') addToCart(id);
      else removeFromCart(id);
    });
  });

  // 5. Update cart-button visibility
  updateCartButtonVisibility();
}

/** Returns the HTML string for a single product card. */
function productCardTemplate(product) {
  const imgHtml = product.img_path
    ? `<img src="${product.img_path}" alt="${product.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="product-card-img-placeholder" style="display:none;">No Image</div>`
    : `<div class="product-card-img-placeholder">No Image</div>`;

  const key = String(product.id);
  const qty = Cart_State[key]?.qty ?? 0;
  const atMax = qty >= product.stock_amount;

  const cartControl = qty > 0
    ? `<div class="card-qty-control">
         <button class="card-qty-btn" data-id="${product.id}" data-action="dec" ${qty <= 1 ? 'disabled' : ''}>−</button>
         <span class="card-qty-value">${qty}</span>
         <button class="card-qty-btn" data-id="${product.id}" data-action="inc" ${atMax ? 'disabled' : ''}>+</button>
       </div>`
    : `<button class="btn-add-cart" data-id="${product.id}">Add to Cart</button>`;

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card-img-wrap">
        ${imgHtml}
      </div>
      <div class="product-card-body">
        <div class="product-card-name">${product.name}</div>
        <div class="product-card-price">${formatPrice(product.price)}</div>
        <div class="product-card-add">
          ${cartControl}
        </div>
      </div>
    </article>`;
}

// ── Filter bar ────────────────────────────────────────────────────────────
/**
 * Derives distinct categories from merchArray and renders the filter bar.
 */
export function renderFilterBar() {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  const categories = [...new Set(merchArray.map((p) => p.category))];

  const categoryButtons = ['all', ...categories].map((cat) => {
    const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
    const isActive = cat === activeCategory ? ' active' : '';
    return `<button class="filter-cat-btn${isActive}" data-cat="${cat}">${label}</button>`;
  });

  const sortButtons = `
    <span class="filter-divider"></span>
    <button class="filter-sort-btn${activeSortOrder === 'asc' ? ' active' : ''}" data-sort="asc">Price: Low to High</button>
    <button class="filter-sort-btn${activeSortOrder === 'desc' ? ' active' : ''}" data-sort="desc">Price: High to Low</button>`;

  filterBar.innerHTML = categoryButtons.join('') + sortButtons;

  // Wire category buttons
  filterBar.querySelectorAll('.filter-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      filterBar.querySelectorAll('.filter-cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderCatalog();
    });
  });

  // Wire sort buttons
  filterBar.querySelectorAll('.filter-sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSortOrder = btn.dataset.sort;
      filterBar.querySelectorAll('.filter-sort-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderCatalog();
    });
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────

/** Returns the cart control HTML for the modal (add button or qty counter). */
function modalCartControl(product) {
  const key = String(product.id);
  const qty = Cart_State[key]?.qty ?? 0;
  const atMax = qty >= product.stock_amount;
  if (qty > 0) {
    return `<div class="modal-qty-control">
      <button class="modal-qty-btn" id="modal-dec-btn" ${qty <= 1 ? 'disabled' : ''}>−</button>
      <span class="modal-qty-value">${qty}</span>
      <button class="modal-qty-btn" id="modal-inc-btn" ${atMax ? 'disabled' : ''}>+</button>
      <button class="modal-remove-btn" id="modal-remove-btn" title="Remove from cart">🗙</button>
    </div>`;
  }
  return `<button class="modal-add-btn" data-id="${product.id}">Add to Cart</button>`;
}

/** Wires the cart buttons inside the open modal for a given product. */
function wireModalCartButtons(product) {
  const content = document.getElementById('modal-content');
  if (!content) return;
  const addBtn = content.querySelector('.modal-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addToCart(product.id);
      refreshModalCartControl(product);
    });
  }
  const incBtn = content.querySelector('#modal-inc-btn');
  const decBtn = content.querySelector('#modal-dec-btn');
  if (incBtn) incBtn.addEventListener('click', () => { addToCart(product.id); refreshModalCartControl(product); });
  if (decBtn) decBtn.addEventListener('click', () => { removeFromCart(product.id); refreshModalCartControl(product); });
  const removeBtn = content.querySelector('#modal-remove-btn');
  if (removeBtn) removeBtn.addEventListener('click', () => { deleteFromCart(product.id); closeModal(); });
}

/** Replaces just the cart control area in the open modal without re-rendering everything. */
function refreshModalCartControl(product) {
  const content = document.getElementById('modal-content');
  if (!content) return;
  const existing = content.querySelector('.modal-qty-control, .modal-add-btn');
  if (existing) {
    const temp = document.createElement('div');
    temp.innerHTML = modalCartControl(product);
    existing.replaceWith(temp.firstElementChild);
    wireModalCartButtons(product);
  }
  renderCatalog(); // keep cards in sync
}

/**
 * Opens the modal and populates it with the given product's details.
 * @param {Object} product
 */
export function openModal(product) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay || !content) return;

  const imgHtml = product.img_path
    ? `<img class="modal-img" src="${product.img_path}" alt="${product.name}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="modal-img-placeholder" style="display:none;">No Image</div>`
    : `<div class="modal-img-placeholder">No Image</div>`;

  content.innerHTML = `
    <div class="modal-header">
      <button class="modal-close-btn" id="modal-close-btn" aria-label="Close modal">&times;</button>
    </div>
    ${imgHtml}
    <div class="modal-name">${product.name}</div>
    <div class="modal-price">${formatPrice(product.price)}</div>
    <div class="modal-description">${product.description}</div>
    <div class="modal-meta">Colours: <span>${product.colours.join(', ')}</span></div>
    <div class="modal-meta">In stock: <span>${product.stock_amount}</span></div>
    ${modalCartControl(product)}`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Wire close button
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);

  wireModalCartButtons(product);

  // Trap focus: collect focusable elements
  const focusable = content.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const firstFocusable = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];
  if (firstFocusable) firstFocusable.focus();

  content._trapFocus = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };
  content.addEventListener('keydown', content._trapFocus);
}

/**
 * Closes the modal and restores page scroll.
 */
export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!overlay) return;

  overlay.classList.remove('open');
  document.body.style.overflow = '';

  if (content && content._trapFocus) {
    content.removeEventListener('keydown', content._trapFocus);
    content._trapFocus = null;
  }
}

// ── Add to cart ───────────────────────────────────────────────────────────
/**
 * Adds a product to Cart_State or increments its qty if already present.
 * @param {number} productId
 */
export function addToCart(productId) {
  const product = merchArray.find((p) => p.id === productId);
  if (!product) return;

  const key = String(productId);
  if (Cart_State[key]) {
    if (Cart_State[key].qty >= product.stock_amount) return;
    Cart_State[key].qty += 1;
  } else {
    Cart_State[key] = { product, qty: 1 };
  }

  saveCart();
  updateBadge();
  updateCartButtonVisibility();
  renderCatalog();
}

/** Decrements qty for a product; removes it if qty reaches 0. */
export function removeFromCart(productId) {
  const key = String(productId);
  if (!Cart_State[key]) return;
  if (Cart_State[key].qty > 1) {
    Cart_State[key].qty -= 1;
  } else {
    delete Cart_State[key];
  }
  saveCart();
  updateBadge();
  updateCartButtonVisibility();
  renderCatalog();
}

/** Removes a product from Cart_State entirely, regardless of qty. */
export function deleteFromCart(productId) {
  const key = String(productId);
  if (!Cart_State[key]) return;
  delete Cart_State[key];
  saveCart();
  updateBadge();
  updateCartButtonVisibility();
  renderCatalog();
}

// ── Cart button visibility ────────────────────────────────────────────────
/**
 * Shows or hides #cart-button based on whether Cart_State has any entries.
 */
export function updateCartButtonVisibility() {
  const btn = document.getElementById('cart-button');
  if (!btn) return;
  if (Object.keys(Cart_State).length > 0) {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
}

// ── Module initialisation (browser-only) ─────────────────────────────────
// Guard against non-browser environments (e.g. Node.js test runners).
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Overlay backdrop click closes modal
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  loadCart();
  renderFilterBar();
  renderCatalog();
  updateBadge();
}
