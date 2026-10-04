import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { home, notePage } from "./views.mjs";
import { ui } from "../site/i18n.mjs";
import { label } from "./views.mjs";
import { loadNotes, renderBody } from "./build.mjs";
const config = JSON.parse(fs.readFileSync("site/config.json", "utf8"));
const notes = loadNotes(process.cwd(), config).filter(
  (n) => n.status === "published",
);
async function withUI(fn, { query = "", mobile = false, locale = "en" } = {}) {
  const localizedConfig =
    locale === "zh"
      ? {
          ...config,
          locale,
          originalBasePath: config.basePath,
          basePath: config.basePath + "zh/",
          description: config.descriptionZh,
          categories: config.categories.map((c) => ({
            ...c,
            name: c.nameZh,
            description: c.descriptionZh,
          })),
        }
      : config;
  const localizedNotes =
    locale === "zh" ? loadNotes(process.cwd(), localizedConfig, "zh") : notes;
  const dom = new JSDOM(home(localizedConfig, localizedNotes), {
    url: "https://example.test" + localizedConfig.basePath + query,
  });
  const previous = {};
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    history: dom.window.history,

    fetch: async () => ({
      ok: true,
      json: async () =>
        localizedNotes.map((n) => ({
          ...n,
          text: n.body,
          tagLabels: n.tags.map((t) => ui(locale, label(t))),
        })),
    }),
  })) {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  }
  dom.window.matchMedia = () => ({ matches: mobile });
  try {
    await import("../site/app.js?test=" + Math.random());
    await fn(dom.window, dom.window.document);
  } finally {
    for (const key of Object.keys(previous)) globalThis[key] = previous[key];
    dom.window.close();
  }
}
const click = (document, selector) => document.querySelector(selector).click();
const visible = (document) =>
  [...document.querySelectorAll("[data-note]")]
    .filter((n) => !n.hidden)
    .map((n) => n.dataset.note);
test("combined filters, chip removal, reset, and empty state operate on real page markup", () =>
  withUI((window, doc) => {
    click(doc, 'button[data-category="economics"]');
    assert.deepEqual(visible(doc), ["hofstede-cultural-dimensions"]);
    click(doc, 'button[data-tag="organizational-culture"]');
    assert.equal(visible(doc).length, 0);
    assert.equal(doc.querySelector("#empty").hidden, false);
    assert.match(window.location.search, /category=economics/);
    assert.match(window.location.search, /tag=organizational-culture/);
    click(doc, 'button[aria-label="Remove filter: Organizational Culture"]');
    assert.equal(visible(doc).length, 1);
    click(doc, "#clear");
    assert.equal(visible(doc).length, notes.length);
    assert.equal(window.location.search, "");
    const input = doc.querySelector("#search");
    input.value = "hofstede";
    input.dispatchEvent(new window.Event("input"));
    assert.equal(visible(doc).length, 2);
    doc.querySelector("#type").value = "guide";
    doc.querySelector("#type").dispatchEvent(new window.Event("change"));
    assert.equal(visible(doc).length, 0);
    click(doc, "#empty-reset");
    assert.equal(visible(doc).length, notes.length);
  }));
test("URL restoration, mobile disclosure defaults, and keyboard shortcut work", () =>
  withUI(
    (window, doc) => {
      assert.deepEqual(visible(doc), ["hofstede-cultural-dimensions"]);
      assert.equal(doc.querySelector(".browse-panel").open, false);
      assert.equal(doc.querySelector(".topic-panel").open, false);
      doc.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "/",
          bubbles: true,
          cancelable: true,
        }),
      );
      assert.equal(doc.activeElement, doc.querySelector("#search"));
      doc.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      assert.equal(doc.querySelector("#search").value, "");
    },
    {
      query:
        "?q=hofstede&category=economics&tag=culture&type=concept&sort=title",
      mobile: true,
    },
  ));
test("browser back restores filter state", () =>
  withUI(async (window, doc) => {
    click(doc, 'button[data-category="economics"]');
    click(doc, 'button[data-tag="culture"]');
    const back = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("No popstate event")),
        1000,
      );
      window.addEventListener(
        "popstate",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
    window.history.back();
    await back;
    assert.equal(window.location.search, "?category=economics");
    assert.equal(
      doc
        .querySelector('button[data-tag="culture"]')
        .getAttribute("aria-pressed"),
      "false",
    );
    assert.deepEqual(visible(doc), ["hofstede-cultural-dimensions"]);
  }));
