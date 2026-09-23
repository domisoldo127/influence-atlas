export function sliceGraph(data,sector='chips',relation='all',entity='all'){
 if(entity==='people'){const nodes=data.nodes.filter(n=>n.kind==='person'),ids=new Set(nodes.map(n=>n.id));data={...data,nodes,edges:data.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))};}
 const base=new Set(data.nodes.filter(n=>sector==='all'||n.sector===sector).map(n=>n.id));
 const edges=data.edges.filter(e=>(relation==='all'||e.type===relation)&&(base.has(e.from)||base.has(e.to)));
 const ids=new Set([...(relation==='all'?base:[]),...edges.flatMap(e=>[e.from,e.to])]);
 return {nodes:data.nodes.filter(n=>ids.has(n.id)),edges};
}
export function searchNodes(nodes,query){const q=query.trim().toLocaleLowerCase();return nodes.filter(n=>[n.name,n.en,n.handle,n.role].filter(Boolean).join(' ').toLocaleLowerCase().includes(q));}
export function neighbors(edges,id){return new Set(edges.filter(e=>e.from===id||e.to===id).flatMap(e=>[e.from,e.to]));}
export const overviewRegions=[
 {id:'global',x:30,y:30,width:510,height:380,columns:3},
 {id:'chips',x:30,y:440,width:510,height:710,columns:3},
 {id:'ai',x:570,y:30,width:660,height:710,columns:4},
 {id:'korea',x:570,y:770,width:660,height:380,columns:4},
 {id:'crypto',x:1260,y:30,width:510,height:1120,columns:3}
];
export function layoutOverview(nodes){
 const positions=new Map();
 for(const region of overviewRegions){
  const group=nodes.filter(n=>n.sector===region.id);
  const rows=Math.ceil(group.length/region.columns);
  const cellWidth=region.width/region.columns;
  const cellHeight=Math.min(137,(region.height-85)/Math.max(1,rows));
  group.forEach((n,i)=>positions.set(n.id,{x:region.x+cellWidth*(i%region.columns+.5),y:region.y+90+Math.floor(i/region.columns)*cellHeight}));
 }
 return positions;
}
export function layoutGraph(nodes,edges){
 const positions=new Map();
 // Deterministic force layout. No dependency, network request, or random motion.
 nodes.forEach((n,i)=>{const a=i*2.39996;const r=40+Math.sqrt(i/Math.max(1,nodes.length))*235;positions.set(n.id,{x:500+Math.cos(a)*r,y:325+Math.sin(a)*r});});
 for(let iteration=0;iteration<260;iteration++){
  const f=new Map(nodes.map(n=>[n.id,{x:0,y:0}]));
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
   const a=positions.get(nodes[i].id),b=positions.get(nodes[j].id);const dx=a.x-b.x,dy=a.y-b.y;const d=Math.max(12,Math.hypot(dx,dy));const force=4200/(d*d);f.get(nodes[i].id).x+=dx/d*force;f.get(nodes[i].id).y+=dy/d*force;f.get(nodes[j].id).x-=dx/d*force;f.get(nodes[j].id).y-=dy/d*force;
  }
  for(const e of edges){const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy));const force=(d-130)*.015;f.get(e.from).x+=dx/d*force;f.get(e.from).y+=dy/d*force;f.get(e.to).x-=dx/d*force;f.get(e.to).y-=dy/d*force;}
  const cooling=1-iteration/300;
  for(const n of nodes){const p=positions.get(n.id),v=f.get(n.id);p.x=Math.max(70,Math.min(930,p.x+(v.x+(500-p.x)*.0009)*cooling*3));p.y=Math.max(65,Math.min(575,p.y+(v.y+(320-p.y)*.001)*cooling*3));}
 }
 return positions;
}

// Edge geometry is shared by initial rendering and node dragging.
export function edgeGeometry(a,b,padding=29){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),inset=Math.min(padding,d/3);
 const ux=d?dx/d:1,uy=d?dy/d:0;
 return {path:`M${a.x+ux*inset},${a.y+uy*inset} L${b.x-ux*inset},${b.y-uy*inset}`,ux,uy};
}
export function layoutEdgeAnnotations(edges,positions){
 const placed=[],result=new Map();
 const integrated=edges.some(e=>e.integrated);
 const obstacles=[...positions.values()].map(p=>integrated?{x:p.x-115,y:p.y-44,w:230,h:148}:{x:p.x-62,y:p.y-29,w:124,h:88});
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 for(const e of edges){
  const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;
  const {ux,uy}=edgeGeometry(a,b),text=e.graphLabel||e.label;
  const width=20+[...text].reduce((n,c)=>n+(/[^\x00-\xff]/.test(c)?12:6.8),0),height=26;
  if(e.board){const target=positions.get(e.board.otherId);result.set(e.id,{x:target.x-176,y:target.y-18,width,height,anchor:{x:target.x-176,y:target.y}});continue;}
  if(e.panel){const x=e.panel.x+e.panel.width/2,y=e.panel.y+45;result.set(e.id,{x,y,width,height,anchor:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}});continue;}
  let best;
  for(const t of [.5,.35,.65,.23,.77])for(const offset of [-18,18,-40,40,-65,65]){
   const anchor={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
   const x=anchor.x-uy*offset,y=anchor.y+ux*offset;
   const box={x:x-width/2,y:y-height/2,w:width,h:height};
   const score=obstacles.reduce((s,o)=>s+overlap(box,o)*5,0)+placed.reduce((s,o)=>s+overlap(box,o)*8,0)+Math.abs(offset)*.3+Math.abs(t-.5)*30;
   if(!best||score<best.score)best={x,y,width,height,anchor,box,score};
  }
  placed.push(best.box);result.set(e.id,best);
 }
 return result;
}

