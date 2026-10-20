import {execFileSync} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
for(const dir of ['./','scripts/','tests/']){
  for(const name of await readdir(new URL(dir,root))){
    if(!/\.(m?js)$/.test(name))continue;
    execFileSync(process.execPath,['--check',fileURLToPath(new URL(dir+name,root))],{stdio:'inherit'});
  }
}
console.log('JavaScript 구문 검사를 통과했습니다.');
