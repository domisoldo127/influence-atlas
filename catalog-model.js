export const PAGE_SIZE = 40;
export const normalize = value => String(value || '').normalize('NFKD')
  .replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function filterPeople(people, {query='', category='all', review='all', linked=false}={}, counts=new Map()) {
  const term=normalize(query);
  return people.filter(p =>
    (category==='all'||p.categories.includes(category)) &&
    (review==='all'||p.review===review) &&
    (!linked||(counts.get(p.id)||0)>0) &&
    (!term||(p.searchText||normalize(p.name+' '+p.en+' '+p.description)).includes(term)));
}
export function pageItems(items,page=0,size=PAGE_SIZE) {
  const pages=Math.max(1,Math.ceil(items.length/size));
  const index=Math.min(Math.max(0,page),pages-1);
  return {items:items.slice(index*size,(index+1)*size),page:index,pages,total:items.length};
}
export function indexRelations(relations) {
  const byPerson=new Map(),byOrganization=new Map();
  for(const r of relations) {
    if(!byPerson.has(r.from))byPerson.set(r.from,[]);
    if(!byOrganization.has(r.to))byOrganization.set(r.to,[]);
    byPerson.get(r.from).push(r);byOrganization.get(r.to).push(r);
  }
  return {byPerson,byOrganization};
}
export function uniqueRelations(rows) {
  return [...new Map(rows.map(r=>[[r.from,r.to,r.start||'',r.end||''].join('|'),r])).values()];
}
export function relatedPeople(person,indices,limit=24) {
  const ids=new Set();
  for(const r of indices.byPerson.get(person)||[])for(const peer of indices.byOrganization.get(r.to)||[]) {
    if(peer.from!==person)ids.add(peer.from);
  }
  return {ids:[...ids].slice(0,limit),total:ids.size};
}
export const flowStatuses={completed:'완료·지급 발표',awarded:'지원 한도 확정',announced:'투자 발표'};
export const flowTypes={equity:'지분 투자',grant:'보조금',loan:'대출',acquisition:'사업 인수'};
export function filterFlows(flows,{status='all',type='all',year='all',organization='all'}={}) {
  return flows.filter(f=>(status==='all'||f.status===status)&&(type==='all'||f.type===type)&&
    (year==='all'||f.date.startsWith(year))&&(organization==='all'||f.from===organization||f.to===organization));
}
export function summarizeFlows(flows) {
  const groups=new Map(),seen=new Set();
  for(const f of flows){
    if(f.amount===null||!Number.isFinite(f.amount))continue;
    // 누적액·개별 지급액이 동일 거래로 등록될 경우 중복 집계를 허용하지 않습니다.
    if(seen.has(f.dealId))throw new Error('중복 거래 집계: '+f.dealId);
    seen.add(f.dealId);
    const key=[f.status,f.type,f.currency,f.amountBasis].join(':');
    const group=groups.get(key)||{key,status:f.status,type:f.type,currency:f.currency,basis:f.amountBasis,amount:0,count:0};
    group.amount+=f.amount;group.count++;groups.set(key,group);
  }
  return [...groups.values()];
}
export function formatMoney(amount,currency='USD') {
  if(amount===null)return '금액 비공개';
  if(!Number.isFinite(amount))return '금액 미확인';
  const unit=currency==='USD'?'달러':currency==='KRW'?'원':currency;
  if(amount>=1e8)return (amount/1e8).toLocaleString('ko-KR',{maximumFractionDigits:3})+'억 '+unit;
  return amount.toLocaleString('ko-KR')+' '+unit;
}
