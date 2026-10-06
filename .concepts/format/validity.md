---
title: Validity
description: The six checks a base passes before a change to it is complete.
---
Every [link](link.md) to a file in the base resolves. Every [concept](concept.md) has a title and a one-sentence [description](description.md). Every concept has one line in its [map](map.md), and the line matches the file. Every [connection](connection.md) has an opener and a link. Kind and Part form no loop, and no pair is both Not and Same as. Titles are unique within the base. An agent checks all six by reading; a script checks them with no dependencies.

Example: `npx concepts check`.
Source: `SPEC.md`, section 8.

## Connections
- Required by a [base](base.md) before a change is complete.
- Requires every [link](link.md) to resolve and the [map](map.md) to match every file.
- Used for the [CLI](../tooling/cli.md) command `check`.
