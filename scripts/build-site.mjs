import {mkdir,copyFile,cp} from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('_site/',root);
await mkdir(out,{recursive:true});
for(const file of ['index.html','styles.css','explorer.css','app.js','graph.js','interactions.js','explorer.js','catalog-model.js','data.json','people.json','people-relations.json','flows.json','.nojekyll']){
  await copyFile(new URL(file,root),new URL(file,out));
}
await cp(new URL('portraits/',root),new URL('portraits/',out),{recursive:true});
console.log('GitHub Pages 정적 배포 파일을 _site에 생성했습니다.');
