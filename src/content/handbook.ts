import data from './handbook.json';
import editorial from './handbook-editorial.json';
import groups from './handbook-groups.json';
import { isPublicPath } from '@/lib/registry';

export const handbookCategories = data.categories;
export const handbookGroups = groups;
export const handbookGroup = (slug: string) => groups.find(g => g.topics.includes(slug));
/** Old topic links go directly to the retained section, without a redirect hop. */
export const handbookPath = (slug: string) => {
  const g = handbookGroup(slug);
  return g ? `/handbook/${g.slug}/${g.slug === slug ? '' : `#${slug}`}` : `/handbook/${slug}/`;
};
export const handbookTopics = (slug: string) => (handbookGroup(slug)?.topics ?? [])
  .map(s => data.articles.find(a => a.slug === s)!).filter(Boolean);
export const handbookArticles = groups.filter(g => isPublicPath(`/handbook/${g.slug}/`)).map(g => ({
  ...data.articles.find(a => a.slug === g.slug)!, title: g.title, answer: g.summary, updatedAt: g.reviewedAt,
}));
// Topic-level callers retain the original question, preparation list and evidence.
export const handbookArticle = (slug: string) => data.articles.find(a => a.slug === slug &&
  isPublicPath(handbookPath(slug).split('#')[0]));
export const handbookCategory = (id: string) => handbookCategories.find(c => c.id === id)!;
export const handbookEditorial = (slug: string) => editorial[slug as keyof typeof editorial];
