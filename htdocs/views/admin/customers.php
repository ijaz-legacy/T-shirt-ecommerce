<?php /** Console: customer list with order counts. */ ?>
<section class="section">
  <div class="section-head">
    <h1 class="display page-title"><?= e(t('admin.customers')) ?></h1>
    <a class="quiet-link" href="<?= e(url('/')) ?>"><?= e(t('admin.viewStore')) ?></a>
  </div>

  <?php require __DIR__ . '/_nav.php'; ?>

  <?php if (!$customers): ?>
    <p class="muted pad"><?= e($lang === 'ta' ? 'இன்னும் வாடிக்கையாளர்கள் இல்லை.' : 'No customers yet.') ?></p>
  <?php else: ?>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th><?= e(t('admin.customer')) ?></th>
            <th><?= e(t('auth.email')) ?></th>
            <th><?= e(t('admin.totalOrders')) ?></th>
            <th><?= e(t('cart.total')) ?></th>
            <th><?= e(t('admin.placedOn')) ?></th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($customers as $customer): ?>
            <tr>
              <td><?= e($customer['name']) ?></td>
              <td><?= e($customer['email']) ?></td>
              <td><?= (int) $customer['order_count'] ?></td>
              <td><?= e(money($customer['spent'])) ?></td>
              <td><?= e(format_date((int) $customer['created_at'], $lang)) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</section>
