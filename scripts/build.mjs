import { extractPractice } from "./practice.mjs";
import { learningPage } from "./learning-view.mjs";
import crypto from "node:crypto";
import { ui } from "../site/i18n.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { marked } from "marked";
import sanitize from "sanitize-html";
import { home, notePage, shell, label } from "./views.mjs";
import { renderConceptMap } from "./diagram.mjs";

export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fail = (message) => {
  throw new Error(message);
};
export function loadNotes(root, config, locale = "en") {
  const directory = path.join(
    root,
    "content/notes",
    locale === "zh" ? "zh" : "",
  );
  const notes = fs
    .readdirSync(directory)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const text = fs.readFileSync(path.join(directory, file), "utf8");
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (!match) fail(`${file}: missing YAML frontmatter`);
      const data = parse(match[1]);
      if (!data || typeof data !== "object") fail(`${file}: invalid metadata`);
      for (const key of [
        "id",
        "title",
        "category",
        "summary",
        "type",
        "status",
        "date",
        "updated",
      ]) {
        if (typeof data[key] !== "string" || !data[key].trim())
          fail(`${file}: ${key} must be a nonempty string`);
      }
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.id) ||
        file !== `${data.id}.md`
      )
        fail(`${file}: filename must match a safe id`);
      if (!config.categories.some((c) => c.id === data.category))
        fail(`${file}: unknown category`);
      if (
        ![
          "concept",
          "lecture",
          "article",
          "case",
          "reflection",
          "guide",
        ].includes(data.type)
      )
        fail(`${file}: invalid type`);
      if (!["draft", "review", "published"].includes(data.status))
        fail(`${file}: invalid status`);
      for (const key of ["date", "updated"]) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(data[key]) ||
          Number.isNaN(Date.parse(data[key])) ||
          new Date(data[key]).toISOString().slice(0, 10) !== data[key]
        )
          fail(`${file}: invalid ${key}`);
      }
      if (data.updated < data.date) fail(`${file}: updated precedes date`);
      for (const key of ["tags", "related", "sources"])
        if (!Array.isArray(data[key])) fail(`${file}: ${key} must be an array`);
      for (const key of ["tags", "related"])
        if (data[key].some((v) => typeof v !== "string" || !v.trim()))
          fail(`${file}: invalid ${key}`);
      if (typeof data.course !== "string")
        fail(`${file}: course must be a string`);
      for (const s of data.sources) {
        if (
          !s ||
          typeof s.title !== "string" ||
          !s.title.trim() ||
          (!s.url && !s.locator)
        )
          fail(`${file}: source needs title and url or locator`);
        if (s.url && (typeof s.url !== "string" || !/^https?:\/\//.test(s.url)))
          fail(`${file}: source url must use http(s)`);
        if (s.locator && typeof s.locator !== "string")
          fail(`${file}: invalid source locator`);
      }
      if (!match[2].trim()) fail(`${file}: empty note`);
      return { ...data, body: match[2], file };
    });
  const ids = new Set();
  for (const n of notes) {
    if (ids.has(n.id)) fail(`Duplicate id: ${n.id}`);
    ids.add(n.id);
  }
  for (const n of notes)
    for (const id of n.related)
      if (!ids.has(id) || id === n.id)
        fail(`${n.file}: invalid related id ${id}`);
  return notes;
}
export function renderBody(note, notes) {
  extractPractice(note.body);
  const renderer = new marked.Renderer();
  const headingIds = new Map();
  const defaultCode = renderer.code.bind(renderer);
  renderer.code = (token) =>
    token.lang === "learning-practice"
      ? ""
      : token.lang === "concept-map"
        ? renderConceptMap(token.text)
        : defaultCode(token);
  renderer.link = ({ href, title, tokens }) => {
    let url = href;
    if (!/^(?:https?:|mailto:|#)/i.test(href)) {
      const [file, fragment] = href.split("#");
      const target = notes.find((n) => n.file === path.posix.normalize(file));
      if (!target || target.status !== "published")
        fail(`${note.file}: broken or unpublished Markdown link ${href}`);
      url = `./${target.id}.html${fragment ? `#${fragment}` : ""}`;
    }
    return `<a href="${escape(url)}"${title ? ` title="${escape(title)}"` : ""}>${marked.Parser.parseInline(tokens)}</a>`;
  };
  renderer.image = () =>
    fail(
      `${note.file}: use attributed text links for source images; image rendering is not configured`,
    );
  renderer.heading = ({ depth, text, tokens }) => {
    const base =
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || "section";
    const count = (headingIds.get(base) || 0) + 1;
    headingIds.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    return `<h${depth} id="${escape(id)}">${marked.Parser.parseInline(tokens)}</h${depth}>`;
  };
  return sanitize(marked.parse(note.body, { renderer }), {
    allowedTags: [...sanitize.defaults.allowedTags, "figure", "figcaption"],
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      "*": ["id", "class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}
export function build(root = process.cwd()) {
  const config = JSON.parse(
    fs.readFileSync(path.join(root, "site/config.json"), "utf8"),
  );
  config.stylesheetVersion = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "site/style.css"))).digest("hex").slice(0, 12);
  if (!/^\/[a-zA-Z0-9/_-]*\/$/.test(config.basePath)) fail("Invalid basePath");
  const notes = loadNotes(root, config);
  const published = notes
    .filter((n) => n.status === "published")
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
    );
  // Validate body links for every note, including drafts, before replacing output.
  const bodies = new Map(notes.map((n) => [n.id, renderBody(n, notes)]));
  const zhConfig = {
    ...config,
    locale: "zh",
    originalBasePath: config.basePath,
    basePath: config.basePath + "zh/",
    description: config.descriptionZh,
    categories: config.categories.map((c) => ({
      ...c,
      name: c.nameZh,
      description: c.descriptionZh,
    })),
  };
  const translated = loadNotes(root, zhConfig, "zh");
  for (const n of published) {
    const match = translated.find(
      (t) => t.id === n.id && t.status === "published",
    );
    if (!match) fail(`${n.id}: missing published Chinese translation`);
    for (const field of ["category", "type", "date", "updated"])
      if (n[field] !== match[field])
        fail(`${n.id}: translation ${field} must match English`);
    for (const field of ["tags", "related"])
      if (JSON.stringify(n[field]) !== JSON.stringify(match[field]))
        fail(`${n.id}: translation ${field} must match English`);
  }
  for (const n of translated.filter((n) => n.status === "published"))
    if (!published.some((en) => en.id === n.id))
      fail(`${n.id}: missing published English note`);
  const practiceVersions = new Map();
  for (const n of published) {
    const english = extractPractice(n.body),
      chinese = extractPractice(translated.find((t) => t.id === n.id).body);
    if (!!english !== !!chinese)
      fail(`${n.id}: practice must exist in both languages`);
    if (english) {
      if (
        JSON.stringify(english.questions.map((q) => [q.id, q.kind])) !==
        JSON.stringify(chinese.questions.map((q) => [q.id, q.kind]))
      )
        fail(`${n.id}: practice IDs/kinds must match across languages`);
      for (const q of english.questions)
        practiceVersions.set(
          n.id + ":" + q.id,
          crypto
            .createHash("sha256")
            .update(
              JSON.stringify([
                q.prompt,
                q.answer,
                chinese.questions.find((c) => c.id === q.id).prompt,
                chinese.questions.find((c) => c.id === q.id).answer,
              ]),
            )
            .digest("hex")
            .slice(0, 12),
        );
    }
  }
  const cardsFor = (list) =>
    list.flatMap((n) => {
      const p = extractPractice(n.body);
      return p
        ? p.questions.map((q) => ({
            ...q,
            key: n.id + ":" + q.id,
            version: practiceVersions.get(n.id + ":" + q.id),
            noteId: n.id,
            noteTitle: n.title,
            objective: p.objective,
            application: p.application,
          }))
        : [];
    });
  const output = path.join(root, "dist");
  fs.rmSync(output, { recursive: true, force: true });
  const base = config.basePath;
  const web = path.join(output, base.slice(1));
  fs.mkdirSync(path.join(web, "notes"), { recursive: true });
  fs.writeFileSync(path.join(web, "index.html"), home(config, published));
  for (const n of published)
    fs.writeFileSync(
      path.join(web, "notes", `${n.id}.html`),
      notePage(config, n, published, bodies.get(n.id)),
    );
  fs.writeFileSync(
    path.join(web, "search.json"),
    JSON.stringify(
      published.map(({ body, ...n }) => ({
        ...n,
        categoryLabel: config.categories.find((c) => c.id === n.category).name,
        text: body,
      })),
    ),
  );
  const zhNotes = translated.filter((n) => n.status === "published");
  const zhWeb = path.join(web, "zh");
  fs.mkdirSync(path.join(zhWeb, "notes"), { recursive: true });
  fs.writeFileSync(path.join(zhWeb, "index.html"), home(zhConfig, zhNotes));
  for (const n of zhNotes)
    fs.writeFileSync(
      path.join(zhWeb, "notes", `${n.id}.html`),
      notePage(zhConfig, n, zhNotes, renderBody(n, translated)),
    );
  fs.writeFileSync(
    path.join(zhWeb, "search.json"),
    JSON.stringify(
      zhNotes.map(({ body, ...n }) => ({
        ...n,
        categoryLabel: zhConfig.categories.find((c) => c.id === n.category)
          .name,
        text: body,
        tagLabels: n.tags.map((t) => ui("zh", label(t))),
      })),
    ),
  );
  for (const [directory, localeConfig, list] of [
    [web, config, published],
    [zhWeb, zhConfig, zhNotes],
  ]) {
    const cards = cardsFor(list);
    fs.writeFileSync(
      path.join(directory, "learn.html"),
      learningPage(localeConfig, cards),
    );
    fs.writeFileSync(
      path.join(directory, "practice.json"),
      JSON.stringify(cards),
    );
  }
  for (const directory of [web, zhWeb])
    for (const file of [
      "style.css",
      "app.js",
      "search.mjs",
      "i18n.mjs",
      "locale.js",
      "practice.js",
      "review.mjs",
      "learning-i18n.mjs",
    ])
      fs.copyFileSync(
        path.join(root, "site", file),
        path.join(directory, file),
      );
  fs.writeFileSync(
    path.join(zhWeb, "404.html"),
    shell(
      zhConfig,
      "Page not found",
      `<main id="main" class="reading"><h1>This note could not be found.</h1><p><a href="${zhConfig.basePath}">Return to the knowledge library</a></p></main>`,
      { alternatePath: "404.html" },
    ),
  );
  // Local preview keeps the production subpath; deployment strips this wrapper.
  fs.writeFileSync(path.join(output, ".nojekyll"), "");
  fs.writeFileSync(path.join(web, ".nojekyll"), "");
  fs.writeFileSync(
    path.join(web, "404.html"),
    shell(
      config,
      "Page not found",
      `<main id="main" class="reading"><h1>This note could not be found.</h1><p><a href="${base}">Return to the knowledge library</a></p></main>`,
    ),
  );
  console.log(
    `Built ${published.length} published notes (${notes.length} total) → dist${base}`,
  );
  return { notes, published, web };
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    build();
  } catch (e) {
    console.error(`BUILD FAILED: ${e.message}`);
    process.exitCode = 1;
  }
}
