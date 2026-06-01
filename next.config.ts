/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    turbopack: false,
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  // Tăng timeout cho serverless functions (Vercel Pro: max 300s, Hobby: max 60s)
  serverExternalPackages: [],
};

export default nextConfig;
