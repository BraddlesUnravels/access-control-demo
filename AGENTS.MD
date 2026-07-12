# AGENTS

## Project purpose

Build a small, functional mini-LMS technical assessment using:

- Next.js (App Router)
- TypeScript
- Supabase (`supabase-js`, `supabase-ssr`)
- PostgreSQL (via Supabase)

The goal is to demonstrate solid full-stack implementation quality, secure access control, and clear architecture decisions under a strict deadline.

## Time constraint

This project is time-boxed to approximately 1.5 days (within a 48-hour submission window).

Priority is:

1. Complete required functionality end-to-end
2. Keep implementation understandable and defensible in interview
3. Avoid unnecessary complexity and refactors

## Build constraints

- Do not over-engineer.
- Do not introduce non-required architecture layers unless they clearly reduce risk.
- Prefer APIs/route handlers over adding new action-heavy patterns.
- Use simple, consistent patterns that can be explained quickly.
- Keep UI basic; functionality and correctness are primary.

## Required feature scope (no extras until done)

1. Authentication (sign up, login, logout)
2. Student dashboard listing own consultations
3. Consultation create form:
   - First name
   - Last name
   - Reason
   - Datetime
4. Student can:
   - Mark complete/incomplete
   - Reschedule
   - Cancel
5. Admin can view all consultations (read-only is acceptable)
6. README with setup, assumptions, design choices, schema/migrations summary

## Decision guardrails

Before implementing anything non-trivial, ask:

1. Is this required by the assessment?
2. Will this increase completion risk inside the timebox?
3. Can I explain this decision clearly in 60 seconds?

If any answer is “no”, choose the simpler option.

## Security and access control baseline

- Enforce ownership: students can only access their own consultations.
- Enforce admin role check for all-consultations view.
- Keep validation and authorization checks explicit and close to API boundaries.

## Definition of done

- All required flows work locally.
- No obvious authorization gaps.
- README clearly explains tradeoffs and what would be improved with more time.
- Submission is stable, coherent, and interview-defensible.
