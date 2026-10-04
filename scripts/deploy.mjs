import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const run = (cmd,args,options={}) => execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim();
let temp;
try {
  if(run('git',['branch','--show-current'])!=='main') throw new Error('Deploy from main after merging source changes.');
  if(run('git',['status','--porcelain'])) throw new Error('Commit all source changes before deployment.');
  run('git',['fetch','origin','main']);
  if(run('git',['rev-parse','HEAD'])!==run('git',['rev-parse','origin/main'])) throw new Error('Source HEAD must match origin/main.');
  const config=JSON.parse(fs.readFileSync('site/config.json','utf8'));
  const web=path.resolve('dist',config.basePath.slice(1));
  if(!fs.existsSync(path.join(web,'index.html'))) throw new Error('Build output missing; run npm run check.');
  const remote=run('git',['remote','get-url','origin']);
  temp=fs.mkdtempSync(path.join(os.tmpdir(),'emba-pages-'));
  const exists=run('git',['ls-remote','--heads','origin','gh-pages']);
  if(exists) {
    run('git',['clone','--depth','1','--single-branch','--branch','gh-pages',remote,temp]);
    for(const entry of fs.readdirSync(temp)) if(entry!=='.git') fs.rmSync(path.join(temp,entry),{recursive:true,force:true});
  } else {
    run('git',['init','-b','gh-pages',temp]);
    run('git',['remote','add','origin',remote],{cwd:temp});
  }
  for(const entry of fs.readdirSync(web)) fs.cpSync(path.join(web,entry),path.join(temp,entry),{recursive:true});
  // Use the source checkout's Git identity, never credentials.
  for(const key of ['user.name','user.email']) run('git',['config',key,run('git',['config',key])],{cwd:temp});
  run('git',['add','--all'],{cwd:temp});
  if(run('git',['status','--porcelain'],{cwd:temp})) {
    run('git',['commit','-m',`Publish EMBA knowledge base from ${run('git',['rev-parse','--short','HEAD'])}`],{cwd:temp});
    run('git',['push','origin','gh-pages'],{cwd:temp});
    console.log('Published locally built HTML to gh-pages.');
  } else console.log('Published files already match the local build.');
  console.log('Verify live deployment: https://tomqwu.github.io/emba_journey/');
} catch(e) {
  console.error(`DEPLOY FAILED: ${e.message}${e.stderr ? '\n'+String(e.stderr) : ''}`);
  process.exitCode=1;
} finally {if(temp) fs.rmSync(temp,{recursive:true,force:true});}
