/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { externalDir: true },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
