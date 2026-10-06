# Examples

Three small bases, complete enough to copy. Each shows a different reason to write concepts: domain rules, metric definitions, and knowledge the model's training predates.

## A SaaS billing base

The classic case: a product with its own vocabulary and rules an agent keeps getting wrong. Seven concepts in two folders.

```
.concepts/
  index.md
  tenancy/
    workspace.md
    team.md
  billing/
    subscription.md
    invoice.md
    proration.md
    receipt.md
    payment-attempt.md
```

`.concepts/tenancy/workspace.md`:

```markdown
---
title: Workspace
description: The tenant boundary; every row and every permission belongs to exactly one workspace.
---
A workspace is what a customer signs up for. Everything the customer owns
lives inside it, and nothing crosses it. Every query filters by
`workspace_id`, because row-level security is enforced per workspace.
Also called a tenant.

Example: `workspaces` table, `src/db/schema/workspace.ts`.
Source: `src/db/schema/workspace.ts`.

## Connections
- Parts: [teams](team.md), [subscription](../billing/subscription.md).
- Not an organization: a customer may have several workspaces, and billing is per workspace.
```

`.concepts/billing/proration.md`:

```markdown
---
title: Proration
description: A credit or charge for the unused part of a billing period after a plan change.
---
When a subscription changes plan mid-period, the difference for the remaining
days becomes a proration line on the next invoice. Prorations are the only
way an amount changes after an invoice is finalized.

Example: `src/billing/proration.ts`, function `prorate()`.
Source: `src/billing/proration.ts`.

## Connections
- Part of an [invoice](invoice.md), as a line item.
- Caused by a plan change on a [subscription](subscription.md).
- Required by an [invoice](invoice.md) for any change after it is finalized.
```

`.concepts/index.md`:

```markdown
# Concepts

## tenancy
- [Workspace](tenancy/workspace.md): The tenant boundary; every row and every permission belongs to exactly one workspace. Parts: team, subscription; not organization.
- [Team](tenancy/team.md): A named group of people inside a workspace, used to grant access to projects. Part of workspace; not workspace.

## billing
- [Subscription](billing/subscription.md): A workspace's active plan, with its billing period and renewal date. Part of workspace; causes invoice.
- [Invoice](billing/invoice.md): A bill for one billing period that cannot change after it is finalized. Part of workspace; requires proration; causes payment attempt; not receipt.
- [Proration](billing/proration.md): A credit or charge for the unused part of a billing period after a plan change. Part of invoice; caused by subscription; required by invoice.
- [Receipt](billing/receipt.md): The record of a successful payment, sent to the customer. Caused by payment attempt; not invoice.
- [Payment attempt](billing/payment-attempt.md): One try to collect an invoice's amount from the stored payment method. Caused by invoice; causes receipt.
```

What this base does: an agent asked to "let users edit last month's invoice" opens Invoice, reads "cannot change after it is finalized" and "requires a proration for any change", and builds a proration instead of an edit. Without the base, it adds an edit endpoint.

## A metrics base

For analytics agents, the failure is subtler: the model knows what churn is in general and gets your churn wrong, because yours is defined by a specific query over specific tables. The source line is the point.

`.concepts/metrics/active-user.md`:

```markdown
---
title: Active user
description: A user who performed at least one qualifying event in the last 28 days.
---
Qualifying events are the ones tagged `core` in `events.yml`. Logins do not
qualify. The 28-day window is calendar days ending on the report date.

Example: `select count(distinct user_id) from fct_active_users where report_date = current_date`.
Source: `models/marts/fct_active_users.sql`.

## Connections
- Requires a [qualifying event](qualifying-event.md) in the window.
- Used for [retention](retention.md) and [churn](churn.md), which count active users across windows.
- Not a signed-up user: signing up without a qualifying event does not count.
```

`.concepts/metrics/churn.md`:

```markdown
---
title: Churn
description: The share of last month's active users who were not active this month.
---
Churn is computed on users, not on revenue; revenue churn is a different
metric that this team does not report. The denominator is last month's
active users, the numerator is those among them with no qualifying event
this month.

Example: `models/marts/fct_churn.sql`, column `churn_rate`.
Source: `models/marts/fct_churn.sql`.

## Connections
- Requires [active user](active-user.md) for both months.
- Not revenue churn: that metric is not reported here.
- Used for the monthly board report.
```

What this base does: asked for "churn by cohort", the agent uses `fct_churn` and the 28-day active-user definition instead of inventing a query over raw events, and it does not confuse user churn with revenue churn.

## Knowledge the model's training predates

A framework shipped a new API after the model was trained. The model confidently uses the old one. A single concept with Replaces fixes it, and this is the case where you write a local concept about something external.

`.concepts/stack/cache-components.md`:

```markdown
---
title: Cache components
description: The framework's current caching model, where a component declares its own cache lifetime with a directive.
---
The old `unstable_cache` helper is gone. Caching is declared inside the
component, and the lifetime is one of the named profiles in the framework's
docs. Data fetched outside a cached component is dynamic by default.

Example: `app/dashboard/page.tsx`, the `"use cache"` directive at the top.
Source: https://example-framework.dev/docs/v16/cache-components (pinned to v16).

## Connections
- Replaces the old cache helper: do not call `unstable_cache` anywhere in this codebase.
- Requires the framework at version 16 or later, see `package.json`.
```

What this base does: the agent stops reaching for the API it learned, because the concept is in the map on every turn, with the word "Replaces" on it.

## The standard's own base

The repository that defines Concepts keeps its own base in `.concepts/`: sixteen concepts in two folders, each with a source line pointing at the section of the spec it comes from. It is the longest-running example, and `npx concepts wiki` on a checkout renders it.
