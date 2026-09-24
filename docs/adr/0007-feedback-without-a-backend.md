# ADR 0007: Bug reports without a backend

**Status:** accepted · 2026-09-24

## Context

Visitors need a way to report bugs and suggest features. Unbox Box has no server, the budget
is $0, and the maintainer doesn't want a new mailbox or a visible email address.

## Decision

- The Help page's form sends reports to Web3Forms, which emails the address its access key
  was created with. The key (`NEXT_PUBLIC_WEB3FORMS_KEY`) is public by design: it can only
  send to that inbox. Free tier: 250 reports a month.
- The form validates with Zod, has a honeypot field and a one-minute cooldown per browser,
  and includes technical details only if the visitor leaves the box ticked (it shows exactly
  what is sent).
- If `NEXT_PUBLIC_REPO_URL` is set, "Open a GitHub issue" pre-fills an issue as an
  alternative. "Copy report" always works, so a report is never lost.
- The logic lives in `apps/web/src/lib/feedback.ts` with unit tests; the form component only
  holds state.

## Consequences

- Reports depend on a third-party service's uptime and terms; the copy fallback covers
  outages.
- Spam protection is basic. If it becomes a problem, Web3Forms' hCaptcha can be switched on.
