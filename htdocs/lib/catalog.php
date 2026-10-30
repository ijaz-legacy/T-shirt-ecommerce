<?php
/**
 * Catalogue data: fits, tee colours, custom-print pricing, shipping rules and
 * the starter product set. Mirrors src/lib/catalog.ts and seed-products.ts so
 * prices stay identical between the two implementations.
 */

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const FITS = [
    'regular' => [
        'name_en' => 'Regular fit',
        'name_ta' => 'ரெகுலர் ஃபிட்',
        'desc_en' => 'Easy, everyday shape',
        'desc_ta' => 'தினசரி அணிய ஏற்ற வழவழப்பான ஃபிட்',
        'price'   => 649,
    ],
    'oversized' => [
        'name_en' => 'Oversized fit',
        'name_ta' => 'ஓவர்சைஸ்டு ஃபிட்',
        'desc_en' => 'Roomy, relaxed drop-shoulder',
        'desc_ta' => 'தாராளமான, ரிலாக்ஸ்டு டிராப்-ஷோல்டர்',
        'price'   => 699,
    ],
];

const TEE_COLORS = [
    'cream'  => ['hex' => '#F2E8D5', 'name_en' => 'Cream',  'name_ta' => 'கிரீம்',  'tone' => 'light'],
    'white'  => ['hex' => '#FFFFFF', 'name_en' => 'White',  'name_ta' => 'வெள்ளை', 'tone' => 'light'],
    'black'  => ['hex' => '#1C1B19', 'name_en' => 'Black',  'name_ta' => 'கருப்பு', 'tone' => 'dark'],
    'sand'   => ['hex' => '#D8C2A4', 'name_en' => 'Sand',   'name_ta' => 'சாண்ட்', 'tone' => 'light'],
    'olive'  => ['hex' => '#5A6349', 'name_en' => 'Olive',  'name_ta' => 'ஆலிவ்',  'tone' => 'dark'],
    'navy'   => ['hex' => '#26374F', 'name_en' => 'Navy',   'name_ta' => 'நேவி',   'tone' => 'dark'],
    'maroon' => ['hex' => '#6C2E38', 'name_en' => 'Maroon', 'name_ta' => 'மெரூன்', 'tone' => 'dark'],
    'sky'    => ['hex' => '#A9C3D6', 'name_en' => 'Sky',    'name_ta' => 'ஸ்கை',   'tone' => 'light'],
];

// Custom print pricing (rupees, added on top of the tee price).
const CUSTOM_PRICE_HALF = 59;   // small logo / half-A4
const CUSTOM_PRICE_FULL = 100;  // full A4 sheet

// Shipping.
const SHIPPING_FEE = 49;
const FREE_SHIPPING_THRESHOLD = 999;

const STICKER_CATEGORIES = ['small', 'medium', 'large'];

/**
 * Price of one custom placement, based on how much of the shirt it covers.
 * Kept in sync with getCategoryFromScale() in the Next.js app:
 * up to 27% width = small, up to 48% = medium, larger = full A4.
 */
function price_for_scale(float $scale): int
{
    if ($scale > 1) {
        // scale expressed as a percentage of the shirt width (8-72)
        return $scale > 48 ? CUSTOM_PRICE_FULL : CUSTOM_PRICE_HALF;
    }
    return $scale >= 0.6 ? CUSTOM_PRICE_FULL : CUSTOM_PRICE_HALF;
}

/** Category bucket for a scale value, used for storage and badges. */
function category_for_scale(float $scale): string
{
    $percent = $scale > 1 ? $scale : $scale * 100;
    if ($percent <= 27) {
        return 'small';
    }
    if ($percent <= 48) {
        return 'medium';
    }
    return 'large';
}

function fit_price(string $fit): int
{
    return FITS[$fit]['price'] ?? FITS['regular']['price'];
}

