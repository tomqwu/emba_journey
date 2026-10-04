const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[-_]/g, " ");
export function filterNotes(
  notes,
  query = "",
  category = "all",
  tag = "",
  type = "all",
) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return notes.filter(
    (n) =>
      (category === "all" || n.category === category) &&
      (!tag || n.tags.includes(tag)) &&
      (type === "all" || n.type === type) &&
      terms.every((term) =>
        normalize(
          [
            n.title,
            n.summary,
            n.categoryLabel,
            n.course,
            n.text,
            ...n.tags,
          ].join(" "),
        ).includes(term),
      ),
  );
}
export function sortNotes(notes, order = "recent", query = "") {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const score = (n) =>
    terms.reduce(
      (sum, t) =>
        sum +
        (normalize(n.title).includes(t) ? 5 : 0) +
        (n.tags.some((tag) => normalize(tag).includes(t)) ? 3 : 0) +
        (normalize(n.summary).includes(t) ? 1 : 0),
      0,
    );
  return [...notes].sort((a, b) => {
    if (order === "title") return a.title.localeCompare(b.title);
    if (order === "relevance" && terms.length) {
      const difference = score(b) - score(a);
      if (difference) return difference;
    }
    return b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title);
  });
}
