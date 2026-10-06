---
title: Loading
description: How a base reaches an agent's context: the map on every turn, concept files on demand.
---
`AGENTS.md` points to the [map](map.md), and a `CLAUDE.md` may import it. A reader loads the map first and opens a [concept](concept.md) file when a task touches the concept; the [connections](connection.md) on the map line say which files to open. An external concept is fetched when a task needs it.

Example: the `## Concepts` block in this repository's `AGENTS.md`.
Source: `SPEC.md`, section 6.

## Connections
- Uses the [map](map.md) on every turn and a [concept](concept.md) file on demand.
- Required by the [skill](../tooling/skill.md), whose first rule is to read the map before domain work.
