<?php
/**
 * IJAZ LEGACY — configuration for InfinityFree (PHP + MySQL).
 *
 * Fill in the four DB_* values from your InfinityFree control panel:
 *   Control Panel → MySQL Databases → your database → details
 *
 * On InfinityFree the host looks like "sql123.infinityfree.com" and the
 * database/user names look like "if0_12345678_store".
 */

// ---- Database ---------------------------------------------------------
define('DB_HOST', getenv('IJAZ_DB_HOST') ?: 'sql000.infinityfree.com');
define('DB_NAME', getenv('IJAZ_DB_NAME') ?: 'if0_00000000_ijaz');
define('DB_USER', getenv('IJAZ_DB_USER') ?: 'if0_00000000');
define('DB_PASS', getenv('IJAZ_DB_PASS') ?: 'CHANGE_ME');
define('DB_CHARSET', 'utf8mb4');

// ---- Site -------------------------------------------------------------
define('SITE_NAME', 'IJAZ LEGACY');

// Absolute URL base. Empty means "same directory the app is served from",
// which is correct for InfinityFree. Override only if you host in a subfolder
// that you cannot rewrite, e.g. '/store'.
define('BASE_PATH', getenv('IJAZ_BASE_PATH') ?: '');

// Where uploaded + static images live, relative to BASE_PATH.
define('IMAGE_BASE', '/images');

// WhatsApp enquiry number (digits only, with country code).
define('WHATSAPP_NUMBER', '918754750458');

// Session lifetime in seconds.
define('SESSION_TTL', 60 * 60 * 24 * 14);

// ---- Environment ------------------------------------------------------
define('APP_DEBUG', getenv('IJAZ_DEBUG') === '1');

ini_set('display_errors', APP_DEBUG ? '1' : '0');
error_reporting(APP_DEBUG ? E_ALL : 0);
date_default_timezone_set('Asia/Kolkata');
