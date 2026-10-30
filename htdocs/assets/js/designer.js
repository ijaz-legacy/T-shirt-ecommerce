/* Custom tee designer: placement state, live price, artwork upload. */
(function () {
  'use strict';

  var cfg = window.IJAZ || {};
  var stage = document.getElementById('tee-stage');
  var printArea = document.getElementById('print-area');
  var form = document.getElementById('designer-form');
  if (!stage || !printArea || !form) {
    return;
  }

  var placementsInput = document.getElementById('placements-input');
  var panel = document.getElementById('placement-panel');
  var scaleInput = document.getElementById('scale');
  var posX = document.getElementById('pos-x');
  var posY = document.getElementById('pos-y');
  var fitSelect = document.getElementById('fit');
  var addButton = document.getElementById('add-design');
  var basePriceEl = document.getElementById('base-price');
  var printPriceEl = document.getElementById('print-price');
  var totalEl = document.getElementById('total-price');
  var scaleNote = document.getElementById('scale-note');

  var placements = [];
  var selected = -1;

  function money(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  /* Mirrors price_for_scale() in lib/catalog.php. */
  function printPrice(scale) {
    return scale > 48 ? cfg.prices.full : cfg.prices.half;
  }

  function paint() {
    printArea.innerHTML = '';

    placements.forEach(function (placement, index) {
      var img = document.createElement('img');
      img.src = placement.ref;
      img.alt = placement.name || '';
      img.draggable = false;
      img.style.left = placement.x + '%';
      img.style.top = placement.y + '%';
      img.style.width = placement.scale + '%';
      img.style.transform = 'translate(-50%, -50%)';
      img.className = 'placed' + (index === selected ? ' is-selected' : '');
      img.addEventListener('click', function (event) {
        event.stopPropagation();
        select(index);
      });
      printArea.appendChild(img);
    });

    placementsInput.value = JSON.stringify(
      placements.map(function (placement) {
        return { ref: placement.ref, x: placement.x, y: placement.y, scale: placement.scale };
      })
    );

    updatePrices();
  }

  function updatePrices() {
    var base = cfg.fits[fitSelect.value] || cfg.fits.regular || 0;
    var print = placements.reduce(function (sum, placement) {
      return sum + printPrice(placement.scale);
    }, 0);

    basePriceEl.textContent = money(base);
    printPriceEl.textContent = placements.length ? '+' + money(print) : '—';
    totalEl.textContent = money(base + print);
    addButton.disabled = placements.length === 0;

    if (selected >= 0 && placements[selected]) {
      var scale = placements[selected].scale;
      scaleNote.textContent = scale > 48
        ? (cfg.lang === 'ta' ? 'முழு A4 அளவு' : 'Full A4 sheet')
        : scale > 27
          ? (cfg.lang === 'ta' ? 'அரை A4 அளவு' : 'Half A4 design')
          : (cfg.lang === 'ta' ? 'சிறிய லோகோ' : 'Small logo / badge');
    }
  }

  function select(index) {
    selected = index;
    var placement = placements[index];
    if (!placement) {
      panel.hidden = true;
      paint();
      return;
    }
    panel.hidden = false;
    scaleInput.value = Math.round(placement.scale);
    posX.value = Math.round(placement.x);
    posY.value = Math.round(placement.y);
    paint();
  }

  function addPlacement(ref, name) {
    placements.push({ ref: ref, name: name || '', x: 50, y: 40, scale: 32 });
    select(placements.length - 1);
  }

  /* Sticker library */
  var grid = document.getElementById('sticker-grid');
  if (grid) {
    grid.addEventListener('click', function (event) {
      var button = event.target.closest('.sticker-btn');
      if (!button) {
        return;
      }
      addPlacement(button.getAttribute('data-src'), button.getAttribute('data-name'));
    });
  }

  /* Artwork upload */
  var artwork = document.getElementById('artwork-input');
  var uploadError = document.getElementById('upload-error');
  if (artwork) {
    artwork.addEventListener('change', function () {
      var file = artwork.files && artwork.files[0];
      if (!file) {
        return;
      }
      uploadError.hidden = true;
      artwork.disabled = true;

      var body = new FormData();
      body.append('file', file);
      body.append('csrf', cfg.csrf);

      fetch(cfg.url, { method: 'POST', body: body, credentials: 'same-origin' })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data && data.url) {
            addPlacement(data.url, file.name);
          } else {
            uploadError.textContent = (data && data.error) || 'Upload failed';
            uploadError.hidden = false;
          }
        })
        .catch(function () {
          uploadError.textContent = 'Upload failed';
          uploadError.hidden = false;
        })
        .then(function () {
          artwork.disabled = false;
          artwork.value = '';
        });
    });
  }

  /* Controls */
  scaleInput.addEventListener('input', function () {
    if (selected < 0 || !placements[selected]) { return; }
    placements[selected].scale = Number(scaleInput.value);
    paint();
  });

  posX.addEventListener('input', function () {
    if (selected < 0 || !placements[selected]) { return; }
    placements[selected].x = Number(posX.value);
    paint();
  });

  posY.addEventListener('input', function () {
    if (selected < 0 || !placements[selected]) { return; }
    placements[selected].y = Number(posY.value);
    paint();
  });

  document.getElementById('remove-placement').addEventListener('click', function () {
    if (selected < 0) { return; }
    placements.splice(selected, 1);
    selected = placements.length ? placements.length - 1 : -1;
    if (selected < 0) {
      panel.hidden = true;
    } else {
      select(selected);
    }
    paint();
  });

  fitSelect.addEventListener('change', updatePrices);

  document.querySelectorAll('input[name="color"]').forEach(function (input) {
    input.addEventListener('change', function () {
      stage.style.setProperty('--tee-color', input.getAttribute('data-hex'));
    });
  });

  /* Clicking empty tee space clears the selection. */
  stage.addEventListener('click', function (event) {
    if (event.target === stage || event.target.classList.contains('print-area') || event.target.classList.contains('tee-shape')) {
      selected = -1;
      panel.hidden = true;
      paint();
    }
  });

  form.addEventListener('submit', function (event) {
    if (placements.length === 0) {
      event.preventDefault();
    }
  });

  paint();
})();
