# Concepts

Specification, version 0.1 (draft).

> Intelligence means having a sufficient number of clear, correct and essential concepts in your mind, and having established a sufficient number of clear, correct and essential connections among them.

A concept base is that, written down for an agent. It gives the agent the meaning of things: what a term, an entity, a metric or an idea is, and how it connects to other things. Skills tell an agent how to do a task. Concepts tell it what things are.

A concept base is a folder of markdown files in the repository. Any agent and any person can read it and change it. It needs no tool, no server and no database.

Every rule below serves one of four words: sufficient, clear, correct, essential. The map keeps the concepts in mind. The style keeps them clear. The source keeps them correct. The test for a connection keeps them essential.

## 1. Structure

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
- The ID of a concept is its path from the base root without `.md`, for example `billing/invoice`.
- The file name is the title in lowercase, with hyphens for spaces: `payment-attempt.md`.
- A folder may contain folders. A folder with more than about thirty concepts gets its own `index.md`.
- A base holds only its own concepts. Another base is linked, never copied. See section 6.
- Titles are unique within a base. Two things with one name need two names.

## 2. A concept file

```markdown
---
title: Invoice
description: A bill for one billing period that cannot change after it is finalized.
---
An invoice lists what a [workspace](../tenancy/workspace.md) owes for one billing
period. Finalizing it freezes the amounts.

Example: `src/billing/__fixtures__/invoice.json`.
Source: `src/billing/invoice.ts`.

## Connections
- Part of a [workspace](../tenancy/workspace.md), never of a user.
- Requires a [proration](proration.md) for any change after it is finalized.
- Causes a [payment attempt](payment-attempt.md) when it is finalized.
- Not a [receipt](receipt.md): a receipt records a payment, an invoice requests one.
```

Required:

- `title` is the one name of the concept. Every link to the concept uses this name as the link text.
- `description` is one sentence that defines the concept. A reader must be able to use the concept correctly from this sentence alone.

There are no other fields and no required sections. The body is free prose.

Recommended in the body:

- Say what the concept is in the first paragraph. It may expand the description.
- If the concept has other names, say so once: "Also called a bill." Do not use the other names anywhere else.
- Give one example with a real identifier: a path, a field name, a record.
- Name the source of truth when one exists: "Source: `src/billing/invoice.ts`." Point to it; do not copy it.
- Link the first mention of every other concept with a relative markdown link to its file.

Connections:

- A concept may stand alone. The first concept in a base always does, and a link from another concept counts as much as one written here.
- A connection is a claim a reader needs to use the concept correctly. Any other mention of another concept is a link in the body, not a connection.
- When a concept has connections, they are a list of sentences under `## Connections` at the end of the file. A long list is a hint that the concept is two concepts.
- Each sentence starts with an opener from section 3 and contains at least one link.
- A sentence has one type. It may link several concepts of that type: `Parts: [team](team.md), [project](project.md).`
- A sentence without an opener counts as "related". Prefer a type.

## 3. Relationship types

| Family | From this side | From the other side | Meaning |
|---|---|---|---|
| Hierarchy | Kind of X | Kinds: X, Y | This concept is a specific case of X. |
| Hierarchy | Part of X | Parts: X, Y | X contains this concept. |
| Equivalence | Same as X | Same as X | This concept and X are one thing with two names. |
| Lifecycle | Replaces X | Replaced by X | X is outdated. Use this concept instead. |
| Contrast | Not X | Not X | This concept is often confused with X, but it is different. |
| Association | Requires X | Required by X | X must exist or be true before this concept applies. |
| Association | Causes X | Caused by X | This concept produces X. |
| Association | Used for X | Uses X | The purpose of this concept is X. |

Rules:

- Kind and Part must not form a loop.
- Not and Same as must not both hold between the same two concepts.
- A concept with a Replaced by connection is retired. See section 7.
- The opener names the type. The rest of the sentence states the claim. Write the claim; do not stop at the opener. Conditions, differences and mappings belong in the claim.
- When a relationship needs its own definition, it is a concept. Settlement is the relationship between a payment and an invoice, so Settlement is a concept with two connections.

