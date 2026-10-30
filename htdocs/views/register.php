<?php /** Create an account. */ ?>
<section class="container section narrow">
  <h1 class="display page-title"><?= e(t('auth.signUpTitle')) ?></h1>

  <?php if (!empty($error)): ?>
    <p class="flash flash-error"><?= e($error) ?></p>
  <?php endif; ?>

  <form method="post" action="<?= e(url('/register')) ?>" class="panel form-panel">
    <?= csrf_field() ?>

    <label class="field-label" for="name"><?= e(t('auth.name')) ?></label>
    <input class="field" id="name" name="name" value="<?= e($name) ?>"
           autocomplete="name" required autofocus>

    <label class="field-label" for="email"><?= e(t('auth.email')) ?></label>
    <input class="field" id="email" name="email" type="email" value="<?= e($email) ?>"
           autocomplete="email" required>

    <label class="field-label" for="password"><?= e(t('auth.password')) ?></label>
    <input class="field" id="password" name="password" type="password"
           autocomplete="new-password" required>
    <p class="muted sm"><?= e(t('auth.passwordRule')) ?></p>

    <button class="btn btn-primary btn-block" type="submit"><?= e(t('auth.signUp')) ?></button>
  </form>

  <p class="muted sm center">
    <?= e(t('auth.haveAccount')) ?>
    <a class="quiet-link" href="<?= e(url('/login')) ?>"><?= e(t('auth.signIn')) ?></a>
  </p>
</section>
