import {readFile, writeFile} from 'node:fs/promises';
import {groups} from './collect-people.mjs';
const root = new URL('../', import.meta.url);
const read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const data = await read('data.json');
const date = '2026-10-20';
const normalize = s => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const candidates = new Map();
for (const group of [...groups, {id:'korea',occupation:'korea',label:'한국 국적 경제·기술 직업'},
  {id:'chips',occupation:'special-chips',label:'반도체 관련 기업 소속·창업 이력'},
  {id:'crypto',occupation:'special-crypto',label:'디지털자산 관련 조직 소속·창업 이력'},
  {id:'ai',occupation:'special-ai-company',label:'AI 기업 소속·창업 이력'}]) {
  for (const row of await read('research-cache/' + group.occupation + '.json')) {
    const id = row.person.value.split('/').at(-1);
    if (!/^Q\d+$/.test(id)) continue;
    const node = candidates.get(id) || {
      id, wikidataId:id, name:row.ko?.value || row.en.value, en:row.en.value,
      description:row.description?.value || '', kind:'person', categories:[],
      occupations:[], evidence:[], links:Number(row.links?.value || 0),
      sourceUrl:'https://www.wikidata.org/wiki/' + id,
      checkedAt:date, review:'community'
    };
    if (!node.categories.includes(group.id)) node.categories.push(group.id);
    if (!node.occupations.includes(group.label)) node.occupations.push(group.label);
    if (!node.evidence.includes(group.occupation)) node.evidence.push(group.occupation);
    if(row.classificationOrganizations)node.classificationOrganizations=[...new Set([...(node.classificationOrganizations||[]),...row.classificationOrganizations])];
    candidates.set(id,node);
  }
}
const curated = data.nodes.filter(n => n.kind === 'person');
for(const node of candidates.values()){
  if(/semiconductor|microelectronic|chip design/i.test(node.description)){
    if(!node.categories.includes('chips'))node.categories.push('chips');
    node.evidence.push('description:semiconductor-or-chip-design');
  }
  if(/cryptocurrency|blockchain|bitcoin/i.test(node.description)){
    if(!node.categories.includes('crypto'))node.categories.push('crypto');
    node.evidence.push('description:cryptocurrency-or-blockchain');
  }
}
const aliases = {
  saylor:['Michael J. Saylor'],
  cz_binance:['Changpeng Zhao'], heyibinance:['He Yi'],
  PhilipLane:['Philip R. Lane'], EuisunChung:['Chung Eui-sun'],
  JaehoonChang:['Chang Jae-hoon'], YoungHyunJun:['Jun Young-hyun'],
  NohJungKwak:['Kwak Noh-jung'], seokhee4:['Lee Seok-hee'],
  JaiHyukSong:['Song Jai-hyuk'], BradSmi:['Brad Smith (American lawyer)']
};
const matches=[];
const base = curated.map(n => {
  const names = [n.name,n.en,...(aliases[n.id]||[])].map(normalize);
  let found = [...candidates.values()].filter(p => names.includes(normalize(p.en)) || names.includes(normalize(p.name)));
  if(found.length > 1) throw new Error('동명이인 검토 필요: '+n.en);
  const p = found[0];
  if(p) { candidates.delete(p.id); matches.push([n.id,p.id,p.en]); }
  return {
    ...p, id:n.id, name:n.name, en:n.en, kind:'person', description:n.role,
    categories:[...new Set([n.sector,...(p?.categories||[])])],
    occupations:p?.occupations||[], evidence:p?.evidence||[],
    sourceUrl:n.sourceUrl||p?.sourceUrl||n.url, checkedAt:n.checkedAt,
    review:'curated', photo:n.photo || null, curatedId:n.id
  };
});
// 특정 분야를 전부 AI나 반도체로 부르지 않고 실제 직업 분류를 유지합니다.
const ordered = [...candidates.values()].sort((a,b) => b.links-a.links || a.id.localeCompare(b.id));
const selected = new Map();
const quotas = {chips:1000,crypto:1000,korea:1000,ai:1000,engineering:1100,finance:1500,economics:2200,technology:2200,business:2800};
for(const [category,quota] of Object.entries(quotas)) {
  for(const p of ordered.filter(p=>p.categories.includes(category)).slice(0,quota)) selected.set(p.id,p);
}
for(const p of ordered) {
  if(selected.size >= 10000-base.length) break;
  selected.set(p.id,p);
}
const additions = [...selected.values()].slice(0,10000-base.length);
if(additions.length+base.length !== 10000) throw new Error('중복 제거 후 1만 명 미달: '+(additions.length+base.length));
const people = [...base,...additions];
for(const p of people) {
  delete p.links;
  p.searchText=normalize([p.name,p.en,p.description,...p.occupations].join(' '));
}
const categories = [
  {id:'ai',name:'인공지능',note:'AI 연구 직업·관련 기업 이력 또는 기존 공식 확인 인물'},
  {id:'chips',name:'반도체',note:'관련 기업 소속·창업 이력 또는 원문 소개의 반도체·칩 설계 키워드. 삼성 등 복합 기업 이력도 포함'},
  {id:'crypto',name:'디지털자산',note:'관련 조직 이력 또는 원문 소개의 암호화폐·블록체인 키워드'},
  {id:'korea',name:'한국 경제',note:'한국 국적 경제·기술 직업 또는 기존 공식 확인 인물'},
  {id:'global',name:'글로벌 정책',note:'기존 공식 확인 인물'},
  {id:'business',name:'기업 경영·창업',note:'사업가·기업가·최고경영자 직업'},
  {id:'finance',name:'금융·투자',note:'은행가·투자자·벤처투자자 직업'},
  {id:'economics',name:'경제학·정책 연구',note:'경제학자 직업'},
  {id:'technology',name:'컴퓨터 과학·기술',note:'컴퓨터 과학자 직업'},
  {id:'engineering',name:'전자·컴퓨터 공학',note:'전기·전자공학자 직업'}
].map(c=>({...c,count:people.filter(p=>p.categories.includes(c.id)).length}));
const catalog = {
  version:'2.0',collectedAt:date,total:people.length,curatedCount:base.length,
  license:'Wikidata structured data: CC0',licenseUrl:'https://www.wikidata.org/wiki/Wikidata:Licensing',
  source:'https://query.wikidata.org/sparql',
  selection:'직업별 조회 범위 안에서 분야별 표본을 구성. 분야 중복 허용. 영향력 순위가 아님. 사망일이 등록된 항목을 조회에서 제외했으나 생존 여부 검증은 아님.',
  limitations:'공개 데이터 수집분은 공식 직함·관계·X 계정을 개별 검증하지 않았습니다. 과거 이력을 포함하며 미확인 정보를 현재 사실로 단정하지 않습니다.',
  categories,people
};
await writeFile(new URL('people.json',root), JSON.stringify(catalog));
await writeFile(new URL('research-cache/identity-matches.json',root),JSON.stringify(matches,null,2));
console.log(JSON.stringify({total:people.length,categories,matches},null,2));

