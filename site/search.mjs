export function filterNotes(notes, query, category) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return notes.filter(n => (category === 'all' || n.category === category) && terms.every(term => [n.title,n.summary,n.course,n.text,...n.tags].join(' ').toLocaleLowerCase().includes(term)));
}
