<?php
/**
 * Custom tee designer.
 *
 * Placements are kept in JavaScript and submitted as JSON; the server re-prices
 * them from the scale so the total cannot be forged.
 */
?>
<section class="container section">
  <h1 class="display page-title"><?= e(t('nav.customize')) ?></h1>
  <p class="lead sm"><?= e(t('home.customText')) ?></p>

  <form method="post" action="<?= e(url('/customize')) ?>" id="designer-form" class="designer">
    <?= csrf_field() ?>
    <input type="hidden" name="placements" id="placements-input" value="[]">

    <div class="designer-grid">
      <div class="designer-stage-wrap">
        <div class="tee-stage" id="tee-stage" style="--tee-color: #F2E8D5">
          <div class="tee-shape" aria-hidden="true"></div>
          <div class="print-area" id="print-area"></div>
        </div>
        <p class="muted sm center" id="stage-hint">
          <?= e($lang === 'ta' ? 'ஸ்டிக்கரை தேர்வு செய்து, அளவு மற்றும் இடத்தை மாற்றுங்கள்.' : 'Pick a sticker, then adjust its size and position.') ?>
        </p>
      </div>

      <div class="designer-controls">
        <div class="panel">
          <label class="field-label" for="fit"><?= e(t('nav.customize')) ?></label>
          <select class="field" id="fit" name="fit">
            <?php foreach (FITS as $id => $fit): ?>
              <option value="<?= e($id) ?>" <?= $id === 'regular' ? 'selected' : '' ?>>
                <?= e($lang === 'ta' ? $fit['name_ta'] : $fit['name_en']) ?> · <?= e(money($fit['price'])) ?>
              </option>
            <?php endforeach; ?>
          </select>

          <label class="field-label"><?= e(t('product.size')) ?></label>
          <div class="size-row">
            <?php foreach (SIZES as $size): ?>
              <label class="size-option">
                <input type="radio" name="size" value="<?= e($size) ?>" <?= $size === 'M' ? 'checked' : '' ?>>
                <span><?= e($size) ?></span>
              </label>
            <?php endforeach; ?>
          </div>

          <label class="field-label"><?= e(t('product.colour')) ?></label>
          <div class="colour-row">
            <?php foreach (TEE_COLORS as $id => $colour): ?>
              <label class="colour-option" title="<?= e($lang === 'ta' ? $colour['name_ta'] : $colour['name_en']) ?>">
                <input type="radio" name="color" value="<?= e($id) ?>"
                       data-hex="<?= e($colour['hex']) ?>" <?= $id === 'cream' ? 'checked' : '' ?>>
                <span style="background:<?= e($colour['hex']) ?>"></span>
              </label>
            <?php endforeach; ?>
          </div>
        </div>

        <div class="panel">
          <h2 class="section-title sm"><?= e($lang === 'ta' ? 'ஸ்டிக்கர்கள்' : 'Stickers') ?></h2>
          <?php if ($stickers): ?>
            <div class="sticker-grid" id="sticker-grid">
              <?php foreach ($stickers as $sticker): ?>
                <button type="button" class="sticker-btn"
                        data-src="<?= e(url('/image/' . $sticker['image_id'])) ?>"
                        data-name="<?= e($sticker['name_en']) ?>">
                  <img src="<?= e(url('/image/' . $sticker['image_id'])) ?>"
                       alt="<?= e($sticker['name_en']) ?>" loading="lazy">
                </button>
              <?php endforeach; ?>
            </div>
          <?php else: ?>
            <p class="muted sm"><?= e($lang === 'ta' ? 'ஸ்டிக்கர்கள் இல்லை.' : 'No stickers yet.') ?></p>
          <?php endif; ?>

          <hr class="rule">

          <h2 class="section-title sm"><?= e($lang === 'ta' ? 'உங்கள் படம்' : 'Your artwork') ?></h2>
          <?php if (is_logged_in()): ?>
            <input type="file" id="artwork-input" accept="image/png,image/jpeg,image/webp" class="field">
            <p class="muted sm"><?= e($lang === 'ta' ? 'PNG, JPG அல்லது WebP · 6MB வரை' : 'PNG, JPG or WebP · up to 6 MB') ?></p>
            <p class="error" id="upload-error" hidden></p>
          <?php else: ?>
            <p class="muted sm">
              <a class="quiet-link" href="<?= e(url('/login?next=' . rawurlencode('/customize'))) ?>"><?= e(t('nav.login')) ?></a>
              <?= e($lang === 'ta' ? 'படத்தை பதிவேற்ற' : 'to upload your own artwork') ?>
            </p>
          <?php endif; ?>
        </div>

        <div class="panel" id="placement-panel" hidden>
          <h2 class="section-title sm"><?= e($lang === 'ta' ? 'தேர்ந்தெடுத்தது' : 'Selected element') ?></h2>

          <label class="field-label" for="scale"><?= e($lang === 'ta' ? 'அளவு' : 'Size') ?></label>
          <input type="range" id="scale" min="8" max="72" value="32" class="range">
          <p class="muted sm" id="scale-note"></p>

          <label class="field-label" for="pos-x"><?= e($lang === 'ta' ? 'இடது / வலது' : 'Left / right') ?></label>
          <input type="range" id="pos-x" min="10" max="90" value="50" class="range">

          <label class="field-label" for="pos-y"><?= e($lang === 'ta' ? 'மேல் / கீழ்' : 'Up / down') ?></label>
          <input type="range" id="pos-y" min="12" max="82" value="40" class="range">

          <button type="button" class="btn btn-ghost btn-block" id="remove-placement">
            <?= e(t('cart.remove')) ?>
          </button>
        </div>

        <div class="panel summary-box">
          <div class="row-between">
            <span><?= e($lang === 'ta' ? 'அடிப்படை விலை' : 'Tee price') ?></span>
            <span id="base-price">—</span>
          </div>
          <div class="row-between">
            <span><?= e($lang === 'ta' ? 'பிரின்ட்' : 'Print') ?></span>
            <span id="print-price">—</span>
          </div>
          <div class="row-between grand">
            <span><?= e(t('cart.total')) ?></span>
            <span id="total-price">—</span>
          </div>

          <button class="btn btn-primary btn-block" type="submit" id="add-design" disabled>
            <?= e(t('product.addToCart')) ?>
          </button>
        </div>
      </div>
    </div>
  </form>
</section>

<script src="<?= e(asset('js/designer.js')) ?>" defer></script>

<script>
  window.IJAZ = {
    url: <?= json_encode(url('/upload')) ?>,
    csrf: <?= json_encode(csrf_token()) ?>,
    prices: { half: <?= CUSTOM_PRICE_HALF ?>, full: <?= CUSTOM_PRICE_FULL ?> },
    fits: <?= json_encode(array_map(function ($f) { return $f['price']; }, FITS)) ?>,
    lang: <?= json_encode($lang) ?>
  };
</script>
