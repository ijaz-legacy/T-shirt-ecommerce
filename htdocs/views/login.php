<?php /** Sign in. */ ?>
<section class="container section narrow">
  <h1 class="display page-title"><?= e(t('auth.signInTitle')) ?></h1>

  <?php if (!empty($error)): ?>
    <p class="flash flash-error"><?= e($error) ?></p>
  <?php endif; ?>

  <form method="post" action="<?= e(url('/login')) ?>" class="panel form-panel">
    <?= csrf_field() ?>
    <input type="hidden" name="next" value="<?= e($next) ?>">

    <label class="field-label" for="email"><?= e(t('auth.email')) ?></label>
    <input class="field" id="email" name="email" type="email" value="<?= e($email) ?>"
           autocomplete="email" required autofocus>

    <label class="field-label" for="password"><?= e(t('auth.password')) ?></label>
    <input class="field" id="password" name="password" type="password"
           autocomplete="current-password" required>

    <button class="btn btn-primary btn-block" type="submit"><?= e(t('auth.signIn')) ?></button>
  </form>

  <p class="muted sm center">
    <?= e(t('auth.noAccount')) ?>
    <a class="quiet-link" href="<?= e(url('/register')) ?>"><?= e(t('auth.signUp')) ?></a>
  </p>
</section>
