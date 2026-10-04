import { learningText } from "./learning-i18n.mjs";
import {
  STORAGE_KEY,
  loadState,
  reviewQueue,
  scheduleReview,
  exportMarkdown,
} from "./review.mjs";
const locale = document.documentElement.dataset.locale || "en";
const l = learningText[locale];
const base = location.pathname.replace(/learn\.html$/, "");
const mode = document.querySelector("#review-mode"),
  note = document.querySelector("#review-note"),
  status = document.querySelector("#practice-status");
const keys = [
  "experience",
  "observation",
  "principle",
  "experiment",
  "outcome",
];
let state = { reviews: {}, journal: {} },
  storageReady = true,
  cards = [],
  queue = [],
  index = 0,
  session = 0,
  rated = false;
try {
  state = loadState(window.localStorage);
} catch {
  storageReady = false;
  status.textContent = l.error;
}
function save() {
  if (!storageReady) {
    status.textContent = l.error;
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    status.textContent = l.error;
    return false;
  }
}
function showReflection(id) {
  const card = cards.find((c) => c.noteId === id);
  document.querySelector("#application-panel").hidden = !card;
  if (!card) return;
  document.querySelector("#application-context").textContent = card.application;
  for (let i = 0; i < keys.length; i++)
    document.querySelector("#reflection-" + i).value =
      state.journal[id]?.[keys[i]] || "";
  document.querySelector("#reflection-form").dataset.note = id;
}
function render() {
  const c = queue[index];
  rated = false;
  document.querySelector("#review-card").hidden = !c;
  document.querySelector("#review-empty").hidden = !!c;
  if (storageReady)
    status.textContent = `${Math.max(0, queue.length - index)} ${l.count} · ${session} ${l.progress}`;
  if (!c) {
    showReflection(note.value === "all" ? null : note.value);
    return;
  }
  document.querySelector("#review-kind").textContent = l[c.kind];
  document.querySelector("#review-title").textContent = c.noteTitle;
  document.querySelector("#review-objective").textContent =
    l.objective + ": " + c.objective;
  document.querySelector("#review-prompt").textContent = c.prompt;
  document.querySelector("#review-answer").textContent = c.answer;
  const response = document.querySelector("#review-response");
  response.value = "";
  response.disabled = false;
  const reveal = document.querySelector("#reveal-feedback");
  reveal.hidden = false;
  reveal.disabled = false;
  document.querySelector("#review-feedback").hidden = true;
  document
    .querySelectorAll("[data-rating]")
    .forEach((b) => (b.disabled = false));
  document.querySelector("#review-source").href =
    base + "notes/" + c.noteId + ".html";
  showReflection(c.noteId);
}
function rebuild() {
  queue = reviewQueue(
    cards,
    state.reviews,
    new Date(),
    mode.value === "all",
  ).filter((c) => note.value === "all" || c.noteId === note.value);
  index = 0;
  render();
  const p = new URLSearchParams();
  if (note.value !== "all") p.set("note", note.value);
  if (mode.value === "all") p.set("mode", "all");
  history.replaceState(null, "", location.pathname + (p.size ? "?" + p : ""));
}
try {
  const response = await fetch("./practice.json");
  if (!response.ok) throw new Error("Practice data unavailable");
  cards = await response.json();
  const p = new URLSearchParams(location.search);
  if ([...note.options].some((o) => o.value === p.get("note")))
    note.value = p.get("note");
  if (p.get("mode") === "all") mode.value = "all";
  rebuild();
  for (const select of [mode, note]) select.addEventListener("change", rebuild);
  document.querySelector("#reveal-feedback").addEventListener("click", () => {
    document.querySelector("#review-feedback").hidden = false;
    document.querySelector("#reveal-feedback").hidden = true;
  });
  for (const button of document.querySelectorAll("[data-rating]"))
    button.addEventListener("click", () => {
      const c = queue[index];
      if (!c || rated) return;
      const previous =
        state.reviews[c.key]?.version === c.version
          ? state.reviews[c.key]
          : null;
      const record = {
        ...scheduleReview(previous, button.dataset.rating),
        version: c.version,
        prompt: c.prompt,
        noteTitle: c.noteTitle,
        locale,
        response: document.querySelector("#review-response").value,
      };
      state.reviews[c.key] = record;
      rated = true;
      session++;
      document
        .querySelectorAll("[data-rating]")
        .forEach((b) => (b.disabled = true));
      document.querySelector("#review-response").disabled = true;
      if (save()) status.textContent = l.reviewed + record.due;
    });
  document.querySelector("#next-question").addEventListener("click", () => {
    index++;
    render();
    if (queue[index]) {
      const heading = document.querySelector("#review-prompt");
      heading.tabIndex = -1;
      heading.focus();
    }
    document
      .querySelector("#practice-status")
      .scrollIntoView?.({ block: "nearest" });
  });
  document.querySelector("#reflection-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = e.currentTarget.dataset.note;
    if (!id) return;
    state.journal[id] = Object.fromEntries(
      keys.map((key, i) => [
        key,
        document.querySelector("#reflection-" + i).value,
      ]),
    );
    if (save()) status.textContent = l.saving;
  });
  document.querySelector("#export-learning").addEventListener("click", () => {
    const blob = new Blob([exportMarkdown(state, cards, locale)], {
        type: "text/markdown;charset=utf-8",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "emba-learning-journal.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector("#reset-learning").addEventListener("click", () => {
    if (!window.confirm(l.resetConfirm)) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      state = { reviews: {}, journal: {} };
      storageReady = true;
      session = 0;
      rebuild();
    } catch {
      status.textContent = l.error;
    }
  });
} catch (e) {
  status.textContent = l.loadError;
  document
    .querySelectorAll(".practice-layout button,.practice-layout select")
    .forEach((el) => (el.disabled = true));
  console.error(e);
}
