import type { NextConfig } from "next";
import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const isProduction = process.env.NODE_ENV === "production";

// ── Copy @imgly/background-removal model assets to public/_next static ──
// The WASM worker and ONNX model files must be served as static files.
async function copyBgRemovalAssets() {
  try {
    const pkgDir = path.dirname(
      require.resolve("@imgly/background-removal/package.json"),
    );
    const srcDir = path.join(pkgDir, "dist");
    const destDir = path.join(process.cwd(), "public", "bg-removal");
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
      // copy all .wasm, .js worker, and .ort model files
      const { readdir } = await import("node:fs/promises");
      for (const file of await readdir(srcDir)) {
        if (/\.(wasm|ort|bin|js)$/.test(file)) {
          await copyFile(path.join(srcDir, file), path.join(destDir, file));
        }
      }
    }
  } catch {
    // Non-fatal — background removal will still try to load via CDN fallback
  }
}

void copyBgRemovalAssets();

const securityHeaders = [
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Allow SharedArrayBuffer for WASM (needed by @imgly/background-removal)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // COOP + COEP required for SharedArrayBuffer / WASM threads
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      // Model files served without COEP restriction
      {
        source: "/bg-removal/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
