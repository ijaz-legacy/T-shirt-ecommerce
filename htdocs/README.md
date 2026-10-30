# IJAZ LEGACY — PHP store for InfinityFree

This folder is a complete, self-contained storefront that runs on InfinityFree's
free PHP + MySQL hosting. Upload **what is inside this folder** into your
`htdocs` directory and the shop works — no Node.js, no build step, no database
server of your own.

| | |
| --- | --- |
| Language | PHP 8.x |
| Database | MySQL (InfinityFree provides it) |
| Image handling | GD (built into PHP) |
| Sessions | Native PHP sessions |
| Languages | English + Tamil |
| Payments | Cash on Delivery |

## What's included

- Storefront: home, shop with category filter, product pages
- Cart and Cash-on-Delivery checkout with pincode/phone validation
- Order tracking by order number, plus customer order history
- Accounts: register, sign in, sign out (scrypt/bcrypt hashing via `password_hash`)
- Custom tee designer: fits, sizes, 8 tee colours, sticker library, artwork upload,
  live price that changes with print size (small logo → full A4)
- Retailer console: dashboard, orders with status flow, products, customers
- Owner and staff roles (staff only see orders)

## Installation

### 1. Upload the files

Upload the **contents** of this `htdocs` folder to InfinityFree's `htdocs`:

```
htdocs/
├── index.php
├── install.php
├── config.php
├── .htaccess
├── lib/
├── views/
├── assets/
└── images/
```

Use FTP (FileZilla) or the InfinityFree file manager. Keep the folder structure.

### 2. Create the MySQL database

In the InfinityFree control panel:

1. Open **MySQL Databases** and create a database.
2. Note the four values it shows: host, database name, username, password.
3. The host looks like `sql123.infinityfree.com`; names look like `if0_12345678_shop`.

### 3. Fill in `config.php`

```php
define('DB_HOST', 'sql123.infinityfree.com');
define('DB_NAME', 'if0_12345678_shop');
define('DB_USER', 'if0_12345678');
define('DB_PASS', 'your-database-password');
```

Also set your WhatsApp number if it changed:

```php
define('WHATSAPP_NUMBER', '918754750458');
```

### 4. Run the installer

Open `https://your-site.infinityfreeapp.com/install.php` in a browser.

It will:

- create every table
- insert the 8 starter products
- import the sticker artwork from `images/stickers/`
- create your owner account

Use the email and password you want for the retailer console.

### 5. Delete the installer

Once you see "Account created", delete or rename `install.php`. Anyone who can
reach it could otherwise create accounts.

### 6. Sign in

Go to `/login`, sign in with the owner account, then open `/admin`.

## Getting the images in place

The product photos and stickers are copied out of the Next.js project by:

```bash
bash scripts/build-htdocs.sh
```

That fills `htdocs/images/products/` (8 tees) and `htdocs/images/stickers/`
(47 stickers). Re-run it whenever you add artwork.

## Day-to-day use

| Page | Address |
| --- | --- |
| Storefront | `/` |
| Shop | `/shop` |
| Custom designer | `/customize` |
| Cart | `/cart` |
| Track an order | `/track` |
| Customer orders | `/orders` |
| Retailer console | `/admin` |

Order statuses: `placed → processing → shipped → delivered`, or `cancelled`.
Cancelling puts printed stock back, the same as the Next.js version.

## Adding staff

Re-open `install.php` while signed in as the owner, or run it after setup to add
another account and choose the **Staff** role. Staff see only the orders section.

## Notes and limits

- **No WhatsApp order alerts.** The Next.js app could call the Meta Cloud API;
  this PHP build does not. The footer links to `wa.me` for enquiries instead.
- **No automatic background removal.** Uploads are stored as-is (transparent PNG
  supported). The Next.js app used `@imgly/background-removal` in the browser.
- **Image storage is in MySQL** as `LONGBLOB`. InfinityFree caps database size, so
  keep artwork reasonably small — uploads are resized to 900px.
- **InfinityFree adds a JavaScript challenge** to some free accounts, which can
  interfere with `fetch()` uploads. If artwork upload fails, sign in first and
  retry, or switch the account to a plan without the challenge.
- **Backups**: export the database from phpMyAdmin regularly.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Redirect loop to `install.php` | Tables missing | Run the installer and check for errors |
| "Cannot connect to MySQL" | Wrong credentials | Re-copy the four values from the control panel |
| Styles missing | `assets/` not uploaded | Upload the `assets` folder as-is |
| Images broken | `images/` not uploaded | Run `scripts/build-htdocs.sh`, re-upload |
| 404 on every page except the home page | `.htaccess` not uploaded | Upload it; it must sit next to `index.php` |
| Upload fails silently | PHP `file_uploads` or size limit | Lower the image size and retry |
