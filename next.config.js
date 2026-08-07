/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow building into an isolated dir (NEXT_DIST) so a verification build
  // never clobbers a running `next dev`'s .next cache. Defaults to .next.
  distDir: process.env.NEXT_DIST || ".next",
};

module.exports = nextConfig;
