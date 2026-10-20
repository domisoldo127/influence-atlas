import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'research-cache');
await mkdir(cache, {recursive: true});
const endpoint = 'https://query.wikidata.org/sparql';
const isEntry = path.resolve(process.argv[1]||'') === fileURLToPath(import.meta.url);
export const groups = [
  {id: 'ai', name: '인공지능', occupation: 'Q15976092', label: 'AI 연구자', limit: 1500},
  {id: 'engineering', name: '전자·컴퓨터 공학', occupation: 'Q1326886', label: '전기·전자공학자', limit: 1500},
  {id: 'finance', name: '금융·투자', occupation: 'Q16023665', label: '벤처투자자', limit: 1000},
  {id: 'finance', name: '금융·투자', occupation: 'Q557880', label: '투자자', limit: 1500},
  {id: 'finance', name: '금융·투자', occupation: 'Q806798', label: '은행가', limit: 1500},
  {id: 'economics', name: '경제학·정책 연구', occupation: 'Q188094', label: '경제학자', limit: 4000},
  {id: 'technology', name: '컴퓨터 과학·기술', occupation: 'Q82594', label: '컴퓨터 과학자', limit: 4000},
  {id: 'business', name: '기업 경영·창업', occupation: 'Q484876', label: '최고경영자', limit: 2000},
  {id: 'business', name: '기업 경영·창업', occupation: 'Q43845', label: '사업가', limit: 6000},
  {id: 'business', name: '기업 경영·창업', occupation: 'Q131524', label: '기업가', limit: 6000}
];
const prefix = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX hint: <http://www.bigdata.com/queryHints#>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>`;

async function query(sparql, key) {
  const filename = path.join(cache, key + '.json');
  try { return JSON.parse(await readFile(filename, 'utf8')); } catch {}
  const response = await fetch(endpoint, {
    method:'POST', body:new URLSearchParams({format:'json',query:prefix+'\n'+sparql}),
    headers: {'Content-Type':'application/x-www-form-urlencoded','Accept':'application/sparql-results+json','User-Agent': 'InfluenceAtlas/2.0 (public economic people directory; https://github.com/domisoldo127/influence-atlas)'},
    signal: AbortSignal.timeout(65000)
  });
  if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
  const rows = (await response.json()).results.bindings;
  await writeFile(filename, JSON.stringify(rows));
  return rows;
}

if (isEntry && process.argv.includes('--people')) {
  for (const group of groups) {
    try {
      const saved=JSON.parse(await readFile(path.join(cache,group.occupation+'.json'),'utf8'));
      console.log(`${group.label}: ${saved.length} (저장된 자료)`);
      continue;
    } catch {}
    const ids = await query(`SELECT DISTINCT ?person ?links WHERE {
          hint:Query hint:optimizer "None".
          ?person wdt:P106 wd:${group.occupation}; wdt:P31 wd:Q5; wikibase:sitelinks ?links.
          FILTER NOT EXISTS { ?person wdt:P570 ?death }
          FILTER(?links >= 1)
        } LIMIT ${group.limit}`, group.occupation+'-ids');
    const rows=[];
    for(let i=0;i<ids.length;i+=250){
      const batch=ids.slice(i,i+250);
      const labels=await query(`SELECT ?person ?en ?ko ?description WHERE {
        VALUES ?person { ${batch.map(r=>'<'+r.person.value+'>').join(' ')} }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en".
          ?person rdfs:label ?en. ?person schema:description ?description. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en".
          ?person rdfs:label ?ko. }
      }`,group.occupation+'-labels-'+i);
      const byId=new Map(batch.map(r=>[r.person.value,r]));
      for(const r of labels)if(!/^Q\d+$/.test(r.en.value))rows.push({...r,links:byId.get(r.person.value).links});
    }
    await writeFile(path.join(cache,group.occupation+'.json'),JSON.stringify(rows));
    console.log(`${group.label}: ${rows.length}`);
  }
  const koreanIds = await query(`SELECT DISTINCT ?person ?links WHERE {
    hint:Query hint:optimizer "None".
    VALUES ?occupation { ${groups.map(g => 'wd:' + g.occupation).join(' ')} }
    ?person wdt:P106 ?occupation; wdt:P27 wd:Q884; wdt:P31 wd:Q5; wikibase:sitelinks ?links.
    FILTER NOT EXISTS { ?person wdt:P570 ?death }
  } LIMIT 2000`, 'korea-ids');
  const korean=[];
  for(let i=0;i<koreanIds.length;i+=200){
    const batch=koreanIds.slice(i,i+200);
    const labels=await query(`SELECT ?person ?en ?ko ?description WHERE {
      VALUES ?person { ${batch.map(r=>'<'+r.person.value+'>').join(' ')} }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en".
        ?person rdfs:label ?en. ?person schema:description ?description. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en".
        ?person rdfs:label ?ko. }
    }`,'korea-labels-'+i);
    const byId=new Map(batch.map(r=>[r.person.value,r]));
    for(const r of labels)if(!/^Q\d+$/.test(r.en.value))korean.push({...r,links:byId.get(r.person.value).links});
  }
  await writeFile(path.join(cache,'korea.json'),JSON.stringify(korean));
  console.log(`한국 경제·기술: ${korean.length}`);
}

