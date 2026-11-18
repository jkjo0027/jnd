"""GET audit: python scripts/technical-seo-audit.py --out reports/seo --tag before
Requires requests and lxml. Two concurrent requests, one retry for network/5xx.
Similarity is a review aid, not a search-engine quality threshold.
"""
import argparse, collections, concurrent.futures as cf, csv, hashlib, json, re, time
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser
import requests
from lxml import etree, html

ap=argparse.ArgumentParser();ap.add_argument('--base',default='https://jndsystem.kr');ap.add_argument('--out',default='reports/seo');ap.add_argument('--tag',default='before');ap.add_argument('--paths');args=ap.parse_args()
root=Path(__file__).resolve().parents[1];out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
base=args.base.rstrip('/');host='https://jndsystem.kr';at=datetime.now(timezone.utc).isoformat()
def get(url,ua='JND-authorized-SEO-audit/1.0'):
    for attempt in range(2):
        try:
            r=requests.get(url,headers={'User-Agent':ua},timeout=30)
            if r.status_code<500 or attempt:return r
        except requests.RequestException:
            if attempt:raise
        time.sleep(.7)
def public(p):
    return p.startswith('/') and not re.match(r'/(admin|api|preview)(/|$)',p) and not re.search(r'\.[a-zA-Z0-9]{1,8}$',p)
def clean(node):
    node=html.fromstring(etree.tostring(node))
    for e in node.xpath('.//script|.//style|.//nav|.//aside|.//header|.//footer|.//*[contains(concat(" ",normalize-space(@class)," ")," cta-box ")]|.//a[starts-with(@href,"tel:")]'):
        if e.getparent() is not None:e.drop_tree()
    return re.sub(r'\s+',' ',' '.join(node.itertext())).strip()
smr=get(base+'/sitemap.xml');smr.raise_for_status();sm=etree.fromstring(smr.content)
sitemap={urlsplit(x.findtext('{*}loc')).path:x.findtext('{*}lastmod') for x in sm.findall('{*}url')}
robot_response=get(base+'/robots.txt');rp=RobotFileParser();rp.parse(robot_response.text.splitlines())
ledger=json.loads((root/'data/registry/publication-ledger.json').read_bytes())['records']
registry={r['path']:r for r in ledger if r.get('contentStatus')=='PUBLISHED' and r.get('indexEligibility')}
static={}
for f in (root/'src/app').rglob('page.tsx'):
    parts=f.relative_to(root/'src/app').parts[:-1]
    if any('[' in x or x.startswith('(') for x in parts):continue
    p='/'+'/'.join(parts)+('/' if parts else '')
    if public(p):static[p]=str(f.relative_to(root))
seeds=set(sitemap)|set(registry)|set(static)
if args.paths:seeds|=set(json.loads(Path(args.paths).read_bytes()))
docs={};rows={};resources=set()
def source(p):
    if p in static:return static[p]
    if p.startswith('/services/'):return 'src/content/services.ts; src/app/services/[id]/page.tsx'
    if p.startswith('/areas/'):return 'src/components/RegionPage.tsx; src/content/gen/visit-notes.ts; src/content/regions.ts'
    if p.startswith('/handbook/'):return 'src/content/handbook.json; src/content/handbook-editorial.json; src/app/handbook/[slug]/page.tsx'
    if p.startswith('/guides/'):return 'src/content/guides*.ts; src/components/GuidePage.tsx'
    if p.startswith('/cases/'):return 'src/content/site-data.ts; src/app/cases/[id]/page.tsx'
    return 'publication-ledger.json / dynamic route; manual review required'
def check(p):
    result={'url':host+p,'path':p,'checked_at':at,'sitemap':p in sitemap,'lastmod':sitemap.get(p),'source_published':p in registry,'source_file':source(p),'issues':[]}
    try:
        r=get(base+p);result.update(http=r.status_code,final_url=r.url,redirects=[{'url':x.url,'http':x.status_code,'location':x.headers.get('location')} for x in r.history],content_type=r.headers.get('content-type',''),x_robots_tag=r.headers.get('x-robots-tag',''),robots_allowed=rp.can_fetch('Yeti',host+p))
        if 'text/html' not in result['content_type']:result['issues'].append('not HTML');return result,None
        d=html.fromstring(r.content.decode('utf8'));m=d.xpath('//main');body=clean(m[0]) if m else ''
        canon=d.xpath('//link[translate(@rel,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="canonical"]/@href')
        meta=d.xpath('//meta[translate(@name,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="robots"]/@content')
        links=[]
        for a in d.xpath('//a/@href'):
            u=urlsplit(urljoin(host+p,a))
            if u.netloc=='jndsystem.kr' and public(u.path):links.append(u.path or '/')
        mainlinks=[]
        for a in m[0].xpath('.//a/@href') if m else []:
            u=urlsplit(urljoin(host+p,a))
            if u.netloc=='jndsystem.kr' and public(u.path):mainlinks.append(u.path or '/')
        result.update(title=d.xpath('string(//title)'),description=d.xpath('//meta[@name="description"]/@content'),h1=d.xpath('//main//h1//text()'),canonical=canon,canonical_count=len(canon),robots_meta=meta,main_present=bool(m),main_text=body,body_hash=hashlib.sha256(body.encode()).hexdigest(),body_chars=len(body),links=sorted(set(links)),main_links=sorted(set(mainlinks)),image_count=len(d.xpath('//main//img')),page_type=p.strip('/').split('/')[0] or 'home')
        result['index_allowed']=r.status_code==200 and result['robots_allowed'] and not re.search(r'noindex|\bnone\b',' '.join(meta)+' '+result['x_robots_tag'],re.I)
        if p in sitemap or p in registry:
            if r.status_code!=200 or r.history:result['issues'].append('public canonical status/redirect')
            if canon!=[host+p]:result['issues'].append('canonical mismatch/count')
            if not result['index_allowed']:result['issues'].append('index disallowed')
            if not body:result['issues'].append('empty main')
            if not result['title'] or not result['h1']:result['issues'].append('missing title/H1')
        if result['index_allowed'] and not r.history and canon==[host+p] and p not in sitemap:result['issues'].append('indexable public URL absent from sitemap')
        assets=[urljoin(host+p,a) for a in d.xpath('//script[@src]/@src|//link[@rel="stylesheet"]/@href')]
        return result,{'html':r.content.decode('utf8'),'assets':assets}
    except Exception as e:
        result['error']=str(e);result['issues'].append('request/parse unverified');return result,None
