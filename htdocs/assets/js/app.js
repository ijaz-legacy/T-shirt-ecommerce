/* Small progressive enhancements shared by every page. */
(function () {
  'use strict';

  // Fade out flash messages after a while so they do not linger forever.
  document.querySelectorAll('.flash').forEach(function (flash) {
    setTimeout(function () {
      flash.classList.add('is-fading');
      setTimeout(function () {
        flash.remove();
      }, 400);
    }, 6000);
  });

  // Keep the quantity field from accepting junk.
  document.querySelectorAll('input[type="number"]').forEach(function (input) {
    input.addEventListener('blur', function () {
      var min = parseInt(input.getAttribute('min') || '1', 10);
      var max = parseInt(input.getAttribute('max') || '99', 10);
      var value = parseInt(input.value, 10);
      if (isNaN(value) || value < min) {
        input.value = String(min);
      } else if (value > max) {
        input.value = String(max);
      }
    });
  });
})();
