<?php /** Console: product list. */ ?>
<section class="section">
  <div class="section-head">
    <h1 class="display page-title"><?= e(t('admin.products')) ?></h1>
    <a class="quiet-link" href="<?= e(url('/')) ?>"><?= e(t('admin.viewStore')) ?></a>
  </div>

  <?php require __DIR__ . '/_nav.php'; ?>

  <?php if (!$products): ?>
    <p class="muted pad"><?= e(t('shop.empty')) ?></p>
  <?php else: ?>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th><?= e(t('admin.products')) ?></th>
            <th><?= e(t('admin.price')) ?></th>
            <th><?= e(t('admin.stock')) ?></th>
            <th><?= e(t('admin.active')) ?></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($products as $product): ?>
            <tr>
              <td><?= e($product['name_en']) ?></td>
              <td><?= e(money($product['price'])) ?></td>
              <td><?= (int) $product['stock'] ?></td>
              <td>
                <span class="status status-<?= (int) $product['active'] ? 'delivered' : 'cancelled' ?>">
                  <?= e((int) $product['active'] ? t('admin.active') : t('admin.inactive')) ?>
                </span>
              </td>
              <td><a href="<?= e(url('/admin/products/' . $product['slug'])) ?>"><?= e(t('admin.save')) ?></a></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</section>
