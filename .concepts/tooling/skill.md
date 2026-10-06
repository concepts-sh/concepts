---
title: Skill
description: The instructions, in the Agent Skills format, that teach an agent to read, write and maintain a base.
---
The skill is organized by moments, not by operations: before domain work, set up, add, fix after a correction, change with code, rename or retire, check, show. It carries four reference files: the format, the eight types, the style, and a template. It needs no tool; `npx concepts` is optional.

Example: `skills/concepts/SKILL.md`.
Source: `skills/concepts/SKILL.md`.

## Connections
- Used for [loading](../format/loading.md) and for writing a [concept](../format/concept.md).
- Not a [concept](../format/concept.md): a skill says how to do a task, a concept says what a thing is.
- Required by the [CLI](cli.md) command `init`, which installs it.
