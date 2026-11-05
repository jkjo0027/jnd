#!/usr/bin/env python3
"""jndsystem-kr-seo-keyword-plan.xlsx -> data/registry/{candidate-pages,keyword-map,area-aliases,datalab}.json

- 원문은 보존하고, 매칭용 키(NFC + 공백 정리)는 별도 필드(key)에 둔다.
- 기존 JSON이 있으면 차이를 출력한다(추가/삭제/변경 ID). 반영은 --write 로만 한다.
- 엑셀 값·URL은 데이터로만 다루며 코드/HTML로 실행하지 않는다.
사용: python3 -I scripts/import-xlsx.py [--xlsx inputs/jndsystem-kr-seo-keyword-plan.xlsx] [--write]
"""
import argparse, hashlib, json, os, re, sys, unicodedata
from urllib.parse import urlsplit

HOST = "https://jndsystem.kr"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def norm_key(s):
    if s is None:
        return ""
    s = unicodedata.normalize("NFC", str(s))
    return re.sub(r"\s+", " ", s).strip()

def match_key(s):
    """띄어쓰기·구분점을 제거한 느슨한 매칭 키"""
    return re.sub(r"[\s·\-_/]", "", norm_key(s)).lower()

def path_of(url, ctx):
    u = urlsplit(str(url).strip())
    if u.scheme != "https" or u.netloc != "jndsystem.kr":
        raise SystemExit(f"[import] 호스트 오류 {ctx}: {url}")
    p = u.path or "/"
    if not p.startswith("/") or not p.endswith("/") or p != p.lower():
        raise SystemExit(f"[import] 경로 정책 위반(소문자·trailing slash) {ctx}: {url}")
    if u.query or u.fragment:
        raise SystemExit(f"[import] 쿼리/프래그먼트 금지 {ctx}: {url}")
    return p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", default=os.path.join(ROOT, "inputs", "jndsystem-kr-seo-keyword-plan.xlsx"))
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    try:
        import openpyxl
    except ImportError:
        raise SystemExit("openpyxl 필요: pip install openpyxl")
    raw = open(a.xlsx, "rb").read()
    sha = hashlib.sha256(raw).hexdigest()
    wb = openpyxl.load_workbook(a.xlsx, data_only=True)
    names = [ws.title for ws in wb.worksheets]
    expect = ["실행요약", "페이지설계318", "키워드조합", "데이터랩분석", "지역목록"]
    if names != expect:
        raise SystemExit(f"[import] 시트 구성 변경: {names} != {expect}")
    source = {"file": os.path.relpath(a.xlsx, ROOT), "sha256": sha, "sheets": names}

    # 페이지설계318
    ws = wb["페이지설계318"]
    hdr = [norm_key(c) for c in next(ws.iter_rows(min_row=4, max_row=4, values_only=True))]
    exp_hdr = ["페이지ID", "유형", "지역", "대표 키워드", "제안 URL", "SEO 제목안", "메타 설명안", "고유 본문 주제", "확보할 자료", "제작순서", "진행상태", "상위 허브 경로", "게시 조건"]
    if hdr != exp_hdr:
        raise SystemExit(f"[import] 페이지설계318 헤더 변경: {hdr}")
    pages, seen_id, seen_path = [], set(), set()
    for i, r in enumerate(ws.iter_rows(min_row=5, values_only=True), start=5):
        if not r[0]:
            continue
        pid = norm_key(r[0])
        if pid in seen_id:
            raise SystemExit(f"[import] 중복 페이지ID {pid} (행 {i})")
        seen_id.add(pid)
        path = path_of(r[4], f"행 {i}")
        if path in seen_path:
            raise SystemExit(f"[import] 중복 경로 {path} (행 {i})")
        seen_path.add(path)
        hub = norm_key(r[11])
        pages.append({
            "pageId": pid, "sheetRow": i, "type": norm_key(r[1]), "regionLabel": norm_key(r[2]),
            "primaryKeyword": norm_key(r[3]), "primaryKeywordKey": match_key(r[3]),
            "sourceUrl": str(r[4]).strip(), "candidatePath": path,
            "titleDraft": norm_key(r[5]), "descriptionDraft": norm_key(r[6]), "bodyTopic": norm_key(r[7]),
            "evidenceNeeded": norm_key(r[8]), "batch": norm_key(r[9]), "sheetStatus": norm_key(r[10]),
            "hubPath": hub, "publishCondition": norm_key(r[12]),
        })
    paths = {p["candidatePath"] for p in pages}
    for p in pages:
        if p["hubPath"] not in paths:
            raise SystemExit(f"[import] 허브 참조 오류 {p['pageId']} -> {p['hubPath']}")

    # 키워드조합
    ws = wb["키워드조합"]
    hdr = [norm_key(c) for c in next(ws.iter_rows(min_row=4, max_row=4, values_only=True))]
    exp_hdr = ["키워드ID", "지역·생활권", "서비스·의도", "키워드 조합", "붙여쓰기 변형", "대표 URL", "근거유형", "월검색량", "운영 메모"]
    if hdr != exp_hdr:
        raise SystemExit(f"[import] 키워드조합 헤더 변경: {hdr}")
    kws, seen_k = [], set()
    by_path = {p["candidatePath"]: p["pageId"] for p in pages}
    for i, r in enumerate(ws.iter_rows(min_row=5, values_only=True), start=5):
        if not r[0]:
            continue
        kid = norm_key(r[0])
        if kid in seen_k:
            raise SystemExit(f"[import] 중복 키워드ID {kid}")
        seen_k.add(kid)
        path = path_of(r[5], f"키워드 행 {i}")
        if path not in by_path:
            raise SystemExit(f"[import] 누락 조인 {kid} -> {path}")
        kws.append({
            "keywordId": kid, "sheetRow": i, "areaLabel": norm_key(r[1]), "intent": norm_key(r[2]),
            "keyword": norm_key(r[3]), "keywordKey": match_key(r[3]), "compactVariant": norm_key(r[4]),
            "candidatePath": path, "pageId": by_path[path], "evidenceType": norm_key(r[6]),
            "monthlyVolume": norm_key(r[7]), "note": norm_key(r[8]),
        })

    # 지역목록
    ws = wb["지역목록"]
    hdr = [norm_key(c) for c in next(ws.iter_rows(min_row=4, max_row=4, values_only=True))]
    if hdr != ["구분", "지역명", "키워드 지역표기", "상위 지역", "페이지 정책"]:
        raise SystemExit(f"[import] 지역목록 헤더 변경: {hdr}")
    areas = []
    for i, r in enumerate(ws.iter_rows(min_row=5, values_only=True), start=5):
        if not r[0]:
            continue
        areas.append({"sheetRow": i, "province": norm_key(r[0]), "name": norm_key(r[1]), "label": norm_key(r[2]),
                      "labelKey": match_key(r[2]), "parent": norm_key(r[3]), "policy": norm_key(r[4])})
    base = [x for x in areas if x["policy"].startswith("5개 서비스")]
    if len(base) != 56:
        raise SystemExit(f"[import] 기본 지역 수 {len(base)} != 56")
    # R01..R56 는 지역목록 기본 56개의 순서(서울 25 → 경기 31)와 일치해야 한다.
    region_pages = {}
    for p in pages:
        m = re.match(r"^(R\d{2})-", p["pageId"])
        if m:
            region_pages.setdefault(m.group(1), []).append(p)
    if len(region_pages) != 56:
        raise SystemExit(f"[import] 지역 ID 수 {len(region_pages)} != 56")
    rid_of = {}
    for k, b in enumerate(base, start=1):
        rid = f"R{k:02d}"
        rows = region_pages.get(rid) or []
        labels = {p["regionLabel"] for p in rows}
        want = ("서울 " + b["name"]) if b["province"] == "서울" else ("경기 " + b["name"])
        if labels != {want}:
            raise SystemExit(f"[import] {rid} 지역 불일치: 시트 {labels} vs 지역목록 {want}")
        b["regionId"] = rid.lower()
        b["province_slug"] = "seoul" if b["province"] == "서울" else "gyeonggi"
        rid_of[b["name"]] = rid.lower()
    aliases = []
    for x in areas:
        if x["policy"].startswith("5개 서비스"):
            aliases.append({"alias": x["name"], "aliasKey": match_key(x["name"]), "label": x["label"], "labelKey": x["labelKey"],
                            "regionId": x["regionId"], "province": x["province_slug"], "kind": "base", "sheetRow": x["sheetRow"]})
            if x["label"] != x["name"]:
                aliases.append({"alias": x["label"], "aliasKey": x["labelKey"], "label": x["label"], "labelKey": x["labelKey"],
                                "regionId": x["regionId"], "province": x["province_slug"], "kind": "base-label", "sheetRow": x["sheetRow"]})
        else:
            parent = x["parent"]
            rid = rid_of.get(parent)
            if not rid:
                raise SystemExit(f"[import] 생활권 상위 지역 미해결 {x['name']} -> {parent}")
            prov = "seoul" if parent.endswith("구") else "gyeonggi"
            aliases.append({"alias": x["name"], "aliasKey": match_key(x["name"]), "label": x["label"], "labelKey": x["labelKey"],
                            "regionId": rid, "province": prov, "kind": "living-area", "parent": parent, "sheetRow": x["sheetRow"]})
    # 광역·표기 변형(경기/경기도, 서울/서울특별시)
    aliases += [
        {"alias": "경기도", "aliasKey": "경기도", "label": "경기", "labelKey": "경기", "regionId": None, "province": "gyeonggi", "kind": "province", "sheetRow": None},
        {"alias": "경기", "aliasKey": "경기", "label": "경기", "labelKey": "경기", "regionId": None, "province": "gyeonggi", "kind": "province", "sheetRow": None},
        {"alias": "서울", "aliasKey": "서울", "label": "서울", "labelKey": "서울", "regionId": None, "province": "seoul", "kind": "province", "sheetRow": None},
        {"alias": "서울특별시", "aliasKey": "서울특별시", "label": "서울", "labelKey": "서울", "regionId": None, "province": "seoul", "kind": "province", "sheetRow": None},
    ]

    # 데이터랩분석 (요약값만 보존: 상대지수. 절대 비교 금지)
    ws = wb["데이터랩분석"]
    datalab = {"period": "2025-11~2026-10", "note": "네이버 데이터랩 상대 지수(비교군별 최대 100). 월 검색 건수가 아니며 비교군 간 직접 비교·0=수요 부재 판정 금지", "series": []}
    for r in ws.iter_rows(min_row=5, values_only=True):
        if r[0] in ("서비스", "지역") and r[2]:
            d = r[1]
            datalab["series"].append({"group": r[0], "month": d.strftime("%Y-%m") if hasattr(d, "strftime") else str(d), "term": norm_key(r[2]), "index": r[3]})

    # 실행요약
    ws = wb["실행요약"]
    summary = [{"item": norm_key(r[0]), "value": norm_key(r[1]), "memo": norm_key(r[2])} for r in ws.iter_rows(min_row=5, values_only=True) if r[0]]

    out = {
        "candidate-pages.json": {"source": source, "host": HOST, "count": len(pages), "pages": pages},
        "keyword-map.json": {"source": source, "count": len(kws), "keywords": kws},
        "area-aliases.json": {"source": source, "baseRegions": [{"regionId": b["regionId"], "province": b["province_slug"], "name": b["name"], "label": b["label"], "sheetRow": b["sheetRow"]} for b in base], "aliases": aliases},
        "datalab.json": {"source": source, **datalab, "summary": summary},
    }
    outdir = os.path.join(ROOT, "data", "registry")
    os.makedirs(outdir, exist_ok=True)
    changed = False
    for fn, obj in out.items():
        fp = os.path.join(outdir, fn)
        new = json.dumps(obj, ensure_ascii=False, indent=1) + "\n"
        if os.path.exists(fp):
            old = json.load(open(fp, encoding="utf-8"))
            if old.get("source", {}).get("sha256") != sha:
                print(f"[import] {fn}: 원본 해시 변경 {old.get('source',{}).get('sha256','?')[:12]} -> {sha[:12]}")
            key = "pages" if "pages" in obj else "keywords" if "keywords" in obj else "aliases" if "aliases" in obj else "series"
            idk = "pageId" if key == "pages" else "keywordId" if key == "keywords" else None
            if idk:
                o = {x[idk]: x for x in old.get(key, [])}; n = {x[idk]: x for x in obj[key]}
                added = sorted(set(n) - set(o)); removed = sorted(set(o) - set(n))
                mod = sorted(k for k in set(n) & set(o) if {a: b for a, b in n[k].items() if a != "sheetRow"} != {a: b for a, b in o[k].items() if a != "sheetRow"})
                print(f"[import] {fn}: 추가 {len(added)} 삭제 {len(removed)} 변경 {len(mod)}" + (f" 예: {added[:5]} {removed[:5]} {mod[:5]}" if added or removed or mod else ""))
                if added or removed or mod: changed = True
        else:
            changed = True
        if a.write:
            open(fp, "w", encoding="utf-8").write(new)
    print(f"[import] pages {len(pages)} keywords {len(kws)} aliases {len(aliases)} datalab {len(datalab['series'])} sha256 {sha}")
    print("[import] 기록됨" if a.write else ("[import] 차이 있음 — --write 로 반영" if changed else "[import] 차이 없음"))

if __name__ == "__main__":
    main()
