<?php /** Console: order list with status filter. */ ?>
<section class="section">
  <div class="section-head">
    <h1 class="display page-title"><?= e(t('admin.orders')) ?></h1>
    <a class="quiet-link" href="<?= e(url('/')) ?>"><?= e(t('admin.viewStore')) ?></a>
  </div>

  <?php require __DIR__ . '/_nav.php'; ?>

  <div class="filter-row">
    <a class="chip <?= $status === 'all' ? 'chip-active' : '' ?>" href="<?= e(url('/admin/orders')) ?>"><?= e(t('shop.all')) ?></a>
    <?php foreach (ORDER_STATUSES as $option): ?>
      <a class="chip <?= $status === $option ? 'chip-active' : '' ?>"
         href="<?= e(url('/admin/orders?status=' . $option)) ?>"><?= e(status_label($option)) ?></a>
    <?php endforeach; ?>
  </div>

  <?php if (!$orders): ?>
    <p class="muted pad"><?= e(t('admin.noOrders')) ?></p>
  <?php else: ?>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th><?= e(t('track.number')) ?></th>
            <th><?= e(t('admin.customer')) ?></th>
            <th><?= e(t('checkout.phone')) ?></th>
            <th><?= e(t('admin.placedOn')) ?></th>
            <th><?= e(t('cart.total')) ?></th>
            <th><?= e(t('admin.updateStatus')) ?></th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($orders as $order): ?>
            <tr>
              <td><a href="<?= e(url('/admin/orders/' . $order['id'])) ?>"><?= e($order['order_number']) ?></a></td>
              <td><?= e($order['customer_name']) ?></td>
              <td><?= e($order['phone']) ?></td>
              <td><?= e(format_date((int) $order['created_at'], $lang)) ?></td>
              <td><?= e(money($order['total'])) ?></td>
              <td><span class="status status-<?= e($order['status']) ?>"><?= e(status_label($order['status'])) ?></span></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</section>
