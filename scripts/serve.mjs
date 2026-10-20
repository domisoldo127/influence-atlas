import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const allowed=new Set(['index.html','styles.css','explorer.css','app.js','graph.js','interactions.js','explorer.js','catalog-model.js','data.json','people.json','people-relations.json','flows.json']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=pathname==='/'?'index.html':pathname.slice(1);
    // 미리보기에서는 Git 이력과 수집 캐시 등 웹사이트 이외 파일을 노출하지 않습니다.
    if(!allowed.has(file)&&!/^portraits\/[a-zA-Z0-9_.-]+$/.test(file)){res.writeHead(404);return res.end();}
    const content=await readFile(path.join(root,file));
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(content);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4176,'127.0.0.1',()=>console.log('Influence Atlas: http://127.0.0.1:4176/'));
