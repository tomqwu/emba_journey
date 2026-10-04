import {filterNotes} from './search.mjs';
const input = document.querySelector('#search');
const buttons = [...document.querySelectorAll('[data-category]')];
const cards = [...document.querySelectorAll('[data-note]')];
const clear = document.querySelector('#clear');
let category = 'all';
try {
  const response = await fetch('./search.json');
  if (!response.ok) throw new Error('Search index unavailable');
  const notes = await response.json();
  const params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  if (buttons.some(b=>b.dataset.category===params.get('category'))) category=params.get('category');
  function update() {
    const matches = new Set(filterNotes(notes,input.value,category).map(n=>n.id));
    cards.forEach(c=>c.hidden=!matches.has(c.dataset.note));
    buttons.forEach(b=>{const active=b.dataset.category===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    const label = buttons.find(b=>b.dataset.category===category).querySelector('span').textContent;
    document.querySelector('#result-count').textContent=`${matches.size} ${matches.size===1?'note':'notes'} · ${label}`;
    document.querySelector('#empty').hidden=matches.size!==0;
    clear.hidden=!input.value && category==='all';
    const p=new URLSearchParams();
    if(input.value) p.set('q',input.value);
    if(category!=='all') p.set('category',category);
    history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));
  }
  input.addEventListener('input',update);
  buttons.forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;update();}));
  clear.addEventListener('click',()=>{input.value='';category='all';update();input.focus();});
  update();
} catch(e) {
  document.querySelector('#result-count').textContent='Search could not load. Published notes are available below; reload to retry.';
  input.disabled=true; buttons.forEach(b=>b.disabled=true);
  console.error(e);
}
