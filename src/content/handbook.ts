import data from './handbook.json';
import { isPublicPath } from '@/lib/registry';

export const handbookCategories = data.categories;
export const handbookPath = (slug: string) => `/handbook/${slug}/`;
export const handbookArticles = data.articles.filter(a => isPublicPath(handbookPath(a.slug)));
export const handbookArticle = (slug: string) => handbookArticles.find(a => a.slug === slug);
export const handbookCategory = (id: string) => handbookCategories.find(c => c.id === id)!;
