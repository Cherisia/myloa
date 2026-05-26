export default function sitemap() {
  const base = 'https://myloa.app'
  return [
    // 비로그인 접근 가능한 공개 페이지만 포함
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/privacy`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
}
