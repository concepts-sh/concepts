# The eight relationship types

The type is the first word of the sentence. The rest of the sentence is the claim.

| Family | From this side | From the other side | Meaning |
|---|---|---|---|
| Hierarchy | Kind of X | Kinds: X, Y | This concept is a specific case of X. |
| Hierarchy | Part of X | Parts: X, Y | X contains this concept. |
| Equivalence | Same as X | Same as X | This concept and X are one thing with two names. |
| Lifecycle | Replaces X | Replaced by X | X is outdated. Use this concept instead. |
| Contrast | Not X | Not X | This concept is often confused with X, but it is different. |
| Association | Requires X | Required by X | X must exist or be true before this concept applies. |
| Association | Causes X | Caused by X | This concept produces X. |
| Association | Used for X | Uses X | The purpose of this concept is X. |

## Rules

- Kind and Part must not form a loop.
- Not and Same as must not both hold between the same two concepts.
- A concept with a Replaced by connection is retired. Keep its file while anything links to it.
- Write the claim; do not stop at the opener. Conditions, differences and mappings belong in the claim.
- When a relationship needs its own definition, it is a concept. Settlement is the relationship between a payment and an invoice, so Settlement is a concept with two connections.

## Example sentences

- Kind of [document](../document.md): one that requests money.
- Part of a [workspace](../tenancy/workspace.md), never of a user.
- Parts: [line item](line-item.md), [tax line](tax-line.md).
- Same as a [bill](bill.md) in the finance team's vocabulary.
- Replaced by [cache components](cache-components.md) since version 16.
- Not a [receipt](receipt.md): a receipt records a payment, an invoice requests one.
- Requires a [proration](proration.md) for any change after it is finalized.
- Causes a [payment attempt](payment-attempt.md) when it is finalized.
- Used for [revenue recognition](../finance/revenue-recognition.md) at period close.

## Choosing

Ask the question each type answers. What is it, more generally? What contains it? Is it the same thing under another name? What does it replace? What is it confused with? What must be true first? What does it trigger? What is it for? If none fits, write the claim without an opener, and consider whether the relationship is really a concept.
