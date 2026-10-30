<?php
/**
 * English / Tamil interface strings.
 *
 * The Next.js app carries a much larger dictionary; this covers the PHP
 * storefront's chrome. Product names and descriptions come from the database.
 */

function current_lang(): string
{
    start_session();
    if (isset($_GET['lang']) && in_array($_GET['lang'], ['en', 'ta'], true)) {
        $_SESSION['lang'] = $_GET['lang'];
    }
    $lang = $_SESSION['lang'] ?? 'en';
    return $lang === 'ta' ? 'ta' : 'en';
}

/** Value of a bilingual database column for the active language. */
function pick(array $row, string $base): string
{
    $suffix = current_lang() === 'ta' ? '_ta' : '_en';
    return (string) ($row[$base . $suffix] ?? $row[$base . '_en'] ?? '');
}

/** Translate an interface key. Unknown keys fall back to the key itself. */
function t(string $key): string
{
    static $dict = null;
    if ($dict === null) {
        $dict = require __DIR__ . '/strings.php';
    }
    $lang = current_lang();
    return $dict[$lang][$key] ?? $dict['en'][$key] ?? $key;
}
