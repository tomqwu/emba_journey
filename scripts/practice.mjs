import { parse } from "yaml";
export function extractPractice(body) {
  const blocks = [...body.matchAll(/```learning-practice\r?\n([\s\S]*?)```/g)];
  if (!blocks.length) return null;
  if (blocks.length !== 1)
    throw new Error("Use one learning-practice block per note");
  const data = parse(blocks[0][1]);
  if (
    !data ||
    typeof data.objective !== "string" ||
    !data.objective.trim() ||
    !Array.isArray(data.questions) ||
    !data.questions.length ||
    data.questions.length > 12
  )
    throw new Error("learning-practice needs an objective and 1–12 questions");
  const ids = new Set();
  for (const q of data.questions) {
    if (
      !q ||
      typeof q.id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(q.id) ||
      ids.has(q.id)
    )
      throw new Error("Practice questions need unique stable IDs");
    ids.add(q.id);
    if (
      !["recall", "explain", "transfer"].includes(q.kind) ||
      typeof q.prompt !== "string" ||
      !q.prompt.trim() ||
      typeof q.answer !== "string" ||
      !q.answer.trim()
    )
      throw new Error("Practice question needs kind, prompt, and answer");
  }
  if (typeof data.application !== "string" || !data.application.trim())
    throw new Error("Practice needs an application prompt");
  return data;
}
