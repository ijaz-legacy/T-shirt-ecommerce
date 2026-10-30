<?php /** Shop listing with category filter. */ ?>
<section class="container section">
  <h1 class="display page-title"><?= e(t('shop.title')) ?></h1>
  <p class="lead sm"><?= e(t('shop.subtitle')) ?></p>

  <div class="chips">
    <a class="chip <?= $category === '' ? 'chip-active' : '' ?>" href="<?= e(url('/shop')) ?>"><?= e(t('shop.all')) ?></a>
    <?php foreach (['nature', 'retro', 'abstract', 'street'] as $cat): ?>
      <a class="chip <?= $category === $cat ? 'chip-active' : '' ?>"
         href="<?= e(url('/shop?category=' . $cat)) ?>"><?= e(ucfirst($cat)) ?></a>
    <?php endforeach; ?>
    <span class="muted sm"><?= count($products) ?> <?= e(t('shop.results')) ?></span>
  </div>

  <?php if (!$products): ?>
    <p class="muted pad"><?= e(t('shop.empty')) ?></p>
  <?php else: ?>
    <div class="grid-products">
      <?php foreach ($products as $product): ?>
        <a class="card-product" href="<?= e(url('/product/' . $product['slug'])) ?>">
          <div class="card-media">
            <img src="<?= e(image_url($product['image'])) ?>" alt="<?= e(pick($product, 'name')) ?>" loading="lazy">
            <?php if (!empty($product['badge'])): ?>
              <span class="badge"><?= e($product['badge']) ?></span>
            <?php endif; ?>
            <?php if ((int) $product['stock'] <= 0): ?>
              <span class="badge badge-sold"><?= e(t('product.outOfStock')) ?></span>
            <?php endif; ?>
          </div>
          <div class="card-body">
            <h3><?= e(pick($product, 'name')) ?></h3>
            <p class="muted sm"><?= e(pick($product, 'color')) ?></p>
            <p class="price"><?= e(money($product['price'])) ?></p>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>