## 4. Style

The style borrows the idea of Simplified Technical English (ASD-STE100): one word has one meaning, and a sentence says one thing. It does not borrow the dictionary.

1. One word has one meaning. Refer to a concept by its title every time. Do not use a synonym in prose.
2. Keep a sentence under 25 words.
3. Use the active voice and the present tense.
4. Put one idea in one sentence.
5. Use "must" and "must not" for rules. Do not use "should".
6. Do not use "it" or "this" when the referent is not obvious.
7. Give exact names: file paths, field names, commands, versions.

Rules 1 to 6 apply strictly to the title, the description and the connections. The body may hold examples, code and longer explanation.

## 5. The map

`index.md` lists every concept in the base, grouped by folder. One line per concept:

```markdown
# Concepts

## tenancy
- [Workspace](tenancy/workspace.md): The tenant boundary; every row belongs to exactly one. Parts: team, project; not organization.

## billing
- [Invoice](billing/invoice.md): A bill for one billing period that cannot change after it is finalized. Part of workspace; requires proration; causes payment attempt; not receipt.
- [Proration](billing/proration.md): A credit or charge for a partial billing period. Part of invoice; caused by plan change.
```

- A line holds the link, the description, and the typed connections in lowercase, separated by semicolons.
- The map must stay under about 4,000 tokens, which is about one hundred concepts. Beyond that, the root map lists each folder with one line, and each folder has its own `index.md` in the same format.
- The map may end with a section `## External` that lists other bases, one line each: a link to the base's `index.md`, pinned to a version, and a description.
- Whoever adds or changes a concept updates the map in the same change.

## 6. Loading

- `AGENTS.md` points to the map: "Read `.concepts/index.md` before you work on domain logic. Open a concept file when a task touches the concept." A `CLAUDE.md` may import it with `@.concepts/index.md`.
- A reader loads the map first and opens concept files on demand. The connections show which files to open.
- Backlinks need no index: `grep -rl "invoice.md" .concepts` lists every concept that links to the invoice.
- A link to a concept in another base is the URL of its file, pinned to a version or commit so the meaning cannot change underneath the reader, or a path to a clone of that base outside your own. The URL returns the markdown file itself. The reader fetches it when a task needs it, and the relative links inside it resolve within that base.
- When an external concept must be in mind, write a local concept in your own words, with the external concept as its source.

## 7. Changes

Links are references. A change keeps every reference valid, as in a database.

- Add: write the file and its map line in the same change.
- Update: change the file and its map line. Then read every file that links to it (`grep -rl "<file>.md" .concepts`); a sentence there may now be wrong.
- Rename or move: update every link to the file, path and text, in the same change. A rename never leaves an old name behind.
- Retire: add a Replaced by connection. The file and its map line stay, so a link to the old concept still resolves and leads to the new one.
- Delete: only when `grep -rl "<file>.md" .concepts` returns nothing. A linked concept cannot be deleted; retire it or rewrite the links first.
- When code changes the meaning of a concept, change the concept in the same commit.

## 8. Validity

A base is valid when:

1. Every link to a file in the base resolves.
2. Every concept has a title and a one-sentence description.
3. Every concept has one line in its folder's map, and the line matches the file.
4. Every sentence under Connections has an opener and a link.
5. Kind and Part form no loop, and no pair of concepts is both Not and Same as.
6. Titles are unique within the base.

An agent can check all six by reading. A script can check them with no dependencies.

## 9. Compatibility

- Add `type: concept` to the front-matter to make the base a valid Open Knowledge Format bundle.
- The map line follows the llms.txt format: a link, a colon, notes.
- Links are standard markdown links, so GitHub, Obsidian, Foam and VS Code render the base without configuration.
