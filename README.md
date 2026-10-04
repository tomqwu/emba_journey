# EMBA Journey

A Markdown knowledge base for executive learning, with a locally built GitHub Pages site.

- Repository: [tomqwu/emba_journey](https://github.com/tomqwu/emba_journey)
- Site: [EMBA Journey](https://tomqwu.github.io/emba_journey/)
- Capture workflow: [.agents/skills/emba-capture/SKILL.md](.agents/skills/emba-capture/SKILL.md)

## Capture new learning

Open this repository in Codex and say **“Capture this for my EMBA knowledge base”** with a deck, keyword, article, URL, or rough notes. Optional context: course, date, category, language, or a practical question. `AGENTS.md` routes future agents to the project skill automatically.

The agent reads the source, writes attributed Markdown, separates your reflections from interpretation, connects related notes, validates locally, commits/pushes, publishes, and checks the live result. Unclear keywords or unavailable sources stay provisional. It reports failed stages and asks for missing information when needed.

## Structure

```text
content/notes/                  Learning notes (Markdown + YAML metadata)
templates/note.md              Starting template
site/config.json               Categories and site settings
site/                          Styles and browser search/filter code
scripts/                       Local build, validation, and deployment
.agents/skills/emba-capture/    Reusable capture skill
incoming/                      Ignored local originals, if supplied
 dist/                         Ignored generated site
```

The interface provides subject navigation, clickable topic tags, combined filters, relevance sorting, and a contents list for notes. See [site/DESIGN.md](site/DESIGN.md) for interface conventions and Markdown diagrams.

One primary category per note; tags, course, source references, and related IDs support connections. Supported note types: concept, lecture, article, case, reflection, guide. `published` notes appear on the site; `draft` and `review` notes do not. **The repository is public, so drafts committed here are public too.** Do not commit confidential notes or unlicensed source decks.

## Local commands

Requires Node.js 22+; Python 3 is used only for the preview server.

```sh
npm ci
npm run check       # behavior tests, metadata/link validation, local HTML build
npm run preview     # http://localhost:4173/emba_journey/
```

Copy `templates/note.md` into `content/notes/<stable-id>.md`, fill the metadata and note, then set `status: published` when ready. Sources use `title` plus `url` or `locator`; related entries use note IDs. Use ordinary relative Markdown links between notes. The build checks and converts these to site links. Raw HTML is sanitized.

## Publish

```sh
git add .
git commit -m "Capture new EMBA learning"
git push origin main
npm run deploy
```

Deployment re-runs local checks, requires a clean `main` matching the fetched `origin/main`, and pushes only generated files to `gh-pages`. Configure GitHub Pages to publish from `gh-pages` at `/`. `.nojekyll` disables Jekyll compilation. No workflow YAML or application build runs in GitHub Actions; GitHub manages the Pages hosting/deployment infrastructure.

After deployment, check the live home page and changed notes. Hosting propagation can take a few minutes. A successful branch push alone does not confirm live availability. If a step fails, the agent reports it immediately, repairs what it can, and asks about unresolved blockers.

Routine work uses direct commits to `main`. If a PR is used, merge only after local tests and required checks pass. A blocked PR is reported and closed with its branch preserved; no task-created PR remains open.

## Languages

Switch EN / 中文 in the header. [English](https://tomqwu.github.io/emba_journey/) and [中文](https://tomqwu.github.io/emba_journey/zh/) have fully translated navigation, search, tags, notes, and diagrams. The language buttons retain filters and save your choice in browser storage.

English Markdown lives in `content/notes/`; Chinese counterparts live in `content/notes/zh/` with matching filenames, ids, dates, categories, types, tags, related links, and publishing status. Build validation requires a Chinese counterpart for every published English note. See `site/DESIGN.md` for authoring conventions.

## Learn and practice

Open [Practice](https://tomqwu.github.io/emba_journey/learn.html) or [中文练习](https://tomqwu.github.io/emba_journey/zh/learn.html). Attempt the question, compare feedback, self-rate, and revisit later. Save reflections to connect ideas to actual work, and export them as Markdown. All progress is browser-local and shared across languages on that browser.

The [learning-method guide](https://tomqwu.github.io/emba_journey/notes/learning-how-to-learn.html) explains the evidence, learning loop, schedule assumptions, and limitations. Source register: `site/LEARNING-RESEARCH.md`. New substantive notes include bilingual `learning-practice` fences using `templates/note.md`.
