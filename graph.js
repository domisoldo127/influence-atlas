export function sliceGraph(data,sector='chips',relation='all'){
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
 const obstacles=[...positions.values()].map(p=>({x:p.x-62,y:p.y-29,w:124,h:88}));
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 for(const e of edges){
  const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;
  const {ux,uy}=edgeGeometry(a,b),text=e.graphLabel||e.label;
  const width=20+[...text].reduce((n,c)=>n+(/[^\x00-\xff]/.test(c)?12:6.8),0),height=26;
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
 const order=['conflict','competition','support','hierarchy','partnership','affiliation','history'];
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
