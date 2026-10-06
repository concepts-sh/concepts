---
title: Concept
description: One markdown file that defines one thing and states how the thing connects to others.
---
A concept has a title, a one-sentence [description](description.md), a free body, and a list of [connections](connection.md). The file is the unit of meaning: one thing per file, one file per thing. A concept is not an instruction; instructions belong in AGENTS.md.

Example: `.concepts/format/concept.md`, this file.
Source: `SPEC.md`, section 2.

## Connections
- Part of a [domain](domain.md), exactly one.
- Parts: [description](description.md), [connections](connection.md).
- Not a [skill](../tooling/skill.md): a skill says how to do a task, a concept says what a thing is.
