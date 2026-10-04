import { ui, resultText } from "./i18n.mjs";
const locale = document.documentElement.dataset.locale || "en";
import { filterNotes, sortNotes } from "./search.mjs";
const input = document.querySelector("#search");
const categories = [...document.querySelectorAll("button[data-category]")];
const tags = [...document.querySelectorAll("button[data-tag]")];
const cards = new Map(
  [...document.querySelectorAll("[data-note]")].map((c) => [c.dataset.note, c]),
);
const type = document.querySelector("#type"),
  sort = document.querySelector("#sort");
let category = "all",
  tag = "";
const tagLabel = (t) =>
  tags.find((b) => b.dataset.tag === t)?.childNodes[0]?.textContent ||
  t.replaceAll("-", " ");
if (window.matchMedia("(max-width:800px)").matches)
  document
    .querySelectorAll(".library-sidebar details")
    .forEach((panel) => (panel.open = false));
try {
  const response = await fetch("./search.json");
  if (!response.ok) throw new Error("Search index unavailable");
  const notes = await response.json();
  function readURL() {
    const p = new URLSearchParams(location.search);
    input.value = p.get("q") || "";
    category = categories.some((b) => b.dataset.category === p.get("category"))
      ? p.get("category")
      : "all";
    tag = notes.some((n) => n.tags.includes(p.get("tag"))) ? p.get("tag") : "";
    type.value = [...type.options].some((o) => o.value === p.get("type"))
      ? p.get("type")
      : "all";
    sort.value = ["recent", "title", "relevance"].includes(p.get("sort"))
      ? p.get("sort")
      : "recent";
  }
  function update(historyMode = "replace") {
    const result = sortNotes(
      filterNotes(notes, input.value, category, tag, type.value),
      sort.value,
      input.value,
    );
    const ids = new Set(result.map((n) => n.id));
    cards.forEach((c, id) => (c.hidden = !ids.has(id)));
    for (const note of result)
      document.querySelector("#notes").append(cards.get(note.id));
    categories.forEach((b) => {
      const active = b.dataset.category === category;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active);
    });
    tags.forEach((b) => {
      const active = b.dataset.tag === tag;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active);
    });
    const current = categories.find((b) => b.dataset.category === category);
    document.querySelector("#library-heading").textContent =
      category === "all"
        ? ui(locale, "All learning")
        : current.querySelector("span:nth-child(2)").textContent;
    document.querySelector("#category-description").textContent =
      current.dataset.description ||
      ui(
        locale,
        "Browse ideas across subjects. Follow a tag to find connections.",
      );
    document.querySelector("#result-count").textContent = resultText(
      locale,
      result.length,
      input.value,
    );
    document.querySelector("#empty").hidden = result.length > 0;
    document.querySelector("#clear").hidden =
      !input.value &&
      category === "all" &&
      !tag &&
      type.value === "all" &&
      sort.value === "recent";
    const chips = document.querySelector("#active-filters");
    chips.replaceChildren();
    const addChip = (name, remove) => {
      const button = document.createElement("button");
      button.textContent = name + " ×";
      button.setAttribute(
        "aria-label",
        (locale === "zh" ? "移除筛选：" : "Remove filter: ") + name,
      );
      button.addEventListener("click", () => {
        remove();
        update("push");
      });
      chips.append(button);
    };
    if (category !== "all")
      addChip(
        current.querySelector("span:nth-child(2)").textContent,
        () => (category = "all"),
      );
    if (tag) addChip(tagLabel(tag), () => (tag = ""));
    if (type.value !== "all")
      addChip(type.selectedOptions[0].textContent, () => (type.value = "all"));
    if (input.value)
      addChip(
        (locale === "zh" ? "搜索：" : "Search: ") + input.value,
        () => (input.value = ""),
      );
    const p = new URLSearchParams();
    if (input.value) p.set("q", input.value);
    if (category !== "all") p.set("category", category);
    if (tag) p.set("tag", tag);
    if (type.value !== "all") p.set("type", type.value);
    if (sort.value !== "recent") p.set("sort", sort.value);
    const url = location.pathname + (p.size ? "?" + p : "") + location.hash;
    if (
      historyMode &&
      url !== location.pathname + location.search + location.hash
    )
      history[historyMode + "State"](null, "", url);
  }
  const reset = () => {
    input.value = "";
    category = "all";
    tag = "";
    type.value = "all";
    sort.value = "recent";
    update("push");
  };
  document
    .querySelector(".search-form")
    .addEventListener("submit", (e) => e.preventDefault());
  input.addEventListener("input", () => update());
  categories.forEach((b) =>
    b.addEventListener("click", () => {
      category = b.dataset.category;
      update("push");
    }),
  );
  tags.forEach((b) =>
    b.addEventListener("click", () => {
      tag = tag === b.dataset.tag ? "" : b.dataset.tag;
      update("push");
    }),
  );
  document.querySelectorAll("a[data-tag]").forEach((a) =>
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      tag = a.dataset.tag;
      update("push");
    }),
  );
  for (const select of [type, sort])
    select.addEventListener("change", () => update("push"));
  document.querySelector("#clear").addEventListener("click", reset);
  document.querySelector("#empty-reset").addEventListener("click", reset);
  window.addEventListener("popstate", () => {
    readURL();
    update(null);
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) &&
      !document.activeElement.isContentEditable &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === "Escape" && document.activeElement === input) {
      input.value = "";
      update();
    }
  });
  readURL();
  update();
} catch (e) {
  document.querySelector("#result-count").textContent =
    locale === "zh"
      ? "搜索加载失败。仍可打开下方笔记，请刷新后重试。"
      : "Search could not load. You can still open the notes below. Reload to retry.";
  document
    .querySelectorAll(".library-sidebar button,.library select,.library input")
    .forEach((el) => (el.disabled = true));
  console.error(e);
}
