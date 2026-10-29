// One-off setup: load the PNGs in public/images/products/new images into the
// stickers table (as full-size "large" stickers for the custom t-shirt studio).
// Idempotent — stickers whose name_en already exists are skipped.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";

const IMAGE_DIR = path.join(process.cwd(), "public", "images", "products", "new images");
const CATEGORY = "large"; // full A4 sheet, max scale in the studio

// filename → [nameEn, nameTa]
const NAMES = {
  "bellingham-wpap-portrait.png": ["Bellingham Art", "பெல்லிங்ஹாம் கலை"],
  "black-spider-silhouette.png": ["Black Spider", "கருப்பு சிலந்தி"],
  "bmw-m-badge.png": ["BMW M Badge", "BMW M முத்திரை"],
  "bmw-roundel-logo.png": ["BMW Roundel", "BMW சின்னம்"],
  "comic-speech-bubbles.png": ["Comic Bubbles", "காமிக் குமிழ்கள்"],
  "cristiano-ronaldo-signature.png": ["CR7 Signature", "சிஆர்7 கையொப்பம்"],
  "floral-vine-flourish.png": ["Floral Vine", "பூக்கொடி அலங்காரம்"],
  "grim-reaper-black-tattoo.png": ["Reaper Tattoo", "மரண தூதன் பச்சை குத்து"],
  "itachi-red-moon-crows.png": ["Itachi Red Moon", "இத்தாச்சி சிவப்பு நிலவு"],
  "lightning-mcqueen.png": ["Lightning McQueen", "லைட்னிங் மெக்குயீன்"],
  "lion-head-logo-silhouette.png": ["Lion Head Logo", "சிங்க முக சின்னம்"],
  "messi-barcelona-jersey.png": ["Messi Barcelona", "மெஸ்ஸி பார்செலோனா"],
  "mickey-mouse-sketch.png": ["Mickey Sketch", "மிக்கி ஸ்கெட்ச்"],
  "minnie-face-pink-bow.png": ["Minnie Pink Bow", "மின்னி இளஞ்சிவப்பு வில்"],
  "minnie-mouse-posing.png": ["Minnie Posing", "மின்னி மவுஸ்"],
  "moto-rider-46-cartoon.png": ["Rider 46 Cartoon", "ரைடர் 46"],
  "motocross-backflip-silhouette.png": ["Moto Backflip", "மோட்டார் பின்தாவல்"],
  "motocross-jump-silhouette.png": ["Moto Jump Silhouette", "மோட்டார் தாவல்"],
  "motocross-rider-orange.png": ["Moto Rider Orange", "மோட்டார் ரைடர்"],
  "my-gun-bigger-than-yours.png": ["Gun Quote Typography", "துப்பாக்கி எழுத்து கலை"],
  "naruto-3d-figure.png": ["Naruto Figure", "நாருட்டோ உருவம்"],
  "naruto-crouching-hand-sign.png": ["Naruto Hand Sign", "நாருட்டோ கை முத்திரை"],
  "naruto-orange-rasengan-kick.png": ["Naruto Rasengan Kick", "நாருட்டோ ரசேன்கன் கிக்"],
  "naruto-team7-collage.png": ["Naruto Team 7", "நாருட்டோ அணி 7"],
  "naruto-toad-tattoo-art.png": ["Naruto Toad Art", "நாருட்டோ தவளை கலை"],
  "naruto-young-smiling.png": ["Young Naruto", "இளம் நாருட்டோ"],
  "owl-dreamcatcher.png": ["Owl Dreamcatcher", "ஆந்தை கனவு வலை"],
  "pink-paint-splash.png": ["Pink Splash", "இளஞ்சிவப்பு தெறிப்பு"],
  "real-madrid-crest.png": ["Real Madrid Crest", "ரியல் மாட்ரிட் சின்னம்"],
  "ronaldo-holding-ball.png": ["Ronaldo Ball Pose", "ரொனால்டோ பந்து"],
  "ronaldo-portugal-crossed-arms.png": ["Ronaldo Crossed Arms", "ரொனால்டோ கை மடிப்பு"],
  "ronaldo-portugal-standing.png": ["Ronaldo Portugal", "ரொனால்டோ போர்ச்சுகல்"],
  "ronaldo-real-madrid-back.png": ["Ronaldo Back 7", "ரொனால்டோ பின்னல் 7"],
  "ronaldo-real-madrid-shout.png": ["Ronaldo Madrid Shout", "ரொனால்டோ மேட்ரிட் கூச்சல்"],
  "ronaldo-stencil-roar.png": ["Ronaldo Stencil Roar", "ரொனால்டோ ஸ்டென்சில்"],
  "ronaldo-trophy-cartoon.png": ["Ronaldo Trophy", "ரொனால்டோ கோப்பை"],
  "ronaldo-white-sprint.png": ["Ronaldo Sprint", "ரொனால்டோ ஓட்டம்"],
  "skull-guns-splatter.png": ["Skull & Guns Splatter", "மண்டையும் துப்பாக்கியும்"],
  "skull-roses-snake.png": ["Skull Roses Snake", "மண்டை ரோஜா பாம்பு"],
  "skull-ship-tattoo.png": ["Skull Ship", "மண்டை கப்பல்"],
  "skull-weapons-crest.png": ["Skull Arms Crest", "மண்டை ஆயுத சின்னம்"],
  "skull-wings-cross-tattoo.png": ["Skull Wings Cross", "மண்டை இறக்கை சிலுவை"],
  "soccer-kick-watercolor.png": ["Soccer Kick Art", "கால்பந்து கிக் கலை"],
  "spiderman-wordmark.png": ["Spider-Man Wordmark", "ஸ்பைடர்மேன் பெயர்"],
  "thug-life-glasses.png": ["Thug Life Glasses", "தக் லைஃப் கண்ணாடி"],
  "white-wolf-face.png": ["White Wolf Face", "வெண் ஓநாய் முகம்"],
  "wow-comic-burst.png": ["Wow Burst", "வவ் வெடிப்பு"],
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
let url;
if (remoteUrl) {
  url = remoteUrl;
} else {
  const dbPath =
    process.env.IJAZ_DB_PATH ?? path.join(process.cwd(), "data", "ijaz-legacy.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  url = pathToFileURL(dbPath).href;
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  intMode: "number",
});

async function main() {
  if (url.startsWith("file:")) {
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA foreign_keys = ON");
  }

  const files = fs
    .readdirSync(IMAGE_DIR)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort();

  const missing = files.filter((f) => !NAMES[f]);
  if (missing.length > 0) {
    throw new Error("No display name defined for: " + missing.join(", "));
  }

  const maxRow = await client.execute(
    "SELECT COALESCE(MAX(sort_order), 0) AS max FROM stickers",
  );
  let sortOrder = Number(maxRow.rows[0].max);

  const existing = new Set(
    (
      await client.execute("SELECT name_en FROM stickers")
    ).rows.map((r) => String(r.name_en).toLowerCase()),
  );

  let added = 0;
  let skipped = 0;
  for (const file of files) {
    const [nameEn, nameTa] = NAMES[file];
    if (existing.has(nameEn.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const bytes = fs.readFileSync(path.join(IMAGE_DIR, file));
    const imageId = randomUUID();
    const stickerId = randomUUID();
    sortOrder += 1;

    const transaction = await client.transaction("write");
    try {
      await transaction.execute({
        sql: `INSERT INTO product_images (id, mime, bytes, created_at, kind)
              VALUES (?, 'image/png', ?, ?, 'sticker')`,
        args: [imageId, bytes, Date.now()],
      });
      await transaction.execute({
        sql: `INSERT INTO stickers (id, name_en, name_ta, image_id, category, active, sort_order, created_at)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [stickerId, nameEn, nameTa, imageId, CATEGORY, sortOrder, Date.now()],
      });
      await transaction.commit();
    } finally {
      transaction.close();
    }
    added += 1;
  }

  console.log(`Added ${added} stickers as category '${CATEGORY}' (${skipped} already present).`);

  const totals = await client.execute(
    "SELECT category, COUNT(*) AS count FROM stickers GROUP BY category ORDER BY category",
  );
  for (const row of totals.rows) {
    console.log(`  ${row.category}: ${row.count}`);
  }
}

main()
  .catch((error) => {
    console.error("Could not add stickers:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
  });
