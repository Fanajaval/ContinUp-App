/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy vers les services locaux — le navigateur reste sur :3000 (pas de CORS front).
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://localhost:5000";
    const ia = process.env.IA_URL || "http://localhost:4000";
    return [
      { source: "/api/auth/:path*", destination: `${backend}/api/auth/:path*` },
      { source: "/api/health", destination: `${backend}/api/health` },
      { source: "/api/ia/:path*", destination: `${ia}/api/:path*` },
    ];
  },
};

export default nextConfig;
