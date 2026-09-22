export function sliceGraph(data,sector='chips',relation='all'){
 const base=new Set(data.nodes.filter(n=>sector==='all'||n.sector===sector).map(n=>n.id));
 const edges=data.edges.filter(e=>(relation==='all'||e.type===relation)&&(base.has(e.from)||base.has(e.to)));
 const ids=new Set([...(relation==='all'?base:[]),...edges.flatMap(e=>[e.from,e.to])]);
 return {nodes:data.nodes.filter(n=>ids.has(n.id)),edges};
}
export function searchNodes(nodes,query){const q=query.trim().toLocaleLowerCase();return nodes.filter(n=>[n.name,n.en,n.handle,n.role].filter(Boolean).join(' ').toLocaleLowerCase().includes(q));}
export function neighbors(edges,id){return new Set(edges.filter(e=>e.from===id||e.to===id).flatMap(e=>[e.from,e.to]));}
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
