/**
 * Cart page module for the LeBron James merch shop.
 * Renders cart contents, handles quantity controls and item deletion.
 */

import { Cart_State, loadCart, saveCart, updateBadge } from './cart.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats a price number as South African Rand, e.g. 6000 → "R 6 000" */
function formatPrice(amount) {
  return amount.toLocaleString('ru-RU') + ' ₽';
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Renders the full cart page from Cart_State.
 * Called on load and after every mutation.
 */
export function renderCart() {
  const cartItemsEl = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');
  const emptyMsgEl = document.getElementById('empty-cart-msg');

  const entries = Object.entries(Cart_State);

  if (entries.length === 0) {
    emptyMsgEl.style.display = '';
    cartItemsEl.style.display = 'none';
    cartTotalEl.style.display = 'none';
    cartItemsEl.innerHTML = '';
    cartTotalEl.innerHTML = '';
    return;
  }

  emptyMsgEl.style.display = 'none';
  cartItemsEl.style.display = '';
  cartTotalEl.style.display = '';

  let orderTotal = 0;

  cartItemsEl.innerHTML = entries.map(([id, { product, qty }]) => {
    const lineTotal = product.price * qty;
    orderTotal += lineTotal;

    const imgHtml = product.img_path
      ? `<img
           class="cart-row-img"
           src="${product.img_path}"
           alt="${product.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
         >
         <div class="cart-row-img-placeholder" style="display:none;">No image</div>`
      : `<div class="cart-row-img-placeholder">No image</div>`;

    return `<div class="cart-row" data-id="${id}">
      ${imgHtml}
      <div class="cart-row-info">
        <div class="cart-row-name">${product.name}</div>
        <div class="cart-row-unit-price">${formatPrice(product.price)} each</div>
      </div>
      <div class="cart-row-controls">
        <button class="cart-qty-btn" ${qty <= 1 ? 'disabled' : ''} onclick="window._cartPage.decrementQty('${id}')">−</button>
        <span class="cart-qty-value">${qty}</span>
        <button class="cart-qty-btn" ${qty >= product.stock_amount ? 'disabled' : ''} onclick="window._cartPage.incrementQty('${id}')">+</button>
      </div>
      <div class="cart-row-line-total">${formatPrice(lineTotal)}</div>
      <button class="cart-delete-btn" title="Remove item" onclick="window._cartPage.deleteItem('${id}')">🗙</button>
    </div>`;
  }).join('');

  cartTotalEl.innerHTML = `Order total: <span>${formatPrice(orderTotal)}</span>`;
}

// ---------------------------------------------------------------------------
// Quantity controls
// ---------------------------------------------------------------------------

/** Increments qty for the given id by 1, persists, and re-renders. */
export function incrementQty(id) {
  if (!Cart_State[id]) return;
  const stock = Cart_State[id].product.stock_amount;
  if (Cart_State[id].qty >= stock) return; // stock cap
  Cart_State[id].qty += 1;
  saveCart();
  renderCart();
}

/** Decrements qty for the given id; removes entry if qty was 1. */
export function decrementQty(id) {
  if (!Cart_State[id]) return;
  if (Cart_State[id].qty > 1) {
    Cart_State[id].qty -= 1;
  } else {
    delete Cart_State[id];
  }
  saveCart();
  renderCart();
}

/** Removes the item with the given id from Cart_State regardless of qty. */
export function deleteItem(id) {
  if (!Cart_State[id]) return;
  delete Cart_State[id];
  saveCart();
  renderCart();
}

// ---------------------------------------------------------------------------
// Module initialisation (browser only)
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Expose functions so inline onclick handlers can reach them.
  window._cartPage = { incrementQty, decrementQty, deleteItem };

  loadCart();
  renderCart();
  updateBadge();
}