// Each relationship gets its own pair of display instances. Entity data stays unique.
export function relationshipPanels(graph,columns=2){
 const nodes=[],edges=[],panels=[],positions=new Map(),bounds=new Map(),byId=new Map(graph.nodes.map(n=>[n.id,n]));
 const order=['conflict','competition','support','hierarchy','partnership','team','affiliation','history'];
 const sorted=[...graph.edges].sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type)||Number(a.id.slice(1))-Number(b.id.slice(1)));
 const linked=new Set(graph.edges.flatMap(e=>[e.from,e.to]));
 const entries=[...sorted.map(e=>({edge:e})),...graph.nodes.filter(n=>!linked.has(n.id)).map(n=>({node:n}))];
 const width=columns*520,height=Math.max(240,Math.ceil(entries.length/columns)*220+20);
 entries.forEach((entry,i)=>{
  const panel={x:10+(i%columns)*520,y:10+Math.floor(i/columns)*220,width:500,height:204,type:entry.edge?.type||'unlinked',edgeId:entry.edge?.id,index:i+1};panels.push(panel);
  const add=(entity,side)=>{const id=entry.edge?entry.edge.id+'::'+entity.id:'loose::'+entity.id;
   const node={...entity,id,entityId:entity.id};nodes.push(node);
   const x=panel.x+(side===0?95:side===1?405:250),y=panel.y+112;
   positions.set(id,{x,y});bounds.set(id,{minX:x-18,maxX:x+18,minY:y-12,maxY:y+12});return id;};
  if(entry.edge){const from=add(byId.get(entry.edge.from),0),to=add(byId.get(entry.edge.to),1);edges.push({...entry.edge,from,to,panel});}
  else add(entry.node,2);
 });
 return {nodes,edges,panels,positions,bounds,width,height};
}
export function constrainPanelPosition(p,bounds){return bounds?{x:Math.max(bounds.minX,Math.min(bounds.maxX,p.x)),y:Math.max(bounds.minY,Math.min(bounds.maxY,p.y))}:p;}

