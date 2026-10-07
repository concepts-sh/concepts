# Concepts

**An open format for agent knowledge.** Agents need skills. They also need concepts.

A skill tells an agent how to do a task. A concept tells it what a thing means in your project, and how it connects to other things. A `.concepts/` folder of plain markdown holds them. No tool, no server, no database; any agent that reads `AGENTS.md` can use it today.

> Intelligence means having a sufficient number of clear, correct and essential concepts in your mind, and having established a sufficient number of clear, correct and essential connections among them.

[concepts.sh](https://concepts.sh) · [Specification](https://concepts.sh/spec) · [Best practices](https://concepts.sh/best-practices) · [Use cases](https://concepts.sh/use-cases) · [Live base](https://concepts.sh/wiki) · [llms.txt](https://concepts.sh/llms.txt)

Status: version 0.1, draft. The format is stable enough to use; expect wording changes.

## One concept, one file

`.concepts/billing/invoice.md`:

```markdown
---
title: Invoice
description: A bill for one billing period that cannot change after it is finalized.
---
An invoice lists what a [workspace](../tenancy/workspace.md) owes for one billing period. Finalizing it freezes the amounts.

Example: `src/billing/__fixtures__/invoice.json`.
Source: `src/billing/invoice.ts`.

## Connections
- Part of a [workspace](../tenancy/workspace.md), never of a user.
- Requires a [proration](proration.md) for any change after it is finalized.
- Causes a [payment attempt](payment-attempt.md) when it is finalized.
- Not a [receipt](receipt.md): a receipt records a payment, an invoice requests one.
```

`.concepts/index.md`, the map:

```markdown
# Concepts

## billing
- [Invoice](billing/invoice.md): A bill for one billing period that cannot change after it is finalized. Part of workspace; requires proration; causes payment attempt; not receipt.
```

Two fields are required: a title and a one-sentence definition. A connection is a sentence whose first word is the type. The map lists every concept on one line, and the agent sees it on every turn; it opens a concept file when a task touches the concept.

## Before and after

| Request | Without concepts | With concepts |
|---|---|---|
| "Let users edit last month's invoice." | Adds an edit endpoint to the invoice. | Reads Invoice: "cannot change after it is finalized, requires a proration". Builds a proration. |
| "Churn by cohort." | Invents a query over raw events and mixes up user churn with revenue churn. | Uses `fct_churn` and the 28-day active-user definition from the Churn concept. |
| "Add caching to the dashboard page." | Calls `unstable_cache`, the API it learned in training. | Sees "Replaces the old cache helper" on the map and uses cache components. |

Six situations with the files: [use cases](https://concepts.sh/use-cases).

## Get started

```
npx concepts-sh init
```

`bunx concepts-sh init` is the same. It creates `.concepts/index.md`, installs the `concepts` skill into `.agents/skills/` with links from `.claude/skills/` and `.cursor/skills/`, and adds one block to `AGENTS.md`. All of it is plain files you could create by hand.

1. **Ask your agent: set up concepts.** It reads your schema, types and docs, writes the ten to twenty concepts that matter, and asks about the terms it cannot pin down.
2. **Correct it.** When a term is wrong, say so. The agent fixes the concept file and the map line in the same change, and every teammate's agent has the fix from then on.
3. **Keep it honest.** `npx concepts-sh check` runs the six validity rules, for CI. `npx concepts-sh wiki` builds a disposable wiki to read the base in a browser.

## Eight relationship types

The first word of a connection is its type. The rest of the sentence is the claim.

| Type | Opener | Question it answers |
|---|---|---|
| Kind | Kind of X · Kinds: X, Y | What is it, more generally? |
| Part | Part of X · Parts: X, Y | What contains it? |
| Same | Same as X | Is it the same thing under another name? |
| Replaces | Replaces X · Replaced by X | What is outdated, and what replaced it? |
| Not | Not X | What is it confused with? |
| Requires | Requires X · Required by X | What must be true first? |
| Causes | Causes X · Caused by X | What does it trigger? |
| Use | Used for X · Uses X | What is it for? |

When a relationship needs its own definition, it is a concept: Settlement is the relationship between a payment and an invoice, so Settlement gets a file.

## Why concepts

- **Shared understanding.** People and agents use the same defined words.
- **Evolves with the project.** Grows from corrections; changes in the same commit as the code.
- **Progressive disclosure.** The map is always in mind; files load only when a task touches them.
- **Typed connections.** Eight relationship types give the agent the shape of your domain, not a glossary.
- **Sources, not copies.** Every concept points to the file or document that defines it.
- **Reviewable like code.** Plain markdown in git; a change of meaning shows up in the pull request.
- **Checkable.** Six validity rules, run by the agent or in CI.
- **Shareable.** Push the repo and every concept has a URL. Others link to your concepts, pinned to a version, and write their own with yours as the source. Nothing is copied.
- **No lock-in.** Works in any agent that reads `AGENTS.md`; the files open in Obsidian or any markdown viewer.

## This repository

| Path | What it is |
|---|---|
| [`SPEC.md`](SPEC.md) | The format, on one page. The site's spec page is rendered from it. |
| [`skills/concepts/`](skills/concepts/) | The skill that teaches an agent to read, write and maintain a base. Installable with `npx skills add concepts-sh/concepts`. |
| [`cli/concepts.mjs`](cli/concepts.mjs) | `init`, `check`, `wiki`. One file, no dependencies, runs under Bun or Node. Published as `concepts-sh`. |
| [`.concepts/`](.concepts/) | This repository's own base: the standard described in its own format. Rendered at [concepts.sh/wiki](https://concepts.sh/wiki). |
| [`site/`](site/) | The site. `bun site/build.mjs` writes it to `site/dist/`. |

From a checkout: `bun cli/concepts.mjs check` validates the base, `bun cli/concepts.mjs wiki` opens it, `bun site/build.mjs` builds the site.

## Contributing

Issues and pull requests are welcome. Three things keep the repository consistent:

- `SPEC.md` is the source of truth. A change to the format starts there; the skill's references and the site follow it.
- `.concepts/` must pass `bun cli/concepts.mjs check`. CI runs it on every pull request.
- The spec is written in its own style: short sentences, active voice, must and must not.

## License

MIT. See [LICENSE](LICENSE).
