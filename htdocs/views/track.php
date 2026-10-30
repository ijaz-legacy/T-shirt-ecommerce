<?php /** Order tracking by number. */ ?>
<section class="container section narrow">
  <h1 class="display page-title"><?= e(t('track.title')) ?></h1>
  <p class="lead sm"><?= e(t('track.hint')) ?></p>

  <form method="get" action="<?= e(url('/track')) ?>" class="inline-form">
    <input class="field" name="number" value="<?= e($number) ?>"
           placeholder="IJZ-261030-4821" aria-label="<?= e(t('track.number')) ?>">
    <button class="btn btn-primary" type="submit"><?= e(t('track.button')) ?></button>
  </form>

  <?php if ($number !== '' && !$order): ?>
    <p class="flash flash-error"><?= e(t('track.notFound')) ?></p>
  <?php endif; ?>

  <?php if ($order): ?>
    <div class="panel">
      <div class="order-head">
        <div>
          <p class="eyebrow"><?= e(t('track.number')) ?></p>
          <p class="order-number"><?= e($order['order_number']) ?></p>
        </div>
        <span class="status status-<?= e($order['status']) ?>"><?= e(status_label($order['status'])) ?></span>
      </div>

      <?php $events = order_events($order['id']); ?>
      <ol class="timeline">
        <?php foreach ($events as $event): ?>
          <li class="done">
            <span class="dot"></span>
            <div>
              <p class="timeline-status"><?= e(status_label($event['status'])) ?></p>
              <p class="muted sm"><?= e(format_date((int) $event['created_at'], $lang)) ?></p>
            </div>
          </li>
        <?php endforeach; ?>
      </ol>

      <p class="muted sm"><?= e(t('admin.placedOn')) ?>: <?= e(format_date((int) $order['created_at'], $lang)) ?></p>
      <p class="price"><?= e(money($order['total'])) ?></p>
    </div>
  <?php endif; ?>
</section>
