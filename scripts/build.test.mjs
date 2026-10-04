import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build,loadNotes,renderBody} from './build.mjs';
import {filterNotes} from '../site/search.mjs';
const root=process.cwd();
const config=JSON.parse(fs.readFileSync('site/config.json','utf8'));
function fixture(fn) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'emba-test-'));
  for(const item of ['site','content']) fs.cpSync(path.join(root,item),path.join(dir,item),{recursive:true});
  try{fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const draft=`---\nid: draft-note\ntitle: Draft\ncategory: strategy\ntags: [中文]\ntype: concept\nstatus: draft\ndate: 2026-10-04\nupdated: 2026-10-04\nsummary: Not ready\ncourse: Strategy\nsources: []\nrelated: []\n---\nPrivate to site, public if committed.\n`;
test('build excludes drafts from pages/search and retains production subpath',()=>fixture(dir=>{
  fs.writeFileSync(path.join(dir,'content/notes/draft-note.md'),draft);
  const result=build(dir);
  assert.equal(result.published.length,1);
  assert.ok(!fs.existsSync(path.join(result.web,'notes/draft-note.html')));
  assert.ok(!fs.readFileSync(path.join(result.web,'search.json'),'utf8').includes('draft-note'));
  assert.ok(fs.readFileSync(path.join(result.web,'index.html'),'utf8').includes('/emba_journey/style.css'));
  assert.ok(fs.existsSync(path.join(result.web,'.nojekyll')));
}));
test('invalid categories, calendar dates, source URLs, and related IDs block publication',()=>{
  for(const [old,value] of [['category: strategy','category: unknown'],['date: 2026-10-04','date: 2026-02-30'],['sources: []','sources: [{title: Bad, url: "javascript:alert(1)"}]'],['related: []','related: [missing]']]) fixture(dir=>{
    fs.writeFileSync(path.join(dir,'content/notes/draft-note.md'),draft.replace(old,value));
    assert.throws(()=>loadNotes(dir,config));
  });
});
test('Markdown links resolve to published notes and broken links fail',()=>{
  const notes=loadNotes(root,config);
  const n={...notes[0],body:'[Guide](using-this-knowledge-base.md)'};
  assert.match(renderBody(n,notes),/\.\/using-this-knowledge-base.html/);
  assert.throws(()=>renderBody({...n,body:'[Missing](missing.md)'},notes));
});
test('untrusted Markdown cannot inject executable HTML',()=>{
  const notes=loadNotes(root,config);
  const body=renderBody({...notes[0],body:'<script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">bad</a>'},notes);
  assert.ok(!body.includes('<script'));assert.ok(!body.includes('onerror'));assert.ok(!body.includes('javascript:'));
});
test('search combines category with all terms, Unicode, tags, and course',()=>{
  const notes=[{id:'a',category:'strategy',title:'Business Model',summary:'Value',text:'竞争',course:'EMBA',tags:['growth']},{id:'b',category:'finance',title:'Value',summary:'Business',text:'',course:'',tags:[]}];
  assert.deepEqual(filterNotes(notes,'BUSINESS growth','all').map(n=>n.id),['a']);
  assert.deepEqual(filterNotes(notes,'竞争 EMBA','strategy').map(n=>n.id),['a']);
  assert.equal(filterNotes(notes,'business','finance').length,1);
  assert.equal(filterNotes(notes,'missing','all').length,0);
});
