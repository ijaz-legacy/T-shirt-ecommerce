<?php
/** One order for the customer. */
?>
<section class="container section">
  <?php if (!empty($placed)): ?>
    <p class="flash flash-ok">
      <?= e($lang === 'ta' ? 'ஆர்டர் பெறப்பட்டது!' : 'Order placed!') ?>
      <?= e(t('track.number')) ?>: <strong><?= e($order['order_number']) ?></strong>
    </p>
  <?php endif; ?>

  <a class="quiet-link sm" href="<?= e(url('/orders')) ?>">&larr; <?= e(t('orders.title')) ?></a>

  <div class="order-head">
    <div>
      <p class="eyebrow"><?= e(t('track.number')) ?></p>
      <p class="order-number"><?= e($order['order_number']) ?></p>
      <p class="muted sm"><?= e(format_date((int) $order['created_at'], $lang)) ?></p>
    </div>
    <span class="status status-<?= e($order['status']) ?>"><?= e(status_label($order['status'])) ?></span>
  </div>

  <div class="checkout-layout">
    <div class="panel">
      <h2 class="section-title"><?= e(t('checkout.summary')) ?></h2>
      <ul class="mini-list items">
        <?php foreach ($items as $item): ?>
          <li>
            <span>
              <?= e($lang === 'ta' ? $item['name_ta'] : $item['name_en']) ?>
              <span class="muted sm">· <?= e($item['size']) ?> ×<?= (int) $item['quantity'] ?></span>
            </span>
            <span><?= e(money($item['unit_price'] * $item['quantity'])) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>

      <dl class="totals">
        <div><dt><?= e(t('cart.subtotal')) ?></dt><dd><?= e(money($order['subtotal'])) ?></dd></div>
        <div>
          <dt><?= e(t('cart.shipping')) ?></dt>
          <dd><?= (int) $order['shipping_fee'] === 0 ? e(t('cart.free')) : e(money($order['shipping_fee'])) ?></dd>
        </div>
        <div class="grand"><dt><?= e(t('cart.total')) ?></dt><dd><?= e(money($order['total'])) ?></dd></div>
      </dl>

      <h3 class="section-title sm"><?= e(t('checkout.delivery')) ?></h3>
      <address class="address">
        <?= e($order['customer_name']) ?><br>
        <?= e($order['address1']) ?><?= $order['address2'] !== '' ? ', ' . e($order['address2']) : '' ?><br>
        <?= e($order['city']) ?>, <?= e($order['state']) ?> <?= e($order['pincode']) ?><br>
        <?= e($order['phone']) ?>
      </address>
    </div>

    <aside class="panel">
      <h2 class="section-title"><?= e(t('track.title')) ?></h2>
      <ol class="timeline">
        <?php foreach ($events as $event): ?>
          <li class="done">
            <span class="dot"></span>
            <div>
              <p class="timeline-status"><?= e(status_label($event['status'])) ?></p>
              <p class="muted sm"><?= e(format_date((int) $event['created_at'], $lang)) ?></p>
            </div>
          </li>
        <?php endforeach; ?>
      </ol>
    </aside>
  </div>
</section>
