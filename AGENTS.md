# EMBA Journey working instructions

This repository is the user's EMBA knowledge base. Follow `.agents/skills/emba-capture/SKILL.md` when the user provides slides, keywords, articles, URLs, or notes to capture. Use EMBA as the standard spelling; preserve exact course titles.

- All authored learning documents, source summaries, reflections, and operating guides are Markdown. Original attachments are input; do not commit binaries unless specifically requested.
- Publish every note in both English and Simplified Chinese: English in `content/notes/`, Chinese with the same filename/id in `content/notes/zh/`. Translate title, summary, body, diagrams, source labels, and course name where applicable; keep category/type/tag/related identifiers and dates aligned. Build rejects missing published translations.
- For substantive learning notes, include a bilingual `learning-practice` Markdown block with an objective, stable recall/explain/transfer questions, source-grounded suggested answers, and an application prompt. See `site/DESIGN.md`. Learner responses and reflections are browser-local; never publish them without a specific request.
- Keep learning content in `content/notes/`; use `templates/note.md` and `site/config.json` for metadata and categories.
- This is a public repo. Review supplied material for personal/confidential information and publication rights; omit restricted material and ask targeted questions when sharing permission is unclear. An authorized capture request includes publishing suitable summaries, not reproducing an entire copyrighted deck/article.
- Run `npm ci` when needed, then `npm run check`. All build/compilation and validation happen locally. Never add GitHub Actions workflows.
- On any extraction, validation, merge, push, deployment, or live verification failure, promptly tell the user the failing stage and error. Repair routine reversible problems, rerun relevant checks, and report any remaining blocker. Do not claim completion on a failed stage.
- Successful capture requests include commit, push to `main`, local build, deploy, and live verification unless the user limits scope. Direct commits to `main` are preferred for routine content changes.
- If a PR is needed, check it against current `main`, run local validation, and merge it once all required checks are green. Never leave a PR created for the task open at turn completion: if blocked, report and close it while preserving the branch. Never bypass required checks or repository protections.
- `npm run deploy` only publishes built output. Commit and push source first; deployment requires a clean tree, `main`, and source HEAD matching `origin/main`.
- Update existing notes and related links instead of duplicating concepts. Preserve learner-provided reflections and language. Never invent a personal experience or completed course.