test("note contents links have matching unique targets and topic links lead back to the library", () => {
  for (const n of notes) {
    const dom = new JSDOM(notePage(config, n, notes, renderBody(n, notes)));
    const doc = dom.window.document;
    const ids = [...doc.querySelectorAll("[id]")].map((el) => el.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const a of doc.querySelectorAll('a[href^="#"]'))
      assert.ok(doc.getElementById(a.getAttribute("href").slice(1)));
    for (const a of doc.querySelectorAll(".tags a"))
      assert.match(a.getAttribute("href"), /^\/emba_journey\/\?tag=/);
    if (n.id === "hofstede-cultural-dimensions")
      assert.equal(doc.querySelectorAll(".concept-map li").length, 3);
    dom.window.close();
  }
});

test("Chinese search, tags, categories and dynamic messages are localized", () =>
  withUI(
    (window, doc) => {
      assert.equal(doc.documentElement.lang, "zh-Hans");
      assert.equal(
        doc.querySelector("#library-heading").textContent,
        "全部笔记",
      );
      const input = doc.querySelector("#search");
      input.value = "组织文化";
      input.dispatchEvent(new window.Event("input"));
      assert.ok(visible(doc).includes("hofstede-organizational-culture"));
      assert.match(
        doc.querySelector("#result-count").textContent,
        /篇笔记符合搜索条件/,
      );
      click(doc, "#clear");
      click(doc, 'button[data-category="economics"]');
      assert.equal(
        doc.querySelector("#library-heading").textContent,
        "经济与全球商业",
      );
      click(doc, 'button[data-tag="organizational-culture"]');
      assert.equal(visible(doc).length, 0);
      assert.ok(doc.querySelector('button[aria-label="移除筛选：组织文化"]'));
      assert.equal(
        doc.querySelector("#empty h3").textContent,
        "暂未找到匹配的笔记",
      );
    },
    { locale: "zh" },
  ));

test("language switch retains current filters and stores explicit choice", () =>
  withUI(async (window, doc) => {
    for (const a of doc.querySelectorAll("a[data-locale]"))
      a.addEventListener("click", (e) => e.preventDefault());
    await import("../site/locale.js?test=" + Math.random());
    click(doc, 'button[data-category="economics"]');
    const chinese = doc.querySelector('[data-locale="zh"]');
    chinese.click();
    assert.equal(new URL(chinese.href).pathname, "/emba_journey/zh/");
    assert.equal(new URL(chinese.href).search, "?category=economics");
    assert.equal(window.localStorage.getItem("emba-locale"), "zh");
  }));

test("Chinese note navigation, diagrams and source labels stay localized with English counterparts", () => {
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
  const zhNotes = loadNotes(process.cwd(), zhConfig, "zh");
  for (const n of zhNotes) {
    const doc = new JSDOM(
      notePage(zhConfig, n, zhNotes, renderBody(n, zhNotes)),
    ).window.document;
    assert.equal(doc.documentElement.lang, "zh-Hans");
    assert.equal(
      doc.querySelector('a[data-locale="en"]').getAttribute("href"),
      "/emba_journey/notes/" + n.id + ".html",
    );
    assert.equal(
      doc.querySelector('a[data-locale="zh"]').getAttribute("aria-current"),
      "true",
    );
    assert.equal(doc.querySelector(".breadcrumbs a").textContent, "知识库");
    assert.equal(
      doc.querySelector(".mobile-toc summary").textContent,
      "本页目录",
    );
    for (const a of doc.querySelectorAll('a[href^="#"]'))
      assert.ok(doc.getElementById(a.getAttribute("href").slice(1)));
    for (const a of doc.querySelectorAll('.related-card,.prose a[href^="./"]'))
      assert.ok(
        zhNotes.some(
          (note) => "./" + note.id + ".html" === a.getAttribute("href"),
        ),
      );
    if (n.id === "hofstede-cultural-dimensions")
      assert.match(
        doc.querySelector(".concept-map figcaption").textContent,
        /文化框架/,
      );
  }
});
