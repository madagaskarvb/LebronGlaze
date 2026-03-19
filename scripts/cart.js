/**
 * Shared cart module for the LeBron James merch shop.
 * Manages Cart_State, localStorage persistence, and header badge updates.
 */

// Single source of truth for cart contents.
// Shape: { "[productId]": { product: Product, qty: number } }
export let Cart_State = {};

/**
 * Reads "lebron_cart" from localStorage and populates Cart_State.
 * - Missing key  → initialise to {}
 * - Parse error  → reset to {} and persist via saveCart()
 * - localStorage unavailable (private browsing) → silently fall back to {}
 */
export function loadCart() {
  try {
    const raw = localStorage.getItem('lebron_cart');
    if (raw === null) {
      Cart_State = {};
      return;
    }
    Cart_State = JSON.parse(raw);
  } catch (_err) {
    Cart_State = {};
    saveCart();
  }
}

/**
 * Serialises Cart_State to JSON and writes it to localStorage under "lebron_cart".
 * Wrapped in try/catch for private-browsing safety.
 */
export function saveCart() {
  try {
    localStorage.setItem('lebron_cart', JSON.stringify(Cart_State));
  } catch (_err) {
    // Storage unavailable — cart works in-memory for this session only.
  }
}

/**
 * Sums all qty values in Cart_State and updates the text of every
 * .cart-badge element in the document.
 */
export function updateBadge() {
  const total = Object.values(Cart_State).reduce((sum, entry) => sum + entry.qty, 0);
  document.querySelectorAll('.cart-badge').forEach((el) => {
    el.textContent = total;
  });
}
