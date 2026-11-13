import { BRAND } from './site';

const caseTitles: Record<string, string> = {
  '/cases/c4/': '동탄 편개형 자동문·카드리더기 설치',
  '/cases/c5/': '성남 사무실 이중슬라이딩 자동문 설치',
  '/cases/c6/': '안양 상가 여닫이 유리문을 자동문으로 교체',
  '/cases/c7/': '경기광주 주택상가 자동문 신규 설치',
  '/cases/c8/': '화성 교회 강화도어를 편개형 자동문으로 교체',
};

/** 긴 제목의 부연·지역 나열만 덜어낸다. 본문 제목과 확인된 현장 정보는 보존한다. */
export function searchTitle(original: string, path: string): string {
  if (Array.from(original).length <= 40) return original;
  const topic = caseTitles[path] || original.split(/\s*\|\s*/)[0].split(/\s*—\s*/)[0].trim();
  const concise = `${topic} | ${BRAND}`;
  // 새 관리자 글도 단어 중간에서 자르거나 의미를 임의로 바꾸지 않는다.
  return Array.from(concise).length <= 40 ? concise : original;
}
