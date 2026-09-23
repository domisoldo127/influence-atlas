import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {edgeGeometry,layoutEdgeAnnotations,sliceGraph,layoutOverview} from '../graph.js';
const data=JSON.parse(readFileSync(new URL('../data.json',import.meta.url),'utf8'));
test('relationship categories preserve evidence, direction and historical context',()=>{
 for(const edge of data.edges){assert.ok(edge.summary.length>25);assert.ok(edge.graphLabel);assert.equal(typeof edge.directed,'boolean');if(edge.directed)assert.ok(['support','hierarchy'].includes(edge.type));}
 assert.ok(data.edges.filter(e=>e.type==='support').every(e=>e.directed));
 assert.ok(data.edges.filter(e=>e.type==='hierarchy').every(e=>e.directed&&e.sources.some(s=>s.url.includes('whitehouse.gov'))));
 const founder=data.edges.find(e=>e.from==='VitalikButerin');assert.equal(founder.type,'affiliation');assert.equal(founder.directed,false);
 const conflict=data.edges.find(e=>e.type==='conflict');assert.ok(conflict.asOf);assert.match(conflict.note,/현재 소송 진행 상태를 뜻하지/);
 for(const type of ['conflict','competition','support','hierarchy']){const graph=sliceGraph(data,'all',type);assert.ok(graph.edges.length);assert.ok(graph.edges.every(e=>e.type===type));}
});
test('arrow endpoints stay outside portraits even when nodes approach or overlap',()=>{
 assert.equal(edgeGeometry({x:0,y:0},{x:100,y:0}).path,'M29,0 L71,0');
 for(const b of [{x:1,y:0},{x:0,y:0},{x:-80,y:90}])assert.ok(!/NaN|Infinity/.test(edgeGeometry({x:0,y:0},b).path));
});
test('all labels get finite geometry and nearby labels avoid each other after movement',()=>{
 const positions=layoutOverview(data.nodes),labels=layoutEdgeAnnotations(data.edges,positions);assert.equal(labels.size,data.edges.length);
 for(const p of labels.values())for(const key of ['x','y','width','height'])assert.ok(Number.isFinite(p[key]));
 const edges=[{id:'a',from:'a',to:'b',label:'지원'},{id:'b',from:'a',to:'b',label:'협력'}],points=new Map([['a',{x:0,y:0}],['b',{x:300,y:0}]]);
 const first=layoutEdgeAnnotations(edges,points);assert.notDeepEqual(first.get('a').box,first.get('b').box);
 points.set('a',{x:0,y:150});assert.notDeepEqual(layoutEdgeAnnotations(edges,points).get('a').anchor,first.get('a').anchor);
});
