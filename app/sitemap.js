export default function sitemap() {
  const base = 'https://myloa.app'
  return [
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/guild`,     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/group`,     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/privacy`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
}
