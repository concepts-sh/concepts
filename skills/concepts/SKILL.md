---
name: concepts
description: Read, write and maintain the project's concept base in .concepts/, the folder that defines what each term, entity, metric and idea means and how they connect. Use when setting up concepts, when a term is undefined or ambiguous, when the user corrects a meaning, when code changes a meaning, or when asked to show, check or explain the concepts.
---

# Concepts

A concept base gives an agent the meaning of things. Skills tell you how to do a task. Concepts tell you what things are. The format is in `references/format.md`, the eight relationship types in `references/types.md`, the style in `references/style.md`, and a file template in `references/template.md`.

Everything is plain markdown in `.concepts/`. No tool is required. `npx concepts` (`check`, `wiki`) is optional; when it is missing, do the same work by reading.

## 1. Before domain work

- The map, `.concepts/index.md`, is normally in context through AGENTS.md. If it is not, read it first.
- Open the concept files the task touches. The connections on each map line tell you which.
- A concept's `Source:` line points to the code or document that defines it. Read the source when the concept is not enough.
- Backlinks: `grep -rl "<file>.md" .concepts` lists every concept that links to a file.

## 2. Set up (no `.concepts/` yet)

Do this when asked to set up concepts. When a project has domain terms and no base, offer it once.

1. Create `.concepts/index.md` with the heading `# Concepts`.
2. Add this block to `AGENTS.md`, creating the file if needed:

   ```markdown
   ## Concepts

   Read `.concepts/index.md` before you work on domain logic. Open a concept file when a task touches the concept. Follow the concepts skill to add or change concepts.
   ```

   If `CLAUDE.md` exists, add the line `@.concepts/index.md`.
3. Mine the repository for candidates, in this order: schema and models; API contracts and event names; existing glossaries (`CONTEXT.md`, docs, ADRs); names used across many files, names with two meanings, names defined nowhere; past corrections in reviews.
4. Rank by how widely a term is used and how ambiguous it is. Write the top ten to twenty, with connections. Not more: the base grows from corrections.
5. For each term you cannot define from the code, ask the user one question at a time. Do not guess a definition.
6. Write the map line for each concept. Run the checks (section 7). Present the result as one change for review.

## 3. Add a concept

When: a term in the task has no concept and is not obvious; the user asks for one; a correction reveals a missing concept.

1. Copy `references/template.md`. File name: the title in lowercase, hyphens for spaces, in the domain folder where a person would look for it.
2. `description`: one sentence that defines it. A reader must be able to use the concept correctly from this sentence alone.
3. Body: what it is; "Also called X" once if it has other names; one example with a real identifier; `Source:` when one exists. Link the first mention of every other concept.
4. `## Connections`: only claims a reader needs to use the concept correctly. Each sentence starts with a type opener and has a link. Conditions and differences go after the colon.
5. Add the map line in `index.md` under the folder heading: `- [Title](path.md): description. type target; type target.`
6. Run the checks.

## 4. Fix after a correction

When the user says a concept is wrong ("a workspace is not a team"):

1. Find it: the title in `index.md`, or `grep -ril "<term>" .concepts`.
2. Change the description, body or connections. Do not only answer; the file is the fix.
3. Update its map line. Then read every file that links to it; a sentence there may now be wrong.
4. If the correction names a thing that has no concept, add one (section 3).

## 5. Change with code

When a change alters what a concept means (a schema, a type, an API, a rule), change the concept in the same commit. The `Source:` lines tell you which concepts a file defines: `grep -rl "<path>" .concepts`.

## 6. Rename, retire, delete

- Rename or move: update every link to the file, path and text, in the same change. Then the map line.
- Retire: add a `Replaced by` connection pointing to the successor. Keep the file and its map line.
- Delete: only when `grep -rl "<file>.md" .concepts` returns nothing. Never delete a linked concept.

## 7. Check

Run `npx concepts-sh check` when available. Otherwise verify by reading:

1. Every link to a file in the base resolves.
2. Every concept has a title and a one-sentence description.
3. Every concept has one line in its folder's map, and the line matches the file.
4. Every sentence under Connections has an opener and a link.
5. Kind and Part form no loop; no pair is both Not and Same as.
6. Titles are unique within the base.

## 8. Show

When asked to show, visualize or explain the concepts: run `npx concepts-sh wiki` when available and open the result. Otherwise, summarize the map by folder and offer to open specific concepts.

## Rules that always apply

- One word, one meaning. Use a concept's title every time you refer to it. Never a synonym in prose.
- Short sentences, active voice, present tense, must and must not for rules, exact names.
- Point to a source; never copy it.
- A concept is a meaning, not an instruction. Instructions belong in AGENTS.md; procedures belong in skills.
- When a relationship needs its own definition, make it a concept.
- Another base is linked by URL, never copied. If an external concept must be in mind, write a local concept with the external one as its source.
