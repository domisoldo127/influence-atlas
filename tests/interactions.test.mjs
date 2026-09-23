import test from 'node:test';
import assert from 'node:assert/strict';
import {zoomAt,pinchCamera,moveNode,readPositions,createLayoutStore} from '../interactions.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const screen=(p,camera,center)=>({x:center.x+camera.x+(p.x-center.x)*camera.zoom,y:center.y+camera.y+(p.y-center.y)*camera.zoom});
test('zoom preserves the graph point under the cursor after panning',()=>{
 const c={zoom:1.4,x:137,y:-83},center={x:900,y:590},p={x:340,y:900},anchor=screen(p,c,center);
 for(const z of [.001,.7,3,100]){const n=zoomAt(c,center,anchor,z),s=screen(p,n,center);near(s.x,anchor.x);near(s.y,anchor.y);assert.ok(n.zoom>=.25&&n.zoom<=6);}
});
test('node drag follows pointer distance at every zoom',()=>{
 for(const zoom of [.25,1,2,6]){const origin={x:200,y:300},start={x:45,y:70},end={x:135,y:10};const p=moveNode(origin,start,end,zoom);near((p.x-origin.x)*zoom,90);near((p.y-origin.y)*zoom,-60);}
});
test('pinch combines zoom and midpoint pan without moving the original anchor away',()=>{
 const c={zoom:2,x:100,y:20},center={x:500,y:330};
 const before=[{x:200,y:300},{x:400,y:300}],after=[{x:150,y:340},{x:550,y:340}];
 const graphAnchor={x:center.x+(300-center.x-c.x)/c.zoom,y:center.y+(300-center.y-c.y)/c.zoom};
 const n=pinchCamera(c,center,before,after),p=screen(graphAnchor,n,center);near(n.zoom,4);near(p.x,350);near(p.y,340);
 const bounded=pinchCamera(c,center,[{x:0,y:0},{x:0,y:0}],after);assert.ok(Number.isFinite(bounded.x)&&Number.isFinite(bounded.zoom));
});
test('invalid and stale saved positions cannot corrupt the map',()=>{
 const ids=new Set(['a','b']);
 for(const raw of [null,'broken','null','[]','{"version":2,"positions":[]}'])assert.equal(readPositions(raw,ids).size,0);
 const raw=JSON.stringify({version:1,positions:[['a',{x:100,y:200}],['b',{x:'10',y:4}],['gone',{x:0,y:0}],['b',{x:1e9,y:1}],null]});
 assert.deepEqual([...readPositions(raw,ids)],[['a',{x:100,y:200}]]);
});
test('layouts survive reload and filters, remain separate by sector, and reset only one sector',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const make=()=>createLayoutStore(()=>storage,new Set(['a','b']));
 const first=make();first.set('all','a',{x:80,y:90});first.set('chips','a',{x:300,y:200});first.set('all','b',{x:7,y:8});
 const second=make();const base=()=>new Map([['a',{x:0,y:0}]]);
 assert.deepEqual(second.apply(base(),'all').get('a'),{x:80,y:90});
 assert.deepEqual(second.apply(new Map([['b',{x:0,y:0}]]),'all').get('b'),{x:7,y:8});
 assert.deepEqual(second.apply(base(),'chips').get('a'),{x:300,y:200});
 second.clear('all');assert.deepEqual(make().apply(base(),'all').get('a'),{x:0,y:0});assert.deepEqual(make().apply(base(),'chips').get('a'),{x:300,y:200});
});
test('storage denial leaves dragging usable for the current page',()=>{
 let errors=0;const store=createLayoutStore(()=>{throw Error('denied');},new Set(['a']),()=>errors++);
 store.set('all','a',{x:12,y:34});assert.deepEqual(store.apply(new Map([['a',{x:0,y:0}]]),'all').get('a'),{x:12,y:34});
 store.clear('all');assert.deepEqual(store.apply(new Map([['a',{x:0,y:0}]]),'all').get('a'),{x:0,y:0});assert.ok(errors);
});
