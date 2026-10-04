import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { home, notePage } from "./views.mjs";
import { loadNotes, renderBody } from "./build.mjs";
const config = JSON.parse(fs.readFileSync("site/config.json", "utf8"));
const notes = loadNotes(process.cwd(), config).filter(
  (n) => n.status === "published",
);
async function withUI(fn, { query = "", mobile = false } = {}) {
  const dom = new JSDOM(home(config, notes), {
    url: "https://example.test/emba_journey/" + query,
  });
  const previous = {};
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    history: dom.window.history,
    fetch: async () => ({
      ok: true,
      json: async () => notes.map((n) => ({ ...n, text: n.body })),
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
