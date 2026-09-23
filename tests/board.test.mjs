import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relationshipBoard,sliceGraph,relationshipGeometry,layoutEdgeAnnotations,constrainPanelPosition} from '../graph.js';
const data=JSON.parse(readFileSync(new URL('../data.json',import.meta.url),'utf8'));
test('board preserves every relation exactly once and never changes canonical identities or directions',()=>{
 for(const entity of ['people','all'])for(const columns of [1,2]){const g=sliceGraph(data,'all','all',entity),p=relationshipBoard(g,columns,true);assert.equal(p.edges.length,g.edges.length);assert.equal(new Set(p.edges.map(e=>e.id)).size,g.edges.length);assert.deepEqual(new Set(p.nodes.map(n=>n.entityId)),new Set(g.nodes.map(n=>n.id)));assert.equal(new Set(p.nodes.map(n=>n.id)).size,p.nodes.length);
 for(const e of p.edges){const original=g.edges.find(o=>o.id===e.id);assert.equal(p.nodes.find(n=>n.id===e.from).entityId,original.from);assert.equal(p.nodes.find(n=>n.id===e.to).entityId,original.to);assert.equal(e.directed,original.directed);assert.ok(!/NaN|Infinity/.test(relationshipGeometry(e,p.positions).path));}}
});
test('unregistered people are collapsed honestly and can be revealed or individually selected',()=>{
 const g=sliceGraph(data,'all','all','people'),p=relationshipBoard(g,2);assert.equal(p.looseCount,31);assert.equal(p.panels.length,7);assert.equal(p.nodes.length,23);assert.ok(!p.nodes.some(n=>n.entityId==='karpathy'));assert.ok(relationshipBoard(g,2,false,'karpathy').nodes.some(n=>n.entityId==='karpathy'));assert.equal(relationshipBoard({nodes:[],edges:[]}).edges.length,0);
});
test('board labels and portraits remain inside their own panels through bounded dragging',()=>{
 const p=relationshipBoard(sliceGraph(data,'all','all','people'),2);for(const n of p.nodes){const b=p.bounds.get(n.id);p.positions.set(n.id,constrainPanelPosition({x:1e5,y:-1e5},b));}
 const labels=layoutEdgeAnnotations(p.edges,p.positions);for(const e of p.edges){const b=e.board.panel;for(const id of [e.from,e.to]){const n=p.positions.get(id);assert.ok(n.x-70>b.x&&n.x+70<b.x+b.width);assert.ok(n.y-32>b.y+52&&n.y+106<b.y+b.height);}const l=labels.get(e.id);assert.ok(l.x-l.width/2>b.x&&l.x+l.width/2<b.x+b.width);const root=p.positions.get(e.board.rootId),other=p.positions.get(e.board.otherId);assert.ok(l.x-l.width/2>root.x+34);assert.ok(l.x+l.width/2<other.x-34);}
});
