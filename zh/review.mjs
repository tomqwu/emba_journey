export const STORAGE_KEY = "emba-learning-v1";
export function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function scheduleReview(previous, rating, now = new Date()) {
  if (!["again", "partial", "confident"].includes(rating))
    throw new Error("Invalid self-rating");
  const stages = [1, 3, 7, 14, 30, 60];
  const stage =
    rating === "again"
      ? 0
      : rating === "partial"
        ? 1
        : Math.min(
            5,
            Number.isInteger(previous?.stage) ? previous.stage + 1 : 2,
          );
  const day = dayKey(now),
    due = new Date(day + "T12:00:00Z");
  due.setUTCDate(due.getUTCDate() + stages[stage]);
  return {
    stage,
    rating,
    reviewed: day,
    due: due.toISOString().slice(0, 10),
    reviews: (previous?.reviews || 0) + 1,
  };
}
export function reviewQueue(cards, state, now = new Date(), all = false) {
  const today = dayKey(now);
  return cards
    .filter(
      (c) =>
        all ||
        !state[c.key] ||
        state[c.key].version !== c.version ||
        state[c.key].due <= today,
    )
    .sort((a, b) => {
      const active = (c) =>
        state[c.key]?.version === c.version ? state[c.key] : null;
      const ra = active(a),
        rb = active(b);
      return (
        (ra?.due || today).localeCompare(rb?.due || today) ||
        a.noteId.localeCompare(b.noteId) ||
        a.id.localeCompare(b.id)
      );
    });
}
export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { reviews: {}, journal: {} };
  const data = JSON.parse(raw);
  if (
    !data ||
    !data.reviews ||
    !data.journal ||
    Array.isArray(data.reviews) ||
    Array.isArray(data.journal)
  )
    throw new Error("Saved learning data is invalid");
  for (const record of Object.values(data.reviews))
    if (
      !record ||
      typeof record.version !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.due) ||
      !Number.isInteger(record.stage) ||
      record.stage < 0 ||
      record.stage > 5
    )
      throw new Error("Saved review record is invalid");
  for (const record of Object.values(data.journal))
    if (
      !record ||
      typeof record !== "object" ||
      Object.values(record).some((value) => typeof value !== "string")
    )
      throw new Error("Saved reflection is invalid");
  return data;
}
export function exportMarkdown(state, cards, locale = "en") {
  const zh = locale === "zh";
  const labels = zh
    ? {
        title: "EMBA 学习记录",
        exported: "导出日期",
        info: "评分为自我评估，日期使用多伦多时区。",
        rating: "自评分",
        reviewed: "复习日期",
        due: "下次复习",
        version: "练习版本",
        response: "我的回答",
        reflection: "反思",
        experience: "情境／实际经历",
        observation: "观察",
        principle: "解释／原理",
        experiment: "实验与预期",
        outcome: "结果与修正",
        again: "需要再试一次",
        partial: "部分回忆起来",
        confident: "能清楚回忆",
      }
    : {
        title: "EMBA learning journal",
        exported: "Exported",
        info: "Review ratings are self-assessments; dates use America/Toronto.",
        rating: "Self-rating",
        reviewed: "Reviewed",
        due: "Next review",
        version: "Practice revision",
        response: "Response",
        reflection: "Reflection",
      };
  const lines = [
    `# ${labels.title}`,
    "",
    `${labels.exported}: ${dayKey()}`,
    "",
    labels.info,
    "",
  ];
  const clean = (v) => String(v ?? "").replace(/\r/g, "");
  for (const [key, r] of Object.entries(state.reviews)) {
    const c = cards.find((c) => c.key === key) || {
      noteTitle: key.split(":")[0],
      prompt: key,
    };
    lines.push(
      `## ${clean(r.noteTitle || c.noteTitle)} — ${clean(r.prompt || c.prompt)}`,
      "",
      `- ${labels.rating}: ${labels[r.rating] || r.rating}`,
      `- ${labels.reviewed}: ${r.reviewed}`,
      `- ${labels.due}: ${r.due}`,
      `- ${labels.version}: ${r.version}`,
      "",
      `${labels.response}: ${clean(r.response)}`,
      "",
    );
  }
  for (const [noteId, entry] of Object.entries(state.journal)) {
    lines.push(
      `## ${labels.reflection}: ${clean(cards.find((c) => c.noteId === noteId)?.noteTitle || noteId)}`,
      "",
    );
    for (const [key, value] of Object.entries(entry))
      lines.push(`### ${labels[key] || key}`, "", clean(value), "");
  }
  return lines.join("\n");
}
