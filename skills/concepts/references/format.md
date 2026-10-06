# The format

A condensed version of the specification. The full text is at concepts.sh/spec.

## Structure

```
.concepts/
  index.md            # the map
  tenancy/            # a domain
    workspace.md      # a concept
    team.md
  billing/
    invoice.md
    proration.md
```

- A base is any folder with an `index.md`. A project's base is `.concepts/` at the root of the repository.
- A folder is a domain. A concept has exactly one home folder.
- The ID of a concept is its path from the base root without `.md`: `billing/invoice`.
- The file name is the title in lowercase, with hyphens for spaces: `payment-attempt.md`.
- A folder with more than about thirty concepts gets its own `index.md`.
- A base holds only its own concepts. Another base is linked, never copied.
- Titles are unique within a base. Two things with one name need two names.

## A concept file

Required: front-matter `title` and `description`. Nothing else is required; the body is free prose.

- `title` is the one name of the concept. Every link to the concept uses this name as the link text.
- `description` is one sentence that defines the concept. A reader must be able to use the concept correctly from this sentence alone.

Recommended in the body:

- Say what the concept is in the first paragraph.
- If it has other names, say so once: "Also called a bill." Never use the other names elsewhere.
- Give one example with a real identifier: a path, a field name, a record.
- Name the source of truth when one exists: "Source: `src/billing/invoice.ts`." Point to it; do not copy it.
- Link the first mention of every other concept with a relative markdown link to its file.

Connections:

- A concept may stand alone. A link from another concept counts as much as one written here.
- A connection is a claim a reader needs to use the concept correctly. Any other mention is a link in the body, not a connection.
- Connections are a list of sentences under `## Connections` at the end of the file. A long list is a hint that the concept is two concepts.
- Each sentence starts with a type opener and contains at least one link. One type per sentence; several links of that type are fine: `Parts: [team](team.md), [project](project.md).`
- A sentence without an opener counts as "related". Prefer a type.

## The map

`index.md` lists every concept, grouped by folder, one line each:

```markdown
# Concepts

## billing
- [Invoice](billing/invoice.md): A bill for one billing period that cannot change after it is finalized. Part of workspace; requires proration; causes payment attempt; not receipt.
```

- A line holds the link, the description, and the typed connections in lowercase, separated by semicolons.
- The map stays under about 4,000 tokens, about one hundred concepts. Beyond that, the root map lists folders, and each folder has its own `index.md`.
- The map may end with `## External`: other bases, one line each, a link to their `index.md` pinned to a version, and a description.
- Whoever adds or changes a concept updates the map in the same change.

## Changes

Links are references. A change keeps every reference valid, as in a database.

- Add: write the file and its map line in the same change.
- Update: change the file and its map line, then read every file that links to it.
- Rename or move: update every link, path and text, in the same change.
- Retire: add a `Replaced by` connection. The file and its map line stay.
- Delete: only when nothing links to the file.
- When code changes the meaning of a concept, change the concept in the same commit.

## Other bases

- A link to a concept in another base is the URL of its file, pinned to a version or commit, or a path to a clone outside your own base. The URL returns the markdown file itself.
- When an external concept must be in mind, write a local concept in your own words, with the external concept as its source.
