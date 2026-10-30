<?php
/**
 * Small shared helpers: escaping, money formatting, URLs, CSRF, flash messages.
 */

/** HTML-escape a value for output. */
function e($value): string
{
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Format rupees the way the storefront does: ₹1,299 */
function money($amount): string
{
    return '₹' . number_format((int) $amount);
}

/** Absolute path for an app route, respecting BASE_PATH. */
function url(string $path = '/'): string
{
    $path = '/' . ltrim($path, '/');
    return BASE_PATH . ($path === '/' ? '/' : rtrim($path, '/'));
}

/** URL for a file in assets/ */
function asset(string $path): string
{
    return BASE_PATH . '/assets/' . ltrim($path, '/');
}

/** Path of a locally hosted product/sticker image. */
function image_url(string $path): string
{
    if ($path === '') {
        return '';
    }
    if (str_starts_with($path, 'http') || str_starts_with($path, 'data:')) {
        return $path;
    }
    return BASE_PATH . '/' . ltrim($path, '/');
}

/** Redirect and stop. */
function redirect(string $path): void
{
    header('Location: ' . url($path), true, 302);
    exit;
}

/** Start the session once, with safe cookie flags. */
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => SESSION_TTL,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $secure,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/** Per-session CSRF token. */
function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** Hidden input for forms. */
function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

/** Abort the request when the CSRF token does not match. */
function csrf_verify(): void
{
    start_session();
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals($_SESSION['csrf'] ?? '', $sent)) {
        http_response_code(419);
        exit('Session expired. Please go back and try again.');
    }
}

/** Store a one-shot flash message. */
function flash(string $type, string $message): void
{
    start_session();
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

/** Read and clear flash messages. */
function take_flashes(): array
{
    start_session();
    $messages = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $messages;
}

/** Reject non-POST requests. */
function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        http_response_code(405);
        exit('Method not allowed.');
    }
}

/** Current request path without the base prefix, e.g. "/shop". */
function current_path(): string
{
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH) ?: '/';
    if (BASE_PATH !== '' && str_starts_with($path, BASE_PATH)) {
        $path = substr($path, strlen(BASE_PATH));
    }
    $path = '/' . trim($path, '/');
    return $path === '/' ? '/' : rtrim($path, '/');
}

/** Trimmed POST/GET string. */
function input(string $key, string $default = ''): string
{
    $value = $_POST[$key] ?? $_GET[$key] ?? $default;
    return is_string($value) ? trim($value) : $default;
}

/** True when the current request looks like it came from this site. */
function same_origin(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return true; // same-origin form posts often omit Origin
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return $host !== '' && str_contains($origin, $host);
}

/**
 * Render a view inside the shared layout.
 *
 * @param string $view  path under views/, without .php
 * @param array  $data  variables made available to the view
 */
function render(string $view, array $data = [], string $title = ''): void
{
    $data['pageTitle'] = $title;
    extract($data, EXTR_SKIP);
    require __DIR__ . '/../views/layout.php';
}

/** Milliseconds since the epoch — the timestamp unit used across the schema. */
function now_ms(): int
{
    return (int) round(microtime(true) * 1000);
}

/** Human date for a millisecond timestamp. */
function format_date(int $ms, string $lang = 'en'): string
{
    $format = $lang === 'ta' ? 'd/m/Y, h:i A' : 'j M Y, g:i A';
    return date($format, (int) ($ms / 1000));
}
