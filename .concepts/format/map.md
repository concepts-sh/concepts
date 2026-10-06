---
title: Map
description: The index.md file that lists every concept in a base with its definition and its typed connections, one line each.
---
The map is what an agent has in mind on every turn. Each line holds a [link](link.md) to the [concept](concept.md), its [description](description.md), and its [connections](connection.md) as lowercase type and target pairs. Lines are grouped under one heading per [domain](domain.md). The map stays under about 4,000 tokens; beyond that, the root map lists domains and each domain has its own map. A map may end with `## External`, listing other bases.

Example: `.concepts/index.md`.
Source: `SPEC.md`, section 5.

## Connections
- Part of a [base](base.md), at its root.
- Requires a [description](description.md) from every concept, repeated on its line.
- Used for [loading](loading.md): the map is in context on every turn.
