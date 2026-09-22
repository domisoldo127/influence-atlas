import { writeFileSync } from 'node:fs';
const date='2026-09-22';
const sectors=[{id:'chips',name:'반도체',color:'#aa9bff',caption:'한국 반도체 생태계'},{id:'ai',name:'인공지능',color:'#74b9ff',caption:'AI를 만드는 사람들'},{id:'crypto',name:'디지털자산',color:'#e7b76c',caption:'디지털자산 생태계'},{id:'global',name:'글로벌 경제',color:'#e58eac',caption:'글로벌 경제정책 네트워크'},{id:'korea',name:'한국 경제',color:'#62c7b6',caption:'한국 경제와 산업'}];
// These are the 46 public accounts verified in the user's 2026-09-22 session.
// Private login handles, notification preferences and local task history are excluded.
const rows=[
['realDonaldTrump','도널드 트럼프','Donald Trump','global','미국 대통령'],
['elonmusk','일론 머스크','Elon Musk','ai','기업가 · Tesla / xAI'],
['Lagarde','크리스틴 라가르드','Christine Lagarde','global','유럽중앙은행 총재'],
['satyanadella','사티아 나델라','Satya Nadella','ai','Microsoft 회장·CEO'],
['JensenHuang','젠슨 황','Jensen Huang','chips','NVIDIA 창업자·CEO'],
['SecScottBessent','스콧 베선트','Scott Bessent','global','미국 재무장관'],
['howardlutnick','하워드 러트닉','Howard Lutnick','global','미국 상무장관'],
['Isabel_Schnabel','이자벨 슈나벨','Isabel Schnabel','global','유럽중앙은행 집행이사'],
['LisaSu','리사 수','Lisa Su','chips','AMD 회장·CEO'],
['BradSmi','브래드 스미스','Brad Smith','ai','Microsoft 부회장·사장'],
['sundarpichai','순다르 피차이','Sundar Pichai','ai','Google·Alphabet CEO'],
['cz_binance','창펑 자오','Changpeng Zhao / CZ','crypto','Binance 공동창업자'],
['heyibinance','허이','Yi He','crypto','Binance 공동창업자'],
['brian_armstrong','브라이언 암스트롱','Brian Armstrong','crypto','Coinbase 공동창업자·CEO'],
['saylor','마이클 세일러','Michael Saylor','crypto','Strategy 공동창업자'],
['sama','샘 올트먼','Sam Altman','ai','OpenAI 공동창업자'],
['demishassabis','데미스 하사비스','Demis Hassabis','ai','Google DeepMind 공동창업자'],
['DarioAmodei','다리오 아모데이','Dario Amodei','ai','Anthropic 공동창업자·CEO'],
['karpathy','안드레이 카파시','Andrej Karpathy','ai','AI 연구자'],
['AndrewYNg','앤드루 응','Andrew Ng','ai','AI 연구·교육'],
['drfeifei','페이페이 리','Fei-Fei Li','ai','World Labs 공동창업자'],
['gdb','그레그 브록먼','Greg Brockman','ai','OpenAI 공동창업자·사장'],
['ilyasut','일리야 수츠케버','Ilya Sutskever','ai','SSI 공동창업자'],
['LipBuTan1','립부 탄','Lip-Bu Tan','chips','Intel CEO'],
['cristianoamon','크리스티아노 아몬','Cristiano Amon','chips','Qualcomm CEO'],
['jimkxa','짐 켈러','Jim Keller','chips','Tenstorrent CEO'],
['seokhee4','이석희','Seok-Hee Lee','chips','Intel Foundry 수석 부사장 · 전 SK하이닉스 대표'],
['SamsungNewsroom','삼성전자','Samsung Electronics','chips','공식 한국 뉴스룸','organization'],
['SKhynix','SK하이닉스','SK hynix','chips','메모리·HBM','organization'],
['Rebellions_inc','리벨리온','Rebellions','chips','AI 추론 반도체','organization'],
['FuriosaAI','퓨리오사AI','FuriosaAI','chips','AI 추론 반도체','organization'],
['VitalikButerin','비탈릭 부테린','Vitalik Buterin','crypto','Ethereum 공동창업자'],
['toly','아나톨리 야코벤코','Anatoly Yakovenko','crypto','Solana Labs 공동창업자'],
['bgarlinghouse','브래드 갈링하우스','Brad Garlinghouse','crypto','Ripple CEO'],
['justinsuntron','저스틴 선','Justin Sun','crypto','TRON 창업자'],
['paoloardoino','파올로 아르도이노','Paolo Ardoino','crypto','Tether CEO'],
['jerallaire','제러미 알레어','Jeremy Allaire','crypto','Circle 공동창업자·CEO'],
['CryptoHayes','아서 헤이즈','Arthur Hayes','crypto','Maelstrom CIO · Flop Labs CEO'],
['Jaemyung_Lee','이재명','Lee Jae-myung','korea','대한민국 대통령'],
['yuncheol_koo','구윤철','Koo Yun-cheol','korea','부총리·재정경제부 장관'],
['MinisterofMOTIR','김정관','Kim Jung-kwan','korea','산업통상부 장관'],
['bok_hub','한국은행','Bank of Korea','korea','중앙은행','organization'],
['mofekorea','재정경제부','Ministry of Finance and Economy','korea','경제·재정정책','organization'],
['fsckorea','금융위원회','Financial Services Commission','korea','금융정책','organization'],
['motirnews','산업통상부','Ministry of Trade, Industry and Resources','korea','산업·통상정책','organization'],
['HMGnewsroom','현대자동차그룹','Hyundai Motor Group','korea','공식 글로벌 뉴스룸','organization']
];
const nodes=rows.map(([id,name,en,sector,role,kind='person'])=>({id,name,en,sector,role,kind,account:true,handle:id,url:`https://x.com/${id}`,checkedAt:date,verification:'profile',note:'2026-09-22 확인한 공개 프로필·계정 목록 기준. 직함은 이후 바뀔 수 있습니다.'}));
const orgRows=[['nvidia','NVIDIA','chips'],['amd','AMD','chips'],['intel','Intel','chips'],['qualcomm','Qualcomm','chips'],['tenstorrent','Tenstorrent','chips'],['microsoft','Microsoft','ai'],['openai','OpenAI','ai'],['anthropic','Anthropic','ai'],['google','Google / Alphabet','ai'],['deepmind','Google DeepMind','ai'],['worldlabs','World Labs','ai'],['ssi','SSI','ai'],['tesla','Tesla','ai'],['xai','xAI','ai'],['binance','Binance','crypto'],['coinbase','Coinbase','crypto'],['strategy','Strategy','crypto'],['ethereum','Ethereum','crypto'],['solana','Solana Labs','crypto'],['ripple','Ripple','crypto'],['tron','TRON','crypto'],['tether','Tether','crypto'],['circle','Circle','crypto'],['maelstrom','Maelstrom','crypto'],['us-admin','미국 행정부','global'],['ecb','유럽중앙은행','global'],['kr-gov','대한민국 정부','korea'],['sds','삼성SDS','chips']];
nodes.push(...orgRows.map(([id,name,sector])=>({id,name,en:name,sector,kind:'organization',account:false,role:'관계 설명용 연결 노드',checkedAt:date,note:'계정 목록에는 포함되지 않는 관계 설명용 기업·기관입니다.'})));
const edges=[];
const add=(from,to,label,type='affiliation',sources=[{title:'공개 X 프로필 (계정 확인 기록)',url:`https://x.com/${from}`}],extra={})=>edges.push({id:`e${edges.length+1}`,from,to,label,type,status:type==='competition'?'inference':'documented',checkedAt:date,sources,...extra});
for(const [a,b,l] of [
['realDonaldTrump','us-admin','대통령'],['SecScottBessent','us-admin','재무장관'],['howardlutnick','us-admin','상무장관'],['Lagarde','ecb','총재'],['Isabel_Schnabel','ecb','집행이사'],
['satyanadella','microsoft','회장·CEO'],['BradSmi','microsoft','부회장·사장'],['JensenHuang','nvidia','창업자·CEO'],['LisaSu','amd','회장·CEO'],['LipBuTan1','intel','CEO'],['cristianoamon','qualcomm','CEO'],['jimkxa','tenstorrent','CEO'],
['sundarpichai','google','CEO'],['demishassabis','deepmind','공동창업'],['sama','openai','공동창업'],['gdb','openai','공동창업·사장'],['DarioAmodei','anthropic','공동창업·CEO'],['drfeifei','worldlabs','공동창업'],['ilyasut','ssi','공동창업'],
['cz_binance','binance','공동창업'],['heyibinance','binance','공동창업'],['brian_armstrong','coinbase','공동창업·CEO'],['saylor','strategy','공동창업'],['VitalikButerin','ethereum','공동창업'],['toly','solana','공동창업'],['bgarlinghouse','ripple','CEO'],['justinsuntron','tron','창업'],['paoloardoino','tether','CEO'],['jerallaire','circle','공동창업·CEO'],['CryptoHayes','maelstrom','CIO'],
['Jaemyung_Lee','kr-gov','대통령'],['yuncheol_koo','mofekorea','장관'],['MinisterofMOTIR','motirnews','장관']])add(a,b,l);
edges.find(e=>e.from==='VitalikButerin').sources=[{title:'Ethereum 공식 역사·창립자 설명',url:'https://ethereum.org/ethereum-history-founder-and-ownership/'}];
edges.find(e=>e.from==='VitalikButerin').note='공동창업 이력입니다. Ethereum에는 단일 소유자나 CEO가 없으며 비탈릭이 네트워크를 통제한다는 의미가 아닙니다.';
add('elonmusk','tesla','공동창업·CEO','affiliation',[{title:'Tesla 공식 Elon Musk 약력',url:'https://www.tesla.com/elon-musk'}]);
add('seokhee4','intel','Intel Foundry 수석 부사장','affiliation',[{title:'Intel 공식 약력',url:'https://www.intel.com/content/www/us/en/corporate/biography/seok-hee-lee.html'}]);
add('seokhee4','SKhynix','전 대표','history',[{title:'이석희 공개 프로필',url:'https://x.com/seokhee4'}],{note:'과거 소속입니다. 현재 SK하이닉스 경영진을 의미하지 않습니다.'});
add('microsoft','openai','AI 기술·클라우드 협력','partnership',[{title:'Microsoft–OpenAI 협력 갱신 · 2026-04-27',url:'https://blogs.microsoft.com/blog/2026/04/27/the-next-phase-of-the-microsoft-openai-partnership/'}],{asOf:'2026-04-27',note:'공식 발표에 근거한 기업 간 협력. 계약의 독점성 등 세부 조건은 원문을 확인하세요.'});
const anthropicSource=[{title:'Microsoft·NVIDIA·Anthropic 전략적 파트너십 · 2025-11-18',url:'https://www.anthropic.com/news/microsoft-nvidia-anthropic-announce-strategic-partnerships'}];
add('microsoft','anthropic','클라우드 협력·투자 발표','partnership',anthropicSource,{asOf:'2025-11-18'});
add('nvidia','anthropic','AI 인프라 협력·투자 발표','partnership',anthropicSource,{asOf:'2025-11-18'});
add('nvidia','SKhynix','차세대 AI 메모리 협력','partnership',[{title:'NVIDIA·SK hynix 다년 기술 파트너십 · 2026-06-07',url:'https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-and-SK-hynix-Announce-Multiyear-Technology-Partnership-to-Advance-Memory-for-AI-Factories/default.aspx'}],{asOf:'2026-06-07',note:'AI 메모리와 반도체 설계·제조 분야의 기술 파트너십 발표.'});
add('SKhynix','Rebellions_inc','전략적 투자자 참여','partnership',[{title:'리벨리온·사피온 합병 완료 발표 · 2024-12-02',url:'https://rebellions.ai/newsroom/rebellions-and-sapeon-korea-complete-merger-launching-koreas-first-ai-chip-unicorn/'}],{asOf:'2024-12-02',note:'합병 발표 당시 SK그룹 계열사의 전략적 투자 참여. 현재 지분율은 표시하지 않습니다.'});
add('FuriosaAI','sds','RNGD 기반 NPUaaS','partnership',[{title:'삼성SDS NPUaaS 출시 · 2026-07-20',url:'https://www.samsungsds.com/en/news/1295097_5252.html'},{title:'FuriosaAI 공식 발표',url:'https://furiosa.ai/blog/furiosaai-and-samsung-sds'}],{asOf:'2026-07-20',note:'삼성SDS와 삼성전자는 별개 법인이므로 다른 노드로 표시합니다.'});
for(const [a,b,label,urls] of [
['nvidia','amd','AI 가속기 시장',['https://www.nvidia.com/en-us/data-center/','https://www.amd.com/en/products/accelerators/instinct.html']],
['SamsungNewsroom','SKhynix','메모리·HBM 시장',['https://semiconductor.samsung.com/dram/hbm/','https://news.skhynix.com/']],
['Rebellions_inc','FuriosaAI','AI 추론 반도체 시장',['https://rebellions.ai/','https://furiosa.ai/']],
['openai','anthropic','생성형 AI 모델 시장',['https://openai.com/','https://www.anthropic.com/']],
['tether','circle','달러 스테이블코인 시장',['https://tether.to/','https://www.circle.com/']]
])add(a,b,label,'competition',urls.map(url=>({title:'사업 영역 참고 · 공식 사이트',url})),{note:'유사한 제품·사업 영역을 바탕으로 한 분석자의 분류입니다. 개인 간 적대·갈등이나 배타적인 경쟁 관계를 뜻하지 않으며 협력이 병존할 수 있습니다.'});
const data={version:'1.0',updatedAt:date,sectors,nodes,edges,statements:[],collection:{status:'disconnected',note:'X 및 인터뷰 수집 미연결'},methodology:'인물의 공동 소속은 기업·기관 노드를 통해 표시합니다. 직함·창업 이력은 확인한 공개 프로필에 근거하며, 협력은 공식 발표 날짜를 표시합니다. 경쟁 관계는 사업 영역에 대한 해석입니다. 미확인 연결은 추가하지 않습니다.'};
if(process.argv.includes('--stdout'))console.log(JSON.stringify(data,null,2));
else {writeFileSync(new URL('./data.json',import.meta.url),JSON.stringify(data,null,2)+'\n');console.log(`${nodes.filter(n=>n.account).length} accounts; ${nodes.length} nodes; ${edges.length} edges`);}
