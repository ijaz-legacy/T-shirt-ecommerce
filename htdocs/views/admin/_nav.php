<?php
/** Console sub-navigation. Owners see everything; staff see orders only. */
$adminPath = current_path();
$adminLinks = [
    ['/admin', t('admin.dashboard'), true],
    ['/admin/orders', t('admin.orders'), false],
    ['/admin/products', t('admin.products'), true],
    ['/admin/customers', t('admin.customers'), true],
];
?>
<div class="admin-nav">
  <?php foreach ($adminLinks as $link): ?>
    <?php if ($link[2] && !is_owner()) { continue; } ?>
    <a class="<?= $adminPath === $link[0] || str_starts_with($adminPath, $link[0] . '/') ? 'active' : '' ?>"
       href="<?= e(url($link[0])) ?>"><?= e($link[1]) ?></a>
  <?php endforeach; ?>
</div>
