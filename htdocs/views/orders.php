<?php /** Customer order history. */ ?>
<section class="container section">
  <h1 class="display page-title"><?= e(t('orders.title')) ?></h1>

  <?php if (!$orders): ?>
    <p class="muted pad"><?= e(t('orders.empty')) ?></p>
    <a class="btn btn-primary" href="<?= e(url('/shop')) ?>"><?= e(t('home.shopCta')) ?></a>
  <?php else: ?>
    <ul class="order-list">
      <?php foreach ($orders as $order): ?>
        <li class="panel order-row">
          <div>
            <p class="order-number"><?= e($order['order_number']) ?></p>
            <p class="muted sm"><?= e(format_date((int) $order['created_at'], $lang)) ?></p>
          </div>
          <span class="status status-<?= e($order['status']) ?>"><?= e(status_label($order['status'])) ?></span>
          <p class="price"><?= e(money($order['total'])) ?></p>
          <a class="btn btn-ghost btn-mini" href="<?= e(url('/orders/' . $order['id'])) ?>"><?= e(t('orders.view')) ?></a>
        </li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>
</section>
