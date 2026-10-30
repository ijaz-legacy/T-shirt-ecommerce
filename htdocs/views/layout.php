<?php
/**
 * Shared page shell: header, navigation, flash messages, footer.
 * Expects $view (view name) and $pageTitle from render().
 */
$user = current_user();
$lang = current_lang();
$count = cart_count();
$flashes = take_flashes();
?><!doctype html>
<html lang="<?= e($lang) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($pageTitle !== '' ? $pageTitle . ' · ' . SITE_NAME : SITE_NAME) ?></title>
<meta name="description" content="<?= e(t('home.subtitle')) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="<?= e(asset('css/app.css')) ?>">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="<?= e(url('/')) ?>"><?= e(SITE_NAME) ?></a>

    <nav class="nav" aria-label="Main">
      <a href="<?= e(url('/shop')) ?>"><?= e(t('nav.shop')) ?></a>
      <a href="<?= e(url('/customize')) ?>"><?= e(t('nav.customize')) ?></a>
      <a href="<?= e(url('/track')) ?>"><?= e(t('nav.track')) ?></a>
      <?php if ($user): ?>
        <a href="<?= e(url('/orders')) ?>"><?= e(t('nav.orders')) ?></a>
      <?php endif; ?>
      <?php if (is_staff()): ?>
        <a href="<?= e(url('/admin')) ?>"><?= e(t('nav.admin')) ?></a>
      <?php endif; ?>
    </nav>

    <div class="header-actions">
      <a class="lang-toggle" href="?lang=<?= $lang === 'ta' ? 'en' : 'ta' ?>" title="<?= e(t('nav.language')) ?>"><?= e(t('nav.language')) ?></a>

      <a class="cart-link" href="<?= e(url('/cart')) ?>">
        <?= e(t('nav.cart')) ?><?php if ($count > 0): ?><span class="cart-badge"><?= (int) $count ?></span><?php endif; ?>
      </a>

      <?php if ($user): ?>
        <form method="post" action="<?= e(url('/logout')) ?>" class="inline">
          <?= csrf_field() ?>
          <button type="submit" class="link-button"><?= e(t('nav.logout')) ?></button>
        </form>
      <?php else: ?>
        <a class="link-button" href="<?= e(url('/login')) ?>"><?= e(t('nav.login')) ?></a>
      <?php endif; ?>
    </div>
  </div>
</header>

<?php if ($flashes): ?>
  <div class="container flash-wrap">
    <?php foreach ($flashes as $flash): ?>
      <p class="flash flash-<?= e($flash['type']) ?>"><?= e($flash['message']) ?></p>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<main id="main">
  <?php require __DIR__ . '/' . $view . '.php'; ?>
</main>

<footer class="site-footer">
  <div class="container footer-inner">
    <div>
      <p class="brand-sm"><?= e(SITE_NAME) ?></p>
      <p class="muted"><?= e(t('home.eyebrow')) ?></p>
    </div>
    <div class="footer-links">
      <a href="<?= e(url('/shop')) ?>"><?= e(t('nav.shop')) ?></a>
      <a href="<?= e(url('/customize')) ?>"><?= e(t('nav.customize')) ?></a>
      <a href="<?= e(url('/track')) ?>"><?= e(t('nav.track')) ?></a>
      <a href="https://wa.me/<?= e(WHATSAPP_NUMBER) ?>" target="_blank" rel="noopener"><?= e(t('home.whatsapp')) ?></a>
    </div>
  </div>
</footer>

<script src="<?= e(asset('js/app.js')) ?>" defer></script>
</body>
</html>
