import { localizeHTML } from "../site/i18n.mjs";
export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const label = (value) =>
  value
    .split("-")
    .map(
      (s) =>
        ({ ai: "AI", emba: "EMBA" })[s] ||
        s.charAt(0).toUpperCase() + s.slice(1),
    )
    .join(" ");
const icons = {
  strategy: "◎",
  leadership: "◌",
  finance: "↗",
  marketing: "◈",
  operations: "▤",
  innovation: "✦",
  economics: "⊕",
  "decision-making": "◇",
  reflection: "✎",
};
const types = {
  concept: "Concept",
  lecture: "Lecture",
  article: "Article",
  case: "Case study",
  reflection: "Reflection",
  guide: "Guide",
};
const readingMinutes = (text) =>
  Math.max(
    1,
    Math.ceil(
      (text.match(/\p{Script=Han}/gu) || []).length / 350 +
        text
          .replace(/\p{Script=Han}/gu, "")
          .split(/\s+/)
          .filter(Boolean).length /
          220,
    ),
  );
const heading = (text) => text.replace(/<[^>]*>/g, "");
export function shell(
  config,
  title,
  body,
  { script = "", active = "library", alternatePath = "" } = {},
) {
  const base = config.basePath;
  const locale = config.locale || "en",
    original = config.originalBasePath || base;
  const suffix = alternatePath;
  const switcher = `<div class="locale-switch" aria-label="${locale === "zh" ? "语言选择" : "Language selection"}"><a data-locale="en" lang="en" href="${original}${suffix}" ${locale === "en" ? 'aria-current="true"' : ""}>EN</a><a data-locale="zh" lang="zh-Hans" href="${original}zh/${suffix}" ${locale === "zh" ? 'aria-current="true"' : ""}>中文</a></div>`;
  return localizeHTML(
    `<!doctype html><html lang="${locale === "zh" ? "zh-Hans" : "en"}" data-locale="${locale}" data-base="${original}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(config.description)}"><meta name="theme-color" content="#233b35"><title>${escape(title)} · EMBA Journey</title><link rel="stylesheet" href="${base}style.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="${base}"><span class="brand-mark" aria-hidden="true">E<span>J</span></span><span>EMBA Journey<small>A personal learning library</small></span></a><nav aria-label="Main navigation"><a ${active === "library" ? 'aria-current="page"' : ""} href="${base}">Library</a><a ${active === "guide" ? 'aria-current="page"' : ""} href="${base}notes/using-this-knowledge-base.html">Capture guide</a><a class="repo-link" href="${escape(config.repository)}">GitHub <span aria-hidden="true">↗</span></a></nav>${switcher}</header>${body}<footer><span>EMBA Journey <span aria-hidden="true">·</span> Learn. Connect. Apply.</span><a href="${escape(config.repository)}/tree/main/content/notes">Browse the Markdown source ↗</a></footer>${script}<script type="module" src="${base}locale.js"></script></body></html>`,
    locale,
  );
}
export function home(config, notes) {
  const base = config.basePath;
  const tagCounts = new Map();
  for (const n of notes)
    for (const t of new Set(n.tags))
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  const tags = [...tagCounts].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const categoryButtons = config.categories
    .map(
      (c) =>
        `<button class="category" data-category="${escape(c.id)}" data-description="${escape(c.description)}" aria-pressed="false"><span class="category-icon" aria-hidden="true">${icons[c.id] || "◇"}</span><span>${escape(c.name)}</span><b>${notes.filter((n) => n.category === c.id).length}</b></button>`,
    )
    .join("");
  const cards = notes
    .map((n) => {
      const category = config.categories.find((c) => c.id === n.category);
      const minutes = readingMinutes(n.body);
      return `<article class="note-card" data-note="${n.id}"><div class="card-labels"><a class="category-label" href="${base}?category=${n.category}#library">${escape(category.name)}</a><span class="type-badge">${types[n.type]}</span></div><h3><a href="${base}notes/${n.id}.html">${escape(n.title)}</a></h3><p>${escape(n.summary)}</p><div class="card-tags">${n.tags
        .slice(0, 3)
        .map(
          (t) =>
            `<a data-tag="${escape(t)}" href="${base}?tag=${encodeURIComponent(t)}#library">${escape(label(t))}</a>`,
        )
        .join(
          "",
        )}${n.tags.length > 3 ? `<span aria-label="${n.tags.length - 3} more tags">+${n.tags.length - 3}</span>` : ""}</div><div class="card-bottom"><span>Updated ${escape(n.updated)}</span><span>${minutes} min read <span aria-hidden="true">↗</span></span></div></article>`;
    })
    .join("");
  const categoriesWithNotes = config.categories.filter((c) =>
    notes.some((n) => n.category === c.id),
  ).length;
  const diagram = `<svg class="learning-illustration" viewBox="0 0 380 245" role="img" aria-labelledby="learning-title learning-desc"><title id="learning-title">Connect source material to useful learning</title><desc id="learning-desc">Sources connect to ideas, which connect to practical applications.</desc><defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#c8d4c7"/></pattern></defs><rect width="380" height="245" fill="url(#dots)"/><path d="M105 78 C170 78 150 122 195 122 M105 175 C150 175 150 122 195 122 M195 122 C250 122 230 70 296 70 M195 122 C250 122 250 176 296 176" fill="none" stroke="#7a9883" stroke-width="2"/><g fill="#f8faf5" stroke="#c5d0c1"><rect x="18" y="49" width="103" height="58" rx="10"/><rect x="18" y="146" width="103" height="58" rx="10"/><rect x="262" y="41" width="103" height="58" rx="10"/><rect x="262" y="147" width="103" height="58" rx="10"/></g><circle cx="192" cy="122" r="43" fill="#233b35"/><g text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#233b35"><text x="69" y="76">Sources</text><text x="69" y="173">Questions</text><text x="314" y="67">Connections</text><text x="314" y="173">Applications</text><text x="192" y="128" fill="#edf2d5">Ideas</text></g><g text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#6c7f71"><text x="69" y="93">Read &amp; capture</text><text x="69" y="190">Stay curious</text><text x="314" y="84">Link concepts</text><text x="314" y="190">Put into practice</text></g></svg>`;
  return shell(
    config,
    "Knowledge library",
    `<main id="main"><section class="hero"><div><div class="eyebrow">THE EXECUTIVE LEARNING NOTEBOOK</div><h1>Learn deeply.<br><em>Connect the ideas.</em></h1><p>${escape(config.description)}</p><div class="stats"><span><b>${notes.length}</b> published notes</span><span><b>${categoriesWithNotes}</b> subjects explored</span><span><b>${tags.length}</b> topic tags</span></div><a class="hero-link" href="#library">Explore the library <span aria-hidden="true">↓</span></a></div>${diagram}</section><div id="library" class="library-layout"><aside class="library-sidebar" aria-label="Browse the library"><details class="browse-panel" open><summary>Browse subjects <span aria-hidden="true">⌄</span></summary><div class="category-list"><button class="category active" data-category="all" aria-pressed="true"><span class="category-icon" aria-hidden="true">▦</span><span>All subjects</span><b>${notes.length}</b></button>${categoryButtons}</div></details><details class="topic-panel" open><summary>Explore topics <span aria-hidden="true">⌄</span></summary><div class="topic-list">${tags.map(([tag, count]) => `<button class="tag-filter" data-tag="${escape(tag)}" aria-pressed="false">${escape(label(tag))}<span>${count}</span></button>`).join("")}</div></details><div class="sidebar-tip"><span aria-hidden="true">✦</span><p>A slide, a link, a question.<br>Start with what you have.</p><a href="${base}notes/using-this-knowledge-base.html">How to capture learning →</a></div></aside><section class="library" aria-labelledby="library-heading"><div class="section-title"><div><div class="eyebrow">YOUR GROWING COLLECTION</div><h2 id="library-heading">All learning</h2><p id="category-description">Browse ideas across subjects. Follow a tag to find connections.</p></div></div><form class="search-form" role="search"><label for="search">Search the library</label><div class="search-field"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Search concepts, keywords, or courses…" aria-controls="notes"><kbd aria-hidden="true">/</kbd></div></form><div class="filter-row"><label>Note type<select id="type"><option value="all">All types</option>${Object.entries(
      types,
    )
      .filter(([id]) => notes.some((n) => n.type === id))
      .map(([id, name]) => `<option value="${id}">${name}</option>`)
      .join(
        "",
      )}</select></label><label>Sort by<select id="sort"><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="relevance">Search relevance</option></select></label></div><div class="results-bar"><p id="result-count" role="status" aria-live="polite">${notes.length} notes</p><button id="clear" hidden>Reset filters</button></div><div id="active-filters" class="active-filters" aria-label="Selected filters"></div><div id="notes" class="notes-grid">${cards}</div><div id="empty" class="empty" hidden><span aria-hidden="true">◇</span><h3>No notes found here yet</h3><p>Try a broader search, reset the filters, or capture your next learning.</p><button id="empty-reset">Show all notes</button></div><noscript><p>Search and filters need JavaScript. All published notes are listed above.</p></noscript></section></div><section class="capture"><div><div class="eyebrow">FROM INPUT TO INSIGHT</div><h2>Every learning starts somewhere.</h2><p>Bring your slides, articles, and questions. Build a record you can return to.</p></div><a href="${base}notes/using-this-knowledge-base.html">Open the capture guide →</a></section></main>`,
    { script: `<script type="module" src="${base}app.js"></script>` },
  );
}
export function notePage(config, n, notes, body) {
  const base = config.basePath,
    category = config.categories.find((c) => c.id === n.category);
  const headings = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const related = n.related
    .map((id) => notes.find((v) => v.id === id))
    .filter(Boolean);
  const minutes = readingMinutes(n.body);
  const contents = headings
    .map(([_, id, text]) => `<a href="#${escape(id)}">${heading(text)}</a>`)
    .join("");
  const sources = n.sources
    .map(
      (s) =>
        `<li>${s.url ? `<a href="${escape(s.url)}">${escape(s.title)} ↗</a>` : escape(s.title)}${s.locator ? `<p>${escape(s.locator)}</p>` : ""}</li>`,
    )
    .join("");
  return shell(
    config,
    n.title,
    `<main id="main" class="note-layout"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}#library">Library</a><span aria-hidden="true">/</span><a href="${base}?category=${n.category}#library">${escape(category.name)}</a><span aria-hidden="true">/</span><span>${types[n.type]}</span></nav><div class="reading-grid"><div class="reading"><div class="note-heading"><div class="eyebrow">${escape(category.name)} <span class="type-badge">${types[n.type]}</span></div><h1>${escape(n.title)}</h1><p class="lead">${escape(n.summary)}</p><p class="meta">Updated ${escape(n.updated)} <span aria-hidden="true">·</span> ${minutes} min read${n.course ? ` <span aria-hidden="true">·</span> ${escape(n.course)}` : ""}</p><div class="tags">${n.tags.map((t) => `<a href="${base}?tag=${encodeURIComponent(t)}#library">${escape(label(t))}</a>`).join("")}</div></div><details class="mobile-toc"><summary>On this page</summary><nav aria-label="Mobile table of contents">${contents}</nav></details><article class="prose">${body}</article>${sources ? `<section id="page-sources" class="source-panel"><div class="eyebrow">TRACE THE IDEAS</div><h2>Sources & further reading</h2><ol>${sources}</ol></section>` : ""}${related.length ? `<section id="page-related" class="related-panel"><div class="eyebrow">KEEP EXPLORING</div><h2>Connected ideas</h2>${related.map((r) => `<a class="related-card" href="./${r.id}.html"><span><strong>${escape(r.title)}</strong><small>${escape(r.summary)}</small></span><span aria-hidden="true">→</span></a>`).join("")}</section>` : ""}<div class="note-footer"><span>Captured ${escape(n.date)}</span><a href="${escape(config.repository)}/blob/main/content/notes/${n.file}">View Markdown ↗</a></div></div><aside class="reading-sidebar"><div class="toc"><div class="eyebrow">ON THIS PAGE</div><nav aria-label="Table of contents">${contents}${sources ? '<a href="#page-sources">Sources & further reading</a>' : ""}${related.length ? '<a href="#page-related">Connected ideas</a>' : ""}</nav><a class="back-library" href="${base}?category=${n.category}#library">← Back to ${escape(category.name)}</a></div></aside></div></main>`,
    {
      active: n.type === "guide" ? "guide" : "note",
      alternatePath: `notes/${n.id}.html`,
    },
  );
}
