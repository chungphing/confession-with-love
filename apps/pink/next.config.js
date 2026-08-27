/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@confession/shared-ui", "@confession/shared"],
};

module.exports = nextConfig;
