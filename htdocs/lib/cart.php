<?php
/**
 * Session-backed cart.
 *
 * Prices are recalculated from the catalogue whenever an order is placed, so a
 * tampered session cannot change what is charged for a printed tee. Custom
 * prints are priced server-side from their placement scales.
 */

function cart(): array
{
    start_session();
    if (!isset($_SESSION['cart']) || !is_array($_SESSION['cart'])) {
        $_SESSION['cart'] = [];
    }
    return $_SESSION['cart'];
}

function cart_set(array $items): void
{
    start_session();
    $_SESSION['cart'] = array_values($items);
}

/** Add a printed product to the cart. */
function cart_add_product(array $product, string $size, int $qty, string $image = ''): void
{
    $items = cart();
    $items[] = [
        'key'       => uuid(),
        'kind'      => 'printed',
        'slug'      => $product['slug'],
        'name_en'   => $product['name_en'],
        'name_ta'   => $product['name_ta'],
        'size'      => $size,
        'color_en'  => $product['color_en'],
        'color_ta'  => $product['color_ta'],
        'color_hex' => $product['color_hex'],
        'image'     => $image !== '' ? $image : $product['image'],
        'unit_price' => (int) $product['price'],
        'qty'       => max(1, min(10, $qty)),
    ];
    cart_set($items);
}

/** Add a custom-designed tee. Placements carry their own size category. */
function cart_add_custom(array $config): void
{
    $fit      = $config['fit'] ?? 'regular';
    $placements = $config['placements'] ?? [];
    $base     = fit_price($fit);

    $printTotal = 0;
    foreach ($placements as $placement) {
        $printTotal += price_for_scale((float) ($placement['scale'] ?? 0.4));
    }

    $color = TEE_COLORS[$config['color'] ?? 'cream'] ?? TEE_COLORS['cream'];

    $items = cart();
    $items[] = [
        'key'        => uuid(),
        'kind'       => 'custom',
        'slug'       => null,
        'name_en'    => FITS[$fit]['name_en'] . ' · Custom print',
        'name_ta'    => FITS[$fit]['name_ta'] . ' · கஸ்டம் பிரின்ட்',
        'size'       => $config['size'] ?? 'M',
        'color_en'   => $color['name_en'],
        'color_ta'   => $color['name_ta'],
        'color_hex'  => $color['hex'],
        'image'      => $config['image'] ?? '',
        'unit_price' => $base + $printTotal,
        'qty'        => max(1, min(10, (int) ($config['qty'] ?? 1))),
        'fit'        => $fit,
        'placements' => $placements,
    ];
    cart_set($items);
}

function cart_remove(string $key): void
{
    $items = array_filter(cart(), function ($item) use ($key) {
        return ($item['key'] ?? '') !== $key;
    });
    cart_set($items);
}

function cart_set_qty(string $key, int $qty): void
{
    $items = cart();
    foreach ($items as $index => $item) {
        if (($item['key'] ?? '') === $key) {
            $items[$index]['qty'] = max(1, min(10, $qty));
        }
    }
    cart_set($items);
}

function cart_clear(): void
{
    cart_set([]);
}

/** Subtotal, shipping and total for the current cart. */
function cart_totals(): array
{
    $subtotal = 0;
    foreach (cart() as $item) {
        $subtotal += ((int) $item['unit_price']) * ((int) $item['qty']);
    }
    $shipping = shipping_for($subtotal);
    return [
        'subtotal' => $subtotal,
        'shipping' => $shipping,
        'total'    => $subtotal + $shipping,
        'count'    => array_sum(array_map(function ($item) {
            return (int) $item['qty'];
        }, cart())),
    ];
}

/** Number of pieces in the cart, for the header badge. */
function cart_count(): int
{
    return cart_totals()['count'];
}
