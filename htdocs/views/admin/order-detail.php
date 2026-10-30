<?php /** Console: one order, with status control. */ ?>
<section class="section">
  <a class="quiet-link sm" href="<?= e(url('/admin/orders')) ?>">&larr; <?= e(t('admin.orders')) ?></a>

  <?php require __DIR__ . '/_nav.php'; ?>

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
              <?= e($item['name_en']) ?>
              <span class="muted sm">· <?= e($item['size']) ?> · <?= e($item['color_en']) ?> ×<?= (int) $item['quantity'] ?></span>
            </span>
            <span><?= e(money($item['unit_price'] * $item['quantity'])) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>

      <dl class="totals">
        <div><dt><?= e(t('cart.subtotal')) ?></dt><dd><?= e(money($order['subtotal'])) ?></dd></div>
        <div><dt><?= e(t('cart.shipping')) ?></dt><dd><?= (int) $order['shipping_fee'] === 0 ? e(t('cart.free')) : e(money($order['shipping_fee'])) ?></dd></div>
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
      <h2 class="section-title"><?= e(t('admin.updateStatus')) ?></h2>
      <form method="post" action="<?= e(url('/admin/orders/' . $order['id'])) ?>">
        <?= csrf_field() ?>
        <label class="field-label" for="status"><?= e(t('admin.updateStatus')) ?></label>
        <select class="field" id="status" name="status">
          <?php foreach (ORDER_STATUSES as $option): ?>
            <option value="<?= e($option) ?>" <?= $order['status'] === $option ? 'selected' : '' ?>>
              <?= e(status_label($option)) ?>
            </option>
          <?php endforeach; ?>
        </select>

        <label class="field-label" for="note"><?= e(t('admin.customer')) ?></label>
        <input class="field" id="note" name="note" maxlength="240" placeholder="Optional note">

        <button class="btn btn-primary btn-block" type="submit" style="margin-top:14px"><?= e(t('admin.save')) ?></button>
      </form>

      <h3 class="section-title sm" style="margin-top:22px"><?= e(t('track.title')) ?></h3>
      <ol class="timeline">
        <?php foreach ($events as $event): ?>
          <li>
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
