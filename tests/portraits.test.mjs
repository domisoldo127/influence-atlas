import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../data.json',import.meta.url),'utf8'));
test('every person has a traceable portrait and organizations retain their own visual identity',()=>{
 const people=data.nodes.filter(n=>n.kind==='person');
 assert.equal(people.length,37);
 for(const n of people){
  assert.ok(n.photo,n.id);
  for(const field of ['sourceUrl','licenseUrl'])assert.equal(new URL(n.photo[field]).protocol,'https:',n.id);
  for(const field of ['author','license','displayNote','checkedAt'])assert.ok(n.photo[field]?.trim(),n.id+' '+field);
  if(n.photo.url.startsWith('./portraits/')){
   const url=new URL('../'+n.photo.url.slice(2),import.meta.url);
   assert.ok(existsSync(url),n.id);
   const bytes=readFileSync(url);assert.ok(bytes.length>1000,n.id);
   assert.ok((bytes[0]===255&&bytes[1]===216)||(bytes[0]===137&&bytes[1]===80),n.id+' must be image bytes');
  }else assert.equal(new URL(n.photo.url).protocol,'https:');
 }
 assert.ok(data.nodes.filter(n=>n.kind==='organization').every(n=>!n.photo));
});
