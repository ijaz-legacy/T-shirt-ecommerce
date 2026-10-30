<?php
/** Cart with quantity controls and totals. */
$items = cart();
?>
<section class="container section">
  <h1 class="display page-title"><?= e(t('cart.title')) ?></h1>

  <?php if (!$items): ?>
    <p class="muted pad"><?= e(t('cart.empty')) ?></p>
    <a class="btn btn-primary" href="<?= e(url('/shop')) ?>"><?= e(t('cart.continue')) ?></a>
  <?php else: ?>
    <div class="cart-layout">
      <ul class="cart-list">
        <?php foreach ($items as $item): ?>
          <li class="cart-row">
            <div class="cart-thumb">
              <?php if (!empty($item['image'])): ?>
                <img src="<?= e(image_url($item['image'])) ?>" alt="">
              <?php endif; ?>
            </div>

            <div class="cart-main">
              <p class="cart-name"><?= e($lang === 'ta' ? $item['name_ta'] : $item['name_en']) ?></p>
              <p class="muted sm">
                <?= e(t('product.size')) ?> <?= e($item['size']) ?> ·
                <?= e($lang === 'ta' ? $item['color_ta'] : $item['color_en']) ?>
                <?php if (($item['kind'] ?? '') === 'custom'): ?>
                  · <?= e(t('cart.custom')) ?>
                <?php endif; ?>
              </p>
              <?php if (!empty($item['placements'])): ?>
                <p class="muted sm"><?= count($item['placements']) ?> <?= e($lang === 'ta' ? 'ஸ்டிக்கர்கள்' : 'stickers') ?></p>
              <?php endif; ?>
            </div>

            <div class="cart-qty">
              <form method="post" action="<?= e(url('/cart')) ?>" class="qty-form">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="qty">
                <input type="hidden" name="key" value="<?= e($item['key']) ?>">
                <input class="field qty-field" name="qty" type="number" min="1" max="10" value="<?= (int) $item['qty'] ?>">
                <button class="btn btn-mini" type="submit">&#8635;</button>
              </form>
            </div>

            <div class="cart-price">
              <p><?= e(money($item['unit_price'] * $item['qty'])) ?></p>
              <form method="post" action="<?= e(url('/cart')) ?>">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="remove">
                <input type="hidden" name="key" value="<?= e($item['key']) ?>">
                <button class="link-button danger" type="submit"><?= e(t('cart.remove')) ?></button>
              </form>
            </div>
          </li>
        <?php endforeach; ?>
      </ul>

      <aside class="cart-summary">
        <h2 class="section-title"><?= e(t('checkout.summary')) ?></h2>
        <dl class="totals">
          <div><dt><?= e(t('cart.subtotal')) ?></dt><dd><?= e(money($totals['subtotal'])) ?></dd></div>
          <div>
            <dt><?= e(t('cart.shipping')) ?></dt>
            <dd><?= $totals['shipping'] === 0 ? e(t('cart.free')) : e(money($totals['shipping'])) ?></dd>
          </div>
          <div class="grand"><dt><?= e(t('cart.total')) ?></dt><dd><?= e(money($totals['total'])) ?></dd></div>
        </dl>
        <a class="btn btn-primary btn-block" href="<?= e(url('/checkout')) ?>"><?= e(t('cart.checkout')) ?></a>
        <a class="quiet-link sm block" href="<?= e(url('/shop')) ?>"><?= e(t('cart.continue')) ?></a>
      </aside>
    </div>
  <?php endif; ?>
</section>
