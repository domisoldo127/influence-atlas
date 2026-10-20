import {PAGE_SIZE,filterPeople,pageItems,indexRelations,uniqueRelations,relatedPeople,
  flowStatuses,flowTypes,filterFlows,summarizeFlows,formatMoney} from './catalog-model.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
const initial=n=>(n.en||n.name).split(/\s+/).slice(0,2).map(s=>s[0]).join('');
const portrait=n=>`<span class="catalog-avatar">${esc(initial(n))}${n.photo?`<img src="${esc(n.photo.url)}" alt="" loading="lazy">`:''}</span>`;
const dateRange=r=>`${r.start?r.start.slice(0,4)+'년':'시작 시점 미등록'} → ${r.end?r.end.slice(0,4)+'년':'종료 시점 미등록'} · 원문 날짜 정밀도 미확인`;
const basisNames={cumulative:'해당 기간 누적액',payment:'지급 기록',ceiling:'최대 한도',announced:'발표 금액',undisclosed:'비공개'};
async function json(file){
  // 배포 전후의 캐시가 섞여 인물 수와 관계 수가 다른 스냅샷을 보이지 않게 합니다.
  const url=new URL(file,import.meta.url);url.searchParams.set('v','2026-10-20-2');
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok)throw new Error('불러오기 실패: '+file);
  return response.json();
}
export async function mountExplorer({data,goView,focusNode}) {
  const [catalog,network,money]=await Promise.all([json('./people.json'),json('./people-relations.json'),json('./flows.json')]);
  const people=new Map(catalog.people.map(p=>[p.id,p]));
  const organizations=new Map(network.organizations.map(p=>[p.id,p]));
  const indices=indexRelations(uniqueRelations(network.relations));
  const counts=new Map([...indices.byPerson].map(([id,rows])=>[id,new Set(rows.map(r=>r.to)).size]));
  const categoryNames=new Map(catalog.categories.map(c=>[c.id,c.name]));
  const orgs=new Map(money.organizations.map(o=>[o.id,o]));
  const curated=new Map(data.nodes.map(n=>[n.id,n]));
  const state={query:'',category:'all',review:'all',linked:false,page:0,selected:null};
  const flowState={status:'all',type:'all',year:'all',organization:'all'};
  const params=new URLSearchParams(location.hash.slice(1));
  if(people.has(params.get('person')))state.selected=params.get('person');
  if(categoryNames.has(params.get('category')))state.category=params.get('category');
  if(orgs.has(params.get('organization')))flowState.organization=params.get('organization');
  $('#stat-accounts').textContent=catalog.total.toLocaleString('ko-KR');
  $('#stat-accounts').parentElement.querySelector('small').textContent=`기존 확인 ${catalog.curatedCount} · 공개 자료 ${catalog.total-catalog.curatedCount}`;
  $('#catalog-view').innerHTML=`
    <div class="explorer-heading"><div><span class="eyebrow">PEOPLE ATLAS / 분야별 인물 사전</span><h2>10,000명에서, 하나의 연결로.</h2><p>분야를 고르고 인물을 선택하면 소속 이력과 같은 조직의 인물을 살펴볼 수 있습니다.</p></div><a class="subtle-button" href="./people.json" download>인물 데이터 내려받기 ↗</a></div>
    <div class="catalog-notice"><b>기존 확인 ${catalog.curatedCount}명 · 공개 데이터 수집 ${(catalog.total-catalog.curatedCount).toLocaleString('ko-KR')}명</b><span>수집분은 Wikidata 기반이며 공식 직함·관계·X 계정의 개별 검토가 필요합니다. 등록 수나 연결 수는 영향력 순위가 아닙니다.</span></div>
    <div id="catalog-categories" class="catalog-categories" aria-label="인물 분야"></div>
    <div class="catalog-filters"><label>인물 검색<input id="catalog-query" type="search" placeholder="이름·영문 이름·직업" autocomplete="off"></label>
      <label>자료 구분<select id="catalog-review"><option value="all">모든 자료</option><option value="curated">기존 확인 인물</option><option value="community">공개 수집 · 검토 필요</option></select></label>
      <label class="check-filter"><input id="catalog-linked" type="checkbox">소속 이력 있는 인물</label>
      <span id="catalog-result-count" role="status"></span></div>
    <div class="catalog-layout"><div><div id="catalog-results" class="catalog-results"></div>
      <div class="catalog-pagination"><button id="catalog-prev">← 이전</button><span id="catalog-page"></span><button id="catalog-next">다음 →</button></div></div>
      <aside id="catalog-detail" class="catalog-detail" aria-live="polite"></aside></div>
    <p class="catalog-footnote">수집 ${esc(catalog.collectedAt)} · 분야는 중복 집계 · 한국어 이름이 없는 항목은 원문 표기 · <a href="${catalog.licenseUrl}" target="_blank" rel="noopener noreferrer">Wikidata CC0</a> · 사망일 미등록 조건으로 수집했으며 생존 여부를 개별 확인한 목록은 아닙니다.</p>`;
  function clearSelection(){state.selected=null;renderDetail();}
  $('#catalog-query').oninput=e=>{state.query=e.target.value;state.page=0;clearSelection();renderCatalog();syncHash();};
  $('#catalog-review').onchange=e=>{state.review=e.target.value;state.page=0;clearSelection();renderCatalog();syncHash();};
  $('#catalog-linked').onchange=e=>{state.linked=e.target.checked;state.page=0;clearSelection();renderCatalog();syncHash();};
  $('#catalog-prev').onclick=()=>{state.page--;renderCatalog();$('#catalog-results').scrollIntoView({block:'start'});};
  $('#catalog-next').onclick=()=>{state.page++;renderCatalog();$('#catalog-results').scrollIntoView({block:'start'});};
  $('#flows-view').innerHTML=`
    <div class="explorer-heading"><div><span class="eyebrow">CAPITAL FLOWS / 출처로 읽는 자금 흐름</span><h2>누가, 어디에, 얼마를.</h2><p>거래의 방향과 금액을 읽고, 관련 조직에서 인물 관계도로 이어갑니다.</p></div><a class="subtle-button" href="./flows.json" download>거래 기록 내려받기 ↗</a></div>
    <div class="catalog-notice"><b>선별한 공식 거래 기록 ${money.flows.length}건 · 자료 확인 ${money.checkedAt}</b><span>${esc(money.scope)} 개인의 재산 이동으로 해석하지 않습니다. 각 카드의 상태는 해당 발표 당시를 뜻합니다.</span></div>
    <div class="flow-filters">
      <label>단계<select id="flow-status"><option value="all">모든 단계</option>${Object.entries(flowStatuses).map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select></label>
      <label>유형<select id="flow-type"><option value="all">모든 거래 유형</option>${Object.entries(flowTypes).map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select></label>
      <label>거래·발표 연도<select id="flow-year"><option value="all">전체 기간</option>${[...new Set(money.flows.map(f=>f.date.slice(0,4)))].sort().reverse().map(y=>`<option>${y}</option>`).join('')}</select></label>
      <label>조직<select id="flow-organization"><option value="all">전체 조직</option>${money.organizations.map(o=>`<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></label>
      <button class="subtle-button" id="flow-reset">필터 초기화</button></div>
    <div id="flow-summary" class="flow-summary" aria-label="유형과 상태별 금액 요약"></div>
    <p class="flow-legend"><span class="legend-solid">━━</span> 완료 발표 / 지급 기록 <span class="legend-dashed">┄┄</span> 발표 / 한도 확정 · 화살표는 돈을 제공하는 조직 → 받는 조직 · 선 두께는 금액 비율이 아닙니다.</p>
    <div id="flow-list" class="flow-list"></div>`;
  for(const key of ['status','type','year','organization']){
    $('#flow-'+key).onchange=e=>{flowState[key]=e.target.value;renderFlows();syncHash();};
  }
  $('#flow-reset').onclick=()=>{Object.assign(flowState,{status:'all',type:'all',year:'all',organization:'all'});renderFlows();syncHash();};
  function syncHash(){
    const p=new URLSearchParams(location.hash.slice(1));
    state.selected?p.set('person',state.selected):p.delete('person');
    p.set('category',state.category);p.set('organization',flowState.organization);
    history.replaceState(null,'','#'+p);
  }
  function openPerson(id){
    if(!people.has(id))return;
    if(!filterPeople([people.get(id)],state,counts).length){
      Object.assign(state,{query:'',category:'all',review:'all',linked:false,page:0});
      $('#catalog-query').value='';$('#catalog-review').value='all';$('#catalog-linked').checked=false;
    }
    state.selected=id;goView('catalog');renderDetail();renderCatalog();syncHash();
    $('#catalog-detail').scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function showFlows(organization){
    Object.assign(flowState,{status:'all',type:'all',year:'all',organization});
    goView('flows');renderFlows();syncHash();
  }
  function renderCatalog(){
    const list=filterPeople(catalog.people,state,counts),page=pageItems(list,state.page);state.page=page.page;
    $('#catalog-categories').innerHTML=[{id:'all',name:'전체 인물',count:catalog.total},...catalog.categories].map(c=>`<button data-category="${c.id}" class="${state.category===c.id?'selected':''}" aria-pressed="${state.category===c.id}" title="${esc(c.note||'중복을 제외한 전체 인물')}"><span>${esc(c.name)}</span><strong>${c.count.toLocaleString('ko-KR')}</strong></button>`).join('');
    $('#catalog-categories').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.category=b.dataset.category;state.page=0;clearSelection();renderCatalog();syncHash();});
    $('#catalog-result-count').textContent=`${page.total.toLocaleString('ko-KR')}명 · 한 번에 ${PAGE_SIZE}명`;
    $('#catalog-results').innerHTML=page.items.map(p=>`<button class="catalog-person ${p.id===state.selected?'selected':''}" data-person="${esc(p.id)}" aria-pressed="${p.id===state.selected}">
      ${portrait(p)}<span class="catalog-person-text"><strong>${esc(p.name)}</strong><span>${esc(p.en)}</span><small>${esc(p.description||p.occupations.join(' · '))}</small>
      <em class="${p.review==='curated'?'curated-mark':'community-mark'}">${p.review==='curated'?'기존 확인':'공개 수집 · 검토 필요'}</em></span><span class="catalog-degree">${counts.get(p.id)||0}<small>소속 이력</small></span></button>`).join('')||'<p class="empty-note">조건에 맞는 인물이 없습니다. 검색어 또는 분류를 바꿔보세요.</p>';
    $('#catalog-results').querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>openPerson(b.dataset.person));
    $('#catalog-results').querySelectorAll('img').forEach(img=>img.onerror=()=>img.hidden=true);
    $('#catalog-prev').disabled=page.page===0;$('#catalog-next').disabled=page.page===page.pages-1;
    $('#catalog-page').textContent=`${page.page+1} / ${page.pages}`;
  }
  function renderDetail(){
    const p=people.get(state.selected);
    if(!p){$('#catalog-detail').innerHTML='<div class="catalog-detail-empty"><span>◎</span><h3>인물에서 관계로</h3><p>왼쪽에서 인물을 선택하세요.<br>확인된 소속 이력을 조직별로 보여줍니다.</p><p>같은 조직의 이력이 있어도 함께 근무한 동료이거나 상하관계라는 뜻은 아닙니다.</p></div>';return;}
    const rows=indices.byPerson.get(p.id)||[],orgIds=[...new Set(rows.map(r=>r.to))],peers=relatedPeople(p.id,indices);
    const associated=data.edges.filter(e=>e.from===p.curatedId&&curated.get(e.to)?.kind==='organization').map(e=>e.to);
    const relatedFlows=money.organizations.filter(o=>associated.includes(o.atlasId));
    const h=Math.max(180,orgIds.slice(0,8).length*85+30);
    const cy=h/2;
    const diagram=orgIds.length?`<svg class="catalog-mini-map" viewBox="0 0 520 ${h}" role="img" aria-label="${esc(p.name)}의 조직 소속 이력. 선은 방향이나 현재 직위를 나타내지 않습니다.">
      ${orgIds.slice(0,8).map((id,i)=>`<path d="M 112 ${cy} C 220 ${cy},220 ${55+i*85},315 ${55+i*85}" class="record-link"/>`).join('')}
      <circle cx="77" cy="${cy}" r="32" class="record-person"/><text x="77" y="${cy+5}" text-anchor="middle">${esc(initial(p))}</text><text class="record-name" x="77" y="${cy+54}" text-anchor="middle">${esc(p.name.length>12?p.name.slice(0,11)+'…':p.name)}</text>
      ${orgIds.slice(0,8).map((id,i)=>`<g><rect x="315" y="${26+i*85}" width="190" height="58" rx="10"/><text x="329" y="${51+i*85}">${esc(organizations.get(id).name.slice(0,19))}</text><text class="record-subtitle" x="329" y="${71+i*85}">소속 이력 · 시점 확인 필요</text><title>${esc(organizations.get(id).name)}</title></g>`).join('')}</svg>`:'<p class="empty-note">수집한 자료에 소속 이력이 없습니다. 관계가 없다는 뜻은 아닙니다.</p>';
    $('#catalog-detail').innerHTML=`<div class="catalog-profile"><div class="catalog-profile-top">${portrait(p)}<button id="catalog-close" aria-label="인물 상세 닫기">×</button></div><h3>${esc(p.name)}</h3><span>${esc(p.en)}</span><p>${esc(p.description)}</p><div class="tags">${p.categories.map(c=>`<span class="tag neutral">${esc(categoryNames.get(c))}</span>`).join('')}</div>
      <p class="catalog-source-status">${p.review==='curated'?'기존 자료 확인 인물 · 과거 확인일 기준':'Wikidata 공개 수집 · 공식 자료 검토 필요'}</p><a class="source-link" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">인물 자료 원문 ↗</a>
      ${p.wikidataId?`<a class="source-link" href="https://www.wikidata.org/wiki/${p.wikidataId}#P106" target="_blank" rel="noopener noreferrer">직업 원문 ↗</a>`:''}
      <details class="classification-details"><summary>분야 분류 기준 보기</summary><ul>${p.categories.map(c=>`<li><b>${esc(categoryNames.get(c))}</b>: ${esc(catalog.categories.find(x=>x.id===c).note)}</li>`).join('')}</ul>${(p.classificationOrganizations||[]).map(id=>`<a class="source-link" href="https://www.wikidata.org/wiki/${id}" target="_blank" rel="noopener noreferrer">분류에 사용한 소속·창업 조직 ${id} ↗</a>`).join('')}</details>
      ${p.curatedId?'<button id="catalog-curated-map" class="subtle-button">공식 자료 기반 관계도 보기 →</button>':''}
      ${relatedFlows.map(o=>`<button class="subtle-button catalog-flow" data-flow-org="${o.id}">${esc(o.name)}의 자금 흐름 →</button>`).join('')}</div>
      <div class="catalog-detail-section"><h4>인물 → 소속 이력 → 다른 인물</h4><p class="empty-note">공개 데이터의 이력입니다. 종료일 미등록은 현재 재직의 증거가 아닙니다. 도표는 최대 8개 조직, 전체 이력은 아래에 표시합니다.</p>${diagram}
      <div class="employment-records">${rows.map(r=>`<article><b>${esc(organizations.get(r.to).name)}</b><small>${esc(dateRange(r))}</small><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikidata P108 근거 ↗</a></article>`).join('')}</div></div>
      <div class="catalog-detail-section"><h4>같은 조직에 이력이 있는 인물 <span>${peers.total}명</span></h4><p class="empty-note">직접적인 동료·친분 관계가 아닙니다. 먼저 ${Math.min(24,peers.total)}명을 표시합니다.</p><div class="catalog-peers">${peers.ids.map(id=>`<button data-peer="${esc(id)}">${esc(people.get(id).name)} ↗</button>`).join('')||'<p class="empty-note">등록된 다른 인물이 없습니다.</p>'}</div></div>`;
    $('#catalog-close').onclick=()=>{state.selected=null;renderDetail();renderCatalog();syncHash();};
    if(p.curatedId)$('#catalog-curated-map').onclick=()=>focusNode(p.curatedId);
    $('#catalog-detail').querySelectorAll('[data-flow-org]').forEach(b=>b.onclick=()=>showFlows(b.dataset.flowOrg));
    $('#catalog-detail').querySelectorAll('[data-peer]').forEach(b=>b.onclick=()=>openPerson(b.dataset.peer));
  }
  function renderFlows(){
    const rows=filterFlows(money.flows,flowState).sort((a,b)=>b.date.localeCompare(a.date));
    for(const key of Object.keys(flowState))$('#flow-'+key).value=flowState[key];
    $('#flow-summary').innerHTML=summarizeFlows(rows).map(g=>`<article class="flow-total ${g.status}"><span>${flowStatuses[g.status]} · ${flowTypes[g.type]}</span><strong>${formatMoney(g.amount,g.currency)}</strong><small>${basisNames[g.basis]} · ${g.count}건 · ${g.currency}</small></article>`).join('')||'<p class="empty-note">현재 조건에 합산 가능한 공개 금액이 없습니다.</p>';
    $('#flow-list').innerHTML=rows.map(f=>{
      const endpoints=[orgs.get(f.from),orgs.get(f.to)];
      const linkedPeople=[...new Set(data.edges.filter(e=>e.type==='affiliation'&&endpoints.some(o=>o.atlasId===e.to)).map(e=>e.from))].map(id=>curated.get(id)).filter(n=>n?.kind==='person');
      return `<article class="flow-card ${f.status}">
        <header><span class="flow-status ${f.status}">${flowStatuses[f.status]}</span><span>${flowTypes[f.type]}</span><time>${esc(f.date)}</time></header>
        <div class="flow-route"><div class="flow-party"><small>자금 제공 조직</small><strong>${esc(endpoints[0].name)}</strong></div>
          <div class="flow-bridge"><b>${f.amountBasis==='ceiling'?'최대 ':''}${formatMoney(f.amount,f.currency)}</b><div class="flow-arrow" aria-hidden="true"></div><small>${basisNames[f.amountBasis]}</small></div>
          <div class="flow-party"><small>자금 수취 조직</small><strong>${esc(endpoints[1].name)}</strong></div></div>
        <h3>${esc(f.title)}</h3><p>${esc(f.note)}</p><div class="flow-period">${esc(f.period)} · 금액 단위 ${f.currency}</div>
        ${linkedPeople.length?`<div class="flow-people"><span>관련 조직의 인물 · 개인 자금 아님</span>${linkedPeople.map(n=>`<button data-flow-person="${n.id}">${esc(n.name)} ↗</button>`).join('')}</div>`:''}
        <a class="source-link" href="${esc(f.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(f.sourceTitle)} ↗</a></article>`;
    }).join('')||'<p class="empty-note">현재 조건에 맞는 거래 기록이 없습니다.</p>';
    $('#flow-list').querySelectorAll('[data-flow-person]').forEach(b=>b.onclick=()=>openPerson(b.dataset.flowPerson));
  }
  renderCatalog();renderDetail();renderFlows();
  function updateStats(view){
    const expanded=view==='catalog',flows=view==='flows';
    const edgeStat=$('#stat-edges'),orgStat=$('#stat-organizations');
    edgeStat.textContent=(expanded?network.relations.length:flows?money.flows.length:data.edges.length).toLocaleString('ko-KR');
    edgeStat.parentElement.querySelector('span').textContent=expanded?'수집 소속 이력':flows?'선별 거래':'기존 관계 연결';
    edgeStat.parentElement.querySelector('small').textContent=expanded?'공개 데이터 · 검토 필요':flows?'공식 자료 기반 기록':'근거와 해석을 구분';
    orgStat.textContent=(expanded?network.organizations.length:flows?money.organizations.length:data.nodes.filter(n=>n.kind==='organization').length).toLocaleString('ko-KR');
    orgStat.parentElement.querySelector('span').textContent=expanded?'수집 조직':flows?'거래 관련 조직':'기존 관계도 조직';
    $('#data-version').textContent=`인물 사전 v${catalog.version} · ${catalog.collectedAt} / 기존 관계도 v${data.version} · ${data.updatedAt}`;
  }
  return {
    search(query){state.query=query;state.page=0;$('#catalog-query').value=query;clearSelection();renderCatalog();},
    openPerson,showFlows,
    searchPeople(query){return filterPeople(catalog.people,{query}).slice(0,8);},
    render(view){updateStats(view);if(view==='catalog')renderCatalog();if(view==='flows')renderFlows();},
    restore(){const p=new URLSearchParams(location.hash.slice(1));state.selected=people.has(p.get('person'))?p.get('person'):null;state.category=categoryNames.has(p.get('category'))?p.get('category'):'all';flowState.organization=orgs.has(p.get('organization'))?p.get('organization'):'all';renderCatalog();renderDetail();renderFlows();}
  };
}