if (isEntry && (process.argv.includes('--relations')||process.argv.includes('--relations-missing'))) {
  const catalog = JSON.parse(await readFile(path.join(root, 'people.json'), 'utf8'));
  const allIds = catalog.people.filter(n => n.wikidataId).map(n => n.wikidataId);
  const onlyMissing=process.argv.includes('--relations-missing');
  const queried=onlyMissing?new Set(JSON.parse(await readFile(path.join(cache,'relation-query-ids.json'),'utf8'))):new Set();
  const ids=allIds.filter(id=>!queried.has(id));
  const rows = onlyMissing?JSON.parse(await readFile(path.join(cache,'employers-all.json'),'utf8')):[];
  for (let i = 0; i < ids.length; i += 200) {
    // 관계는 개별 진술의 시작·종료 시점을 보존하고 현재 소속으로 단정하지 않습니다.
    const batch = ids.slice(i, i + 200);
    const result = await query(`SELECT ?person ?statement ?org ?orgLabel ?start ?end WHERE {
      VALUES ?person { ${batch.map(id => 'wd:' + id).join(' ')} }
      ?person p:P108 ?statement.
      ?statement ps:P108 ?org; wikibase:rank ?rank.
      FILTER(?rank != wikibase:DeprecatedRank)
      FILTER NOT EXISTS { ?org wdt:P31 wd:Q5 }
      OPTIONAL { ?statement pq:P580 ?start }
      OPTIONAL { ?statement pq:P582 ?end }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
    }`, 'employers-' + i + '-' + batch[0] + '-' + batch.at(-1));
    rows.push(...result);
    console.log(`소속 이력 ${Math.min(i + 200, ids.length)}/${ids.length}: ${result.length}개`);
  }
  await writeFile(path.join(cache, 'employers-all.json'), JSON.stringify(rows));
  await writeFile(path.join(cache, 'relation-query-ids.json'), JSON.stringify(allIds));
}

if(isEntry && process.argv.includes('--special')){
  const sectors=[
    {id:'chips',orgs:['Q182477','Q128896','Q248','Q20718','Q713418','Q4654287','Q370719','Q544847']},
    {id:'crypto',orgs:['Q51403327','Q16972754','Q114736857']},
    {id:'ai-company',orgs:['Q21708200','Q116758847']}
  ];
  for(const sector of sectors){
    const ids=await query(`SELECT DISTINCT ?person ?org WHERE {
      VALUES ?org { ${sector.orgs.map(id=>'wd:'+id).join(' ')} }
      { ?person wdt:P108 ?org } UNION { ?org wdt:P112 ?person }
      ?person wdt:P31 wd:Q5.
      FILTER NOT EXISTS { ?person wdt:P570 ?death }
    }`,'special-'+sector.id+'-ids');
    const unique=[...new Set(ids.map(r=>r.person.value))],rows=[];
    for(let i=0;i<unique.length;i+=200){
      const batch=unique.slice(i,i+200);
      const labels=await query(`SELECT ?person ?en ?ko ?description WHERE {
        VALUES ?person { ${batch.map(id=>'<'+id+'>').join(' ')} }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en".
          ?person rdfs:label ?en. ?person schema:description ?description. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". ?person rdfs:label ?ko. }
      }`,'special-'+sector.id+'-labels-'+i);
      for(const r of labels)if(!/^Q\d+$/.test(r.en.value))rows.push({...r,classificationOrganizations:ids.filter(x=>x.person.value===r.person.value).map(x=>x.org.value.split('/').at(-1))});
    }
    await writeFile(path.join(cache,'special-'+sector.id+'.json'),JSON.stringify(rows));
    console.log(sector.id+': '+rows.length);
  }
}