export function connectionCounts(nodes,edges){
 const counts=new Map(nodes.map(n=>[n.id,0]));
 for(const e of edges){if(counts.has(e.from))counts.set(e.from,counts.get(e.from)+1);if(counts.has(e.to))counts.set(e.to,counts.get(e.to)+1);}return counts;
}
export function circularCrossings(order,edges){
 const rank=new Map(order.map((id,i)=>[id,i]));let count=0;
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
  const [a,b]=[rank.get(edges[i].from),rank.get(edges[i].to)].sort((a,b)=>a-b),[c,d]=[rank.get(edges[j].from),rank.get(edges[j].to)].sort((a,b)=>a-b);
  if(a===c||a===d||b===c||b===d)continue;
  if((a<c&&c<b&&b<d)||(c<a&&a<d&&d<b))count++;
 }return count;
}
const integratedCache=new Map();
export function layoutIntegrated(nodes,edges){
 const key=nodes.map(n=>n.id).join('|')+';'+edges.map(e=>e.id+':'+e.from+':'+e.to).join('|');
 if(integratedCache.has(key)){const old=integratedCache.get(key);return {...old,positions:new Map([...old.positions].map(([id,p])=>[id,{...p}]))};}
 const adj=new Map(nodes.map(n=>[n.id,[]])),byId=new Map(nodes.map(n=>[n.id,n]));
 for(const e of edges){adj.get(e.from)?.push(e.to);adj.get(e.to)?.push(e.from);}
 const seen=new Set(),groups=[],isolated=[];
 const score=(order,es)=>{const rank=new Map(order.map((id,i)=>[id,i]));return circularCrossings(order,es)*100000+es.reduce((sum,e)=>{const d=Math.abs(rank.get(e.from)-rank.get(e.to));return sum+Math.min(d,order.length-d)**1.5;},0);};
 for(const n of nodes){
  if(seen.has(n.id))continue;const ids=[],queue=[n.id];seen.add(n.id);
  while(queue.length){const id=queue.pop();ids.push(id);for(const next of adj.get(id))if(!seen.has(next)){seen.add(next);queue.push(next);}}
  if(ids.length===1){isolated.push(n.id);continue;}
  const members=new Set(ids),es=edges.filter(e=>members.has(e.from));let best=ids,bestScore=Infinity;
  for(const root of ids){const visited=new Set(),order=[];const walk=id=>{visited.add(id);order.push(id);for(const next of [...adj.get(id)].sort((a,b)=>adj.get(b).length-adj.get(a).length||a.localeCompare(b)))if(!visited.has(next))walk(next);};walk(root);const value=score(order,es);if(value<bestScore){best=order;bestScore=value;}}
  // A single cycle with attached trees has an exact crossing-free circular order.
  const core=new Map(ids.map(id=>[id,new Set(adj.get(id))])),leaves=[...core].filter(([,ns])=>ns.size<2).map(([id])=>id);
  while(leaves.length){const id=leaves.pop();if(!core.has(id))continue;for(const next of core.get(id)){core.get(next).delete(id);if(core.get(next).size===1)leaves.push(next);}core.delete(id);}
  if(core.size&&[...core.values()].every(ns=>ns.size===2)){
   const cycle=[],first=core.keys().next().value;let id=first,previous=null;
   do{cycle.push(id);const next=[...core.get(id)].find(n=>n!==previous);previous=id;id=next;}while(id!==first&&cycle.length<=core.size);
   if(cycle.length===core.size){const order=[],visited=new Set();const branch=id=>{visited.add(id);order.push(id);for(const next of adj.get(id))if(!core.has(next)&&!visited.has(next))branch(next);};for(const id of cycle)branch(id);const value=score(order,es);if(value<bestScore){best=order;bestScore=value;}}
  }
  for(let pass=0;pass<20;pass++){let chosen=null;for(let i=0;i<best.length;i++)for(let j=i+1;j<best.length;j++){const candidate=[...best];[candidate[i],candidate[j]]=[candidate[j],candidate[i]];const value=score(candidate,es);if(value<bestScore-.0001){bestScore=value;chosen=candidate;}}if(!chosen)break;best=chosen;}
  // Node relocations keep branches beside their parent on the circle.
  for(let pass=0;pass<30;pass++){let chosen=null;for(let i=0;i<best.length;i++)for(let j=0;j<best.length;j++){if(i===j)continue;const candidate=[...best],item=candidate.splice(i,1)[0];candidate.splice(j,0,item);const value=score(candidate,es);if(value<bestScore-.0001){bestScore=value;chosen=candidate;}}if(!chosen)break;best=chosen;}
  const radius=Math.max(170,ids.length*34),width=ids.length===2?540:Math.ceil(radius*2+300),height=ids.length===2?230:Math.ceil(radius*2+230);
  groups.push({ids:best,edges:es,width,height,radius,crossings:circularCrossings(best,es)});
 }
 groups.sort((a,b)=>b.ids.length-a.ids.length||byId.get(a.ids[0]).sector.localeCompare(byId.get(b.ids[0]).sector));
 const positions=new Map(),regions=[];const main=groups[0],mainWidth=main?.width||0;let width=mainWidth,height=0;
 const place=(g,x,y)=>{g.ids.forEach((id,i)=>{const angle=-Math.PI/2+i*2*Math.PI/g.ids.length;positions.set(id,g.ids.length===2?{x:x+135+i*270,y:y+90}:{x:x+g.width/2+Math.cos(angle)*g.radius,y:y+g.height/2-5+Math.sin(angle)*g.radius});});const leaders=[...g.ids].sort((a,b)=>adj.get(b).length-adj.get(a).length);regions.push({x,y,width:g.width,height:g.height,ids:g.ids,title:leaders.slice(0,2).map(id=>byId.get(id).name).join(' · '),edges:g.edges.length});width=Math.max(width,x+g.width);height=Math.max(height,y+g.height);};
 if(main)place(main,20,55);
 const laneWidth=680,columns=groups.length>10?3:groups.length>4?2:1,laneHeights=Array(columns).fill(55),originX=mainWidth?mainWidth+70:20;
 for(const g of groups.slice(1)){const col=laneHeights.indexOf(Math.min(...laneHeights));place(g,originX+col*laneWidth,laneHeights[col]);laneHeights[col]+=g.height+40;}
 if(isolated.length){const y=height+65,cols=Math.min(8,Math.max(2,Math.floor(Math.max(width,900)/240)));for(let i=0;i<isolated.length;i++)positions.set(isolated[i],{x:140+(i%cols)*240,y:y+95+Math.floor(i/cols)*180});regions.push({x:20,y,width:Math.max(500,cols*240),height:Math.ceil(isolated.length/cols)*180+70,ids:isolated,title:'연결 미등록',edges:0});width=Math.max(width,cols*240+40);height=y+Math.ceil(isolated.length/cols)*180+70;}
 const result={positions,regions,width:Math.max(600,width+30),height:Math.max(320,height+30),crossings:groups.reduce((s,g)=>s+g.crossings,0)};
 integratedCache.set(key,{...result,positions:new Map([...positions].map(([id,p])=>[id,{...p}]))});return result;
}
export function relationshipGeometry(edge,positions){
 const a=positions.get(edge.from),b=positions.get(edge.to);
 if(edge.board){const root=positions.get(edge.board.rootId),other=positions.get(edge.board.otherId),start={x:root.x+34,y:root.y},end={x:other.x-34,y:other.y};const bend={x:other.x-160,y:other.y};
  return {path:edge.from===edge.board.rootId?`M${start.x},${start.y} C${root.x+156},${root.y} ${other.x-250},${other.y} ${bend.x},${bend.y} L${end.x},${end.y}`:`M${end.x},${end.y} L${bend.x},${bend.y} C${other.x-250},${other.y} ${root.x+156},${root.y} ${start.x},${start.y}`};
 }
 if(!edge.integrated)return edgeGeometry(a,b);
 const clip=(p,q)=>{const dx=q.x-p.x,dy=q.y-p.y,tx=dx?115/Math.abs(dx):Infinity,ty=dy?(dy>0?104:44)/Math.abs(dy):Infinity;const t=Math.min(tx,ty,.36);return {x:p.x+dx*t,y:p.y+dy*t};};
 const start=clip(a,b),end=clip(b,a);return {path:`M${start.x},${start.y} L${end.x},${end.y}`};
}

