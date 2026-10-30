<?php
/** Checkout: delivery details + COD. */
?>
<section class="container section">
  <h1 class="display page-title"><?= e(t('checkout.title')) ?></h1>

  <?php if (!is_logged_in()): ?>
    <p class="flash flash-error"><?= e(t('checkout.mustSignIn')) ?></p>
    <a class="btn btn-primary" href="<?= e(url('/login?next=' . rawurlencode('/checkout'))) ?>"><?= e(t('nav.login')) ?></a>
    <?php return; ?>
  <?php endif; ?>

  <div class="checkout-layout">
    <form method="post" action="<?= e(url('/checkout')) ?>" class="panel form-panel" novalidate>
      <?= csrf_field() ?>
      <h2 class="section-title"><?= e(t('checkout.delivery')) ?></h2>

      <label class="field-label" for="name"><?= e(t('checkout.name')) ?></label>
      <input class="field <?= isset($errors['name']) ? 'field-error' : '' ?>" id="name" name="name"
             value="<?= e($address['name']) ?>" autocomplete="name" required>
      <?php if (isset($errors['name'])): ?><p class="error"><?= e($errors['name']) ?></p><?php endif; ?>

      <label class="field-label" for="phone"><?= e(t('checkout.phone')) ?></label>
      <input class="field <?= isset($errors['phone']) ? 'field-error' : '' ?>" id="phone" name="phone"
             value="<?= e($address['phone']) ?>" inputmode="tel" autocomplete="tel" required>
      <?php if (isset($errors['phone'])): ?><p class="error"><?= e($errors['phone']) ?></p><?php endif; ?>

      <label class="field-label" for="address1"><?= e(t('checkout.address1')) ?></label>
      <input class="field <?= isset($errors['address1']) ? 'field-error' : '' ?>" id="address1" name="address1"
             value="<?= e($address['address1']) ?>" autocomplete="address-line1" required>
      <?php if (isset($errors['address1'])): ?><p class="error"><?= e($errors['address1']) ?></p><?php endif; ?>

      <label class="field-label" for="address2"><?= e(t('checkout.address2')) ?></label>
      <input class="field" id="address2" name="address2"
             value="<?= e($address['address2']) ?>" autocomplete="address-line2">

      <div class="field-row">
        <div>
          <label class="field-label" for="city"><?= e(t('checkout.city')) ?></label>
          <input class="field <?= isset($errors['city']) ? 'field-error' : '' ?>" id="city" name="city"
                 value="<?= e($address['city']) ?>" autocomplete="address-level2" required>
          <?php if (isset($errors['city'])): ?><p class="error"><?= e($errors['city']) ?></p><?php endif; ?>
        </div>
        <div>
          <label class="field-label" for="state"><?= e(t('checkout.state')) ?></label>
          <input class="field <?= isset($errors['state']) ? 'field-error' : '' ?>" id="state" name="state"
                 value="<?= e($address['state']) ?>" autocomplete="address-level1" required>
          <?php if (isset($errors['state'])): ?><p class="error"><?= e($errors['state']) ?></p><?php endif; ?>
        </div>
        <div>
          <label class="field-label" for="pincode"><?= e(t('checkout.pincode')) ?></label>
          <input class="field <?= isset($errors['pincode']) ? 'field-error' : '' ?>" id="pincode" name="pincode"
                 value="<?= e($address['pincode']) ?>" inputmode="numeric" autocomplete="postal-code" required>
          <?php if (isset($errors['pincode'])): ?><p class="error"><?= e($errors['pincode']) ?></p><?php endif; ?>
        </div>
      </div>

      <div class="cod-box">
        <p class="cod-title"><?= e(t('checkout.cod')) ?></p>
        <p class="muted sm"><?= e(t('checkout.codNote')) ?></p>
      </div>

      <button class="btn btn-primary btn-block" type="submit"><?= e(t('checkout.place')) ?></button>
    </form>

    <aside class="cart-summary">
      <h2 class="section-title"><?= e(t('checkout.summary')) ?></h2>
      <ul class="mini-list">
        <?php foreach (cart() as $item): ?>
          <li>
            <span><?= e(($lang === 'ta' ? $item['name_ta'] : $item['name_en'])) ?> ×<?= (int) $item['qty'] ?></span>
            <span><?= e(money($item['unit_price'] * $item['qty'])) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>
      <dl class="totals">
        <div><dt><?= e(t('cart.subtotal')) ?></dt><dd><?= e(money($totals['subtotal'])) ?></dd></div>
        <div>
          <dt><?= e(t('cart.shipping')) ?></dt>
          <dd><?= $totals['shipping'] === 0 ? e(t('cart.free')) : e(money($totals['shipping'])) ?></dd>
        </div>
        <div class="grand"><dt><?= e(t('cart.total')) ?></dt><dd><?= e(money($totals['total'])) ?></dd></div>
      </dl>
    </aside>
  </div>
</section>
