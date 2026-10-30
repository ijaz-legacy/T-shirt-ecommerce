<?php /** Home page: hero + featured prints. */ ?>
<section class="hero container">
  <p class="eyebrow"><?= e(t('home.eyebrow')) ?></p>
  <h1 class="display hero-title">
    <?= e(t('home.titleA')) ?><br>
    <span class="accent"><?= e(t('home.titleB')) ?></span>
  </h1>
  <p class="lead"><?= e(t('home.subtitle')) ?></p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="<?= e(url('/shop')) ?>"><?= e(t('home.shopCta')) ?></a>
    <a class="btn btn-ghost" href="<?= e(url('/customize')) ?>"><?= e(t('home.customCta')) ?></a>
  </div>
</section>

<section class="container section">
  <div class="section-head">
    <h2 class="section-title"><?= e(t('home.featured')) ?></h2>
    <a class="quiet-link" href="<?= e(url('/shop')) ?>"><?= e(t('home.allCta')) ?></a>
  </div>

  <?php if (!$featured): ?>
    <p class="muted"><?= e(t('shop.empty')) ?></p>
  <?php else: ?>
    <div class="grid-products">
      <?php foreach ($featured as $product): ?>
        <a class="card-product" href="<?= e(url('/product/' . $product['slug'])) ?>">
          <div class="card-media">
            <img src="<?= e(image_url($product['image'])) ?>" alt="<?= e(pick($product, 'name')) ?>" loading="lazy">
            <?php if (!empty($product['badge'])): ?>
              <span class="badge"><?= e($product['badge']) ?></span>
            <?php endif; ?>
          </div>
          <div class="card-body">
            <h3><?= e(pick($product, 'name')) ?></h3>
            <p class="muted sm"><?= e($product['color_en']) ?></p>
            <p class="price"><?= e(money($product['price'])) ?></p>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<section class="container section">
  <div class="panel custom-panel">
    <div>
      <h2 class="section-title"><?= e(t('home.customTitle')) ?></h2>
      <p class="lead sm"><?= e(t('home.customText')) ?></p>
    </div>
    <a class="btn btn-primary" href="<?= e(url('/customize')) ?>"><?= e(t('home.customCta')) ?></a>
  </div>
</section>
