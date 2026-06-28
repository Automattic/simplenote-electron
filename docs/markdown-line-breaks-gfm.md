# Markdown line breaks — GFM-aligned spec

This document specifies how the Simplenote markdown editor should encode and interpret
newlines. It replaces the current **line-native** model (empty root paragraphs, bare `\n`
hard breaks) with behavior closer to [GitHub Flavored Markdown](https://github.github.io/gfm/)
and [CommonMark](https://spec.commonmark.org/).

## Goals

1. **GFM hard line breaks** — Shift+Enter produces a visible line break within a block,
   stored as two trailing spaces before the newline (`  \n`).
2. **No empty root paragraphs** — The document tree never contains empty paragraph blocks
   used as spacing between content blocks.
3. **Stable round-trip** — New typing, save, reopen, and copy/paste round-trip in GFM
   encoding. Legacy notes opened from sync must not change stored content until the user
   edits and saves.
4. **Compatibility** — Lenient import for trunk, mobile, and line-native notes; strict GFM
   export after edit. Exported notes render correctly in standard GFM viewers and other
   Simplenote apps.

## Non-goals

- Changing block-level syntax (headings, lists, tables, fences, etc.) beyond how gaps
  between blocks are encoded.
- Supporting the backslash hard-break form (`\\\n`) on **export** (import may still
  accept it for compatibility).

---

## Terminology

| Term                     | Meaning                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **Root block**           | Direct child of the editor root (paragraph, heading, list, quote, code, table, HR, …). |
| **Empty root paragraph** | A root-level paragraph with no text content (`getTextContent() === ''`).               |
| **Hard line break**      | A line break _inside_ a block (Shift+Enter). Rendered as `<br>` in HTML.               |
| **Paragraph break**      | A boundary between two root blocks (Enter).                                            |
| **Block gap**            | Newlines in stored markdown between two exported root blocks.                          |

---

## Document model

### Allowed structure

- Root children are **content blocks only** — blocks with semantic or textual content.
- **Empty root paragraphs are forbidden** between content blocks.
- Adjacent content paragraphs are stored as sibling root blocks with **no** empty paragraph
  between them.

### Empty notes

An entirely empty note is represented as:

- **Stored markdown:** `''` (empty string).
- **Editor state:** One caret host block so the user can type. This may be a normal empty
  paragraph or a `TransientParagraphNode` (excluded from export). It must **not** affect
  exported markdown.

Pressing Enter in an empty note creates the first real content paragraph; no extra empty
blocks are inserted.

### Blank lines (spacing between paragraphs)

**Cannot be created in the editor.** Users cannot insert a new visible blank line between
two paragraphs (no empty root paragraph node for spacing; Enter always creates a new
content paragraph).

**Legacy blank lines in stored markdown** (`\n\n\n` or more between content) must survive
**open without save** (see [Backwards compatibility](#backwards-compatibility)). On
**export after edit**, strict encoding applies: do not emit more than `\n\n` between
content paragraphs the user created via Enter. Whether a full-note save still preserves
imported extra gaps is an implementation choice (see lenient import rules below); the
default recommendation is to preserve extra gaps until the user edits the surrounding
blocks, then normalize that region to `\n\n`.

---

## Stored markdown encoding

### Paragraph breaks (Enter)

Two adjacent content paragraphs export with exactly **two** newlines:

```markdown
hello

world
```

(`hello\n\nworld`)

| Editor state                                   | Stored markdown                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `paragraph("hello")` then `paragraph("world")` | `hello\n\nworld`                                                     |
| `heading("Title")` then `paragraph("body")`    | `# Title\nbody` or `# Title\n\nbody` per block-separator rules below |

**Import:** `\n\n` (or longer gap, see normalization) separates blocks. Import creates
**adjacent** root blocks — never an empty paragraph between them.

```markdown
hello

world
```

→ root: `[paragraph("hello"), paragraph("world")]` — **two** blocks, not three.

### Hard line breaks (Shift+Enter)

A hard break inside a paragraph exports as **two trailing spaces** followed by newline:

```markdown
zero  
zero
```

(`zero  \nzero` — two spaces before the line-ending newline)

| Editor state                                               | Stored markdown                          |
| ---------------------------------------------------------- | ---------------------------------------- |
| `paragraph` with text `zero`, `LineBreakNode`, text `zero` | `zero  \nzero`                           |
| Same, inside a list item or blockquote                     | `  \n` within that block’s exported text |

**Import:** Recognizes GFM hard-break markers:

| Input pattern                      | Result                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foo  \nbar` (two trailing spaces) | `LineBreakNode` between `foo` and `bar`                                                                                                           |
| `foo\\\nbar` (backslash)           | Same (compat import)                                                                                                                              |
| `foo\nbar` (bare single newline)   | See [lenient import](#lenient-import-strict-export) — preserve as hard break when importing legacy / plain-text notes; do not use for **export**. |

**Export:** Always use the two-space form. Do not export bare `\n` or `\\\n` for hard breaks.

### Block gaps (non-paragraph pairs)

When two root blocks are not both plain content paragraphs, use the minimum newline gap
that GFM requires and round-trip needs:

| Previous block  | Next block      | Gap                                                   |
| --------------- | --------------- | ----------------------------------------------------- |
| Plain paragraph | Plain paragraph | `\n\n`                                                |
| Table           | Table           | `\n\n`                                                |
| Blockquote      | Blockquote      | `\n\n`                                                |
| Horizontal rule | Heading         | `\n`                                                  |
| Paragraph       | Fenced code     | `\n\n`                                                |
| …               | …               | See `blockSeparatorForExport` (updated for this spec) |

Rule: export uses `\n\n` only when required for block separation or merge-sensitive pairs;
otherwise a single `\n` suffices. Never insert a gap solely to encode an empty paragraph.

---

## Gap parsing on import

When scanning markdown for block boundaries:

1. **Fenced code blocks** — Newlines inside fences are content, not block gaps.
2. **List runs** — Handled by the list importer; blank lines between separate lists follow
   list import rules (see lenient import).
3. **Between blocks** — A run of `\n\n` or more newlines is a block boundary. Under
   **strict** import, extra newlines beyond the first `\n\n` collapse. Under **lenient**
   import, extra newlines are preserved for round-trip until export-after-edit (see
   [Backwards compatibility](#backwards-compatibility)).

Examples (strict export target; lenient import may differ while note is unedited):

| Input markdown             | Imported root blocks (strict)      | Lenient import (open only)                        |
| -------------------------- | ---------------------------------- | ------------------------------------------------- |
| `a\n\nb`                   | `paragraph("a")`, `paragraph("b")` | Same                                              |
| `a\n\n\nb`                 | `paragraph("a")`, `paragraph("b")` | Preserve gap → export `a\n\n\nb` if untouched     |
| `a\n\n\n\nb`               | Same as `\n\n` (strict)            | Preserve gap width if untouched                   |
| `\n\n\n` (whitespace-only) | Empty note (`''`) or caret host    | Round-trip whitespace if untouched                |
| `a  \nb`                   | One `paragraph` with hard break    | Same                                              |
| `a\nb`                     | Soft break (strict)                | `LineBreakNode` (legacy / trunk plain-text lines) |

---

## Editing behavior

### Enter

| Context                                               | Action                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Plain paragraph                                       | Split or insert new root paragraph **after** current block. No empty paragraph inserted before or between. |
| End of blockquote line with more quoted content below | Split into two blockquotes (see blockquote split). **No** empty paragraph between quotes.                  |
| Block shortcut trigger (`---`, `# `, etc.)            | Commit shortcut to structure (existing behavior).                                                          |
| Empty note                                            | First paragraph with typed content.                                                                        |

Exported markdown after `hello` + Enter + `world`:

```markdown
hello

world
```

Live editor and reopened note both have **two** root paragraphs.

### Shift+Enter

| Context                          | Action                                                     |
| -------------------------------- | ---------------------------------------------------------- |
| Paragraph, list item, blockquote | Insert `LineBreakNode` in current block (Lexical default). |
| Code block                       | New line in code (existing code-block behavior).           |

Export uses `  \n` at each hard break.

### Paste

| Paste type                                                | Behavior                                                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain text with `\n` inside a block context (code, quote) | `LineBreakNode` per line (existing). Export as `\n` inside block or `  \n` if breaks are hard breaks — **inside code**, literal `\n`; inside paragraph, prefer re-import of pasted segment. |
| Plain text with `\n\n`                                    | Split into paragraphs (no empty paragraphs between).                                                                                                                                        |
| Markdown                                                  | Full import path (lenient); see [Backwards compatibility](#backwards-compatibility).                                                                                                        |

---

## Blockquote Enter split (updated)

**Current:** Enter after `> 1` in `> 1\n> 2` inserts an empty root paragraph between two
quotes.

**Target:** Enter splits into two adjacent blockquotes with **no** empty paragraph:

```markdown
> 1

> 2
```

Stored markdown uses `\n\n` between quotes (merge-sensitive pair). Editor tree:

`[quote("1"), quote("2")]`

---

## Backwards compatibility

All Simplenote clients (Electron trunk, iOS, Android, web) sync the same plain-text
`content` field. There is no structured document on the server. Compatibility is about
**not rewriting synced bytes on open** and **not surprising users** when notes cross clients.

Official Simplenote markdown help matches this spec’s **export** format:

- Line break within a paragraph: two spaces + newline (`  \n`).
- New paragraph: two newlines (`\n\n`).

Trunk Electron preview (`lib/utils/render-note-to-html.ts`) uses Showdown with GFM and
`simpleLineBreaks: false`, so preview behavior aligns with GFM export, not line-native.

### How clients differ today

|                                           | Trunk (Monaco)                                   | Line-native (Lexical branch)         | GFM spec (export)                            |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------ | -------------------------------------------- | ---- |
| **Enter**                                 | one `\n` in storage                              | exports `\n\n` between paragraphs    | `\n\n` between paragraphs                    | Let' |
| **In-paragraph break**                    | one `\n` (same keystroke as Enter in plain text) | bare `\n` in block text              | `  \n`                                       |
| **Blank line in note**                    | `\n\n\n+` preserved literally                    | empty root paragraphs + gap encoding | no new blank lines; legacy preserved on open |
| **Preview / other apps: bare `\n` break** | no `<br>` (lines merge)                          | no `<br>`                            | no `<br>`                                    |
| **Preview / other apps: `  \n`**          | `<br>`                                           | `<br>`                               | `<br>`                                       |

Line-native is **less** compatible with trunk and other apps than this spec (bare `\n` hard
breaks do not render). The GFM spec fixes that for **new exports** while requiring careful
**import** of existing notes.

### Compatibility matrix (opening existing notes)

| Stored content                              | Open without save                                                         | First save after open                                            | Other apps after sync              |
| ------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `line1  \nline2`                            | OK                                                                        | OK (`  \n` unchanged)                                            | OK                                 |
| `line1\\\nline2`                            | OK                                                                        | Export → `line1  \nline2`                                        | OK (was usually OK)                |
| `zero\nzero` (bare `\n`)                    | Show as two lines (lenient import)                                        | Export → `zero  \nzero`                                          | **Improved** (preview gets `<br>`) |
| `hello\nworld` (trunk single Enter)         | Two lines in plain text; lenient → hard break or two lines in rich editor | May become `hello\n\nworld` if split into two paragraphs on edit | Depends on edit                    |
| `hello\n\nworld`                            | Two paragraphs                                                            | OK                                                               | OK                                 |
| `before\n\n\nafter` (blank line)            | Preserved if lenient import + no edit                                     | Blank line **may be lost** on strict export                      | May lose blank line                |
| Line-native note with empty root paragraphs | Normalize tree on import                                                  | Export without empty paragraphs                                  | Converges to GFM                   |

**Opening a note is safe for synced storage** only when bootstrap import does not call
`onChange` and does not push a re-export (existing `REMOTE_CONTENT_TAG` behavior).

**First explicit save after upgrade is the highest-risk moment** — local export can rewrite
the string and propagate via Simperium to every client.

### Lenient import, strict export

Recommended strategy to avoid breaking existing notes:

#### Lenient import (read path)

Accept all legacy encodings when building the Lexical tree from synced markdown:

| Pattern                              | Lenient import behavior                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `  \n` or `\\\n`                     | `LineBreakNode` (GFM hard break)                                             |
| Bare `\n` inside a paragraph segment | `LineBreakNode` (line-native, trunk plain-text lines, paste)                 |
| `\n\n` between blocks                | Adjacent root blocks, **no** empty paragraph between                         |
| `\n\n\n+` between blocks             | Block boundary + **preserve extra gap width** for export if region untouched |
| Line-native empty root paragraphs    | Map to preserved gap on export, or collapse tree to content blocks           |
| Whitespace-only note                 | Round-trip exact whitespace or normalize to `''` + caret host                |

Do **not** collapse gaps or strip bare `\n` breaks **on import alone**.

#### Strict export (write path)

When the user edits and the note is saved:

| Content                                       | Export                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| New hard break (Shift+Enter)                  | `  \n`                                                                                 |
| New paragraph (Enter)                         | `\n\n` between content paragraphs                                                      |
| New content                                   | No empty root paragraphs between blocks                                                |
| Untouched imported region with extra `\n\n\n` | Preserve until user edits that region (ideal), or normalize (acceptable if documented) |

Never auto-export on open. Re-export only on user edit or explicit save.

#### Sync

- `NoteContentSyncTracker` compares raw strings; avoid pushing when remote matches last
  import and the user has not edited.
- Mixed clients: notes edited only on old clients keep their encoding until opened and saved
  on the new editor. Document transient divergence until convergence.

#### Heuristic for bare `\n` (optional)

If bare `\n` must be distinguished from soft breaks in strict mode:

- **Inside a paragraph segment** (no `\n\n` nearby): treat as hard break on import.
- **Between block-level lines** (e.g. after `# heading`): block boundary, not hard break.

Default for Simplenote: prefer **lenient** (hard break) — trunk users expect two lines in
the editor for `hello\nworld`.

### What is _not_ backwards compatible

Even with lenient import, users may lose data **after they save**:

1. **Intentional blank lines** (`before\n\n\nafter`) if strict export normalizes gaps.
2. **Notes never edited on new client** — no problem; bytes unchanged.

Aggressive **import-time** collapse of blank lines or bare `\n` hard breaks is **not**
recommended — it changes the editor view on open and erodes trust before the user saves.

---

## Migration from line-native notes

Existing notes may use line-native encoding:

| Line-native pattern                                  | GFM-aligned target (on save)                          |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `zero\nzero` (bare `\n` hard break)                  | `zero  \nzero`                                        |
| `hello\n\nworld` with empty root paragraph in tree   | `hello\n\nworld` with two paragraphs only             |
| `hello\n\n\nworld` (blank line)                      | `hello\n\nworld` when user edits (blank line dropped) |
| Adjacent blocks + implicit empty paragraph on reopen | Adjacent blocks only                                  |

### Migration strategy (recommended)

1. **Lenient import** — Preserve legacy encoding in the tree and/or gap metadata; no
   normalization on open.
2. **Strict export on save** — GFM encoding for edited content; migrate line-native bare
   `\n` → `  \n` when the user saves.
3. **No forced rewrite on open** — Do not push re-exported markdown to sync until the user
   edits (keep `REMOTE_CONTENT_TAG` / skip onChange on bootstrap).
4. **Optional one-time migration** — Background job or explicit “update formatting” with
   revision backup; not silent on open.
5. **Tests** — Fixtures from `line-native.test.ts` updated; add compatibility fixtures from
   trunk and official Simplenote markdown examples.

---

## Acceptance criteria (tests)

### Hard breaks

- [ ] Shift+Enter in `zero` + `zero` exports `zero  \nzero`.
- [ ] Import `zero  \nzero` → one paragraph, `LineBreakNode`, text `zero\nzero`.
- [ ] Import `zero\\\nzero` → same as two-space form (compat).
- [ ] Import `zero  \nzero` → one paragraph, `LineBreakNode` (strict).
- [ ] Lenient import `zero\nzero` → `LineBreakNode` (legacy).
- [ ] Strict import-only `zero\nzero` → soft break (if strict path exists for tests).
- [ ] Round-trip `foo  \nbar` preserves two-space marker.

### Paragraph breaks (no empty paragraphs)

- [ ] `hello` + Enter + `world` → two root paragraphs; export `hello\n\nworld`.
- [ ] Import `hello\n\nworld` → two root paragraphs (count === 2).
- [ ] Save/reopen after Enter does not insert a third empty block.

### Blank lines

- [ ] User cannot create a new blank line between paragraphs via Enter.
- [ ] Open `before\n\n\nafter` without save → synced content unchanged.
- [ ] Lenient import + no edit → export still `before\n\n\nafter` (or equivalent).
- [ ] After edit + save → export `before\n\nafter` (blank line dropped) if strict normalize.

### Backwards compatibility

- [ ] Bootstrap import does not fire `onChange` / does not push to sync.
- [ ] Open trunk note `hello\nworld` → no sync payload change until user saves.
- [ ] Save after open migrates `zero\nzero` → `zero  \nzero`.
- [ ] `line1  \nline2` round-trips unchanged across save/reopen and note switch.
- [ ] Remote update from trunk client not overwritten while local note is unedited.

### Block separation

- [ ] Adjacent tables export with `\n\n`; import without empty paragraph between.
- [ ] `---\n# Title` single `\n` round-trip (no extra blank line).
- [ ] Blockquote Enter split: no empty root paragraph between quotes.

### Empty note

- [ ] `''` imports and exports as `''`.
- [ ] `\n\n\n` imports as empty note, exports `''`.

### Regression

- [ ] Fenced code internal newlines unchanged.
- [ ] List blank-line handling does not reintroduce empty root paragraphs.
- [ ] Selection memory / caret restore works without empty-paragraph paths.
- [ ] Search highlight offset math updated for `\n\n` vs `\n\n\n` encoding.

---

## Implementation touchpoints

| Area                         | Change                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `import-export.ts`           | Lenient import paths; strict GFM export; hard-break export as `  \n`; gap preservation for untouched regions.    |
| `block-gaps.ts`              | GFM gap constants, pair separators, legacy gap cache, `isEmptyRootParagraph`.                                    |
| `list-transformers.ts`       | Stop inserting empty paragraphs for blank lines between lists.                                                   |
| `blockquote-enter-split.ts`  | Split without empty paragraph.                                                                                   |
| `memory/selection-*.ts`      | Offset mapping without empty root paragraphs.                                                                    |
| `search/search-highlight.ts` | Block gap = `\n\n` consistently.                                                                                 |
| `markdown/pipeline.ts`       | Ensure bootstrap / remote apply does not record false local exports.                                             |
| Tests                        | Replace `line-native.test.ts`, `empty-line-count.test.ts`, `note-switch.test.ts`; add backwards-compat fixtures. |

---

## Open questions

1. **Blank-line preservation on save** — Preserve extra `\n` in untouched regions via gap
   metadata, or normalize entire note on first save (simpler, loses blank lines sooner).

2. **Trailing spaces visibility** — Two-space hard breaks are invisible in source. Consider
   whether the plain-text editor view should ever surface trailing spaces (probably not).

3. **Transient paragraph** — Confirm empty-note caret host never exports; document interaction
   with “no empty paragraphs” rule.

4. **Strict import mode** — Whether a test-only or paste-only strict path is needed for
   pure GFM paste from GitHub (bare `\n` → soft break).
