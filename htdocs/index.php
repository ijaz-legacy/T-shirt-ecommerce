<?php
/**
 * IJAZ LEGACY — PHP storefront for InfinityFree.
 *
 * Single front controller. Pretty URLs are created by .htaccess; without
 * rewriting everything still works through index.php?r=/path.
 */

require __DIR__ . '/config.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/i18n.php';
require __DIR__ . '/lib/catalog.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/cart.php';
require __DIR__ . '/lib/orders.php';

start_session();

// The installer must be reachable before the schema exists.
if (!db_installed()) {
    $target = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/') . '/install.php';
    header('Location: ' . $target, true, 302);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path   = $_GET['r'] ?? current_path();
$path   = '/' . trim((string) $path, '/');
if ($path === '/index.php') {
    $path = '/';
}

// ---------------------------------------------------------------- helpers

/** Render one of the storefront views. */
function page(string $view, array $data = [], string $title = ''): void
{
    render($view, $data, $title);
}

/** The customer-facing 404. */
function not_found(): void
{
    http_response_code(404);
    page('not-found', [], 'Not found');
}

// ------------------------------------------------------------------ routes

switch (true) {

    // ---- Home ---------------------------------------------------------
    case $path === '/':
        $featured = all(
            'SELECT * FROM products WHERE active = 1 AND featured = 1 ORDER BY sort_order LIMIT 4'
        );
        $latest = all('SELECT * FROM products WHERE active = 1 ORDER BY sort_order LIMIT 8');
        page('home', ['featured' => $featured, 'latest' => $latest], SITE_NAME);
        break;

    // ---- Shop ---------------------------------------------------------
    case $path === '/shop':
        $category = input('category');
        if ($category !== '' && in_array($category, ['nature', 'retro', 'abstract', 'street'], true)) {
            $products = all(
                'SELECT * FROM products WHERE active = 1 AND category = ? ORDER BY sort_order',
                [$category]
            );
        } else {
            $category = '';
            $products = all('SELECT * FROM products WHERE active = 1 ORDER BY sort_order');
        }
        page('shop', ['products' => $products, 'category' => $category], t('shop.title'));
        break;

    // ---- Product ------------------------------------------------------
    case (bool) preg_match('#^/product/([a-z0-9\-]+)$#', $path, $m):
        $product = one('SELECT * FROM products WHERE slug = ? AND active = 1', [$m[1]]);
        if (!$product) {
            not_found();
            break;
        }
        page('product', ['product' => $product], pick($product, 'name'));
        break;

    // ---- Cart ---------------------------------------------------------
    case $path === '/cart':
        if ($method === 'POST') {
            csrf_verify();
            $action = input('action');
            if ($action === 'remove') {
                cart_remove(input('key'));
                flash('ok', t('cart.remove'));
            } elseif ($action === 'qty') {
                cart_set_qty(input('key'), (int) input('qty', '1'));
            }
            redirect('/cart');
        }
        page('cart', ['totals' => cart_totals()], t('cart.title'));
        break;

    // ---- Add a printed product to the cart ----------------------------
    case $path === '/cart/add':
        require_post();
        csrf_verify();
        $slug = input('slug');
        $size = input('size');
        $product = one('SELECT * FROM products WHERE slug = ? AND active = 1', [$slug]);
        if (!$product) {
            flash('error', t('shop.empty'));
            redirect('/shop');
        }
        if (!in_array($size, SIZES, true)) {
            flash('error', t('product.chooseSize'));
            redirect('/product/' . $slug);
        }
        if ((int) $product['stock'] <= 0) {
            flash('error', t('product.outOfStock'));
            redirect('/product/' . $slug);
        }
        cart_add_product($product, $size, (int) input('qty', '1'));
        flash('ok', t('product.addToCart'));
        redirect('/cart');
        break;

    // ---- Custom designer ----------------------------------------------
    case $path === '/customize':
        if ($method === 'POST') {
            csrf_verify();
            $fit  = input('fit', 'regular');
            $size = input('size', 'M');
            $colorId = input('color', 'cream');

            if (!isset(FITS[$fit])) {
                $fit = 'regular';
            }
            if (!in_array($size, SIZES, true)) {
                $size = 'M';
            }
            if (!isset(TEE_COLORS[$colorId])) {
                $colorId = 'cream';
            }

            $placements = [];
            $raw = json_decode((string) input('placements', '[]'), true);
            if (is_array($raw)) {
                foreach (array_slice($raw, 0, 12) as $placement) {
                    if (!is_array($placement)) {
                        continue;
                    }
                    $scale = (float) ($placement['scale'] ?? 32);
                    $placements[] = [
                        'ref'      => (string) ($placement['ref'] ?? ''),
                        'x'        => max(0, min(100, (float) ($placement['x'] ?? 50))),
                        'y'        => max(0, min(100, (float) ($placement['y'] ?? 40))),
                        'scale'    => max(8, min(72, $scale)),
                        'rotation' => 0,
                        'category' => category_for_scale($scale),
                    ];
                }
            }

            cart_add_custom([
                'fit'        => $fit,
                'size'       => $size,
                'color'      => $colorId,
                'placements' => $placements,
                'qty'        => (int) input('qty', '1'),
            ]);
            flash('ok', t('product.addToCart'));
            redirect('/cart');
        }

        $stickers = all('SELECT * FROM stickers WHERE active = 1 ORDER BY sort_order, name_en LIMIT 60');
        page('customize', ['stickers' => $stickers], t('nav.customize'));
        break;

    // ---- Upload an image for the designer ------------------------------
    case $path === '/upload':
        require_login('/customize');
        require_post();
        csrf_verify();
        header('Content-Type: application/json');
        try {
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                echo json_encode(['error' => 'upload_failed']);
                exit;
            }
            $id = store_uploaded_image($_FILES['file']);
            echo json_encode(['id' => $id, 'url' => url('/image/' . $id)]);
        } catch (Throwable $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        exit;

    // ---- Checkout ------------------------------------------------------
    case $path === '/checkout':
        require_login('/checkout');
        $user = current_user();

        if ($method === 'POST') {
            csrf_verify();
            $address = [
                'name'     => input('name'),
                'phone'    => input('phone'),
                'address1' => input('address1'),
                'address2' => input('address2'),
                'city'     => input('city'),
                'state'    => input('state'),
                'pincode'  => input('pincode'),
            ];
            $errors = [];
            if (mb_strlen($address['name']) < 2) {
                $errors['name'] = t('common.required');
            }
            if (!preg_match('/^[0-9+\-\s]{10,15}$/', $address['phone'])) {
                $errors['phone'] = t('common.invalid');
            }
            if (mb_strlen($address['address1']) < 5) {
                $errors['address1'] = t('common.required');
            }
            if ($address['city'] === '') {
                $errors['city'] = t('common.required');
            }
            if ($address['state'] === '') {
                $errors['state'] = t('common.required');
            }
            if (!preg_match('/^[0-9]{6}$/', $address['pincode'])) {
                $errors['pincode'] = t('common.invalid');
            }

            if ($errors) {
                page('checkout', [
                    'totals'  => cart_totals(),
                    'address' => $address,
                    'errors'  => $errors,
                ], t('checkout.title'));
                break;
            }

            $result = place_order($user, $address);
            if (!$result['ok']) {
                flash('error', $result['error']);
                redirect('/cart');
            }
            redirect('/orders/' . $result['order']['id'] . '?placed=1');
        }

        if (cart_count() === 0) {
            flash('error', t('cart.empty'));
            redirect('/cart');
        }
        page('checkout', [
            'totals'  => cart_totals(),
            'address' => ['name' => $user['name'], 'phone' => '', 'address1' => '', 'address2' => '', 'city' => '', 'state' => 'Tamil Nadu', 'pincode' => ''],
            'errors'  => [],
        ], t('checkout.title'));
        break;

    // ---- Track ---------------------------------------------------------
    case $path === '/track':
        $number = input('number');
        $order  = $number !== '' ? get_order_by_number(strtoupper($number)) : null;
        page('track', ['number' => $number, 'order' => $order], t('track.title'));
        break;

    // ---- Auth ----------------------------------------------------------
    case $path === '/login':
        if ($method === 'POST') {
            csrf_verify();
            $error = attempt_login(input('email'), (string) ($_POST['password'] ?? ''));
            if ($error === null) {
                $next = input('next', '/orders');
                redirect($next !== '' && str_starts_with($next, '/') ? $next : '/orders');
            }
            page('login', ['error' => $error, 'email' => input('email'), 'next' => input('next')], t('nav.login'));
            break;
        }
        if (is_logged_in()) {
            redirect('/orders');
        }
        page('login', ['error' => null, 'email' => '', 'next' => input('next')], t('nav.login'));
        break;

    case $path === '/register':
        if ($method === 'POST') {
            csrf_verify();
            $error = register_customer(
                input('name'),
                input('email'),
                (string) ($_POST['password'] ?? '')
            );
            if ($error === null) {
                redirect('/orders');
            }
            page('register', ['error' => $error, 'name' => input('name'), 'email' => input('email')], t('nav.register'));
            break;
        }
        if (is_logged_in()) {
            redirect('/orders');
        }
        page('register', ['error' => null, 'name' => '', 'email' => ''], t('nav.register'));
        break;

    case $path === '/logout':
        logout_user();
        redirect('/');
        break;

    // ---- Customer orders -----------------------------------------------
    case $path === '/orders':
        require_login('/orders');
        $user = current_user();
        page('orders', ['orders' => orders_for_user($user['id'])], t('orders.title'));
        break;

    case (bool) preg_match('#^/orders/([0-9a-f\-]{36})$#', $path, $m):
        require_login('/orders');
        $user  = current_user();
        $order = get_order($m[1]);
        if (!$order) {
            not_found();
            break;
        }
        // A customer may only see their own order; staff may see any.
        if ($order['user_id'] !== $user['id'] && !is_staff()) {
            not_found();
            break;
        }
        page('order-detail', [
            'order'  => $order,
            'items'  => order_items($order['id']),
            'events' => order_events($order['id']),
            'placed' => isset($_GET['placed']),
        ], 'Order ' . $order['order_number']);
        break;

    // ---- Retailer console ----------------------------------------------
    case $path === '/admin':
        require_owner();
        page('admin/dashboard', [
            'stats'  => admin_stats(),
            'recent' => orders_for_admin('all', 6),
        ], t('admin.dashboard'));
        break;

    case $path === '/admin/orders':
        require_staff();
        $status = input('status', 'all');
        page('admin/orders', [
            'orders' => orders_for_admin($status, 100),
            'status' => $status,
        ], t('admin.orders'));
        break;

    case (bool) preg_match('#^/admin/orders/([0-9a-f\-]{36})$#', $path, $m):
        require_staff();
        $order = get_order($m[1]);
        if (!$order) {
            not_found();
            break;
        }
        if ($method === 'POST') {
            csrf_verify();
            $newStatus = input('status');
            if (update_order_status($order['id'], $newStatus, input('note'))) {
                flash('ok', t('admin.updateStatus'));
            }
            redirect('/admin/orders/' . $order['id']);
        }
        page('admin/order-detail', [
            'order'  => $order,
            'items'  => order_items($order['id']),
            'events' => order_events($order['id']),
        ], 'Order ' . $order['order_number']);
        break;

    case $path === '/admin/products':
        require_owner();
        page('admin/products', ['products' => all('SELECT * FROM products ORDER BY sort_order')], t('admin.products'));
        break;

    case (bool) preg_match('#^/admin/products/([a-z0-9\-]+)$#', $path, $m):
        require_owner();
        $product = one('SELECT * FROM products WHERE slug = ?', [$m[1]]);
        if (!$product) {
            not_found();
            break;
        }
        if ($method === 'POST') {
            csrf_verify();
            q(
                'UPDATE products SET price = ?, stock = ?, active = ?, updated_at = ? WHERE slug = ?',
                [
                    max(0, (int) input('price', (string) $product['price'])),
                    max(0, (int) input('stock', (string) $product['stock'])),
                    input('active') === '1' ? 1 : 0,
                    now_ms(),
                    $product['slug'],
                ]
            );
            flash('ok', t('admin.save'));
            redirect('/admin/products');
        }
        page('admin/product-edit', ['product' => $product], pick($product, 'name'));
        break;

    case $path === '/admin/customers':
        require_owner();
        page('admin/customers', ['customers' => admin_customers()], t('admin.customers'));
        break;

    // ---- Image stream ---------------------------------------------------
    case (bool) preg_match('#^/image/([0-9a-f\-]{36})$#', $path, $m):
        serve_image($m[1]);
        break;

    // ---- Health ---------------------------------------------------------
    case $path === '/health':
        header('Content-Type: application/json');
        try {
            db()->query('SELECT 1');
            echo json_encode(['status' => 'ok']);
        } catch (Throwable $e) {
            http_response_code(503);
            echo json_encode(['status' => 'error']);
        }
        exit;

    default:
        not_found();
}

// ------------------------------------------------------------- image utils

/** Stream a stored image blob. */
function serve_image(string $id): void
{
    $row = one('SELECT mime, bytes FROM product_images WHERE id = ?', [$id]);
    if (!$row) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: ' . $row['mime']);
    header('Cache-Control: public, max-age=31536000, immutable');
    header('Content-Length: ' . strlen($row['bytes']));
    echo $row['bytes'];
    exit;
}

/**
 * Validate, resize and store an uploaded image in the database.
 * Returns the new image id. Requires the GD extension (standard on InfinityFree).
 */
function store_uploaded_image(array $file): string
{
    $maxBytes = 6 * 1024 * 1024;
    if ((int) $file['size'] <= 0 || (int) $file['size'] > $maxBytes) {
        throw new RuntimeException('file_too_large');
    }

    $info = @getimagesize($file['tmp_name']);
    if ($info === false) {
        throw new RuntimeException('not_an_image');
    }

    $allowed = [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP];
    if (!in_array($info[2], $allowed, true)) {
        throw new RuntimeException('unsupported_image');
    }

    switch ($info[2]) {
        case IMAGETYPE_PNG:
            $source = imagecreatefrompng($file['tmp_name']);
            break;
        case IMAGETYPE_JPEG:
            $source = imagecreatefromjpeg($file['tmp_name']);
            break;
        default:
            $source = imagecreatefromwebp($file['tmp_name']);
            break;
    }
    if (!$source) {
        throw new RuntimeException('not_an_image');
    }

    // Keep transparency for PNG/WebP artwork.
    $canvas = imagecreatetruecolor($info[0], $info[1]);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);
    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    imagefilledrectangle($canvas, 0, 0, $info[0], $info[1], $transparent);
    imagealphablending($canvas, true);
    imagecopy($canvas, $source, 0, 0, 0, 0, $info[0], $info[1]);

    // Scale down so the largest side is at most 900px.
    $limit = 900;
    $width = $info[0];
    $height = $info[1];
    if ($width > $limit || $height > $limit) {
        $ratio = min($limit / $width, $limit / $height);
        $width = (int) round($width * $ratio);
        $height = (int) round($height * $ratio);
        $resized = imagecreatetruecolor($width, $height);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagefilledrectangle($resized, 0, 0, $width, $height, $transparent);
        imagealphablending($resized, true);
        imagecopyresampled($resized, $canvas, 0, 0, 0, 0, $width, $height, $info[0], $info[1]);
        imagedestroy($canvas);
        $canvas = $resized;
    }

    ob_start();
    imagepng($canvas, null, 8);
    $bytes = ob_get_clean();
    imagedestroy($canvas);
    imagedestroy($source);

    $id = uuid();
    q(
        'INSERT INTO product_images (id, mime, bytes, kind, created_at) VALUES (?,?,?,?,?)',
        [$id, 'image/png', $bytes, 'upload', now_ms()]
    );
    return $id;
}
