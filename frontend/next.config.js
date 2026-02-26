/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lokal dev: /api ve /health istekleri backend'e (8000) proxy edilir → CORS sorunu kalmaz
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" },
      { source: "/health", destination: "http://127.0.0.1:8000/health" },
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
