// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getAllAnalysisSlugs } from '@/app/actions/storage';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://nuke.farm';

  // 1. Static Core Pages
  const staticRoutes = [
    '',
    '/analysis/feed',
    '/demo/agent',
    '/bridge',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // 2. Dynamic Market Pages
  // Fetches all slugs from DB using the RPC we made
  const marketSlugs = await getAllAnalysisSlugs();

  const dynamicRoutes = marketSlugs.map((record) => ({
    url: `${baseUrl}/market/${record.event_slug}`,
    lastModified: new Date(record.last_modified),
    changeFrequency: 'hourly' as const, // Prediction markets move fast
    priority: 0.9,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}