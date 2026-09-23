import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sliceGraph,layoutIntegrated,connectionCounts} from '../graph.js';
const d=JSON.parse(readFileSync(new URL('../data.json',import.meta.url),'utf8'));
test('people mode excludes companies and never converts corporate edges into personal relations',()=>{
 const p=sliceGraph(d,'all','all','people');assert.equal(p.nodes.length,54);assert.ok(p.nodes.every(n=>n.kind==='person'));const ids=new Set(p.nodes.map(n=>n.id));for(const e of p.edges){assert.ok(ids.has(e.from)&&ids.has(e.to));assert.ok(d.edges.some(original=>original.id===e.id&&original.from===e.from&&original.to===e.to));}
 assert.equal(layoutIntegrated(p.nodes,p.edges).crossings,0);
 const all=sliceGraph(d,'all','all','all');assert.equal(all.nodes.filter(n=>n.kind==='organization').length,37);assert.equal(all.edges.length,d.edges.length);
 const hierarchy=sliceGraph(d,'all','hierarchy','people');assert.equal(connectionCounts(hierarchy.nodes,hierarchy.edges).get('realDonaldTrump'),4);
});
test('every sector gains sourced people without fabricated X identities or reporting lines',()=>{
 const added=d.nodes.filter(n=>n.addedAt==='2026-09-23');assert.equal(added.length,17);for(const sector of d.sectors)assert.ok(added.filter(n=>n.sector===sector.id).length>=3);
 for(const n of added){assert.equal(n.kind,'person');assert.equal(n.account,false);assert.ok(!n.handle&&!n.url);assert.equal(new URL(n.sourceUrl).protocol,'https:');assert.ok(d.nodes.some(org=>org.id===n.organizationId&&org.kind==='organization'));assert.ok(d.edges.some(e=>e.from===n.id||e.to===n.id));}
 for(const e of d.edges.filter(e=>e.type==='team')){assert.equal(e.directed,false);assert.match(e.note,/직접 보고/);}
});
