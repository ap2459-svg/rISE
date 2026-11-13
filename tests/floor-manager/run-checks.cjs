const {spawnSync}=require('node:child_process');
const {readdirSync}=require('node:fs');
const path=require('node:path');
let failed=0;
for(const file of readdirSync(__dirname).filter(f=>f.endsWith('-checks.mjs')).sort()){
  console.log(`\nRunning ${file}`);
  const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',timeout:180000});
  if(result.error||result.status!==0){
    failed++;
    console.error(`${file}: ${result.error?.message||`exit ${result.status}, signal ${result.signal||'none'}`}`);
  }
}
console.log(failed?`${failed} check file(s) failed.`:'PASS: all Floor Manager check files.');
process.exitCode=failed?1:0;
