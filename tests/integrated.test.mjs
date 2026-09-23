import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutIntegrated,connectionCounts,sliceGraph,relationshipGeometry} from '../graph.js';
const data=JSON.parse(readFileSync(new URL('../data.json',import.meta.url),'utf8'));
const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const crosses=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<-1e-6&&orient(c,d,a)*orient(c,d,b)<-1e-6;
test('integrated baseline preserves every entity and has no intersecting relationship segments',()=>{
 const p=layoutIntegrated(data.nodes,data.edges);assert.equal(p.positions.size,data.nodes.length);
 for(const [id,a] of p.positions){assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));assert.ok(a.x>0&&a.x<p.width&&a.y>0&&a.y<p.height);for(const [other,b] of p.positions)if(id!==other)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>150,'icons remain separated');}
 for(let i=0;i<data.edges.length;i++)for(let j=i+1;j<data.edges.length;j++){const a=data.edges[i],b=data.edges[j];if(new Set([a.from,a.to,b.from,b.to]).size<4)continue;assert.ok(!crosses(p.positions.get(a.from),p.positions.get(a.to),p.positions.get(b.from),p.positions.get(b.to)),a.id+' crosses '+b.id);}
 assert.equal(p.crossings,0);
});
test('connection badges count only displayed relationships, including zero connections',()=>{
 const all=connectionCounts(data.nodes,data.edges);assert.equal(all.get('realDonaldTrump'),3);assert.equal(all.get('karpathy'),0);assert.equal([...all.values()].reduce((a,b)=>a+b,0),data.edges.length*2);
 const h=sliceGraph(data,'all','hierarchy'),counts=connectionCounts(h.nodes,h.edges);assert.equal(counts.get('realDonaldTrump'),2);assert.equal([...counts.values()].reduce((a,b)=>a+b,0),4);
});
test('filter layouts, empty maps and dragging do not corrupt cached baseline positions',()=>{
 for(const type of new Set(data.edges.map(e=>e.type))){const g=sliceGraph(data,'all',type),p=layoutIntegrated(g.nodes,g.edges);assert.equal(p.positions.size,g.nodes.length);for(const e of g.edges){const line=relationshipGeometry({...e,integrated:true},p.positions);assert.ok(!/NaN|Infinity/.test(line.path));}}
 assert.equal(layoutIntegrated([],[]).positions.size,0);
 const a=layoutIntegrated(data.nodes,data.edges),id=data.nodes[0].id,original={...a.positions.get(id)};a.positions.get(id).x+=1000;assert.deepEqual(layoutIntegrated(data.nodes,data.edges).positions.get(id),original);
});
