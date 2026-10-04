import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { marked } from 'marked';
import sanitize from 'sanitize-html';

export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fail = message => { throw new Error(message); };
export function loadNotes(root, config) {
  const directory = path.join(root, 'content/notes');
  const notes = fs.readdirSync(directory).filter(f => f.endsWith('.md')).sort().map(file => {
    const text = fs.readFileSync(path.join(directory, file), 'utf8');
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) fail(`${file}: missing YAML frontmatter`);
    const data = parse(match[1]);
    if (!data || typeof data !== 'object') fail(`${file}: invalid metadata`);
    for (const key of ['id','title','category','summary','type','status','date','updated']) {
      if (typeof data[key] !== 'string' || !data[key].trim()) fail(`${file}: ${key} must be a nonempty string`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.id) || file !== `${data.id}.md`) fail(`${file}: filename must match a safe id`);
    if (!config.categories.some(c => c.id === data.category)) fail(`${file}: unknown category`);
    if (!['concept','lecture','article','case','reflection','guide'].includes(data.type)) fail(`${file}: invalid type`);
    if (!['draft','review','published'].includes(data.status)) fail(`${file}: invalid status`);
    for (const key of ['date','updated']) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data[key]) || Number.isNaN(Date.parse(data[key])) || new Date(data[key]).toISOString().slice(0,10) !== data[key]) fail(`${file}: invalid ${key}`);
    }
    if (data.updated < data.date) fail(`${file}: updated precedes date`);
    for (const key of ['tags','related','sources']) if (!Array.isArray(data[key])) fail(`${file}: ${key} must be an array`);
    for (const key of ['tags','related']) if (data[key].some(v => typeof v !== 'string' || !v.trim())) fail(`${file}: invalid ${key}`);
    if (typeof data.course !== 'string') fail(`${file}: course must be a string`);
    for (const s of data.sources) {
      if (!s || typeof s.title !== 'string' || !s.title.trim() || (!s.url && !s.locator)) fail(`${file}: source needs title and url or locator`);
      if (s.url && (typeof s.url !== 'string' || !/^https?:\/\//.test(s.url))) fail(`${file}: source url must use http(s)`);
      if (s.locator && typeof s.locator !== 'string') fail(`${file}: invalid source locator`);
    }
    if (!match[2].trim()) fail(`${file}: empty note`);
    return {...data, body: match[2], file};
  });
  const ids = new Set();
  for (const n of notes) { if (ids.has(n.id)) fail(`Duplicate id: ${n.id}`); ids.add(n.id); }
  for (const n of notes) for (const id of n.related) if (!ids.has(id) || id === n.id) fail(`${n.file}: invalid related id ${id}`);
  return notes;
}
export function renderBody(note, notes) {
  const renderer = new marked.Renderer();
  renderer.link = ({href, title, tokens}) => {
    let url = href;
    if (!/^(?:https?:|mailto:|#)/i.test(href)) {
      const [file, fragment] = href.split('#');
      const target = notes.find(n => n.file === path.posix.normalize(file));
      if (!target || target.status !== 'published') fail(`${note.file}: broken or unpublished Markdown link ${href}`);
      url = `./${target.id}.html${fragment ? `#${fragment}` : ''}`;
    }
    return `<a href="${escape(url)}"${title ? ` title="${escape(title)}"` : ''}>${marked.Parser.parseInline(tokens)}</a>`;
  };
  renderer.image = () => fail(`${note.file}: use attributed text links for source images; image rendering is not configured`);
  renderer.heading = ({depth, text, tokens}) => `<h${depth} id="${escape(text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,''))}">${marked.Parser.parseInline(tokens)}</h${depth}>`;
  return sanitize(marked.parse(note.body, {renderer}), {allowedTags: sanitize.defaults.allowedTags, allowedAttributes: {...sanitize.defaults.allowedAttributes, '*':['id']}, allowedSchemes:['http','https','mailto'], allowProtocolRelative:false});
}
export function build(root = process.cwd()) {
  const config = JSON.parse(fs.readFileSync(path.join(root,'site/config.json'),'utf8'));
  if (!/^\/[a-zA-Z0-9/_-]*\/$/.test(config.basePath)) fail('Invalid basePath');
  const notes = loadNotes(root,config);
  const published = notes.filter(n => n.status === 'published').sort((a,b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  // Validate body links for every note, including drafts, before replacing output.
  const bodies = new Map(notes.map(n => [n.id, renderBody(n,notes)]));
  const output = path.join(root,'dist');
  fs.rmSync(output,{recursive:true,force:true});
  const base = config.basePath;
  const web = path.join(output,base.slice(1));
  fs.mkdirSync(path.join(web,'notes'),{recursive:true});
  const shell = (title,body,script='') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(config.description)}"><title>${escape(title)} · EMBA Journey</title><link rel="stylesheet" href="${base}style.css"></head><body><a class="skip" href="#main">Skip to content</a><header><a class="brand" href="${base}"><span class="brand-mark">E<span>J</span></span>EMBA Journey</a><nav aria-label="Main navigation"><a href="${base}">Knowledge library</a><a href="${escape(config.repository)}">GitHub ↗</a></nav></header>${body}<footer><span>EMBA Journey · Learning in progress</span><a href="${escape(config.repository)}/tree/main/content/notes">Explore the Markdown source ↗</a></footer>${script}</body></html>`;
  const categories = config.categories.map(c => {
    const count = published.filter(n => n.category === c.id).length;
    return `<button class="category" data-category="${escape(c.id)}" aria-pressed="false"><span>${escape(c.name)}</span><small>${escape(c.description)}</small><b>${count} ${count === 1 ? 'note' : 'notes'}</b></button>`;
  }).join('');
  const cards = published.map(n => `<article class="note-card" data-note="${n.id}"><div class="eyebrow">${escape(config.categories.find(c=>c.id===n.category).name)} <span>· ${escape(n.type)}</span></div><h3><a href="${base}notes/${n.id}.html">${escape(n.title)}</a></h3><p>${escape(n.summary)}</p><div class="card-bottom"><span>${escape(n.date)}</span><span>${n.tags.slice(0,2).map(t=>`#${escape(t)}`).join(' ')}</span></div></article>`).join('');
  fs.writeFileSync(path.join(web,'index.html'),shell('Knowledge library',`<main id="main"><section class="hero"><div class="eyebrow">THE EXECUTIVE LEARNING NOTEBOOK</div><h1>Learn deeply.<br><em>Connect the ideas.</em></h1><p>${escape(config.description)}</p><div class="stats"><span><b>${published.length}</b> published ${published.length===1?'note':'notes'}</span><span><b>${config.categories.length}</b> learning categories</span><span>Markdown at the source</span></div></section><section class="library" aria-labelledby="library-heading"><div class="section-title"><div><div class="eyebrow">EXPLORE THE COLLECTION</div><h2 id="library-heading">Your knowledge library</h2></div><label class="search-label">Search notes<input id="search" type="search" placeholder="Find a concept, tag, or course…" aria-controls="notes"></label></div><div class="categories"><button class="category all active" data-category="all" aria-pressed="true"><span>All learning</span><small>Find connections across subjects</small><b>${published.length} notes</b></button>${categories}</div><div class="results-bar"><p id="result-count" aria-live="polite">${published.length} notes · All learning</p><button id="clear" hidden>Clear filters</button></div><div id="notes" class="notes-grid">${cards}</div><p id="empty" class="empty" hidden>No notes match yet. Try another search or add your next learning.</p></section><aside class="capture"><div><div class="eyebrow">KEEP THE LEARNING GOING</div><h2>Every input is a starting point.</h2><p>Slides, articles, keywords, and questions become sourced notes, practical applications, and connections.</p></div><a href="${base}notes/using-this-knowledge-base.html">How to add a learning <span>→</span></a></aside></main>`,`<script type="module" src="${base}app.js"></script>`));
  for (const n of published) {
    const related = n.related.map(id=>published.find(v=>v.id===id)).filter(Boolean);
    const sources = n.sources.map(s=>`<li>${s.url ? `<a href="${escape(s.url)}">${escape(s.title)}</a>` : escape(s.title)}${s.locator ? ` — ${escape(s.locator)}` : ''}</li>`).join('');
    fs.writeFileSync(path.join(web,'notes',`${n.id}.html`),shell(n.title,`<main id="main" class="reading"><a class="back" href="${base}">← Knowledge library</a><div class="eyebrow">${escape(config.categories.find(c=>c.id===n.category).name)} · ${escape(n.type)}</div><h1>${escape(n.title)}</h1><p class="lead">${escape(n.summary)}</p><p class="meta">Captured ${escape(n.date)} · Updated ${escape(n.updated)}${n.course ? ` · ${escape(n.course)}` : ''}</p><div class="tags">${n.tags.map(t=>`<span>#${escape(t)}</span>`).join('')}</div><article class="prose">${bodies.get(n.id)}</article>${sources ? `<section class="prose"><h2>Sources</h2><ul>${sources}</ul></section>` : ''}${related.length ? `<section class="prose"><h2>Connected ideas</h2><ul>${related.map(r=>`<li><a href="./${r.id}.html">${escape(r.title)}</a></li>`).join('')}</ul></section>` : ''}<a class="source-link" href="${escape(config.repository)}/blob/main/content/notes/${n.file}">Read the Markdown source ↗</a></main>`));
  }
  fs.writeFileSync(path.join(web,'search.json'),JSON.stringify(published.map(({body,...n})=>({...n,text:body}))));
  for (const file of ['style.css','app.js','search.mjs']) fs.copyFileSync(path.join(root,'site',file),path.join(web,file));
  // Local preview keeps the production subpath; deployment strips this wrapper.
  fs.writeFileSync(path.join(output,'.nojekyll'),'');
  fs.writeFileSync(path.join(web,'.nojekyll'),'');
  fs.writeFileSync(path.join(web,'404.html'),shell('Page not found',`<main id="main" class="reading"><h1>This note could not be found.</h1><p><a href="${base}">Return to the knowledge library</a></p></main>`));
  console.log(`Built ${published.length} published notes (${notes.length} total) → dist${base}`);
  return {notes,published,web};
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { build(); } catch (e) { console.error(`BUILD FAILED: ${e.message}`); process.exitCode=1; }
}
