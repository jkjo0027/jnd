'use client';

import { useRef, useState } from 'react';
import type { ReviewImage } from '@/content/review-images';

export default function ReviewCards({ reviews }: { reviews: ReviewImage[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const move = (direction: number) => {
    const node = rail.current;
    if (!node) return;
    const card = node.querySelector('article');
    node.scrollBy({ left: direction * ((card?.getBoundingClientRect().width ?? 300) + 20), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <>
    <div className="review-rail" id="review-cards" ref={rail} role="region" aria-label="고객 후기 5개" tabIndex={0} onScroll={() => {
      const node = rail.current;
      if (node) setEdge({ start: node.scrollLeft < 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
    }}>
      {reviews.slice(0, 5).map((review, index) => <article className="review-card" key={review.id}>
        <div className="review-photo">
          <img src={review.photo} alt={review.photoAlt} width={600} height={400} loading="lazy" />
          <span className="review-badge">REVIEW <b>{String(index + 1).padStart(2, '0')}</b></span>
          <span className="review-photo-label">시공 참고사진</span>
        </div>
        <div className="review-copy">
          <p className="review-category">{review.category}</p>
          <h3>{review.title}</h3>
          <details>
            <summary><p className="review-excerpt">{review.body}</p><span className="review-read"><span className="review-closed">후기 전체 보기</span><span className="review-open">접기</span><span aria-hidden="true">↗</span></span></summary>
            <p className="review-full">{review.body}</p>
          </details>
        </div>
      </article>)}
    </div>
    <div className="review-controls"><p>옆으로 넘겨 더 많은 후기를 만나보세요.</p><div>
      <button type="button" aria-label="이전 후기" aria-controls="review-cards" disabled={edge.start} onClick={() => move(-1)}>←</button>
      <button type="button" aria-label="다음 후기" aria-controls="review-cards" disabled={edge.end} onClick={() => move(1)}>→</button>
    </div></div>
  </>;
}
