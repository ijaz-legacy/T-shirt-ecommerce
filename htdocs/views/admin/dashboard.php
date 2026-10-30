<?php /** Console dashboard. */ ?>
<section class="section">
  <div class="section-head">
    <h1 class="display page-title"><?= e(t('admin.title')) ?></h1>
    <a class="quiet-link" href="<?= e(url('/')) ?>"><?= e(t('admin.viewStore')) ?></a>
  </div>

  <?php require __DIR__ . '/_nav.php'; ?>

  <div class="stat-grid">
    <div class="stat">
      <p class="stat-label"><?= e(t('admin.openOrders')) ?></p>
      <p class="stat-value"><?= (int) $stats['open'] ?></p>
    </div>
    <div class="stat">
      <p class="stat-label"><?= e(t('admin.last24h')) ?></p>
      <p class="stat-value"><?= (int) $stats['last24h'] ?></p>
    </div>
    <div class="stat">
      <p class="stat-label"><?= e(t('admin.revenue')) ?></p>
      <p class="stat-value"><?= e(money($stats['revenue'])) ?></p>
    </div>
    <div class="stat">
      <p class="stat-label"><?= e(t('admin.activeProducts')) ?></p>
      <p class="stat-value"><?= (int) $stats['active'] ?></p>
    </div>
    <div class="stat">
      <p class="stat-label"><?= e(t('admin.totalOrders')) ?></p>
      <p class="stat-value"><?= (int) $stats['orders'] ?></p>
    </div>
    <div class="stat">
      <p class="stat-label"><?= e(t('admin.totalCustomers')) ?></p>
      <p class="stat-value"><?= (int) $stats['customers'] ?></p>
    </div>
  </div>

  <h2 class="section-title" style="margin-top:26px"><?= e(t('admin.recent')) ?></h2>

  <?php if (!$recent): ?>
    <p class="muted pad"><?= e(t('admin.noOrders')) ?></p>
  <?php else: ?>
    <div class="table-wrap" style="margin-top:12px">
      <table class="data">
        <thead>
          <tr>
            <th><?= e(t('track.number')) ?></th>
            <th><?= e(t('admin.customer')) ?></th>
            <th><?= e(t('admin.placedOn')) ?></th>
            <th><?= e(t('cart.total')) ?></th>
            <th><?= e(t('admin.updateStatus')) ?></th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($recent as $order): ?>
            <tr>
              <td><a href="<?= e(url('/admin/orders/' . $order['id'])) ?>"><?= e($order['order_number']) ?></a></td>
              <td><?= e($order['customer_name']) ?></td>
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
