import { parse } from "yaml";
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderConceptMap(text) {
  const map = parse(text);
  if (
    !map ||
    typeof map.title !== "string" ||
    !map.title.trim() ||
    !Array.isArray(map.steps) ||
    map.steps.length < 2 ||
    map.steps.length > 6
  )
    throw new Error("concept-map needs a title and 2–6 steps");
  if (map.caption !== undefined && typeof map.caption !== "string")
    throw new Error("concept-map caption must be text");
  for (const step of map.steps)
    if (
      !step ||
      typeof step.label !== "string" ||
      !step.label.trim() ||
      typeof step.detail !== "string"
    )
      throw new Error("Each concept-map step needs label and detail");
  return `<figure class="concept-map"><figcaption>${esc(map.title)}</figcaption><ol>${map.steps.map((s, i) => `<li><span class="step-number">${String(i + 1).padStart(2, "0")}</span><strong>${esc(s.label)}</strong><p>${esc(s.detail)}</p></li>`).join("")}</ol>${map.caption ? `<p class="diagram-caption">${esc(map.caption)}</p>` : ""}</figure>`;
}
