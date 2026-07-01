import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://hanut.tn', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://hanut.tn/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://hanut.tn/legal', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://hanut.tn/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
