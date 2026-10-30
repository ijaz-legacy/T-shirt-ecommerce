<?php
/** Product detail with size selection. */
$soldOut = (int) $product['stock'] <= 0;
?>
<section class="container section">
  <a class="quiet-link sm" href="<?= e(url('/shop')) ?>">&larr; <?= e(t('product.back')) ?></a>

  <div class="product-layout">
    <div class="product-media">
      <img src="<?= e(image_url($product['image'])) ?>" alt="<?= e(pick($product, 'name')) ?>">
    </div>

    <div class="product-info">
      <p class="eyebrow"><?= e(ucfirst($product['category'])) ?></p>
      <h1 class="display page-title"><?= e(pick($product, 'name')) ?></h1>
      <p class="price lg"><?= e(money($product['price'])) ?></p>
      <p class="lead sm"><?= e(pick($product, 'desc')) ?></p>

      <p class="meta">
        <?= e(t('product.colour')) ?>:
        <span class="swatch" style="background:<?= e($product['color_hex']) ?>"></span>
        <?= e(pick($product, 'color')) ?>
      </p>

      <?php if ($soldOut): ?>
        <p class="badge-sold pad"><?= e(t('product.outOfStock')) ?></p>
      <?php else: ?>
        <?php if ((int) $product['stock'] <= 5): ?>
          <p class="muted sm"><?= e(sprintf(t('product.stockLeft'), (int) $product['stock'])) ?></p>
        <?php endif; ?>

        <form method="post" action="<?= e(url('/cart/add')) ?>" class="buy-form">
          <?= csrf_field() ?>
          <input type="hidden" name="slug" value="<?= e($product['slug']) ?>">

          <fieldset class="field-group">
            <legend><?= e(t('product.size')) ?></legend>
            <div class="size-row">
              <?php foreach (SIZES as $size): ?>
                <label class="size-option">
                  <input type="radio" name="size" value="<?= e($size) ?>" <?= $size === 'M' ? 'checked' : '' ?>>
                  <span><?= e($size) ?></span>
                </label>
              <?php endforeach; ?>
            </div>
          </fieldset>

          <label class="field-label" for="qty"><?= e(t('cart.quantity')) ?></label>
          <input class="field" id="qty" name="qty" type="number" min="1" max="10" value="1">

          <button class="btn btn-primary btn-block" type="submit"><?= e(t('product.addToCart')) ?></button>
        </form>
      <?php endif; ?>
    </div>
  </div>
</section>
