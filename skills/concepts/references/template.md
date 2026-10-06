# Template

Replace every angle-bracket placeholder. Delete any line that does not apply.

```markdown
---
title: <Title>
description: <One sentence that defines it. A reader must be able to use the concept correctly from this sentence alone.>
---
<What it is, in a short paragraph. Link the first mention of every other concept.>
Also called <other name>.

Example: <a real identifier: a path, a field name, a record>.
Source: <the file, document or URL that defines it>.

## Connections
- <Opener> <claim with a [link](path.md)>.
- <Opener> <claim with a [link](path.md)>.
```

Map line for `index.md`, under the folder heading:

```markdown
- [<Title>](<folder>/<file>.md): <description> <type target>; <type target>.
```

## Filled example

```markdown
---
title: Invoice
description: A bill for one billing period that cannot change after it is finalized.
---
An invoice lists what a [workspace](../tenancy/workspace.md) owes for one billing
period. Finalizing it freezes the amounts.
Also called a bill.

Example: `src/billing/__fixtures__/invoice.json`.
Source: `src/billing/invoice.ts`.

## Connections
- Part of a [workspace](../tenancy/workspace.md), never of a user.
- Requires a [proration](proration.md) for any change after it is finalized.
- Causes a [payment attempt](payment-attempt.md) when it is finalized.
- Not a [receipt](receipt.md): a receipt records a payment, an invoice requests one.
```

```markdown
- [Invoice](billing/invoice.md): A bill for one billing period that cannot change after it is finalized. Part of workspace; requires proration; causes payment attempt; not receipt.
```
