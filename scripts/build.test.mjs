import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build, loadNotes, renderBody } from "./build.mjs";
import { filterNotes } from "../site/search.mjs";
const root = process.cwd();
const config = JSON.parse(fs.readFileSync("site/config.json", "utf8"));
function fixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emba-test-"));
  for (const item of ["site", "content"])
    fs.cpSync(path.join(root, item), path.join(dir, item), { recursive: true });
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const draft = `---\nid: draft-note\ntitle: Draft\ncategory: strategy\ntags: [中文]\ntype: concept\nstatus: draft\ndate: 2026-10-04\nupdated: 2026-10-04\nsummary: Not ready\ncourse: Strategy\nsources: []\nrelated: []\n---\nPrivate to site, public if committed.\n`;
test("build excludes drafts from pages/search and retains production subpath", () =>
  fixture((dir) => {
    fs.writeFileSync(path.join(dir, "content/notes/draft-note.md"), draft);
    const result = build(dir);
    const expectedIds = loadNotes(root, config)
      .filter((n) => n.status === "published")
      .map((n) => n.id)
      .sort();
    assert.deepEqual(result.published.map((n) => n.id).sort(), expectedIds);
    assert.ok(!fs.existsSync(path.join(result.web, "notes/draft-note.html")));
    assert.ok(
      !fs
        .readFileSync(path.join(result.web, "search.json"), "utf8")
        .includes("draft-note"),
    );
    assert.ok(
      fs
        .readFileSync(path.join(result.web, "index.html"), "utf8")
        .includes("/emba_journey/style.css"),
    );
    assert.ok(fs.existsSync(path.join(result.web, ".nojekyll")));
  }));
test("invalid categories, calendar dates, source URLs, and related IDs block publication", () => {
  for (const [old, value] of [
    ["category: strategy", "category: unknown"],
    ["date: 2026-10-04", "date: 2026-02-30"],
    ["sources: []", 'sources: [{title: Bad, url: "javascript:alert(1)"}]'],
    ["related: []", "related: [missing]"],
  ])
    fixture((dir) => {
      fs.writeFileSync(
        path.join(dir, "content/notes/draft-note.md"),
        draft.replace(old, value),
      );
      assert.throws(() => loadNotes(dir, config));
    });
});
test("Markdown links resolve to published notes and broken links fail", () => {
  const notes = loadNotes(root, config);
  const n = { ...notes[0], body: "[Guide](using-this-knowledge-base.md)" };
  assert.match(renderBody(n, notes), /\.\/using-this-knowledge-base.html/);
  assert.throws(() =>
    renderBody({ ...n, body: "[Missing](missing.md)" }, notes),
  );
});
test("untrusted Markdown cannot inject executable HTML", () => {
  const notes = loadNotes(root, config);
  const body = renderBody(
    {
      ...notes[0],
      body: '<script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">bad</a>',
    },
    notes,
  );
  assert.ok(!body.includes("<script"));
  assert.ok(!body.includes("onerror"));
  assert.ok(!body.includes("javascript:"));
});
test("search combines category with all terms, Unicode, tags, and course", () => {
  const notes = [
    {
      id: "a",
      category: "strategy",
      title: "Business Model",
      summary: "Value",
      text: "竞争",
      course: "EMBA",
      tags: ["growth"],
    },
    {
      id: "b",
      category: "finance",
      title: "Value",
      summary: "Business",
      text: "",
      course: "",
      tags: [],
    },
  ];
  assert.deepEqual(
    filterNotes(notes, "BUSINESS growth", "all").map((n) => n.id),
    ["a"],
  );
  assert.deepEqual(
    filterNotes(notes, "竞争 EMBA", "strategy").map((n) => n.id),
    ["a"],
  );
  assert.equal(filterNotes(notes, "business", "finance").length, 1);
  assert.equal(filterNotes(notes, "missing", "all").length, 0);
});
test("tag and type filters intersect with category and normalize search text", () => {
  const notes = [
    {
      id: "a",
      category: "leadership",
      categoryLabel: "Leadership & People",
      title: "Café Teams",
      summary: "",
      text: "",
      course: "",
      type: "concept",
      tags: ["cross-cultural-management"],
    },
    {
      id: "b",
      category: "economics",
      title: "Teams",
      summary: "",
      text: "",
      course: "",
      type: "article",
      tags: ["culture"],
    },
  ];
  assert.deepEqual(
    filterNotes(
      notes,
      "cafe cross cultural",
      "leadership",
      "cross-cultural-management",
      "concept",
    ).map((n) => n.id),
    ["a"],
  );
  assert.equal(filterNotes(notes, "", "leadership", "culture").length, 0);
  assert.equal(filterNotes(notes, "", "all", "", "article")[0].id, "b");
  assert.equal(filterNotes(notes, "people", "all")[0].id, "a");
});
test("ranking promotes title matches and sorts by update date without mutating input", async () => {
  const { sortNotes } = await import("../site/search.mjs");
  const notes = [
    {
      id: "a",
      title: "Another note",
      summary: "culture",
      tags: [],
      updated: "2026-10-04",
    },
    {
      id: "b",
      title: "Culture framework",
      summary: "",
      tags: [],
      updated: "2026-10-01",
    },
  ];
  assert.equal(sortNotes(notes, "relevance", "culture")[0].id, "b");
  assert.equal(sortNotes(notes, "recent")[0].id, "a");
  assert.equal(sortNotes(notes, "title")[0].id, "a");
  assert.equal(notes[0].id, "a");
});
test("concept maps render accessible steps, escape input, and reject malformed diagrams", () => {
  const notes = loadNotes(root, config);
  const body =
    '```concept-map\ntitle: "<script>unsafe</script>"\nsteps:\n  - label: First\n    detail: Read the source\n  - label: Second\n    detail: Ask a question\n```';
  const html = renderBody({ ...notes[0], body }, notes);
  assert.match(html, /<figure class="concept-map">/);
  assert.match(html, /<ol>/);
  assert.ok(!html.includes("<script>"));
  assert.throws(() =>
    renderBody(
      { ...notes[0], body: "```concept-map\ntitle: Invalid\nsteps: []\n```" },
      notes,
    ),
  );
});
test("repeated headings receive unique anchor IDs", () => {
  const notes = loadNotes(root, config);
  const html = renderBody(
    { ...notes[0], body: "## Repeat\n\nOne\n\n## Repeat\n\nTwo" },
    notes,
  );
  assert.match(html, /id="repeat"/);
  assert.match(html, /id="repeat-2"/);
});