pending=seeds
while pending:
    batch=sorted(pending-set(rows))
    if not batch:break
    with cf.ThreadPoolExecutor(2) as ex:
        for p,(row,doc) in zip(batch,ex.map(check,batch)):
            rows[p]=row
            if doc:docs[p]=doc;resources.update(doc['assets'])
    pending={p for r in rows.values() for p in r.get('links',[]) if p not in rows}
    print('checked',len(rows),'new internal paths',len(pending),flush=True)
    if len(rows)>1500:raise RuntimeError('crawl bound reached; review discovered routes')
(out/f'fetch-{args.tag}.json').write_text(json.dumps({'rows':rows,'docs':docs},ensure_ascii=False),'utf8')
incoming=collections.Counter(p for r in rows.values() for p in r.get('links',[]));depth={'/':0};q=collections.deque(['/'])
while q:
    p=q.popleft()
    for target in rows.get(p,{}).get('main_links',[]):
        if target in rows and target not in depth:depth[target]=depth[p]+1;q.append(target)
normalized={p:re.sub(r'[^가-힣a-z0-9]','',r['main_text'].lower()) for p,r in rows.items() if p in sitemap and r.get('main_text')}
grams={p:{text[i:i+5] for i in range(max(0,len(text)-4))} for p,text in normalized.items()}
nearest={p:(0,None) for p in grams};pairs=[]
keys=sorted(grams)
for i,p in enumerate(keys):
    for z in keys[:i]:
        a,b=grams[p],grams[z];score=len(a&b)/max(1,len(a|b));pairs.append((score,p,z))
        if score>nearest[p][0]:nearest[p]=(score,z)
        if score>nearest[z][0]:nearest[z]=(score,p)
for p,r in rows.items():
    r.update(incoming_links=incoming[p],home_depth=depth.get(p),orphan=incoming[p]==0 and p!='/')
    r['nearest_similarity'],r['nearest_url']=nearest.get(p,(None,None))
    r['canonical_target_status']=[rows.get(urlsplit(c).path,{}).get('http') if urlsplit(c).netloc=='jndsystem.kr' else 'unverified external' for c in r.get('canonical',[])]
    if p in sitemap and p not in depth:r['issues'].append('not reached through main links')
    r['naver_status']='not checked in this script; see UI evidence';r['priority']='P0/P1 review' if r['issues'] else 'technical checks pass; content editorial review separate'
    if p.startswith('/areas/') and p.count('/')>4:r['content_evidence_gap']='No on-page case link' if not any(x.startswith('/cases/c') for x in r.get('main_links',[])) else ''
    else:r['content_evidence_gap']=''
fields=['url','page_type','http','final_url','redirects','content_type','x_robots_tag','robots_allowed','robots_meta','canonical','canonical_count','canonical_target_status','title','description','h1','main_present','main_text','body_hash','body_chars','nearest_similarity','nearest_url','incoming_links','home_depth','orphan','sitemap','lastmod','source_published','source_file','naver_status','checked_at','issues','priority','content_evidence_gap']
with (out/f'seo-audit-{args.tag}.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader()
    for r in rows.values():w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in r.items() if k in fields})
(out/f'pages-{args.tag}.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),'utf8')
(out/f'html-{args.tag}.json').write_text(json.dumps(docs,ensure_ascii=False),'utf8')
(out/f'paths-{args.tag}.json').write_text(json.dumps(sorted(rows)), 'utf8')
summary={'at':at,'sitemap_count':len(sitemap),'source_published':len(registry),'checked':len(rows),'unverified':sum('error' in r for r in rows.values()),'public_200_html':sum(r.get('http')==200 and not r.get('redirects') and r.get('main_present',False) for r in rows.values()),'index_allowed':sum(bool(r.get('index_allowed')) and not r.get('redirects') for r in rows.values()),'issues':{p:r['issues'] for p,r in rows.items() if r['issues']},'top_similarity':sorted(pairs,reverse=True)[:30],'identical_main_pairs':[(p,z) for _,p,z in pairs if rows[p]['body_hash']==rows[z]['body_hash']],'resource_robots_blocked':[u for u in resources if not rp.can_fetch('Yeti',u)],'no_actual_yeti_logs_checked':True}
(out/f'summary-{args.tag}.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),'utf8');print(json.dumps({k:v for k,v in summary.items() if k not in ['top_similarity']},ensure_ascii=False),flush=True)
