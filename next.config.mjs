/** @type {import('next').NextConfig} */

const securityHeaders = [
  // HTTPS 강제 (2년, preload 포함)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // 클릭재킹 방지 — 같은 출처의 iframe만 허용
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // MIME 스니핑 방지
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 외부 링크 클릭 시 Referer에 full URL 대신 origin만 전송
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 불필요한 브라우저 기능 비활성화
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

const nextConfig = {
  ...(process.env.NODE_ENV === 'development' && { allowedDevOrigins: ['172.30.1.3'] }),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        // API 경로를 제외한 모든 페이지에 적용
        source: '/((?!api/).*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
