import { CASES, REVIEWS, REVIEW_PREVIEW_IMGS, CLIENTS, type Case, type Review } from '@/content/site-data';
import { CONSULT_PHONES, MAIN_PHONE, SMS_PHONE } from '@/lib/site';
import { isPreview, isPublic, ops, recordById } from '@/lib/registry';

/** 공개 빌드에 포함할 시공사례 (대장 approved/published). preview 게이트는 시안 8건 전부 */
export const publicCases = (): Case[] => (isPreview ? CASES : CASES.filter((c) => isPublic(recordById(`CASE-${c.id}`))));
export const caseById = (id: string) => publicCases().find((c) => c.id === id) || null;

/** 후기: 게시 동의 확인 전에는 공개 빌드에서 보류. preview 에서는 시안의 순환 사진을 붙여 표시(실제 후기 사진 아님) */
export const publicReviews = (): Review[] => {
  if (isPreview) return REVIEWS.map((r, i) => ({ ...r, img: REVIEW_PREVIEW_IMGS[i % REVIEW_PREVIEW_IMGS.length] }));
  return ops.reviewsApproved ? REVIEWS : [];
};
export const publicClients = () => (isPreview || ops.clientLogosApproved ? CLIENTS : []);
export const brandLogosEnabled = () => isPreview || ops.brandLogosApproved;

/** 상담 노출 번호: 보조 번호 수신 테스트 확인 전에는 대표번호만 */
export const consultPhones = (): string[] => (isPreview || ops.phonesVerified ? [...CONSULT_PHONES] : [MAIN_PHONE]);
export const smsPhone = (): string | null => (isPreview || ops.smsVerified ? SMS_PHONE : null);
