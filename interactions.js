// Camera coordinates are SVG viewBox units, independent of CSS size and letterboxing.
export const MIN_ZOOM = .25, MAX_ZOOM = 6;
export function zoomAt(camera, center, anchor, requestedZoom) {
 const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requestedZoom));
 const ratio = zoom / camera.zoom;
 return {zoom, x:anchor.x-center.x-(anchor.x-center.x-camera.x)*ratio,
  y:anchor.y-center.y-(anchor.y-center.y-camera.y)*ratio};
}
export function pinchCamera(camera, center, before, after) {
 const midpoint = pair => ({x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2});
 const a=midpoint(before),b=midpoint(after);
 const distance = pair => Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
 const next=zoomAt(camera,center,a,camera.zoom*distance(after)/Math.max(1,distance(before)));
 next.x+=b.x-a.x;next.y+=b.y-a.y;
 return next;
}
export function moveNode(origin, start, end, zoom) {
 return {x:origin.x+(end.x-start.x)/zoom,y:origin.y+(end.y-start.y)/zoom};
}
export function readPositions(raw, validIds) {
 const result=new Map();
 try {
  const saved=JSON.parse(raw);
  if(saved?.version!==1||!Array.isArray(saved.positions))return result;
  for(const entry of saved.positions) {
   if(!Array.isArray(entry)||entry.length!==2)continue;
   const [id,p]=entry;
   if(validIds.has(id)&&Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.abs(p.x)<=100000&&Math.abs(p.y)<=100000)
    result.set(id,{x:p.x,y:p.y});
  }
 } catch {}
 return result;
}
export function createLayoutStore(getStorage, validIds, onError=()=>{}) {
 const cache=new Map(),key=sector=>'influence-atlas:positions:v1:'+sector;
 const get=sector=>{
  if(!cache.has(sector)){
   let raw=null;try {raw=getStorage().getItem(key(sector));} catch {onError();}
   cache.set(sector,readPositions(raw,validIds));
  }
  return cache.get(sector);
 };
 const save=sector=>{
  try {getStorage().setItem(key(sector),JSON.stringify({version:1,positions:[...get(sector)]}));} catch {onError();}
 };
 return {
  apply(positions,sector){for(const [id,p] of get(sector))if(positions.has(id))positions.set(id,{...p});return positions;},
  set(sector,id,p){get(sector).set(id,{...p});save(sector);},
  clear(sector){cache.set(sector,new Map());try {getStorage().removeItem(key(sector));} catch {onError();}}
 };
}
export function attachMapInteractions({svg,camera,getPositions,getEdges,getSector,store,transform}) {
 const pointers=new Map();
 let gesture=null,ignoreClick=false,dirtyNode=null;
 const center=()=>({x:svg.viewBox.baseVal.width/2,y:svg.viewBox.baseVal.height/2});
 const point=e=>{
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
 };
 const flush=()=>{
  if(dirtyNode){store.set(getSector(),dirtyNode,getPositions().get(dirtyNode));dirtyNode=null;}
 };
 function updateNode(id,p) {
  getPositions().set(id,p);
  const node=[...svg.querySelectorAll('[data-node]')].find(el=>el.dataset.node===id);
  node?.setAttribute('transform',`translate(${p.x},${p.y})`);
  const edges=new Map(getEdges().filter(e=>e.from===id||e.to===id).map(e=>[e.id,e]));
  for(const el of svg.querySelectorAll('[data-edge]')){
   const edge=edges.get(el.dataset.edge);if(!edge)continue;
   const a=getPositions().get(edge.from),b=getPositions().get(edge.to);
   for(const path of el.querySelectorAll('path'))path.setAttribute('d',`M${a.x},${a.y} L${b.x},${b.y}`);
   const label=el.querySelector('.edge-label');
   if(label){label.setAttribute('x',(a.x+b.x)/2);label.setAttribute('y',(a.y+b.y)/2-5);}
  }
 }
 const beginPan=()=>{
  const p=[...pointers.values()][0];
  gesture=p?{kind:'pan',start:p.point,client:p.client,origin:{...camera},moved:true}:null;
 };
 svg.addEventListener('click',e=>{
  if(ignoreClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();ignoreClick=false;}
 },true);
 svg.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  if(!pointers.size)ignoreClick=false;
  const p=point(e),target=e.target.closest('.node,.edge-group')||svg;
  pointers.set(e.pointerId,{point:p,client:{x:e.clientX,y:e.clientY}});
  target.setPointerCapture(e.pointerId);
  if(pointers.size>=2){
   flush();ignoreClick=true;
   gesture={kind:'pinch',before:[...pointers.values()].slice(0,2).map(p=>p.point),origin:{...camera}};
   svg.classList.add('dragging');return;
  }
  const id=target.dataset.node;
  gesture={kind:id?'node':'pan',id,start:p,client:{x:e.clientX,y:e.clientY},
   origin:id?{...getPositions().get(id)}:{...camera},moved:false};
 });
 svg.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;
  const p=point(e);pointers.set(e.pointerId,{point:p,client:{x:e.clientX,y:e.clientY}});
  if(gesture.kind==='pinch'){
   Object.assign(camera,pinchCamera(gesture.origin,center(),gesture.before,[...pointers.values()].slice(0,2).map(p=>p.point)));
   transform();return;
  }
  if(!gesture.moved&&Math.hypot(e.clientX-gesture.client.x,e.clientY-gesture.client.y)<4)return;
  gesture.moved=true;ignoreClick=true;svg.classList.add('dragging');
  if(gesture.kind==='node'){
   updateNode(gesture.id,moveNode(gesture.origin,gesture.start,p,camera.zoom));dirtyNode=gesture.id;
  }else{
   camera.x=gesture.origin.x+p.x-gesture.start.x;camera.y=gesture.origin.y+p.y-gesture.start.y;transform();
  }
 });
 const finish=e=>{
  if(!pointers.has(e.pointerId))return;
  pointers.delete(e.pointerId);flush();
  if(pointers.size>=2)gesture={kind:'pinch',before:[...pointers.values()].slice(0,2).map(p=>p.point),origin:{...camera}};
  else if(pointers.size)beginPan();
  else{gesture=null;svg.classList.remove('dragging');}
 };
 svg.addEventListener('pointerup',finish);
 svg.addEventListener('pointercancel',finish);
 svg.addEventListener('lostpointercapture',finish);
 svg.addEventListener('wheel',e=>{
  e.preventDefault();if(pointers.size)return;
  const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?svg.clientHeight:1);
  Object.assign(camera,zoomAt(camera,center(),point(e),camera.zoom*Math.exp(-Math.max(-300,Math.min(300,delta))*.002)));
  transform();
 },{passive:false});
 svg.addEventListener('keydown',e=>{
  const node=e.target.closest('[data-node]'),steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(node&&steps[e.key]){
   e.preventDefault();const id=node.dataset.node,p=getPositions().get(id),step=e.shiftKey?50:10;
   const next={x:p.x+steps[e.key][0]*step,y:p.y+steps[e.key][1]*step};
   updateNode(id,next);store.set(getSector(),id,next);
  }
 });
 return {zoom(factor){Object.assign(camera,zoomAt(camera,center(),center(),camera.zoom*factor));transform();}};
}
