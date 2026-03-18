/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    turbopack: false, // Tắt Turbopack, quay về webpack
  },
};

export default nextConfig;
