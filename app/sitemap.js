export default function sitemap() {
  const base = 'https://myloa.app'
  return [
    // 비로그인 접근 가능한 공개 페이지만 포함
    { url: `${base}/`,           lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/dashboard`,  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/dictionary`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/guide`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/guide/guild`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/guide/group`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/auction`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
}
