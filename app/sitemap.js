export default function sitemap() {
  const base = 'https://myloa.app'
  const now = new Date()
  return [
    { url: `${base}/`,              lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/dashboard`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/dictionary`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/tools/auction`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/guide`,         lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/guide/guild`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/guide/group`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`,       lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]
}
