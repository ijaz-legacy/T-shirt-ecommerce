<?php
/**
 * Order creation, status flow and reporting.
 *
 * Status flow: placed → processing → shipped → delivered, or cancelled.
 * Cancelling restores stock for printed items, matching the Next.js behaviour.
 */

const ORDER_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

function status_label(string $status): string
{
    return t('track.' . $status);
}

/** Next order number, e.g. IJZ-261030-4821. */
function next_order_number(): string
{
    $prefix = 'IJZ-' . date('ymd') . '-';
    for ($attempt = 0; $attempt < 12; $attempt++) {
        $candidate = $prefix . str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        if (!scalar('SELECT id FROM orders WHERE order_number = ?', [$candidate])) {
            return $candidate;
        }
    }
    return $prefix . substr((string) random_int(10000, 99999), 0, 5);
}

/**
 * Place an order from the current cart.
 *
 * @return array{ok:bool,error?:string,order?:array}
 */
function place_order(array $user, array $address): array
{
    $items = cart();
    if (count($items) === 0) {
        return ['ok' => false, 'error' => t('cart.empty')];
    }

    // Re-price printed items from the catalogue so prices cannot be forged.
    foreach ($items as $index => $item) {
        if (($item['kind'] ?? '') === 'printed') {
            $product = one('SELECT price, stock, active FROM products WHERE slug = ?', [$item['slug']]);
            if (!$product || !(int) $product['active']) {
                return ['ok' => false, 'error' => t('shop.empty')];
            }
            if ((int) $product['stock'] < (int) $item['qty']) {
                return ['ok' => false, 'error' => t('product.outOfStock') . ': ' . $item['name_en']];
            }
            $items[$index]['unit_price'] = (int) $product['price'];
        }
    }

    $subtotal = 0;
    foreach ($items as $item) {
        $subtotal += ((int) $item['unit_price']) * ((int) $item['qty']);
    }
    $shipping = shipping_for($subtotal);
    $total    = $subtotal + $shipping;

    $orderId     = uuid();
    $orderNumber = next_order_number();
    $createdAt   = now_ms();
    $pdo         = db();

    try {
        $pdo->beginTransaction();

        q(
            'INSERT INTO orders
                (id, order_number, user_id, status, customer_name, phone,
                 address1, address2, city, state, pincode,
                 subtotal, shipping_fee, total, payment_method,
                 idempotency_key, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                $orderId, $orderNumber, $user['id'], 'placed',
                $address['name'], $address['phone'],
                $address['address1'], $address['address2'], $address['city'],
                $address['state'], $address['pincode'],
                $subtotal, $shipping, $total, 'cod',
                bin2hex(random_bytes(8)), $createdAt,
            ]
        );

        foreach ($items as $item) {
            q(
                'INSERT INTO order_items
                    (id, order_id, kind, product_slug, name_en, name_ta, size,
                     color_en, color_ta, image, custom_config, quantity, unit_price)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [
                    uuid(), $orderId, $item['kind'], $item['slug'] ?? null,
                    $item['name_en'], $item['name_ta'], $item['size'],
                    $item['color_en'], $item['color_ta'],
                    $item['image'] ?? null,
                    isset($item['placements']) ? json_encode($item['placements']) : null,
                    (int) $item['qty'], (int) $item['unit_price'],
                ]
            );

            if (($item['kind'] ?? '') === 'printed' && !empty($item['slug'])) {
                q(
                    'UPDATE products SET stock = GREATEST(0, stock - ?) WHERE slug = ?',
                    [(int) $item['qty'], $item['slug']]
                );
            }
        }

        q(
            'INSERT INTO order_status_events (id, order_id, status, note, created_at)
             VALUES (?,?,?,?,?)',
            [uuid(), $orderId, 'placed', null, $createdAt]
        );

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('place_order failed: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Could not place the order. Please try again.'];
    }

    cart_clear();

    return [
        'ok'    => true,
        'order' => [
            'id'           => $orderId,
            'order_number' => $orderNumber,
            'total'        => $total,
        ],
    ];
}

function get_order(string $id): ?array
{
    return one('SELECT * FROM orders WHERE id = ?', [$id]);
}

function get_order_by_number(string $number): ?array
{
    return one('SELECT * FROM orders WHERE order_number = ?', [$number]);
}

function order_items(string $orderId): array
{
    return all('SELECT * FROM order_items WHERE order_id = ?', [$orderId]);
}

function order_events(string $orderId): array
{
    return all(
        'SELECT * FROM order_status_events WHERE order_id = ? ORDER BY created_at ASC',
        [$orderId]
    );
}

function orders_for_user(string $userId): array
{
    return all(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [$userId]
    );
}

/** Orders for the console, newest first. */
function orders_for_admin(string $status = 'all', int $limit = 50, int $offset = 0): array
{
    if ($status !== 'all' && in_array($status, ORDER_STATUSES, true)) {
        return all(
            'SELECT o.*, u.email AS customer_email
             FROM orders o LEFT JOIN users u ON u.id = o.user_id
             WHERE o.status = ?
             ORDER BY o.created_at DESC LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset,
            [$status]
        );
    }
    return all(
        'SELECT o.*, u.email AS customer_email
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset
    );
}

/** Move an order to a new status, logging the change. */
function update_order_status(string $orderId, string $status, string $note = ''): bool
{
    if (!in_array($status, ORDER_STATUSES, true)) {
        return false;
    }
    $order = get_order($orderId);
    if (!$order) {
        return false;
    }
    if ($order['status'] === $status) {
        return true;
    }

    $pdo = db();
    try {
        $pdo->beginTransaction();

        q('UPDATE orders SET status = ? WHERE id = ?', [$status, $orderId]);
        q(
            'INSERT INTO order_status_events (id, order_id, status, note, created_at)
             VALUES (?,?,?,?,?)',
            [uuid(), $orderId, $status, $note !== '' ? $note : null, now_ms()]
        );

        // Cancelling a printed order puts the stock back.
        if ($status === 'cancelled' && $order['status'] !== 'cancelled') {
            foreach (order_items($orderId) as $item) {
                if ($item['kind'] === 'printed' && !empty($item['product_slug'])) {
                    q(
                        'UPDATE products SET stock = stock + ? WHERE slug = ?',
                        [(int) $item['quantity'], $item['product_slug']]
                    );
                }
            }
        }

        $pdo->commit();
        return true;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('update_order_status failed: ' . $e->getMessage());
        return false;
    }
}

/** Headline numbers for the console dashboard. */
function admin_stats(): array
{
    $dayAgo = now_ms() - 86400000;
    return [
        'open'      => (int) scalar("SELECT COUNT(*) FROM orders WHERE status IN ('placed','processing','shipped')"),
        'last24h'   => (int) scalar('SELECT COUNT(*) FROM orders WHERE created_at >= ?', [$dayAgo]),
        'revenue'   => (int) scalar("SELECT COALESCE(SUM(total),0) FROM orders WHERE status = 'delivered'"),
        'active'    => (int) scalar('SELECT COUNT(*) FROM products WHERE active = 1'),
        'orders'    => (int) scalar('SELECT COUNT(*) FROM orders'),
        'customers' => (int) scalar("SELECT COUNT(*) FROM users WHERE role = 'customer'"),
    ];
}

function admin_customers(int $limit = 100): array
{
    return all(
        'SELECT u.id, u.name, u.email, u.created_at,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
                (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.user_id = u.id) AS spent
         FROM users u
         WHERE u.role = ? ORDER BY u.created_at DESC LIMIT ' . (int) $limit,
        ['customer']
    );
}