/** Shipping for a given subtotal. */
function shipping_for(int $subtotal): int
{
    if ($subtotal <= 0) {
        return 0;
    }
    return $subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/**
 * Starter products. `image` points at static files that ship inside
 * htdocs/images/products/, so no database seeding of binaries is required.
 */
function seed_products(): array
{
    return [
        [
            'slug' => 'kadal-dawn', 'name_en' => 'Kadal Dawn', 'name_ta' => 'கடல் விடியல்',
            'desc_en' => 'A retro sunrise over calm waves. Printed on soft, breathable cotton — made for slow mornings and long evenings.',
            'desc_ta' => 'அமைதியான அலைகள்மேல் ஒரு ரெட்ரோ சூரிய உதயம். மென்மையான, காற்றோட்டமான பருத்தியில் பதிக்கப்பட்டது — மெதுவான காலைகளுக்கும் நீண்ட மாலைகளுக்கும்.',
            'price' => 699, 'image' => '/images/products/kadal-dawn.webp',
            'color_en' => 'Sand', 'color_ta' => 'சாண்ட்', 'color_hex' => '#D8C2A4',
            'category' => 'retro', 'badge' => 'bestseller', 'featured' => 1, 'sort_order' => 1,
        ],
        [
            'slug' => 'malai-mist', 'name_en' => 'Malai Mist', 'name_ta' => 'மலை பனி',
            'desc_en' => 'Minimal peak lines inspired by the Nilgiris. For people who carry the mountains wherever they go.',
            'desc_ta' => 'நீலகிரியை நினைவூட்டும் எளிய மலைக் கோடுகள். மலைகளை எங்கு சென்றாலும் மனதில் சுமக்கும் உங்களுக்கு.',
            'price' => 749, 'image' => '/images/products/malai-mist.webp',
            'color_en' => 'Black', 'color_ta' => 'கருப்பு', 'color_hex' => '#1C1B19',
            'category' => 'nature', 'badge' => 'new', 'featured' => 1, 'sort_order' => 2,
        ],
        [
            'slug' => 'thulir', 'name_en' => 'Thulir', 'name_ta' => 'துளிர்',
            'desc_en' => 'A little green for every day. Hand-drawn botanicals that feel like a window left open.',
            'desc_ta' => 'ஒவ்வொரு நாளுக்கும் கொஞ்சம் பசுமை. திறந்து வைத்த ஜன்னல் போல உணரவைக்கும் கைவரைந்த தாவரங்கள்.',
            'price' => 699, 'image' => '/images/products/thulir.webp',
            'color_en' => 'Cream', 'color_ta' => 'கிரீம்', 'color_hex' => '#F2E8D5',
            'category' => 'nature', 'badge' => null, 'featured' => 0, 'sort_order' => 3,
        ],
        [
            'slug' => 'alai', 'name_en' => 'Alai', 'name_ta' => 'அலை',
            'desc_en' => 'Endless waves in clean line work. Easy to style, hard to miss.',
            'desc_ta' => 'நேர்த்தியான கோடுகளில் முடிவில்லா அலைகள். ஸ்டைல் செய்ய எளிது, கவனிக்க வைக்கும்.',
            'price' => 749, 'image' => '/images/products/alai.webp',
            'color_en' => 'Navy', 'color_ta' => 'நேவி', 'color_hex' => '#26374F',
            'category' => 'abstract', 'badge' => 'bestseller', 'featured' => 0, 'sort_order' => 4,
        ],
        [
            'slug' => 'puli', 'name_en' => 'Puli', 'name_ta' => 'புலி',
            'desc_en' => 'A bold tiger for the quietly fearless. Small-batch print, big presence.',
            'desc_ta' => 'அமைதியான தைரியசாலிகளுக்கு ஒரு துணிச்சலான புலி. சிறிய அளவில் அச்சிடப்பட்டது, பெரிய தாக்கம்.',
            'price' => 799, 'image' => '/images/products/puli.webp',
            'color_en' => 'Olive', 'color_ta' => 'ஆலிவ்', 'color_hex' => '#5A6349',
            'category' => 'street', 'badge' => 'limited', 'featured' => 1, 'sort_order' => 5,
        ],
        [
            'slug' => 'legacy-1987', 'name_en' => 'Legacy 1987', 'name_ta' => 'மரபு 1987',
            'desc_en' => 'An abstract nod to 1987 — shapes, sun and a little nostalgia.',
            'desc_ta' => '1987-க்கு ஒரு அப்ஸ்ட்ராக்ட் அஞ்சலி — வடிவங்கள், சூரியன், கொஞ்சம் நாஸ்டால்ஜியா.',
            'price' => 699, 'image' => '/images/products/legacy-1987.webp',
            'color_en' => 'White', 'color_ta' => 'வெள்ளை', 'color_hex' => '#FFFFFF',
            'category' => 'abstract', 'badge' => 'new', 'featured' => 0, 'sort_order' => 6,
        ],
        [
            'slug' => 'nilavu', 'name_en' => 'Nilavu', 'name_ta' => 'நிலவு',
            'desc_en' => 'Phases of the moon across a midnight tee. Quiet, poetic, easy to wear.',
            'desc_ta' => 'நள்ளிரவு நிற டீ முழுவதும் நிலவின் கலைகள். அமைதியான, கவிதைத்தனமான, அணிய எளிதானது.',
            'price' => 749, 'image' => '/images/products/nilavu.webp',
            'color_en' => 'Black', 'color_ta' => 'கருப்பு', 'color_hex' => '#1C1B19',
            'category' => 'nature', 'badge' => null, 'featured' => 0, 'sort_order' => 7,
        ],
        [
            'slug' => 'veyil', 'name_en' => 'Veyil', 'name_ta' => 'வெயில்',
            'desc_en' => 'A warm arch of sunset colour. Like golden hour, but you can wear it.',
            'desc_ta' => 'சூரிய அஸ்தமனத்தின் வெதுவெதுப்பான வளைவு. கோல்டன் அர் நேரம் போல — ஆனால் அணியக்கூடியது.',
            'price' => 699, 'image' => '/images/products/veyil.webp',
            'color_en' => 'Sand', 'color_ta' => 'சாண்ட்', 'color_hex' => '#D8C2A4',
            'category' => 'retro', 'badge' => 'limited', 'featured' => 1, 'sort_order' => 8,
        ],
    ];
}

/** Insert starter products that are missing. Existing rows are left untouched. */
function seed_products_into_db(): int
{
    $inserted = 0;
    foreach (seed_products() as $product) {
        $exists = scalar('SELECT slug FROM products WHERE slug = ?', [$product['slug']]);
        if ($exists) {
            continue;
        }
        q(
            'INSERT INTO products
                (slug, name_en, name_ta, desc_en, desc_ta, price, image,
                 color_en, color_ta, color_hex, category, badge, featured,
                 sort_order, stock, active, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)',
            [
                $product['slug'], $product['name_en'], $product['name_ta'],
                $product['desc_en'], $product['desc_ta'], $product['price'],
                $product['image'], $product['color_en'], $product['color_ta'],
                $product['color_hex'], $product['category'], $product['badge'],
                $product['featured'], $product['sort_order'], 25,
                (int) round(microtime(true) * 1000),
            ]
        );
        $inserted++;
    }
    return $inserted;
}
