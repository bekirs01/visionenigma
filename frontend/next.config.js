/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const BACKEND_URL = isProd
  ? "https://visionenigma-production-f911.up.railway.app"
  : "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* requests to backend - fixes CORS and cookie issues
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/health", destination: `${BACKEND_URL}/health` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = { ignored: /node_modules/, aggregateTimeout: 300 };
    }
    return config;
  },
};

module.exports = nextConfig;
