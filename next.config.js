/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Output standalone for Vercel deployment
  output: 'standalone',
  // Disable TypeScript checking during build (we have a separate typecheck script)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Disable ESLint during build (we have a separate lint script)
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
