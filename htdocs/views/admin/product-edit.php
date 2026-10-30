<?php /** Console: edit price, stock and visibility for one product. */ ?>
<section class="section">
  <a class="quiet-link sm" href="<?= e(url('/admin/products')) ?>">&larr; <?= e(t('admin.products')) ?></a>

  <?php require __DIR__ . '/_nav.php'; ?>

  <div class="checkout-layout">
    <form method="post" action="<?= e(url('/admin/products/' . $product['slug'])) ?>" class="panel form-panel">
      <?= csrf_field() ?>
      <h1 class="display page-title"><?= e($product['name_en']) ?></h1>
      <p class="muted sm"><?= e($product['slug']) ?></p>

      <label class="field-label" for="price"><?= e(t('admin.price')) ?> (₹)</label>
      <input class="field" id="price" name="price" type="number" min="0" step="1"
             value="<?= (int) $product['price'] ?>" required>

      <label class="field-label" for="stock"><?= e(t('admin.stock')) ?></label>
      <input class="field" id="stock" name="stock" type="number" min="0" step="1"
             value="<?= (int) $product['stock'] ?>" required>

      <label class="field-label" for="active"><?= e(t('admin.active')) ?></label>
      <select class="field" id="active" name="active">
        <option value="1" <?= (int) $product['active'] ? 'selected' : '' ?>><?= e(t('admin.active')) ?></option>
        <option value="0" <?= (int) $product['active'] ? '' : 'selected' ?>><?= e(t('admin.inactive')) ?></option>
      </select>

      <button class="btn btn-primary btn-block" type="submit" style="margin-top:16px"><?= e(t('admin.save')) ?></button>
    </form>

    <aside class="cart-summary">
      <img src="<?= e(image_url($product['image'])) ?>" alt="<?= e($product['name_en']) ?>"
           style="border-radius:14px;border:1px solid var(--line)">
      <p class="muted sm" style="margin-top:10px"><?= e($product['desc_en']) ?></p>
    </aside>
  </div>
</section>
