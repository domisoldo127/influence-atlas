import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterPeople,pageItems,indexRelations,relatedPeople,filterFlows,summarizeFlows,formatMoney} from '../catalog-model.js';
const read=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url),'utf8'));
const catalog=await read('people.json'),network=await read('people-relations.json'),money=await read('flows.json');
const original=await read('data.json');

test('실제 수집 인물 1만 명의 식별자와 출처를 보존한다',()=>{
  assert.equal(catalog.people.length,10000);
  assert.equal(new Set(catalog.people.map(p=>p.id)).size,10000);
  const qids=catalog.people.map(p=>p.wikidataId).filter(Boolean);
  assert.equal(new Set(qids).size,qids.length);
  const categories=new Set(catalog.categories.map(c=>c.id));
  for(const p of catalog.people){
    assert.equal(p.kind,'person');assert.ok(p.name&&p.en&&p.sourceUrl.startsWith('https://'));
    assert.ok(p.categories.length&&p.categories.every(c=>categories.has(c)));
    if(p.review==='community'){assert.match(p.wikidataId,/^Q\d+$/);assert.ok(p.evidence.length);}
  }
  for(const n of original.nodes.filter(n=>n.kind==='person'))assert.ok(catalog.people.some(p=>p.id===n.id&&p.curatedId===n.id));
});
test('분류 수는 중복 분야를 정확히 집계하고 1만 명 검색도 페이지별로 제한한다',()=>{
  for(const c of catalog.categories)assert.equal(c.count,catalog.people.filter(p=>p.categories.includes(c.id)).length);
  const all=filterPeople(catalog.people);
  assert.equal(pageItems(all).items.length,40);
  assert.equal(pageItems(all,249).items.length,40);
  assert.equal(pageItems(all,1000).page,249);
  assert.equal(pageItems([]).pages,1);
  const n=catalog.people.find(p=>p.id==='sama');
  assert.ok(filterPeople(all,{query:n.name}).some(p=>p.id===n.id));
  assert.ok(filterPeople(all,{query:n.en}).some(p=>p.id===n.id));
  assert.equal(filterPeople(all,{review:'curated'}).length,54);
});
test('수집 관계는 유효한 인물·조직을 연결하고 원문의 시점과 근거를 가진다',()=>{
  const ids=new Set(catalog.people.map(p=>p.id)),orgs=new Set(network.organizations.map(o=>o.id));
  assert.ok(network.relations.length>0);
  assert.equal(new Set(network.relations.map(r=>r.id)).size,network.relations.length);
  for(const r of network.relations){
    assert.ok(ids.has(r.from)&&orgs.has(r.to));assert.equal(r.type,'employment-record');
    assert.equal(r.review,'community');assert.match(r.sourceUrl,/wikidata.org\/wiki\/Q\d+#P108/);
    assert.ok(r.start===null||/^\d{4}-\d{2}-\d{2}$/.test(r.start));
    assert.ok(r.end===null||/^\d{4}-\d{2}-\d{2}$/.test(r.end));
  }
});
test('공유 소속 탐색은 자기 자신과 중복을 제외하고 화면 인원을 제한한다',()=>{
  const rows=[{from:'a',to:'org'},{from:'a',to:'org'},...Array.from({length:100},(_,i)=>({from:'p'+i,to:'org'}))];
  const peers=relatedPeople('a',indexRelations(rows));
  assert.equal(peers.total,100);assert.equal(peers.ids.length,24);assert.ok(!peers.ids.includes('a'));
});
test('실제 거래 데이터에 금액·상태·기간·출처가 있고 개인을 수취자로 바꾸지 않는다',()=>{
  const orgs=new Set(money.organizations.map(n=>n.id));
  assert.ok(money.flows.length>=7);
  assert.equal(new Set(money.flows.map(f=>f.dealId)).size,money.flows.length);
  for(const f of money.flows){
    assert.ok(orgs.has(f.from)&&orgs.has(f.to));assert.ok(f.amount===null||f.amount>0);
    assert.ok(f.currency&&f.date&&f.period&&f.sourceUrl.startsWith('https://'));
  }
  assert.equal(money.flows.find(f=>f.id==='microsoft-openai-202301').amount,null);
  assert.equal(money.flows.find(f=>f.id==='chips-skhynix-grant-202412').status,'awarded');
});
test('발표·집행·대출·보조금·통화와 누적 기준을 섞지 않고 중복 합산을 거부한다',()=>{
  const flows=[
    {dealId:'a',status:'completed',type:'equity',currency:'USD',amountBasis:'payment',amount:10},
    {dealId:'b',status:'announced',type:'equity',currency:'USD',amountBasis:'announced',amount:20},
    {dealId:'c',status:'completed',type:'equity',currency:'KRW',amountBasis:'payment',amount:30},
    {dealId:'d',status:'completed',type:'equity',currency:'USD',amountBasis:'payment',amount:null},
    {dealId:'e',status:'completed',type:'loan',currency:'USD',amountBasis:'payment',amount:5}
  ];
  assert.equal(summarizeFlows(flows).length,4);
  assert.throws(()=>summarizeFlows([...flows,flows[0]]),/중복/);
  assert.equal(formatMoney(null),'금액 비공개');
  assert.equal(formatMoney(2235000000),'22.35억 달러');
  const filtered=filterFlows(money.flows,{organization:'SKhynix',type:'loan',year:'2024'});
  assert.equal(filtered.length,1);assert.equal(filtered[0].amount,500000000);
});
