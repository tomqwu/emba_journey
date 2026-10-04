import test from "node:test";
import assert from "node:assert/strict";
import {
  dayKey,
  scheduleReview,
  reviewQueue,
  loadState,
  exportMarkdown,
  STORAGE_KEY,
} from "../site/review.mjs";
import { extractPractice } from "./practice.mjs";
const now = new Date("2026-10-04T15:00:00Z");
test("review dates follow self-ratings, cap growth, reset after a lapse and use Toronto calendar days", () => {
  assert.equal(dayKey(new Date("2026-10-05T01:00:00Z")), "2026-10-04");
  const again = scheduleReview(null, "again", now),
    partial = scheduleReview(null, "partial", now),
    confident = scheduleReview(null, "confident", now);
  assert.equal(again.due, "2026-10-05");
  assert.equal(partial.due, "2026-10-07");
  assert.equal(confident.due, "2026-10-11");
  assert.equal(scheduleReview(confident, "confident", now).due, "2026-10-18");
  assert.equal(
    scheduleReview({ stage: 5, reviews: 3 }, "confident", now).stage,
    5,
  );
  assert.equal(scheduleReview({ stage: 5 }, "again", now).stage, 0);
  assert.throws(() => scheduleReview(null, "mastered", now));
  assert.equal(
    scheduleReview(null, "again", new Date("2026-11-01T17:00:00Z")).due,
    "2026-11-02",
  );
});
test("due queue includes new and revised cards, excludes future reviews and allows deliberate extra practice", () => {
  const cards = [
    { key: "a:one", id: "one", noteId: "a", version: "new" },
    { key: "b:two", id: "two", noteId: "b", version: "same" },
    { key: "c:three", id: "three", noteId: "c", version: "same" },
  ];
  const state = {
    "a:one": { version: "old", due: "2026-11-01" },
    "b:two": { version: "same", due: "2026-10-05" },
  };
  assert.deepEqual(
    reviewQueue(cards, state, now).map((c) => c.key),
    ["a:one", "c:three"],
  );
  assert.equal(reviewQueue(cards, state, now, true).length, 3);
});
test("storage validation reports corruption and Markdown export contains responses and experiments", () => {
  assert.deepEqual(loadState({ getItem: () => null }), {
    reviews: {},
    journal: {},
  });
  assert.throws(() => loadState({ getItem: () => "{broken" }));
  const state = {
    reviews: {
      "a:q": {
        version: "v1",
        stage: 2,
        due: "2026-10-11",
        reviewed: "2026-10-04",
        rating: "confident",
        response: "My answer",
      },
    },
    journal: {
      a: {
        experience: "A real meeting",
        experiment: "Collect concerns before the next meeting",
      },
    },
  };
  assert.deepEqual(
    loadState({
      getItem: (key) => (key === STORAGE_KEY ? JSON.stringify(state) : null),
    }),
    state,
  );
  const md = exportMarkdown(state, [
    { key: "a:q", noteId: "a", noteTitle: "Culture", prompt: "Why?" },
  ]);
  assert.match(md, /My answer/);
  assert.match(md, /A real meeting/);
  assert.match(md, /2026-10-11/);
});
test("practice schema rejects duplicate IDs, missing feedback and multiple blocks", () => {
  const body =
    "```learning-practice\nobjective: Recall\napplication: Try it\nquestions:\n  - id: one\n    kind: recall\n    prompt: What?\n    answer: This.\n```";
  assert.equal(extractPractice(body).questions.length, 1);
  assert.throws(() => extractPractice(body + "\n" + body));
  assert.throws(() =>
    extractPractice(body.replace("answer: This.", 'answer: ""')),
  );
  assert.throws(() =>
    extractPractice(body.replace("id: one", "id: unsafe/path")),
  );
});

test("exports retain original prompts after source revision or removal and localize Chinese labels", () => {
  const state = {
    reviews: {
      "gone:q": {
        version: "old",
        prompt: "Original question",
        noteTitle: "Original note",
        rating: "partial",
        response: "原回答",
        reviewed: "2026-10-04",
        due: "2026-10-07",
      },
    },
    journal: { gone: { experiment: "小实验" } },
  };
  const md = exportMarkdown(state, [], "zh");
  assert.match(md, /Original question/);
  assert.match(md, /原回答/);
  assert.match(md, /自评分: 部分回忆起来/);
  assert.match(md, /实验与预期/);
});
