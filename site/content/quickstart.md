# Quickstart

Ten minutes from an existing project to a base your agent uses. Nothing here needs the CLI; the two commands are shortcuts for files you can create by hand.

## 1. Install

```
npx concepts init
```

`bunx concepts init` is the same. It creates `.concepts/index.md`, installs the `concepts` skill into `.agents/skills/` and links it into each agent's own skills folder, and adds this block to `AGENTS.md`:

```markdown
## Concepts

Read `.concepts/index.md` before you work on domain logic. Open a concept file when a task touches the concept. Follow the concepts skill to add or change concepts.
```

If a `CLAUDE.md` exists, it also adds `@.concepts/index.md`, which inlines the map.

Without the CLI: create the folder and the file, add the block, and install the skill from the repository with `npx skills add concepts-sh/concepts` or by copying `skills/concepts/`.

## 2. Let the agent mine the project

Say to your agent: *set up concepts*. An existing project does not start from scratch; the skill mines what the repo already says, in this order:

1. Schema and models: tables, domain types, enums. The code becomes each concept's source.
2. Contracts: API schemas, event and queue names.
3. Existing glossaries: `CONTEXT.md`, docs glossaries, ADRs.
4. Names used across many files, names that mean two things, names defined nowhere.
5. Past corrections in reviews and chats, where someone said "that's not what X means".

It writes the ten to twenty concepts that matter most, with their connections, asks you one question at a time about the terms it cannot pin down, and opens a change for review. Small on purpose: the base grows from corrections.

## 3. Review the first base

Read the map, `.concepts/index.md`. One line per concept: link, definition, connections. If a definition is wrong, say so; the agent fixes the file. If a term is missing, ask for it. The six validity checks run by reading, or with `npx concepts check`.

## 4. Work as usual

Nothing changes in daily use. The map is in context on every turn. When a task touches a concept, the agent opens the file and follows the connections.

The one new habit is the correction. When the agent misunderstands a term, do not rephrase the prompt; say the concept is wrong. The skill changes the concept file and the map line in the same change, and every teammate's agent has the correction from then on.

When a change alters what a concept means, a schema, a type, an API, a rule, the concept changes in the same commit. The `Source:` lines tell the agent which concepts a file defines.

## 5. Read the base

```
npx concepts wiki
```

Builds a disposable wiki into the temp directory and opens it: a page per concept, connections as sentences, what other concepts say about it, a reading order from prerequisites, a focus graph, and a health view. Rebuild it any time; it is never stale, because it is built from the files every time. Edits go through the agent or your editor, not the page.

## 6. Check in CI

```
npx concepts check
```

Exits non-zero when any of the six checks fails, and prints the expected map line when a line is wrong, so an agent can paste the fix. Put it next to your linter.

## 7. Publish

Push the repository. Every concept now has a URL. Another project uses your base by linking to it, pinned to a version, or by writing its own concepts with yours as the source. See [the spec](spec.html#6-loading) for the two ways.