if(process.argv.includes('--relations')){
  const rows=await read('research-cache/employers-all.json');
  const byQ=new Map(people.filter(n=>n.wikidataId).map(n=>[n.wikidataId,n.id]));
  const orgs=new Map(), relations=new Map();
  const dateValue=field=>field?.type==='literal'&&/^\d{4}-\d{2}-\d{2}T/.test(field.value)?field.value.slice(0,10):null;
  for(const r of rows) {
    const person=byQ.get(r.person.value.split('/').at(-1));
    const org=r.org.value.split('/').at(-1);
    if(!person||!/^Q\d+$/.test(org))continue;
    orgs.set(org,{id:org,name:r.orgLabel.value,kind:'organization',sourceUrl:'https://www.wikidata.org/wiki/'+org});
    const id=r.statement.value.split('/').at(-1);
    relations.set(id,{id,from:person,to:org,type:'employment-record',
      start:dateValue(r.start),end:dateValue(r.end),datePrecision:'uncollected',
      sourceUrl:'https://www.wikidata.org/wiki/'+r.person.value.split('/').at(-1)+'#P108',
      statementUrl:r.statement.value.replace('http:','https:'),review:'community',checkedAt:date});
  }
  await writeFile(new URL('people-relations.json',root),JSON.stringify({
    collectedAt:date,organizations:[...orgs.values()],relations:[...relations.values()],
    note:'Wikidata P108 소속 이력. 종료일 누락은 현재 재직 증거가 아닙니다. 같은 조직의 이력은 직접적인 동료·상하·친분을 뜻하지 않습니다.'
  }));
  console.log(`소속 이력 ${relations.size}개, 조직 ${orgs.size}개`);
}
