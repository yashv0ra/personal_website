// Run against one frozen production server, then close only that server.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const port = process.env.CINEMATIC_PORT || '3014';
const server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{stdio:['ignore','pipe','pipe']});
const serverReady = new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(new Error('Production server did not start')),20000);
 server.stdout.on('data',data=>{if(String(data).includes('Ready')){clearTimeout(timeout);resolve();}});
 server.stderr.on('data',data=>process.stderr.write(data));
 server.on('exit',code=>{clearTimeout(timeout);reject(new Error(`Server exited ${code}`));});
});
const env={...process.env,CINEMATIC_URL:`http://127.0.0.1:${port}`,CINEMATIC_COUNT_DRAWS:'1'};
async function run(script, save) {
 console.log(`Running ${script}`);
 let output='';
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[`scripts/${script}`],{env,stdio:['ignore','pipe','inherit']});
  child.stdout.on('data',data=>{output+=data;process.stdout.write(data);});
  child.on('exit',code=>code===0?resolve():reject(new Error(`${script} exited ${code}`)));
 });
 if(save)await writeFile(save,output);
}
try {
 await serverReady; await mkdir('output/playwright',{recursive:true});
 await run('verify-cinematic-password.mjs');
 await run('measure-cinematic-performance.mjs','output/playwright/performance.json');
 await run('verify-cinematic.mjs');
 await run('verify-cinematic-edges.mjs');
 await run('capture-cinematic-visuals.mjs');
}finally{server.kill('SIGTERM');}
