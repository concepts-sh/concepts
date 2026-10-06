---
title: Link
description: A markdown link from one concept file to another, with the target's title as the link text.
---
Within a [base](base.md), a link is a relative path to the file. To another base, a link is the URL of the file, pinned to a version, or a path to a clone. Links are references, and a change keeps every link valid: a rename updates every link, and a file is deleted only when nothing links to it. Backlinks need no index; `grep -rl "<file>.md" .concepts` lists them.

Example: `[concept](concept.md)`.
Source: `SPEC.md`, sections 6 and 7.

## Connections
- Used for a [connection](connection.md) and for any mention of another concept in a body.
- Required by [validity](validity.md): every link to a file in the base must resolve.
