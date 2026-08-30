/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "nominatim.openstreetmap.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "**.supabase.co" },
      // Imported restaurant menu photos are served from take.app's image CDN.
      { protocol: "https", hostname: "emofly.b-cdn.net" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    /*
     * Images are served exactly as uploaded, not through Vercel's optimizer.
     *
     * They do not need it. /api/admin/upload already re-encodes every upload to
     * WebP and caps its dimensions, so what is in Supabase storage is web-ready
     * before it is ever requested — a second transform was paying to resize an
     * image that had already been resized.
     *
     * It also broke the site. The optimizer allowance ran out, every transform
     * started answering 402, and any photo not already in Vercel's cache
     * rendered as its alt text — so existing dishes looked fine and every newly
     * added one looked broken, which is a baffling way to fail. Serving the
     * source removes the cost and that failure mode together.
     */
    unoptimized: true,
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  compress: true,
  async headers() {
    return [
      {
        source: "/logos/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
