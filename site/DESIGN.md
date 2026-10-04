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
