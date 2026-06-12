export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings', '/guild/', '/group/', '/history'],
    },
    sitemap: 'https://myloa.app/sitemap.xml',
  }
}