// Compact relationship neighborhoods: every edge belongs to one panel, identities stay canonical.
export function relationshipBoard(graph,columns=2,includeIsolated=false,selected=null){
 const byId=new Map(graph.nodes.map(n=>[n.id,n])),counts=connectionCounts(graph.nodes,graph.edges),remaining=new Set(graph.edges.map(e=>e.id));
 const nodes=[],edges=[],panels=[],positions=new Map(),bounds=new Map(),groups=[];
 while(remaining.size){
  const pending=graph.edges.filter(e=>remaining.has(e.id)),degree=connectionCounts(graph.nodes,pending);
  const root=[...graph.nodes].sort((a,b)=>degree.get(b.id)-degree.get(a.id)||pending.filter(e=>e.directed&&e.from===b.id).length-pending.filter(e=>e.directed&&e.from===a.id).length||a.id.localeCompare(b.id))[0];
  const incident=pending.filter(e=>e.from===root.id||e.to===root.id);incident.forEach(e=>remaining.delete(e.id));
  groups.push({root,incident,members:[...new Set(incident.map(e=>e.from===root.id?e.to:e.from))]});
 }
 const loose=graph.nodes.filter(n=>!counts.get(n.id));
 const shownLoose=includeIsolated?loose:loose.filter(n=>n.id===selected);
 for(let i=0;i<shownLoose.length;i+=3)groups.push({loose:shownLoose.slice(i,i+3),incident:[]});
 const heights=Array(columns).fill(16),width=columns*640+16;
 for(const group of groups){
  const col=heights.indexOf(Math.min(...heights)),x=16+col*640,y=heights[col],height=group.loose?236:Math.max(296,group.members.length*142+96);
  const panel={x,y,width:624,height,root:group.root,types:[...new Set(group.incident.map(e=>e.type))],size:group.loose?.length||group.members.length+1,edgeCount:group.incident.length,loose:!!group.loose};panels.push(panel);heights[col]+=height+16;
  const add=(n,px,py)=>{const id='board:'+ (group.root?.id||'loose')+':'+n.id;nodes.push({...n,id,entityId:n.id});positions.set(id,{x:px,y:py});bounds.set(id,{minX:px-8,maxX:px+8,minY:py-8,maxY:py+8});return id;};
  if(group.loose){group.loose.forEach((n,i)=>add(n,x+104+i*208,y+113));continue;}
  const rootId=add(group.root,x+120,y+95+(group.members.length-1)*71),memberIds=new Map();
  group.members.forEach((id,i)=>memberIds.set(id,add(byId.get(id),x+480,y+95+i*142)));
  for(const edge of group.incident){const other=edge.from===group.root.id?edge.to:edge.from;edges.push({...edge,from:edge.from===group.root.id?rootId:memberIds.get(other),to:edge.to===group.root.id?rootId:memberIds.get(other),board:{rootId,otherId:memberIds.get(other),panel}});}
 }
 return {nodes,edges,panels,positions,bounds,width,height:Math.max(300,...heights),looseCount:loose.length};
}
