---
title: CLI
description: The optional concepts command with three subcommands: init, check and wiki.
---
`init` creates the [map](../format/map.md), installs the [skill](skill.md) and adds the AGENTS.md block. `check` runs the six [validity](../format/validity.md) rules, for CI. `wiki` builds the [wiki](wiki.md). The CLI is TypeScript with no runtime dependencies, runs under Bun or Node, and never calls a model. Everything it writes, a person can write by hand.

Example: `npx concepts-sh init`.
Source: `cli/`.

## Connections
- Used for installing the [skill](skill.md), for [validity](../format/validity.md) checks in CI, and for building the [wiki](wiki.md).
