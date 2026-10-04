import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { learningPage } from "./learning-view.mjs";
import { STORAGE_KEY } from "../site/review.mjs";
const config = JSON.parse(fs.readFileSync("site/config.json", "utf8"));
const cards = [
  {
    id: "q",
    key: "hofstede:q",
    version: "v1",
    noteId: "hofstede",
    noteTitle: "Culture",
    prompt: "Why consider context?",
    answer: "Individual and organizational contexts vary.",
    kind: "explain",
    objective: "Avoid stereotypes",
    application: "Reflect on an actual meeting.",
  },
];
async function withPractice(
  fn,
  { locale = "en", saved, blocked = false } = {},
) {
  const c =
    locale === "zh"
      ? {
          ...config,
          locale,
          originalBasePath: config.basePath,
          basePath: config.basePath + "zh/",
        }
      : config;
  const dom = new JSDOM(learningPage(c, cards), {
    url: "https://example.test" + c.basePath + "learn.html",
  });
  if (saved)
    dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  if (blocked)
    Object.defineProperty(dom.window, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
  const previous = {};
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    history: dom.window.history,
    fetch: async () => ({ ok: true, json: async () => cards }),
  })) {
    previous[key] = globalThis[key];
    globalThis[key] = value;
  }
  try {
    await import("../site/practice.js?test=" + Math.random());
    await fn(dom.window, dom.window.document);
  } finally {
    for (const key in previous) globalThis[key] = previous[key];
    dom.window.close();
  }
}
test("feedback is hidden initially; rating and reflection persist without claiming automatic mastery", () =>
  withPractice((w, d) => {
    assert.equal(d.querySelector("#review-feedback").hidden, true);
    assert.equal(d.querySelector("#review-card").hidden, false);
    d.querySelector("#review-response").value = "My explanation";
    d.querySelector("#reveal-feedback").click();
    assert.equal(d.querySelector("#review-feedback").hidden, false);
    d.querySelector('[data-rating="partial"]').click();
    const saved = JSON.parse(w.localStorage.getItem(STORAGE_KEY));
    assert.equal(saved.reviews["hofstede:q"].response, "My explanation");
    assert.equal(saved.reviews["hofstede:q"].rating, "partial");
    assert.equal(d.querySelector('[data-rating="confident"]').disabled, true);
    d.querySelector("#reflection-0").value = "A team meeting";
    d.querySelector("#reflection-3").value = "Try anonymous input";
    d.querySelector("#reflection-form").dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    assert.equal(
      JSON.parse(w.localStorage.getItem(STORAGE_KEY)).journal.hofstede
        .experiment,
      "Try anonymous input",
    );
    d.querySelector("#next-question").click();
    assert.equal(d.querySelector("#review-empty").hidden, false);
  }));
test("English and Chinese share scheduled progress and extra practice can reopen future cards", () =>
  withPractice(
    (w, d) => {
      assert.equal(d.documentElement.lang, "zh-Hans");
      assert.equal(d.querySelector("#review-empty").hidden, false);
      d.querySelector("#review-mode").value = "all";
      d.querySelector("#review-mode").dispatchEvent(new w.Event("change"));
      assert.equal(d.querySelector("#review-card").hidden, false);
      assert.equal(
        d.querySelector("#reveal-feedback").textContent,
        "查看参考答案并比较",
      );
    },
    {
      locale: "zh",
      saved: {
        reviews: {
          "hofstede:q": { version: "v1", stage: 2, due: "2099-10-11" },
        },
        journal: {},
      },
    },
  ));
test("unavailable browser storage reports failure while allowing in-memory practice", () =>
  withPractice(
    (w, d) => {
      assert.match(
        d.querySelector("#practice-status").textContent,
        /Could not save/,
      );
      d.querySelector("#reveal-feedback").click();
      d.querySelector('[data-rating="again"]').click();
      assert.match(
        d.querySelector("#practice-status").textContent,
        /Could not save/,
      );
      assert.equal(d.querySelector("#export-learning").disabled, false);
    },
    { blocked: true },
  ));
