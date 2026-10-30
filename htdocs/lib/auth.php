<?php
/**
 * Authentication.
 *
 * The Next.js app stores hashed session tokens in a `sessions` table. On
 * shared PHP hosting the native session is simpler and safer (no token ever
 * leaves the server), so the browser session holds only the user id.
 */

function current_user(): ?array
{
    static $cached = null;
    static $loaded = false;
    if ($loaded) {
        return $cached;
    }
    $loaded = true;

    start_session();
    $id = $_SESSION['uid'] ?? null;
    if (!is_string($id) || $id === '') {
        return null;
    }
    $user = one('SELECT id, name, email, role FROM users WHERE id = ?', [$id]);
    if (!$user) {
        unset($_SESSION['uid']);
        return null;
    }
    $cached = $user;
    return $cached;
}

function is_logged_in(): bool
{
    return current_user() !== null;
}

/** Owners and staff can open the console. */
function is_staff(): bool
{
    $user = current_user();
    return $user !== null && in_array($user['role'], ['admin', 'staff'], true);
}

/** Only the owner sees dashboard, products and customers. */
function is_owner(): bool
{
    $user = current_user();
    return $user !== null && $user['role'] === 'admin';
}

function require_login(string $next = '/orders'): void
{
    if (!is_logged_in()) {
        $target = '/login?next=' . rawurlencode($next);
        redirect($target);
    }
}

function require_owner(): void
{
    if (!is_owner()) {
        http_response_code(403);
        render_error(403, t('admin.noAccess'));
    }
}

function require_staff(): void
{
    if (!is_staff()) {
        http_response_code(403);
        render_error(403, t('admin.noAccess'));
    }
}

/** A short error page used by guards. */
function render_error(int $status, string $message): void
{
    http_response_code($status);
    echo '<!doctype html><html><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>' . e($message) . '</title>'
        . '<link rel="stylesheet" href="' . e(asset('css/app.css')) . '">'
        . '</head><body><main class="container" style="padding:80px 0;text-align:center">'
        . '<h1 class="display">' . e($message) . '</h1>'
        . '<p style="margin-top:16px"><a class="btn" href="' . e(url('/')) . '">'
        . e(t('nav.shop')) . '</a></p>'
        . '</main></body></html>';
    exit;
}

/** Validate a password against the store rules. */
function password_problem(string $password): ?string
{
    if (strlen($password) < 8 || strlen($password) > 72) {
        return t('auth.passwordRule');
    }
    if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
        return t('auth.passwordRule');
    }
    return null;
}

/**
 * Attempt a sign-in.
 * @return string|null an error message, or null on success
 */
function attempt_login(string $email, string $password): ?string
{
    $email = strtolower(trim($email));
    $user = one('SELECT * FROM users WHERE email = ?', [$email]);
    if (!$user || !password_verify($password, $user['password_hash'])) {
        return t('auth.signIn') . ': ' . t('common.invalid');
    }

    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $user['id'];
    return null;
}

/**
 * Register a customer.
 * @return string|null an error message, or null on success
 */
function register_customer(string $name, string $email, string $password): ?string
{
    $name = trim($name);
    $email = strtolower(trim($email));

    if ($name === '' || mb_strlen($name) < 2) {
        return t('common.required');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return t('common.invalid');
    }
    $problem = password_problem($password);
    if ($problem !== null) {
        return $problem;
    }
    if (one('SELECT id FROM users WHERE email = ?', [$email])) {
        return t('auth.email') . ': ' . t('common.invalid');
    }

    $id = uuid();
    q(
        'INSERT INTO users (id, name, email, password_hash, role, created_at)
         VALUES (?,?,?,?,?,?)',
        [$id, $name, $email, password_hash($password, PASSWORD_DEFAULT), 'customer', now_ms()]
    );

    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $id;
    return null;
}

function logout_user(): void
{
    start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) ($params['secure'] ?? false), true);
    }
    session_destroy();
}

/** Role label for display. */
function role_label(string $role): string
{
    return $role === 'admin' ? 'Owner' : ($role === 'staff' ? 'Staff' : 'Customer');
}
