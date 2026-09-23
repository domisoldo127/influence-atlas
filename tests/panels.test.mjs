import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relationshipPanels,constrainPanelPosition,sliceGraph,layoutEdgeAnnotations} from '../graph.js';
const data=JSON.parse(readFileSync(new URL('../data.json',import.meta.url),'utf8'));
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
test('panels repeat entities while preserving all identities, relations and disconnected nodes',()=>{
 const p=relationshipPanels(data,2);assert.equal(p.edges.length,data.edges.length);
 assert.equal(new Set(p.nodes.map(n=>n.id)).size,p.nodes.length);assert.deepEqual(new Set(p.nodes.map(n=>n.entityId)),new Set(data.nodes.map(n=>n.id)));
 for(const edge of p.edges){const original=data.edges.find(e=>e.id===edge.id);assert.equal(p.nodes.find(n=>n.id===edge.from).entityId,original.from);assert.equal(p.nodes.find(n=>n.id===edge.to).entityId,original.to);}
 const hierarchy=relationshipPanels(sliceGraph(data,'all','hierarchy'),1);assert.equal(hierarchy.nodes.filter(n=>n.entityId==='realDonaldTrump').length,4);assert.equal(data.nodes.filter(n=>n.id==='realDonaldTrump').length,1);
});
test('one and two column layouts keep icons and names clear of other nodes and relationship labels',()=>{
 for(const columns of [1,2]){const p=relationshipPanels(data,columns),labels=layoutEdgeAnnotations(p.edges,p.positions);const boxes=[...p.positions.values()].map(v=>({x:v.x-74,y:v.y-28,w:148,h:83}));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!intersects(boxes[i],boxes[j]));
 for(const label of labels.values()){const box={x:label.x-label.width/2,y:label.y-label.height/2,w:label.width,h:label.height};for(const node of boxes)assert.ok(!intersects(box,node));}
 }
});
test('extreme drags stay within the assigned relationship lane without moving another copy',()=>{
 const p=relationshipPanels(sliceGraph(data,'all','hierarchy'),2),copies=p.nodes.filter(n=>n.entityId==='realDonaldTrump');const other={...p.positions.get(copies[1].id)};
 for(const extreme of [{x:1e6,y:1e6},{x:-1e6,y:-1e6}]){const moved=constrainPanelPosition(extreme,p.bounds.get(copies[0].id));const b=p.bounds.get(copies[0].id);assert.ok(moved.x>=b.minX&&moved.x<=b.maxX&&moved.y>=b.minY&&moved.y<=b.maxY);}
 assert.deepEqual(p.positions.get(copies[1].id),other);assert.equal(relationshipPanels({nodes:[],edges:[]}).nodes.length,0);
});
