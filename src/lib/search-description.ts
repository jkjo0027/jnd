/** Keep search summaries concise while retaining the original page-specific wording. */
export function searchDescription(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (Array.from(text).length <= 80) return text;

  // Prefer complete sentences; abbreviations and a long opening sentence use a word boundary.
  const sentences = Array.from(new Intl.Segmenter('ko', { granularity: 'sentence' }).segment(text), part => part.segment);
  let summary = '';
  for (const sentence of sentences) {
    if (Array.from((summary + sentence).trim()).length > 80) break;
    summary += sentence;
  }
  if (Array.from(summary.trim()).length >= 30) return summary.trim();

  const prefix = Array.from(text).slice(0, 79).join('');
  const boundary = prefix.lastIndexOf(' ');
  return (boundary >= 40 ? prefix.slice(0, boundary) : prefix).replace(/[\s,·:;–—-]+$/u, '') + '…';
}
