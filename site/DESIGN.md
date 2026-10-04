# EMBA Journey interface

## Navigation

The global navigation has Library and Capture guide. Categories describe primary subjects; topic tags connect notes across subjects; note types describe the form of learning. Keep these three dimensions distinct.

Desktop uses a subject/topic sidebar and a searchable card collection. Smaller screens use collapsible browse panels. Note pages provide a category breadcrumb, section links, sources, related notes, and a link to Markdown.

## Labels and search

Store stable tag slugs in note metadata (for example `cross-cultural-management`); display readable labels. Reuse existing tags where meanings match. Use categories for disciplines, tags for themes/frameworks, and types for concept, lecture, article, case, reflection, or guide. Do not add a category just for one author.

Search matches all query terms across titles, summaries, category names, tags, course names, and note text. Hyphens and diacritics are normalized; English and Chinese are supported. Subject, topic, and type filters intersect. Sorting supports update date, alphabetical title, and relevance (title and tag matches receive priority). Filter state is shareable through the URL. The slash key focuses search, and Escape clears the search field.

Topic counts show all published notes using that tag, not the current filtered result count. The results count reflects all active filters. Empty subjects remain visible so new learning has a clear home.

## Markdown diagrams

Use a `concept-map` fenced block for a short sequence when it helps explain a note. It renders locally as an accessible figure with ordered steps, laid out horizontally on larger screens and vertically on phones. Keep diagrams concise; use a caption to label interpretation or limitations.

```yaml
# Place this YAML inside a fence named concept-map, not yaml.
title: From source to application
steps:
  - label: Read
    detail: Identify the source's central claim.
  - label: Connect
    detail: Compare the idea with another framework.
  - label: Apply
    detail: Test a clearly labeled practical example.
caption: A learning sequence, not evidence of causation.
```

The schema requires a title and 2–6 steps, each with a label and detail. Caption is optional. Input text is escaped and sanitized. Diagrams remain in the note's Markdown; avoid duplicating their definitions in the renderer. This renderer is for sequences, not arbitrary network or architecture graphs.

## Visual approach and checks

Use the green/ivory palette, editorial headings, compact metadata, and readable body text. Diagrams should clarify a relationship; decorative artwork should be limited. Native HTML links and details elements keep navigation usable without JavaScript; client filtering requires JavaScript and reports an index-loading failure.

After renderer changes run `npm run check`, then inspect desktop and phone layouts, search, combined filters, resetting filters, URL restoration/back navigation, note anchors, related links, and diagrams. Build and deploy locally with the existing scripts; never add GitHub Actions workflows.

## English and Chinese

English pages retain existing URLs; Simplified Chinese pages live under `/zh/`. Every published English note must have a Chinese Markdown counterpart with the same filename and stable metadata identifiers. Translate titles, summaries, all sections, diagram labels/captions, source labels, and course names when appropriate. Retain source URLs and clearly identified English technical terms. The build checks matching published notes and shared identifiers/dates before generating output.

The header switch links to the same note in the other language and preserves current library filters. Explicit language selections are stored locally when browser storage is available. A saved Chinese preference redirects external visits to default English routes; explicit Chinese URLs remain Chinese. Native language links work with JavaScript disabled. Both language versions have their own search index, including translated tag labels. Add translations to `site/i18n.mjs` for new interface strings and topic labels, and `nameZh` / `descriptionZh` for new categories.

## Practice and application

Every substantive note can contain one `learning-practice` Markdown fence. It requires `objective`, `application`, and 1–12 `questions`, each with a stable slug `id`, `kind` (`recall`, `explain`, `transfer`), `prompt`, and `answer`. Keep question IDs and kinds aligned in English and Chinese. Generated practice data is derived from these Markdown blocks; the block is hidden from the reading body. See the note template for an example.

The Practice page opens new and due questions, keeps feedback hidden initially, records self-rated recall, and schedules the next review. Learners can deliberately select all questions or one note. The experience/observation/principle/experiment/outcome panel supports a Kolb-inspired application loop. Responses save with a rating; reflections save explicitly. Data stays browser-local, language versions share keys, and Markdown export keeps a copy. Saved answer records preserve the prompt used at the time, so later revisions do not misattribute an old answer to a new question.

The 1/3/7/14/30/60-day schedule is a product heuristic, not a calibrated memory model. Self-ratings do not certify mastery. Changes to either language's question or answer make that item eligible for review again. No background reminders or automatic publishing of personal responses are implemented. See `site/LEARNING-RESEARCH.md` for evidence and boundaries.
