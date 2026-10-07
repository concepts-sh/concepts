# Use cases

Where concepts change what an agent does: what goes wrong without them, what you write, and what changes.

## A product team with a codebase

**What goes wrong.** "Let users edit last month's invoice" becomes an edit endpoint, because nothing told the agent that a finalized invoice never changes. Names drift: one file says user, the next says account, the third says member.

**What you write.** The entities and their rules, seven concepts in two folders.

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

`.concepts/billing/proration.md`:

```markdown
---
title: Proration
description: A credit or charge for the unused part of a billing period after a plan change.
---
When a subscription changes plan mid-period, the difference for the remaining days becomes a proration line on the next invoice. Prorations are the only way an amount changes after an invoice is finalized.

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

**What changes.** The agent reads "cannot change after it is finalized" and "requires a proration", and builds a proration instead of an edit. New code uses the names on the map, because the map is in front of the agent on every turn.

## A data team

**What goes wrong.** "Churn by cohort" becomes an invented query over raw events. User churn and revenue churn get mixed up. The number in the agent's answer does not match the number in the board deck.

**What you write.** The metrics, each with the model that computes it as its source.

`.concepts/metrics/active-user.md`:

```markdown
---
title: Active user
description: A user who performed at least one qualifying event in the last 28 days.
---
Qualifying events are the ones tagged `core` in `events.yml`. Logins do not qualify. The 28-day window is calendar days ending on the report date.

Example: `select count(distinct user_id) from fct_active_users where report_date = current_date`.
Source: `models/marts/fct_active_users.sql`.

## Connections
- Requires a [qualifying event](qualifying-event.md) in the window.
- Used for [retention](retention.md) and [churn](churn.md).
- Not a signed-up user: signing up without a qualifying event does not count.
```

`.concepts/metrics/churn.md`:

```markdown
---
title: Churn
description: The share of last month's active users who were not active this month.
---
Churn counts users, not revenue. The denominator is last month's active users; the numerator is those with no qualifying event this month.

Example: `models/marts/fct_churn.sql`, column `churn_rate`.
Source: `models/marts/fct_churn.sql`.

## Connections
- Requires [active user](active-user.md) for both months.
- Not revenue churn: that metric is not reported here.
```

**What changes.** The agent uses `fct_churn` and the 28-day definition, and does not confuse user churn with revenue churn. When the definition changes, the concept changes in the same commit as the model.

## A library author

**What goes wrong.** Every user's agent calls the API the model learned in training. Your issue tracker fills with bugs that are really documentation, and nothing you write in the docs reaches the agent at the moment it writes code.

**What you write.** A base in the library's own repository: the ten concepts a user must hold to use the library right, with Replaces for what changed.

`.concepts/cache-components.md`:

```markdown
---
title: Cache components
description: The current caching model, where a component declares its own cache lifetime with a directive.
---
The old `unstable_cache` helper is gone. Caching is declared inside the component with a `"use cache"` directive. Data fetched outside a cached component is dynamic by default.

Example: `examples/dashboard/app/page.tsx`, the directive at the top.
Source: `docs/caching.md`.

## Connections
- Replaces the old cache helper: do not call `unstable_cache` in version 16 or later.
- Requires version 16 or later.
```

**What changes.** Users add one line to their map:

```markdown
## External
- [Framework concepts](https://raw.githubusercontent.com/example/framework/v16.2/.concepts/index.md): the framework's own concepts, pinned to v16.2.
```

Their agents stop calling `unstable_cache`, because Replaces is on the map every turn. Bugs that were documentation stop arriving.

## An open-source maintainer

**What goes wrong.** Contributor pull requests break the architecture because the contributor's agent did not know that a plugin is not a hook. Each review explains the same distinction again.

**What you write.** The core architecture, with Not sentences for the classic confusions.

`.concepts/plugin.md`:

```markdown
---
title: Plugin
description: A package that adds commands or hooks to the CLI, loaded from the user's config.
---
A plugin is the unit of distribution. It is listed in `plugins.toml` and loaded at start-up. What it adds is commands, hooks, or both.

Example: `plugins/git-sync`.
Source: `src/plugins/loader.ts`.

## Connections
- Parts: [command](command.md), [hook](hook.md).
- Not a [hook](hook.md): a hook runs inside the lifecycle of a command; a plugin is the package that provides it.
- Requires an entry in `plugins.toml`, see [config](config.md).
```

**What changes.** Pull requests arrive shaped correctly, because the contributor's agent read the map before it wrote code. The distinction is explained once, in a file, instead of once per review.

## A team on several agents

**What goes wrong.** Some of the team use Claude Code, some Cursor, some Codex. Each agent gets told the same things in separate prompts, and each forgets. A new hire's agent knows nothing on day one.

**What you write.** Nothing new. One base, one line in `AGENTS.md`:

```markdown
## Concepts

Read `.concepts/index.md` before you work on domain logic. Open a concept file when a task touches the concept. Follow the concepts skill to add or change concepts.
```

**What changes.** Every agent that reads `AGENTS.md` has the same meanings, and a correction made through one agent reaches all of them, because it changed a file in git. The new hire reads the base in order, prerequisites first, and so does their agent.

## A regulated domain

**What goes wrong.** "Revenue" is computed the way the model thinks revenue works, not the way the auditors do. The agent's number is plausible and wrong, and nobody can say which document it followed.

**What you write.** The terms the auditors use, each with the policy that governs it as its source.

`.concepts/finance/revenue.md`:

```markdown
---
title: Revenue
description: The amount recognized in a period when a performance obligation is satisfied, not the amount invoiced.
---
Revenue follows ASC 606. An invoice does not create revenue; satisfying the obligation does. Amounts invoiced before that point sit in deferred revenue.

Example: `reports/revenue-2026-q3.md`, section 2.
Source: `policies/revenue-recognition.md`, pinned to the 2026 revision.

## Connections
- Requires a satisfied [performance obligation](performance-obligation.md).
- Causes [deferred revenue](deferred-revenue.md) when an invoice precedes the obligation.
- Not [bookings](bookings.md): bookings are signed contracts, revenue is what has been earned.
```

**What changes.** Every definition the agent uses traces to the document that governs it, and the Not sentence stops the most expensive confusion in the building.

## The standard's own base

The repository that defines Concepts keeps its own base in `.concepts/`: sixteen concepts, each with a source line pointing at the spec section it comes from. It is rendered live at [/wiki](/wiki), the same page `npx concepts-sh wiki` builds for any base.
