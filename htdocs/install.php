<?php
/**
 * One-time installer for InfinityFree.
 *
 * Creates the tables, seeds the starter products and stickers, and creates the
 * owner account. Open this file in a browser after uploading.
 *
 * When an owner already exists, this page requires that owner to be signed in
 * before it will create further accounts.
 */

require __DIR__ . '/config.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/i18n.php';
require __DIR__ . '/lib/catalog.php';
require __DIR__ . '/lib/auth.php';

start_session();

$messages = [];
$errors   = [];
$installed = false;
$ownerExists = false;

try {
    db()->query('SELECT 1');
    $connected = true;
} catch (Throwable $e) {
    $connected = false;
    $errors[] = 'Cannot connect to MySQL: ' . $e->getMessage()
        . ' — check DB_HOST, DB_NAME, DB_USER and DB_PASS in config.php.';
}

if ($connected) {
    try {
        $installed = db_installed();
    } catch (Throwable $e) {
        $installed = false;
    }
}

if ($connected) {
    try {
        if ($installed) {
            $ownerExists = (bool) scalar("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        }
    } catch (Throwable $e) {
        $ownerExists = false;
    }
}

$needsOwnerLogin = $installed && $ownerExists && !is_owner();

if ($connected && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && !$needsOwnerLogin) {
    csrf_verify();

    try {
        db_migrate();
        $messages[] = 'Tables are ready.';
    } catch (Throwable $e) {
        $errors[] = 'Could not create tables: ' . $e->getMessage();
    }

    try {
        $inserted = seed_products_into_db();
        $messages[] = $inserted > 0
            ? $inserted . ' starter products added.'
            : 'Starter products already present.';
    } catch (Throwable $e) {
        $errors[] = 'Could not seed products: ' . $e->getMessage();
    }

    // Seed stickers from images/stickers if that folder was uploaded.
    $stickerDir = __DIR__ . '/images/stickers';
    if (is_dir($stickerDir)) {
        $seeded = 0;
        foreach (glob($stickerDir . '/*.png') ?: [] as $file) {
            $name = basename($file, '.png');
            $exists = scalar('SELECT id FROM stickers WHERE name_en = ?', [$name]);
            if ($exists) {
                continue;
            }
            $bytes = file_get_contents($file);
            if ($bytes === false) {
                continue;
            }
            $imageId = uuid();
            q(
                'INSERT INTO product_images (id, mime, bytes, kind, created_at) VALUES (?,?,?,?,?)',
                [$imageId, 'image/png', $bytes, 'sticker', now_ms()]
            );
            q(
                'INSERT INTO stickers (id, name_en, name_ta, image_id, category, active, sort_order, created_at)
                 VALUES (?,?,?,?,?,1,?,?)',
                [uuid(), ucwords(str_replace(['-', '_'], ' ', $name)), ucwords(str_replace(['-', '_'], ' ', $name)),
                 $imageId, 'medium', $seeded, now_ms()]
            );
            $seeded++;
        }
        $messages[] = $seeded . ' stickers added.';
    }

    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $name  = trim((string) ($_POST['name'] ?? ''));
    $pass  = (string) ($_POST['password'] ?? '');
    $role  = ($_POST['role'] ?? 'admin') === 'staff' ? 'staff' : 'admin';

    if ($email !== '' || $pass !== '') {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Enter a valid email address for the account.';
        } elseif (($problem = password_problem($pass)) !== null) {
            $errors[] = $problem;
        } elseif (one('SELECT id FROM users WHERE email = ?', [$email])) {
            $errors[] = 'That email already has an account.';
        } else {
            try {
                q(
                    'INSERT INTO users (id, name, email, password_hash, role, created_at)
                     VALUES (?,?,?,?,?,?)',
                    [uuid(), $name !== '' ? $name : 'Store owner', $email,
                     password_hash($pass, PASSWORD_DEFAULT), $role, now_ms()]
                );
                $messages[] = 'Account created for ' . $email . '.';
            } catch (Throwable $e) {
                $errors[] = 'Could not create the account: ' . $e->getMessage();
            }
        }
    }

    $installed = db_installed();
    $ownerExists = (bool) scalar("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
}
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Install · <?= e(SITE_NAME) ?></title>
<link rel="stylesheet" href="<?= e(asset('css/app.css')) ?>">
</head>
<body>
<main class="container section narrow">
  <p class="eyebrow">Setup</p>
  <h1 class="display page-title"><?= e(SITE_NAME) ?> installer</h1>

  <?php foreach ($errors as $error): ?>
    <p class="flash flash-error"><?= e($error) ?></p>
  <?php endforeach; ?>
  <?php foreach ($messages as $message): ?>
    <p class="flash flash-ok"><?= e($message) ?></p>
  <?php endforeach; ?>

  <?php if (!$connected): ?>
    <div class="panel">
      <h2 class="section-title">Database connection</h2>
      <p class="muted sm">
        Open <code>config.php</code> and fill in the values from your InfinityFree
        control panel under <strong>MySQL Databases</strong>.
      </p>
      <pre class="muted sm" style="overflow:auto">Host: <?= e(DB_HOST) ?>
Database: <?= e(DB_NAME) ?>
User: <?= e(DB_USER) ?></pre>
    </div>
  <?php elseif ($needsOwnerLogin): ?>
    <div class="panel">
      <h2 class="section-title">Already installed</h2>
      <p class="muted sm">
        An owner account exists. Sign in as the owner to add more accounts.
      </p>
      <p style="margin-top:14px">
        <a class="btn btn-primary" href="<?= e(url('/login')) ?>">Sign in</a>
      </p>
    </div>
  <?php else: ?>
    <form method="post" action="" class="panel form-panel">
      <?= csrf_field() ?>
      <h2 class="section-title">1. Create the owner account</h2>
      <p class="muted sm">
        <?= $installed ? 'Add another account, or update the store.' : 'This also creates the tables and seeds the starter products.' ?>
      </p>

      <label class="field-label" for="name">Name</label>
      <input class="field" id="name" name="name" value="Store owner">

      <label class="field-label" for="email">Email</label>
      <input class="field" id="email" name="email" type="email" autocomplete="email" required>

      <label class="field-label" for="password">Password</label>
      <input class="field" id="password" name="password" type="password" autocomplete="new-password" required>
      <p class="muted sm">At least 8 characters, with a letter and a number.</p>

      <label class="field-label" for="role">Role</label>
      <select class="field" id="role" name="role">
        <option value="admin">Owner (full console)</option>
        <option value="staff">Staff (orders only)</option>
      </select>

      <button class="btn btn-primary btn-block" type="submit" style="margin-top:16px">
        <?= $installed ? 'Save' : 'Install the store' ?>
      </button>
    </form>

    <p class="muted sm" style="margin-top:16px">
      After setup, delete or rename <code>install.php</code> so nobody else can run it.
    </p>
  <?php endif; ?>

  <?php if ($installed && $ownerExists): ?>
    <p style="margin-top:20px">
      <a class="btn btn-ghost" href="<?= e(url('/')) ?>">Open the store</a>
    </p>
  <?php endif; ?>
</main>
</body>
</html>
