export type Tag = 'office' | 'commercial' | 'apartment' | 'villa' | 'factory' | 'hospital' | 'school' | 'rural' | 'tourism' | 'newtown' | 'logistics' | 'hotel' | 'church';
export type RegionFact = {
  rid: string; name: string; short: string; province: 'seoul' | 'gyeonggi';
  dongs: string[]; zones: string[]; tags: Tag[];
  /** 지역 특성(공개된 일반 사실). 사례·실적을 뜻하지 않는다 */
  profile: string;
  /** 평택 본사 기준 접근 동선·방문 메모 */
  access: string;
};
