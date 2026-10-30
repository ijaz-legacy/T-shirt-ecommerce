<?php
/**
 * MySQL access layer + schema for InfinityFree.
 *
 * Every table that exists in the Next.js/SQLite version is mirrored here so the
 * PHP app can read the same data shape if you ever migrate a database dump.
 */

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}

/** Run a statement and return the PDOStatement. */
function q(string $sql, array $params = []): PDOStatement
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

/** Fetch a single row, or null. */
function one(string $sql, array $params = []): ?array
{
    $row = q($sql, $params)->fetch();
    return $row === false ? null : $row;
}

/** Fetch all rows. */
function all(string $sql, array $params = []): array
{
    return q($sql, $params)->fetchAll();
}

/** Fetch a single scalar value, or null. */
function scalar(string $sql, array $params = [])
{
    $value = q($sql, $params)->fetchColumn();
    return $value === false ? null : $value;
}

/** True when the schema has already been created. */
function db_installed(): bool
{
    try {
        $count = scalar(
            "SELECT COUNT(*) FROM information_schema.tables
             WHERE table_schema = ? AND table_name = 'products'",
            [DB_NAME]
        );
        return (int) $count > 0;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Statements that build the database. Kept as MySQL DDL (InnoDB so foreign
 * keys work). Safe to run repeatedly.
 */
function schema_statements(): array
{
    return [
        "CREATE TABLE IF NOT EXISTS users (
            id            VARCHAR(36)  NOT NULL PRIMARY KEY,
            name          VARCHAR(120) NOT NULL,
            email         VARCHAR(190) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role          VARCHAR(16)  NOT NULL DEFAULT 'customer',
            created_at    BIGINT       NOT NULL,
            UNIQUE KEY uq_users_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS sessions (
            id         VARCHAR(36)  NOT NULL PRIMARY KEY,
            user_id    VARCHAR(36)  NOT NULL,
            token_hash CHAR(64)     NOT NULL,
            expires_at BIGINT       NOT NULL,
            created_at BIGINT       NOT NULL,
            UNIQUE KEY uq_sessions_token (token_hash),
            KEY idx_sessions_user (user_id),
            CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
                REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS products (
            slug       VARCHAR(120) NOT NULL PRIMARY KEY,
            name_en    VARCHAR(160) NOT NULL,
            name_ta    VARCHAR(220) NOT NULL,
            desc_en    TEXT         NOT NULL,
            desc_ta    TEXT         NOT NULL,
            price      INT          NOT NULL,
            image      VARCHAR(255) NOT NULL,
            color_en   VARCHAR(60)  NOT NULL,
            color_ta   VARCHAR(80)  NOT NULL,
            color_hex  VARCHAR(9)   NOT NULL,
            category   VARCHAR(24)  NOT NULL,
            badge      VARCHAR(24)  NULL,
            featured   TINYINT(1)   NOT NULL DEFAULT 0,
            sort_order INT          NOT NULL DEFAULT 0,
            stock      INT          NOT NULL DEFAULT 25,
            active     TINYINT(1)   NOT NULL DEFAULT 1,
            updated_at BIGINT       NOT NULL DEFAULT 0,
            KEY idx_products_active_sort (active, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS product_images (
            id         VARCHAR(36)  NOT NULL PRIMARY KEY,
            mime       VARCHAR(64)  NOT NULL,
            bytes      LONGBLOB     NOT NULL,
            kind       VARCHAR(16)  NOT NULL DEFAULT 'product',
            created_at BIGINT       NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS stickers (
            id         VARCHAR(36)  NOT NULL PRIMARY KEY,
            name_en    VARCHAR(120) NOT NULL,
            name_ta    VARCHAR(160) NOT NULL,
            image_id   VARCHAR(36)  NOT NULL,
            category   VARCHAR(16)  NOT NULL DEFAULT 'small',
            active     TINYINT(1)   NOT NULL DEFAULT 1,
            sort_order INT          NOT NULL DEFAULT 0,
            created_at BIGINT       NOT NULL,
            KEY idx_stickers_active_sort (active, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS orders (
            id              VARCHAR(36)  NOT NULL PRIMARY KEY,
            order_number    VARCHAR(24)  NOT NULL,
            user_id         VARCHAR(36)  NOT NULL,
            status          VARCHAR(16)  NOT NULL DEFAULT 'placed',
            customer_name   VARCHAR(120) NOT NULL,
            phone           VARCHAR(24)  NOT NULL,
            address1        VARCHAR(190) NOT NULL,
            address2        VARCHAR(190) NOT NULL DEFAULT '',
            city            VARCHAR(80)  NOT NULL,
            state           VARCHAR(80)  NOT NULL,
            pincode         VARCHAR(12)  NOT NULL,
            subtotal        INT          NOT NULL,
            shipping_fee    INT          NOT NULL,
            total           INT          NOT NULL,
            payment_method  VARCHAR(16)  NOT NULL DEFAULT 'cod',
            idempotency_key VARCHAR(64)  NOT NULL,
            created_at      BIGINT       NOT NULL,
            UNIQUE KEY uq_orders_number (order_number),
            UNIQUE KEY uq_orders_idem (user_id, idempotency_key),
            KEY idx_orders_user (user_id, created_at),
            KEY idx_orders_status (status, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS order_status_events (
            id         VARCHAR(36)  NOT NULL PRIMARY KEY,
            order_id   VARCHAR(36)  NOT NULL,
            status     VARCHAR(16)  NOT NULL,
            note       VARCHAR(255) NULL,
            created_at BIGINT       NOT NULL,
            KEY idx_events_order (order_id, created_at),
            CONSTRAINT fk_events_order FOREIGN KEY (order_id)
                REFERENCES orders (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS order_items (
            id            VARCHAR(36)  NOT NULL PRIMARY KEY,
            order_id      VARCHAR(36)  NOT NULL,
            kind          VARCHAR(16)  NOT NULL,
            product_slug  VARCHAR(120) NULL,
            name_en       VARCHAR(160) NOT NULL,
            name_ta       VARCHAR(220) NOT NULL,
            size          VARCHAR(8)   NOT NULL,
            color_en      VARCHAR(60)  NOT NULL,
            color_ta      VARCHAR(80)  NOT NULL,
            image         VARCHAR(255) NULL,
            custom_config TEXT         NULL,
            quantity      INT          NOT NULL,
            unit_price    INT          NOT NULL,
            KEY idx_items_order (order_id),
            CONSTRAINT fk_items_order FOREIGN KEY (order_id)
                REFERENCES orders (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS user_designs (
            id          VARCHAR(36)  NOT NULL PRIMARY KEY,
            user_id     VARCHAR(36)  NOT NULL,
            image_id    VARCHAR(36)  NOT NULL,
            name        VARCHAR(120) NOT NULL DEFAULT '',
            category    VARCHAR(16)  NOT NULL DEFAULT 'medium',
            config_json TEXT         NULL,
            created_at  BIGINT       NOT NULL,
            updated_at  BIGINT       NOT NULL DEFAULT 0,
            KEY idx_designs_user (user_id, created_at),
            CONSTRAINT fk_designs_user FOREIGN KEY (user_id)
                REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    ];
}

/** Create every table if it does not exist yet. */
function db_migrate(): void
{
    foreach (schema_statements() as $sql) {
        db()->exec($sql);
    }
}

/** A random UUID v4 string, used as the primary key type throughout. */
function uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}
