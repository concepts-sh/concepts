# concepts

A `.concepts/` folder gives your agents the meaning of things: what each term, entity, metric and idea in your project is, and how they connect. Skills tell an agent how to do a task. Concepts tell it what things are.

> Intelligence means having a sufficient number of clear, correct and essential concepts in your mind, and having established a sufficient number of clear, correct and essential connections among them.

The format is plain markdown with no dependencies. It is defined in [SPEC.md](SPEC.md). This file describes the tooling, which is optional: every file the tooling writes, a person can write by hand.

Status: draft. The commands below work from a checkout as `node cli/concepts.mjs <command>`; the npm package is not published yet.

## Install

```
npx concepts init
```

`bunx concepts init` is the same. It does three things, all plain files:

1. Creates `.concepts/index.md`, the map.
2. Installs the `concepts` skill into `.agents/skills/` and links it into each agent's own skills folder.
3. Adds a short block to `AGENTS.md` (and `@.concepts/index.md` to `CLAUDE.md` if present) so every agent reads the map before domain work.

Then ask your agent: *set up concepts*. An existing project does not start from scratch; the agent mines what the repo already says:

1. Schema and models: tables, domain types, enums, with the code as each concept's source.
2. Contracts: API schemas, event and queue names.
3. Existing glossaries: `CONTEXT.md`, docs glossaries, ADRs.
4. Names used across many files, names that mean two things, names defined nowhere.
5. Past corrections in reviews and chats, where someone said "that's not what X means".

It writes the ten to twenty that matter most, with their connections, asks about the terms it cannot pin down, and opens a PR. Small on purpose: the base grows from corrections.

The skill also installs through plugin marketplaces and `npx skills add`. Installed that way, it creates the folder and the AGENTS.md block itself on first use.

## Use

- **Daily work needs nothing.** The map is in context on every turn. The agent opens a concept file when a task touches it and follows the connections.
- **Correct once.** When the agent misunderstands a term, say so. The skill fixes the concept file and the map line in the same change, and every teammate's agent has it from then on.
- **Meaning changes with code.** When a change alters what a concept means, the concept changes in the same commit.
- **Read the base.** `npx concepts wiki` builds a wiki into the temp directory and opens it: a page per concept, connections as sentences, backlinks, a reading order from prerequisites, and a health view. External concepts you link to appear at the edge of the graph as ghost nodes; `--external` fetches the bases listed under `## External` and shows them too. It is disposable; rebuild it any time. Edits go through the agent or your editor, not the page.
- **Check in CI.** `npx concepts check` runs the six validity rules from the spec.

## Share

A base is shared by publishing it. Push the repository, and every concept in it has a URL.

Using someone else's base never copies it:

- **Link to it.** A sentence may link to a concept in another base by URL, pinned to a version. Add the base to the `## External` section of your map, one line, so your agent knows it exists and reads it when a task needs it.
- **Write your own.** When an external concept must be in mind on every turn, write a local concept in your own words, with the external concept as its source.

To read a whole base, clone it and run `npx concepts wiki path/to/.concepts`, or publish its wiki with GitHub Pages. Your own base holds only your concepts, so titles never collide and nothing needs resolving. The directory of public bases will live at concepts.sh, with a readable wiki for each.

## Files in this repository

- `SPEC.md`: the format.
- `skills/concepts/`: the skill, which teaches an agent to read, write and maintain a base.
- `cli/`: the `concepts` command.
- `site/`: the site at concepts.sh. `node site/build.mjs` writes it to `site/dist/`: home, quickstart, spec (rendered from `SPEC.md`), best practices, examples.
