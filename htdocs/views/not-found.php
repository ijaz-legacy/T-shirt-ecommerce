<?php /** 404. */ ?>
<section class="container section narrow center">
  <p class="eyebrow">404</p>
  <h1 class="display page-title"><?= e($lang === 'ta' ? 'பக்கம் கிடைக்கவில்லை' : 'Page not found') ?></h1>
  <p class="lead sm"><?= e($lang === 'ta' ? 'நீங்கள் தேடிய பக்கம் இல்லை.' : 'The page you were looking for does not exist.') ?></p>
  <a class="btn btn-primary" href="<?= e(url('/shop')) ?>"><?= e(t('home.shopCta')) ?></a>
</section>
