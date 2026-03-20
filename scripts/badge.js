// Updates .cart-badge elements from localStorage on any page.
(function () {
  try {
    const cart = JSON.parse(localStorage.getItem('lebron_cart') || '{}');
    const total = Object.values(cart).reduce((sum, e) => sum + (e.qty || 0), 0);
    document.querySelectorAll('.cart-badge').forEach((el) => {
      el.textContent = total;
    });
  } catch (_) {}
})();
