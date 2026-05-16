/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['172.30.1.3'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
